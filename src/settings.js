"use strict";
const shortcut = document.getElementById("shortcut");
const font = document.getElementById("font-size");
const position = document.getElementById("position");
const next = document.getElementById("show-next");
const status = document.getElementById("status");
async function load() {
  const commands = await browser.commands.getAll();
  shortcut.value = commands.find(command => command.name === "toggle-karaoke")?.shortcut || "";
  const { displaySettings: settings } = await browser.storage.local.get("displaySettings");
  if (settings) { font.value = settings.fontSize; position.value = settings.position; next.checked = settings.showNext; }
}
load().catch(error => { status.textContent = error.message; });
document.getElementById("shortcut-form").addEventListener("submit", async event => {
  event.preventDefault();
  try {
    await browser.commands.update({ name: "toggle-karaoke", shortcut: shortcut.value.trim() });
    await load(); status.textContent = "Shortcut saved. Try it on a YouTube video.";
  } catch (error) { status.textContent = `Could not save shortcut: ${error.message}`; }
});
document.getElementById("reset-shortcut").addEventListener("click", async () => {
  try { await browser.commands.reset("toggle-karaoke"); await load(); status.textContent = "Default shortcut restored."; }
  catch (error) { status.textContent = error.message; }
});
document.getElementById("display-form").addEventListener("submit", async event => {
  event.preventDefault();
  try {
    await browser.storage.local.set({ displaySettings: { fontSize: Number(font.value), position: Number(position.value), showNext: next.checked } });
    status.textContent = "Display settings saved.";
  } catch (error) { status.textContent = error.message; }
});

document.getElementById("open-editor").addEventListener("click", async () => {
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    await browser.tabs.sendMessage(tab.id, { type: "open-editor" });
    if (new URLSearchParams(location.search).get("tab") !== "1") window.close();
  } catch (_) { status.textContent = "Open these settings from the extension icon on a YouTube video. Reload the video page if needed."; }
});
