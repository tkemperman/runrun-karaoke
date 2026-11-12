/* Timing results are staged and validated before they can touch a project. */
(function (root) {
  "use strict";
  const normalize = text => text.normalize("NFKC").toLowerCase().replace(/[\p{P}\p{Z}\s]/gu, "");
  function duration(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 2700) throw new Error("Timing supports complete, finite videos up to 45 minutes. Livestreams are not supported.");
    return seconds;
  }
  const fingerprint = project => JSON.stringify([project.videoId, project.blocks, project.offset, project.source, project.originalLanguage]);
  function lines(payload, seconds) {
    duration(seconds);
    if (!Array.isArray(payload?.lines) || !payload.lines.length || payload.lines.length > 5000) throw new Error("AudioShake returned no usable lyric lines.");
    let previousStart = -1, previousEnd = -1;
    return payload.lines.map(line => {
      const words = line?.words;
      const text = line?.text;
      const start = line?.start ?? words?.[0]?.start;
      const end = line?.end ?? words?.at(-1)?.end;
      if (typeof text !== "string" || !text.trim() || text.length > 20000 || !Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start || end > seconds + 0.05 || start < previousStart || end < previousEnd) throw new Error("AudioShake returned invalid or out-of-order timing, or timing beyond this video.");
      previousStart = start; previousEnd = end;
      return { text, start, end: Math.min(end, seconds) };
    });
  }
  function align(blocks, timed) {
    if (blocks.length > 5000) throw new Error("At most 5000 lines can be aligned.");
    const a = blocks.map(row => normalize(row.text)), b = timed.map(row => normalize(row.text));
    const n = a.length, m = b.length;
    const forward = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
    const backward = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
    for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) forward[i + 1][j + 1] = a[i] && a[i] === b[j] ? forward[i][j] + 1 : Math.max(forward[i][j + 1], forward[i + 1][j]);
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) backward[i][j] = a[i] && a[i] === b[j] ? backward[i + 1][j + 1] + 1 : Math.max(backward[i + 1][j], backward[i][j + 1]);
    const total = forward[n][m], unmatched = [];
    const result = blocks.map((row, i) => {
      const candidates = [];
      let optional = false;
      for (let j = 0; j <= m; j++) {
        if (forward[i][j] + backward[i + 1][j] === total) optional = true;
        if (j < m && a[i] && a[i] === b[j] && forward[i][j] + 1 + backward[i + 1][j + 1] === total) candidates.push(j);
      }
      const match = !optional && candidates.length === 1 ? timed[candidates[0]] : null;
      if (!match) unmatched.push(i + 1);
      return { ...row, start: match?.start ?? null, end: match?.end ?? null };
    });
    return { blocks: result, unmatched };
  }
  function preview(project, payload, seconds, useExisting) {
    const C = root.KaraokeCore || require("./core.js"), timed = lines(payload, seconds);
    const result = useExisting ? align(project.blocks, timed) : { blocks: timed.map(row => C.block(row.text, row.start, row.end)), unmatched: [] };
    const candidate = C.validate({ ...project, offset: 0, blocks: result.blocks,
      ...(!useExisting ? { furiganaEnabled: false, source: { provider: "audioshake", url: "https://www.audioshake.ai/" }, originalLanguage: /^[a-z]{2}$/.test(payload.language) ? payload.language : project.originalLanguage } : {}) });
    return { project: candidate, unmatched: result.unmatched };
  }
  function apply(project, job, seconds) {
    if (fingerprint(project) !== job.fingerprint || Math.abs(duration(seconds) - job.duration) > 0.1) throw new Error("Project or video changed. Discard this timing result and generate again.");
    return preview(project, job.result, seconds, job.useExisting);
  }
  const api = { duration, fingerprint, lines, align, preview, apply };
  if (typeof module !== "undefined") module.exports = api;
  root.KaraokeTiming = api;
})(globalThis);
