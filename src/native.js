/* Background-only native connections and durable, credential-free task state. */
const KaraokeNative = (() => {
  const host = "com.runrun.karaoke", active = new Map(), locks = new Map();
  const key = videoId => `timingJob:${videoId}`;
  async function settings() {
    const saved = (await browser.storage.local.get("audioShakeSettings")).audioShakeSettings || {};
    return { language: saved.language || "auto", hasApiKey: !!saved.apiKey };
  }
  async function saveSettings(message) {
    if (!/^(auto|[a-z]{2})$/.test(message.language)) throw new Error("Select an AudioShake language.");
    if (message.apiKey !== undefined && (typeof message.apiKey !== "string" || message.apiKey.length > 1000 || /[\r\n]/.test(message.apiKey))) throw new Error("Invalid AudioShake key.");
    const saved = (await browser.storage.local.get("audioShakeSettings")).audioShakeSettings || {};
    await browser.storage.local.set({ audioShakeSettings: { language: message.language, apiKey: message.apiKey === undefined ? saved.apiKey || "" : message.apiKey.trim() } });
    return settings();
  }
  async function status() {
    let timer;
    try {
      const response = await Promise.race([
        browser.runtime.sendNativeMessage(host, { type: "status" }),
        new Promise((_, reject) => (timer = setTimeout(() => reject(new Error("Helper status timed out.")), 10000)))
      ]);
      return { ...response, ready: response?.protocol === 1 && response.ready === true };
    } catch (_) { return { ready: false, error: "Native helper is unavailable. Open Installation instructions, then Check again." }; }
    finally { clearTimeout(timer); }
  }
  async function get(videoId) {
    return (await browser.storage.local.get(key(videoId)))[key(videoId)] || null;
  }
  function serialized(videoId, action) {
    const result = (locks.get(videoId) || Promise.resolve()).catch(() => {}).then(action);
    locks.set(videoId, result);
    return result;
  }
  async function launch(message) {
    const videoId = message.videoId;
    return serialized(videoId, async () => {
      if (active.has(videoId)) throw new Error("A timing task is already active for this video.");
      const saved = (await browser.storage.local.get("audioShakeSettings")).audioShakeSettings || {};
      if (!saved.apiKey) throw new Error("Enter your AudioShake API key.");
      if (!(await status()).ready) throw new Error("Install or update the native helper and dependencies, then choose Check again.");
      let job = await get(videoId);
      if (message.resume) {
        if (!job || job.status === "ready") throw new Error("No interrupted task to resume.");
      } else {
        if (job) throw new Error("Review or discard the existing timing task first.");
        const project = KaraokeCore.validate(message.project);
        if (project.videoId !== videoId) throw new Error("Video changed.");
        KaraokeTiming.duration(message.duration);
        if (project.blocks.length > 5000) throw new Error("At most 5000 lines can be aligned.");
        const useExisting = !!message.useExisting && project.blocks.some(row => row.text.trim());
        const transcript = useExisting ? project.blocks.map(row => row.text).join("\n") : null;
        if (transcript?.length > 300000) throw new Error("Transcript is too large.");
        job = { requestId: crypto.randomUUID(), videoId, duration: message.duration, useExisting,
          transcript, language: saved.language || "auto", fingerprint: KaraokeTiming.fingerprint(project), status: "starting", taskId: null };
      }
      job.status = "running"; job.stage = message.resume ? "resuming" : "download"; delete job.error;
      // Persist before connecting or submitting, including the original project fingerprint.
      await browser.storage.local.set({ [key(videoId)]: job });
      const port = browser.runtime.connectNative(host);
      const entry = { port, job, queue: Promise.resolve(), done: false };
      active.set(videoId, entry);
      const update = callback => {
        entry.queue = entry.queue.then(async () => {
          await callback();
          await browser.storage.local.set({ [key(videoId)]: job });
        }).catch(() => {
          entry.done = true; active.delete(videoId); port.disconnect();
        });
      };
      port.onMessage.addListener(response => {
        if (entry.done) return;
        update(async () => {
          if (response.taskId && ["task", "billing"].includes(response.type)) await KaraokeUsage.recordAudio(response.taskId, response.credits, response.createdAt).catch(() => {});
          if (response.taskId) job.taskId = response.taskId;
          if (response.type === "progress") {
            job.stage = response.stage;
            job.percent = response.percent ?? null;
          }
          if (response.type === "result") { job.result = response.result; job.status = "ready"; }
          if (response.type === "error") { job.error = response.error; job.status = "interrupted"; }
          if (response.type === "cancelled") job.status = "cancelled";
          if (["result", "error", "cancelled"].includes(response.type)) {
            entry.done = true;
          }
        });
        if (["result", "error", "cancelled"].includes(response.type)) {
          // Keep the active entry until the terminal state is durable, so Discard cannot race a final write.
          entry.done = true;
          entry.queue = entry.queue.then(() => { active.delete(videoId); port.disconnect(); });
        }
      });
      port.onDisconnect.addListener(() => {
        if (entry.done) return;
        entry.done = true;
        update(() => { job.status = "interrupted"; job.error = "Helper connection lost. Resume this task to avoid duplicate charges."; });
        entry.queue = entry.queue.then(() => active.delete(videoId));
      });
      port.postMessage({ type: "start", requestId: job.requestId, videoId, duration: job.duration,
        transcript: job.transcript, language: job.language, taskId: job.taskId, resume: !!message.resume, apiKey: saved.apiKey });
      return job;
    });
  }
  async function request(message) {
    if (message.type === "helper-status") return status();
    if (message.type === "audioshake-settings") return settings();
    if (message.type === "save-audioshake-settings") return saveSettings(message);
    if (!/^[\w-]{11}$/.test(message.videoId)) throw new Error("Invalid video ID.");
    if (message.type === "timing-start") return launch(message);
    return serialized(message.videoId, async () => {
      const entry = active.get(message.videoId);
      if (message.type === "timing-clear-audio") {
        if (entry) throw new Error("Wait for the timing task to stop before removing audio.");
        let timer;
        try {
          const response = await Promise.race([
            browser.runtime.sendNativeMessage(host, { type: "clear-audio-cache", videoId: message.videoId }),
            new Promise((_, reject) => (timer = setTimeout(() => reject(new Error("Audio cleanup timed out. Try again.")), 10000)))
          ]);
          if (response?.type !== "audio-cache-cleared" || typeof response.removed !== "boolean") {
            throw new Error(response?.error || "Update the Linux helper to remove cached audio.");
          }
          return { removed: response.removed };
        } finally { clearTimeout(timer); }
      }
      if (message.type === "timing-cancel") {
        if (entry) entry.port.postMessage({ type: "cancel" });
        else {
          const job = await get(message.videoId);
          if (job) { job.status = "cancelled"; await browser.storage.local.set({ [key(message.videoId)]: job }); }
        }
      }
      if (message.type === "timing-discard") {
        if (entry) throw new Error("Cancel and wait for the helper to stop before discarding.");
        await browser.storage.local.remove(key(message.videoId));
        return null;
      }
      await entry?.queue;
      const job = await get(message.videoId);
      if (job && !entry && job.status === "running") {
        job.status = "interrupted";
        job.error = "The previous connection stopped. Resume the existing task.";
      }
      return job;
    });
  }
  return { request };
})();
