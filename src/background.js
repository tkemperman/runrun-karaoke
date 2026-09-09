"use strict";
browser.runtime.onMessage.addListener(async (message, sender) => {
  if (!sender.tab || !sender.url?.startsWith("https://www.youtube.com/")) return;
  try {
    let data;
    const key = `project:${message.videoId}`;
    switch (message.type) {
      case "load":
        if (!/^[\w-]{11}$/.test(message.videoId)) throw new Error("Invalid video ID.");
        data = (await browser.storage.local.get(key))[key] || null;
        break;
      case "save": {
        const project = KaraokeCore.validate(message.project);
        await browser.storage.local.set({ [`project:${project.videoId}`]: project });
        data = true;
        break;
      }
      case "search":
        if (typeof message.query !== "string" || !message.query.trim() || message.query.length > 500) throw new Error("Enter a shorter song or artist search.");
        data = await KaraokeProviders.get("lrclib").search(message.query);
        break;
      default: throw new Error("Unknown request.");
    }
    return { data };
  } catch (error) { return { error: error.message }; }
});
browser.commands.onCommand.addListener(async command => {
  if (command !== "toggle-karaoke") return;
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) browser.tabs.sendMessage(tab.id, { type: "toggle-enabled" }).catch(() => {});
});
