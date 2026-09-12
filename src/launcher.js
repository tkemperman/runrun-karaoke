"use strict";
async function openSettings() {
  const status = document.getElementById("status");
  try {
    const tabs = await browser.tabs.query({ currentWindow: true });
    const videos = tabs.filter(tab => tab.url?.startsWith("https://www.youtube.com/watch?"));
    const tab = videos.find(tab => tab.active) || videos.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0))[0];
    if (!tab) { status.textContent = "Open a YouTube video, then open Settings using the gear beside Karaoke or this button."; return; }
    await browser.tabs.sendMessage(tab.id, { type: "open-editor" });
    await browser.tabs.update(tab.id, { active: true });
    status.textContent = "Settings are open beside your video.";
    window.close();
  } catch (_) { status.textContent = "Reload your YouTube video, then try opening Settings again."; }
}
document.getElementById("open-settings").addEventListener("click", openSettings);
openSettings();
