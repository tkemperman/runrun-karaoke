"use strict";
const status = document.getElementById("status");
async function repositoryRequest(message) {
  const result = await browser.runtime.sendMessage(message);
  if (!result || result.error) throw new Error(result?.error || "Extension unavailable.");
  return result.data;
}
function showTokenStatus(saved) {
  document.getElementById("github-token").placeholder = saved.hasToken
    ? "Token saved — enter a new token to replace it" : "Enter your GitHub token";
}
function showRepositorySettings(saved) {
  showTokenStatus(saved);
  for (const side of ["retrieval", "publishing"]) {
    document.getElementById(`${side}-repo`).value = saved[side].repo;
    document.getElementById(`${side}-branch`).value = saved[side].branch;
  }
}
const form = document.getElementById("repository-form");
const controls = [...form.querySelectorAll("input, button")];
controls.forEach(control => { control.disabled = true; });
repositoryRequest({ type: "repository-settings" }).then(saved => {
  showRepositorySettings(saved);
  controls.forEach(control => { control.disabled = false; });
}).catch(error => { status.textContent = error.message; });

let saveQueue = Promise.resolve();
let revision = 0;
function saveRepositorySettings(clearToken = false) {
  const currentRevision = ++revision;
  const settings = {};
  for (const side of ["retrieval", "publishing"]) settings[side] = {
    repo: document.getElementById(`${side}-repo`).value,
    branch: document.getElementById(`${side}-branch`).value
  };
  const tokenField = document.getElementById("github-token");
  const token = clearToken ? "" : tokenField.value.trim() || undefined;
  tokenField.value = "";
  status.textContent = "";
  // Preserve edit order and never replace newer field values with a save response.
  saveQueue = saveQueue.catch(() => {}).then(() => repositoryRequest({ type: "save-repository-settings", settings, token }));
  saveQueue.then(saved => {
    if (currentRevision === revision) showTokenStatus(saved);
  }).catch(error => {
    if (currentRevision === revision) status.textContent = error.message;
  });
}
form.addEventListener("change", () => saveRepositorySettings());
form.addEventListener("submit", event => {
  event.preventDefault();
  saveRepositorySettings();
});
document.getElementById("clear-github-token").addEventListener("click", () => {
  document.getElementById("github-token").value = "";
  saveRepositorySettings(true);
});

// Only layout information crosses the extension frame boundary.
new ResizeObserver(() => {
  parent.postMessage({ type: "karaoke-repository-height", height: Math.ceil(document.body.getBoundingClientRect().height) }, "https://www.youtube.com");
}).observe(document.body);
