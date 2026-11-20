(() => {
  "use strict";
  if (document.getElementById("youtube-karaoke-host")) return;
  const C = KaraokeCore;
  const host = document.createElement("div");
  host.id = "youtube-karaoke-host";
  const root = host.attachShadow({ mode: "closed" });
  const style = document.createElement("style");
  style.textContent = `
    :host { all: initial; font: 14px/1.45 system-ui, sans-serif; color: #eef2ff; }
    * { box-sizing: border-box; } [hidden] { display: none !important; }
    button, input, textarea, select { font: inherit; }
    button, a.button-link { cursor: pointer; border: 1px solid #526078; border-radius: 7px; padding: 7px 11px; background: #28354b; color: #fff; }
    a.button-link { display: inline-flex; align-items: center; text-decoration: none; }
    details > button + button { margin-inline-start: 8px; }
    button:hover, a.button-link:hover { background: #3c4d69; } button:focus-visible, a.button-link:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible { outline: 2px solid #67e8f9; outline-offset: 2px; }
    .key-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .key-row input { flex: 1; width: 0; }
    .key-row button { flex: 0 0 auto; }
    button.danger { background: #b91c1c; border-color: #f87171; }
    button.danger:hover { background: #991b1b; }
    a.primary-button, button.primary-button { display: inline-flex; align-items: center; border: 1px solid #60a5fa; border-radius: 7px; padding: 7px 11px; background: #2563eb; color: #fff; text-decoration: none; }
    a.primary-button:hover, button.primary-button:hover { background: #1d4ed8; }
    a.primary-button:focus-visible, button.primary-button:focus-visible { outline: 2px solid #67e8f9; outline-offset: 2px; }
    button:disabled { cursor: wait; opacity: .65; }
    button[aria-busy=true]::before { content: ""; display: inline-block; width: 1em; height: 1em; margin-right: 8px; vertical-align: -.15em; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: translation-spin .75s linear infinite; }
    @keyframes translation-spin { to { transform: rotate(360deg); } }
    input, textarea, select { border: 1px solid #526078; border-radius: 5px; padding: 7px; background: #121c2b; color: #fff; min-width: 0; }
    textarea { width: 100%; min-height: 65px; resize: vertical; } input[type=number] { width: 90px; }
    label { display: flex; flex-direction: column; gap: 4px; margin: 8px 0; } a { color: #82e5f0; }
    label.checkbox-row { flex-direction: row; align-items: center; gap: 8px; cursor: pointer; }
    .sync-row { margin: 8px 0; }
    .start-at-field { position: relative; flex: 0 0 132px; }
    .start-at-field input { width: 100%; padding-right: 32px; }
    .start-at-reset { position: absolute; right: 4px; top: 50%; transform: translateY(-50%); width: 24px; height: 24px; padding: 0; border: 0; background: transparent; font-size: 20px; line-height: 1; }
    .start-at-reset:disabled { cursor: default; }
    .checkbox-row input[type=checkbox] { flex: 0 0 auto; width: 16px; height: 16px; margin: 0; padding: 0; accent-color: #67e8f9; cursor: pointer; }
    #panel { position: fixed; right: 16px; top: 70px; width: min(550px, calc(100vw - 32px)); max-height: calc(100vh - 140px); overflow: auto; z-index: 2147483647; background: #182235; border: 1px solid #526078; border-radius: 12px; padding: 12px 16px 16px; box-shadow: 0 12px 40px #0009; }
    #panel.privacy-open, #panel.about-open { display:flex; flex-direction:column; height:calc(100vh - 140px); overflow:hidden; }
    #panel.privacy-open > :not(header):not(#privacy-policy) { display:none !important; }
    #panel.about-open > :not(header):not(#about) { display:none !important; }
    #panel.privacy-open > header, #panel.about-open > header { flex-shrink:0; }
    #privacy-policy, #about { display:flex; flex-direction:column; min-height:0; overflow:hidden; }
    #privacy-toolbar, #about-toolbar { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-shrink:0; padding-bottom:12px; border-bottom:1px solid #39465c; }
    #privacy-toolbar h3, #about-toolbar h3 { margin:0; font-size:17px; }
    #privacy-toolbar button, #about-toolbar button { flex-shrink:0; }
    #privacy-text, #about-text { min-height:0; overflow:auto; overscroll-behavior:contain; padding-top:8px; }
    header, .row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; } header { justify-content: space-between; } h2 { margin: 0; font-size: 20px; } p { margin: 8px 0; } .muted { color: #b4c0d4; font-size: 12px; }
    .editor-toolbar { display: flex; align-items: center; gap: 12px; margin: 8px 0 12px; padding: 10px 12px; border: 1px solid #41516d; border-radius: 8px; }
    .editor-toolbar p { flex: 1; min-width: 0; margin: 0; }
    .editor-toolbar button { flex-shrink: 0; margin-inline-start: auto; }
    .lyrics-source-choice { margin: 12px 0; padding: 8px 12px; border: 1px solid #41516d; border-radius: 8px; }
    .lyrics-source-choice input[type=radio] { width: 16px; height: 16px; margin: 0; accent-color: #67e8f9; }
    .lyrics-source-choice .source-or { display: flex; align-items: center; gap: 12px; margin: 16px 0; }
    .lyrics-source-choice .source-or::before, .lyrics-source-choice .source-or::after { content: ""; flex: 1; border-top: 1px solid #41516d; }
    .catalog-panel, .lyrics-source-choice > .lyrics-search-panel { margin-left: 24px; }
    .catalog-panel button:disabled { cursor: default; }
    .lyrics-search-row { display: flex; align-items: center; gap: 8px; margin: 8px 0; }
    .lyrics-search-row input, .lyrics-search-row select { flex: 1; width: 0; min-width: 0; }
    .lyrics-search-row button { flex-shrink: 0; }
    details { border-top: 1px solid #39465c; padding: 12px 0; } summary { cursor: pointer; font-weight: 650; }
    #status { white-space: pre-wrap; color: #8de9dd; } #status.error { color: #ffb4b4; }
    #repository-status { white-space: pre-wrap; color: #8de9dd; } #repository-status.error { color: #ffb4b4; }
    .muted.warning { color: #fef08a; background: #422f12; border: 1px solid #eab308; border-radius: 7px; padding: 10px 12px; }
    #rows { display: grid; gap: 12px; } .block { padding: 10px; border: 1px solid #41516d; border-radius: 8px; } #panel.tutorial-active .block.selected { border-color: #67e8f9; } .block label { font-size: 12px; }
    #overlay { position: absolute; left: 5%; right: 5%; bottom: 13%; text-align: center; z-index: 60; pointer-events: none; font-family: system-ui, sans-serif; text-shadow: 0 2px 5px #000, 0 0 8px #000; }
    #caption { display: inline-block; max-width: 100%; background: #07111bd9; border-radius: 10px; padding: 10px 20px; }
    ruby { ruby-position: over; } rt { font-size: .5em; font-weight: 400; line-height: 1; }
    #original:has(ruby), #next:has(ruby) { line-height: 2; }
    #original { color: #fff; font-weight: 700; white-space: pre-wrap; overflow-wrap: anywhere; } #translated { color: #a5f3fc; font-size: .67em; white-space: pre-wrap; margin-top: 5px; } #next { color: #cbd5e1; font-size: .5em; margin-top: 5px; }
  `;
  root.append(style);
  function el(tag, text, parent, attrs = {}) {
    const node = document.createElement(tag);
    if (text !== null) node.textContent = text;
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    parent?.append(node);
    return node;
  }
  function button(text, parent, action) {
    const node = el("button", text, parent, { type: "button" });
    node.addEventListener("click", () => Promise.resolve().then(action).catch(fail));
    return node;
  }
  function input(label, parent, value = "", type = "text") {
    const wrap = el("label", label, parent);
    const node = el(type === "textarea" ? "textarea" : "input", null, wrap);
    if (type !== "textarea") node.type = type;
    node.value = value;
    return node;
  }
  function keyInput(label, parent, provider, remove) {
    const id = `${provider.toLowerCase()}-api-key`;
    el("label", label, parent, { for: id });
    const row = el("div", null, parent, { class: "key-row" });
    const field = el("input", null, row, { id, type: "password", autocomplete: "off" });
    const removeButton = button("Remove key", row, async () => {
      if (!window.confirm(`Remove the saved ${provider} API key?`)) return;
      removeButton.disabled = true;
      try { await remove(); field.value = ""; }
      finally { removeButton.disabled = false; }
    });
    removeButton.className = "danger";
    removeButton.setAttribute("aria-label", `Remove ${provider} key`);
    removeButton.hidden = true;
    return { field, removeButton };
  }
  function section(title) { const node = el("details", null, panel); el("summary", title, node); return node; }
  const panel = el("section", null, root, { id: "panel", "aria-label": "ルンルンKARAOKE editor" }); panel.hidden = true;
  const header = el("header", null, panel); el("h2", "ルンルンKARAOKE", header);
  button("Close", header, () => { tutorial.close(false); panel.hidden = true; });
  const headerActions = el("div", null, header, { class: "row", style: "flex-basis:100%;justify-content:flex-start" });
  const tutorialButton = button("Tutorial", headerActions, () => tutorial.open());
  tutorialButton.style.cssText = "display:inline-flex;align-items:center;gap:7px;background:#7542b5;border-color:#b58aef";
  const surpriseButton = button("Surprise Me", headerActions, async () => {
    surpriseButton.disabled = true;
    surpriseButton.textContent = "Choosing…";
    try {
      const result = await request({ type: "repository-random", videoId });
      if (!result.videoId) { surpriseButton.hidden = true; return; }
      await saveQueue;
      location.href = `https://www.youtube.com/watch?v=${result.videoId}`;
    } catch (_) {
      surpriseButton.hidden = true;
    } finally {
      surpriseButton.disabled = false;
      surpriseButton.textContent = "Surprise Me";
    }
  });
  surpriseButton.style.cssText = "background:#db2777;border-color:#f9a8d4";
  surpriseButton.hidden = true;
  let surpriseCheck = 0;
  async function refreshSurpriseButton() {
    const token = ++surpriseCheck, requestedId = videoId;
    surpriseButton.hidden = true;
    if (!requestedId || !/^[\w-]{11}$/.test(requestedId)) return;
    try {
      const result = await request({ type: "repository-random-available", videoId: requestedId });
      if (token === surpriseCheck && videoId === requestedId) surpriseButton.hidden = !result.available;
    } catch (_) { /* An unavailable or unconfigured repository keeps this optional button hidden. */ }
  }
  const privacyButton = button("Privacy Policy", headerActions, async () => {
    tutorial.close(false);
    setAboutOpen(false);
    setPrivacyOpen(privacyPanel.hidden);
    if (privacyPanel.hidden || privacyLoaded) return;
    privacyText.textContent = "Loading privacy policy…";
    try {
      const response = await fetch(browser.runtime.getURL("privacy.md"));
      if (!response.ok) throw new Error("Could not load the privacy policy. Close and reopen it to retry.");
      const markdown = await response.text();
      privacyText.textContent = "";
      for (const block of markdown.trim().split(/\n\s*\n/)) {
        const heading = block.match(/^(#{1,2}) (.+)$/);
        if (heading?.[1] === "#") {
          privacyHeading.textContent = heading[2];
          continue;
        }
        const node = el(heading ? (heading[1].length === 1 ? "h3" : "h4") : "p", null, privacyText);
        const text = heading ? heading[2] : block.replace(/^- /, "");
        for (const part of text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\(mailto:[^)]+\)|`[^`]+`)/g)) {
          if (part.startsWith("**")) el("strong", part.slice(2, -2), node);
          else if (part.startsWith("`")) el("code", part.slice(1, -1), node);
          else {
            const link = part.match(/^\[([^\]]+)\]\((mailto:[^)]+)\)$/);
            if (link) el("a", link[1], node, { href: link[2] });
            else node.append(document.createTextNode(part));
          }
        }
      }
      privacyLoaded = true;
    } catch (error) {
      privacyText.textContent = error.message || "Could not load the privacy policy. Close and reopen it to retry.";
    }
  });
  privacyButton.setAttribute("aria-controls", "privacy-policy");
  privacyButton.setAttribute("aria-expanded", "false");
  privacyButton.style.cssText = "background:#2563eb;border-color:#60a5fa";
  const aboutButton = button("About", headerActions, () => {
    tutorial.close(false);
    setPrivacyOpen(false);
    setAboutOpen(aboutPanel.hidden);
  });
  aboutButton.setAttribute("aria-controls", "about");
  aboutButton.setAttribute("aria-expanded", "false");
  const privacyPanel = el("section", null, panel, { id: "privacy-policy", "aria-label": "Privacy Policy" });
  privacyPanel.hidden = true;
  privacyPanel.style.cssText = "margin-top:12px;padding:12px;border:1px solid #526078;border-radius:8px;overflow-wrap:anywhere";
  const privacyToolbar = el("div", null, privacyPanel, { id: "privacy-toolbar" });
  const privacyHeading = el("h3", "Privacy Policy", privacyToolbar);
  const privacyClose = button("Close", privacyToolbar, () => { setPrivacyOpen(false); privacyButton.focus(); });
  privacyClose.setAttribute("aria-label", "Close Privacy Policy");
  const privacyText = el("div", null, privacyPanel, { id: "privacy-text", tabindex: "0", role: "region", "aria-label": "Privacy Policy text", "aria-live": "polite" });
  let privacyLoaded = false;
  function setPrivacyOpen(open) {
    privacyPanel.hidden = !open;
    panel.classList.toggle("privacy-open", open);
    privacyButton.setAttribute("aria-expanded", String(open));
    if (open) privacyClose.focus();
  }
  privacyPanel.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      event.stopPropagation();
      setPrivacyOpen(false);
      privacyButton.focus();
    }
  });
  const aboutPanel = el("section", null, panel, { id: "about", "aria-label": "About ルンルンKARAOKE" });
  aboutPanel.hidden = true;
  aboutPanel.style.cssText = "margin-top:12px;padding:12px;border:1px solid #526078;border-radius:8px;overflow-wrap:anywhere";
  const aboutToolbar = el("div", null, aboutPanel, { id: "about-toolbar" });
  el("h3", "About", aboutToolbar);
  const aboutClose = button("Close", aboutToolbar, () => { setAboutOpen(false); aboutButton.focus(); });
  aboutClose.setAttribute("aria-label", "Close About");
  const aboutText = el("div", null, aboutPanel, { id: "about-text", tabindex: "0", role: "region", "aria-label": "About information" });
  el("p", `Version ${browser.runtime.getManifest().version}`, aboutText, { class: "muted" });
  el("p", "Editable bilingual karaoke lyrics for YouTube.", aboutText);
  el("p", "© 2026 Thomas Kemperman", aboutText);
  el("a", "thomas@silverwoodslabs.com", el("p", null, aboutText), {
    href: "mailto:thomas@silverwoodslabs.com?subject=" + encodeURIComponent("ルンルンKARAOKE")
  });
  function setAboutOpen(open) {
    aboutPanel.hidden = !open;
    panel.classList.toggle("about-open", open);
    aboutButton.setAttribute("aria-expanded", String(open));
    if (open) aboutClose.focus();
  }
  aboutPanel.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      event.stopPropagation();
      setAboutOpen(false);
      aboutButton.focus();
    }
  });
  const title = el("p", "Open a YouTube video to begin.", panel, { class: "muted" });
  const status = el("p", "", panel, { id: "status", role: "status" });
  const untimedMessage = "These lyrics have no timing. Set the first line with Start at or Sync, then set each remaining line’s Start time in Line editor. Setting the first line does not automatically time the rest of the song.";
  const timingWarning = el("p", untimedMessage, panel, { class: "muted warning", role: "status" });
  timingWarning.hidden = true;
  function notify(text, error = false) { status.textContent = text; status.className = error ? "error" : ""; }
  function fail(error) { notify(error.message || String(error), true); }
  let project = null, videoId = null, selected = 0, generation = 0;
  let enabled = false, saveQueue = Promise.resolve(), results = [];
  async function request(message) {
    const result = await browser.runtime.sendMessage(message);
    if (!result || result.error) throw new Error(result?.error || "Extension unavailable. Reload this page after reloading the add-on.");
    return result.data;
  }
  let storageState = { revision: 0 }, localDeleted = false;
  function save(options = {}) {
    if (!project || storageState.deleting) return;
    updateFuriganaButton();
    updateTimingFields();
    updateTimingControls();
    let snapshot;
    project.videoTitle = currentVideoTitle() || project.videoTitle;
    try { snapshot = C.validate(project); } catch (error) { fail(error); return; }
    const currentGeneration = generation, state = storageState;
    localDeleted = false;
    saveQueue = saveQueue.catch(() => {}).then(async () => {
      const updated = await request({ type: "project-write", project: snapshot, revision: state.revision, manualLoad: options.manualLoad === true });
      Object.assign(state, updated);
    });
    saveQueue.then(() => { if (generation === currentGeneration) notify("Saved locally."); }, fail);
    return saveQueue;
  }
  function requireProject() { if (storageState.deleting) throw new Error("Wait for local deletion to finish."); if (!project) throw new Error("Wait for the video project to load."); }
  function video() { return document.querySelector("#movie_player video.html5-main-video"); }
  function playbackTime() {
    const media = video();
    if (!media || document.querySelector("#movie_player.ad-showing")) throw new Error("Wait for the main video (not an advertisement).");
    return Math.max(0, media.currentTime - project.offset);
  }
  const display = section("Display & timing"); display.open = true;
  const controls = el("div", null, display, { class: "row" });
  function setEnabled(value) { enabled = value; globalThis.KaraokeSetPressed?.(enabled); if (enabled && !project?.blocks.length) panel.hidden = false; return { enabled }; }
  function setEditorOpen(open) {
    panel.hidden = !open;
    if (open) { setEnabled(true); void refreshSurpriseButton(); }
    return { enabled };
  }
  el("label", "Start at", display, { for: "lyrics-start-at" });
  const syncRow = el("div", null, display, { class: "row sync-row" });
  const startAtField = el("div", null, syncRow, { class: "start-at-field" });
  const startAt = el("input", null, startAtField, { id: "lyrics-start-at", type: "text" });
  startAt.addEventListener("change", () => {
    try {
      requireProject();
      const match = startAt.value.trim().match(/^(-?)(\d+):([0-5]\d)(?:\.(\d{1,3}))?$/);
      if (!match) throw new Error("Use minutes:seconds for Start at, for example 0:33 or 1:05.5.");
      const seconds = (Number(match[2]) * 60 + Number(match[3]) + Number(`0.${match[4] || 0}`)) * (match[1] ? -1 : 1);
      applyStartAt(seconds);
    } catch (error) { updateTimingFields(); fail(error); }
  });
  function applyStartAt(seconds) {
    requireProject();
    const first = firstTimedLyric() || project.blocks.find(row => row.text.trim());
    if (!first) throw new Error("Load lyrics or add a lyric line first.");
    if (first.start !== null && seconds !== first.start + project.offset && !confirmShift()) { updateTimingFields(); return; }
    C.syncLine(project, first, seconds);
    renderRows();
    save();
  }
  function confirmShift() { return window.confirm('Shift the timing of the following lyrics as well?'); }
  const resetStartAt = button('×', startAtField, () => applyStartAt(0));
  resetStartAt.className = "start-at-reset";
  resetStartAt.setAttribute("aria-label", "Set Start at to 0:00");
  resetStartAt.title = "Set Start at to 0:00";
  function firstTimedLyric() {
    return project?.blocks.filter(row => row.start !== null && row.text.trim()).reduce((first, row) => !first || row.start < first.start ? row : first, null);
  }
  function updateTimingFields() {
    const untimed = project?.blocks.filter(row => row.text.trim() && row.start === null).length || 0;
    timingWarning.hidden = untimed === 0;
    timingWarning.textContent = firstTimedLyric()
      ? `${untimed} lyric line${untimed === 1 ? " still needs" : "s still need"} timing. Mark each remaining line in the Line editor as the vocals begin. Sync does not automatically time the rest of the song.`
      : untimedMessage;
    const first = firstTimedLyric();
    startAt.disabled = !project;
    resetStartAt.disabled = !project?.blocks.some(row => row.text.trim());
    if (!first) { startAt.value = ""; return; }
    startAt.value = formatTime(first.start + project.offset);
  }
  function formatTime(value) {
    const milliseconds = Math.round(value * 1000);
    const absolute = Math.abs(milliseconds);
    const seconds = String(Math.floor(absolute / 1000) % 60).padStart(2, "0");
    const fraction = String(absolute % 1000).padStart(3, "0").replace(/0+$/, "");
    return `${milliseconds < 0 ? "-" : ""}${Math.floor(absolute / 60000)}:${seconds}${fraction ? `.${fraction}` : ""}`;
  }
  function parseLineTime(value) {
    if (!value.trim()) return null;
    const match = value.trim().match(/^(-?)(\d+):([0-5]\d)(?:\.(\d{1,3}))?$/);
    if (!match) throw new Error("Use minutes:seconds, for example 3:32 or 3:32.250. Leave the field blank for no timing.");
    return (Number(match[2]) * 60 + Number(match[3]) + Number(`0.${match[4] || 0}`)) * (match[1] ? -1 : 1);
  }

  button("Sync with video position", syncRow, () => {
    requireProject();
    const row = project.blocks[selected];
    if (!row) throw new Error("Select a line in the Line editor first.");
    const media = video();
    if (!media || document.querySelector("#movie_player.ad-showing")) throw new Error("Wait for the main video (not an advertisement).");
    // Playback can advance while the confirmation dialog is open.
    const seconds = media.currentTime;
    if (row.start !== null && seconds !== row.start + project.offset && !confirmShift()) return;
    C.syncLine(project, row, seconds);
    renderRows();
    save();
  }).title = "Sync selected line to current video position";
  el("p", "Start at sets when the first lyric begins. Select a line in the Line editor and click Sync as it begins in the video. For a timed line, this shifts all lyrics together; for an untimed line, it sets that line’s start. Lyrics without timing still need each remaining line marked in the Line editor.", display, { class: "muted" });
  const fontSize = input("Original text size", display, "30", "range"); fontSize.min = "12"; fontSize.max = "80";
  const position = input("Original distance above bottom (%)", display, "13", "range"); position.min = "0"; position.max = "90";
  const translationSize = input("Translation text size", display, "23", "range"); translationSize.min = "12"; translationSize.max = "80";
  const translationPosition = input("Translation distance above bottom (%)", display, "8", "range"); translationPosition.min = "0"; translationPosition.max = "90";
  function checkbox(text, parent, checked = true) {
    const label = el('label', null, parent, { class: 'checkbox-row' });
    const box = el('input', null, label, { type: 'checkbox' }); box.checked = checked;
    el('span', text, label); return box;
  }
  const showOriginal = checkbox('Show original lyrics', display);
  const showTranslation = checkbox('Show translation', display);
  const showNext = checkbox('Show next line', display, false);
  const displayFields = { fontSize, position, translationFontSize: translationSize, translationPosition, showOriginal, showTranslation, showNext };
  function refreshDisplay() {
    const settings = project?.display || C.displayDefaults();
    for (const [key, field] of Object.entries(displayFields)) {
      if (field.type === 'checkbox') field.checked = settings[key]; else field.value = settings[key];
    }
  }
  for (const field of Object.values(displayFields)) field.addEventListener('change', () => {
    requireProject();
    project.display = Object.fromEntries(Object.entries(displayFields).map(([key, field]) => [key, field.type === 'checkbox' ? field.checked : Number(field.value)]));
    save();
  });
  const furiganaLabel = el("label", null, display, { class: "checkbox-row" });
  const showFurigana = el("input", null, furiganaLabel, { type: "checkbox" });
  el("span", "Show furigana", furiganaLabel);
  const furiganaStatus = el("p", "", display, { role: "status", class: "muted" });
  el("p", "Dictionary generation works without an API key and downloads the EDICT2 and ENAMDICT dictionaries on first use. Lyrics are processed locally. Dictionary readings may differ from sung readings; correct them in Line editor. JSON exports include readings and visibility.", display, { class: "muted" });
  el("a", "Dictionary credits and licence · EDRDG", display, { href: "https://www.edrdg.org/edrdg/licence.html", target: "_blank", rel: "noopener noreferrer" });
  showFurigana.addEventListener("change", () => {
    if (!project) { showFurigana.checked = false; return; }
    project.furiganaEnabled = showFurigana.checked; save();
  });
  const furiganaActions = el("div", null, display, { class: "row", style: "margin-top: 8px" });
  const hasFurigana = () => !!project?.blocks.some(row => row.furigana !== undefined);
  const generateFurigana = button("Generate furigana (dictionary)", furiganaActions, () => generateReadings(hasFurigana()));
  function updateFuriganaButton() {
    if (!generateFurigana.disabled) generateFurigana.textContent = hasFurigana() ? "Re-generate furigana (dictionary)" : "Generate furigana (dictionary)";
  }
  async function generateReadings(replaceExisting) {
    requireProject();
    if (generateFurigana.disabled) return;
    furiganaStatus.classList.remove("warning");
    const target = project, token = generation;
    const snapshot = JSON.stringify(target.blocks.map(row => [row.id, row.text, row.furigana]));
    const japanese = target.blocks.filter(row => /[\p{Script=Han}]/u.test(row.text));
    const pending = replaceExisting ? japanese : japanese.filter(row => row.furigana === undefined);
    const existing = japanese.filter(row => row.furigana !== undefined).length;
    if (!pending.length) {
      furiganaStatus.classList.toggle("warning", existing > 0);
      furiganaStatus.textContent = existing
        ? "Furigana already exists for all Japanese lines. Enable Show furigana to display it, edit readings in Line editor, or choose Re-generate furigana."
        : "No lyrics with kanji found to generate furigana for.";
      return;
    }
    if (replaceExisting && existing && !window.confirm("Regenerate all furigana? This replaces existing readings, including manual and song-wide term corrections. Lyrics, translations and timing are preserved.")) return;
    const activeButton = generateFurigana;
    generateFurigana.disabled = true;
    activeButton.setAttribute("aria-busy", "true");
    activeButton.textContent = replaceExisting ? "Regenerating furigana…" : "Generating furigana…";
    furiganaStatus.textContent = `${existing && !replaceExisting ? `Furigana already exists for ${existing} lines; these will be kept. ` : ""}Preparing dictionaries and ${replaceExisting ? "regenerating all" : "generating missing"} furigana… The first download can take a while.`;
    try {
      const results = [];
      for (let start = 0; start < pending.length; start += 200) {
        const batch = pending.slice(start, start + 200);
        const parts = await request({ type: "furigana", texts: batch.map(row => row.text) });
        if (project !== target || generation !== token) return;
        if (JSON.stringify(target.blocks.map(row => [row.id, row.text, row.furigana])) !== snapshot) throw new Error("Lyrics or furigana changed. Generate again to use your latest edits.");
        if (!Array.isArray(parts) || parts.length !== batch.length) throw new Error("Incomplete furigana response.");
        batch.forEach((row, index) => results.push([row, C.validateFurigana(row.text, parts[index])]));
      }
      for (const [row, parts] of results) row.furigana = parts;
      target.furiganaEnabled = true; showFurigana.checked = true;
      renderRows(); save();
      furiganaStatus.textContent = `${replaceExisting ? "Regenerated" : "Generated"} furigana for ${results.length} lines.${existing && !replaceExisting ? ` Existing furigana for ${existing} lines kept.` : ""} Review readings in Line editor.`;
    } catch (error) { if (project === target && generation === token) furiganaStatus.textContent = error.message; }
    finally {
      generateFurigana.disabled = false;
      activeButton.removeAttribute("aria-busy");
      updateFuriganaButton();
    }
  }
  const termCorrection = el("details", null, display);
  el("summary", "Correct a term throughout this song", termCorrection);
  const correctionTerm = input("Term", termCorrection);
  correctionTerm.placeholder = "宝鐘";
  const correctionReading = input("Reading (kana)", termCorrection);
  correctionReading.placeholder = "ほうしょう";
  el("p", "Applies to every exact occurrence in this song, including terms split into separate kanji. Existing readings for the term are replaced. If a match cuts through a longer annotated word, the remaining fragment becomes unannotated for review. Saved in your project and JSON export.", termCorrection, { class: "muted" });
  const correctionStatus = el("p", "", termCorrection, { role: "status", class: "muted" });
  const applyCorrection = button("Apply to all occurrences in this song", termCorrection, async () => {
    requireProject();
    if (applyCorrection.disabled) return;
    const term = correctionTerm.value.trim(), reading = correctionReading.value.trim();
    C.replaceFuriganaTerm(term, [[term, null]], term, reading);
    const target = project, token = generation;
    const matching = target.blocks.filter(row => row.text.includes(term));
    if (!matching.length) { correctionStatus.textContent = "This term does not occur in the current lyrics."; return; }
    const before = JSON.stringify(target.blocks.map(row => [row.id, row.text, row.furigana]));
    applyCorrection.disabled = true; applyCorrection.setAttribute("aria-busy", "true");
    correctionStatus.textContent = "Applying reading…";
    try {
      const missing = matching.filter(row => row.furigana === undefined);
      const generated = new Map();
      for (let start = 0; start < missing.length; start += 200) {
        const batch = missing.slice(start, start + 200);
        const parts = await request({ type: "furigana", texts: batch.map(row => row.text) });
        if (project !== target || generation !== token) return;
        if (!Array.isArray(parts) || parts.length !== batch.length) throw new Error("Incomplete furigana response.");
        batch.forEach((row, index) => generated.set(row.id, C.validateFurigana(row.text, parts[index])));
      }
      if (project !== target || generation !== token) return;
      if (JSON.stringify(target.blocks.map(row => [row.id, row.text, row.furigana])) !== before) throw new Error("Lyrics or furigana changed. Apply the correction again.");
      const updates = matching.map(row => [row, C.replaceFuriganaTerm(row.text, row.furigana || generated.get(row.id), term, reading)]);
      for (const [row, parts] of updates) row.furigana = parts;
      renderRows(); save();
      const count = matching.reduce((sum, row) => sum + row.text.split(term).length - 1, 0);
      correctionStatus.textContent = `Applied ${term} → ${reading} to ${count} occurrences across ${matching.length} lines.`;
    } catch (error) { if (project === target && generation === token) correctionStatus.textContent = error.message; }
    finally { applyCorrection.disabled = false; applyCorrection.removeAttribute("aria-busy"); }
  });
  const searchSection = section("Find lyrics");
  const sourceChoices = el('fieldset', null, searchSection, { class: 'lyrics-source-choice', 'aria-label': 'Lyrics source' });
  sourceChoices.hidden = true;
  const catalogChoiceLabel = el('label', null, sourceChoices, { class: 'checkbox-row' });
  const catalogChoice = el('input', null, catalogChoiceLabel, { type: 'radio', name: 'lyrics-source', value: 'catalog' });
  el('span', 'Use lyrics translation from catalog', catalogChoiceLabel);
  const catalogPanel = el('div', null, sourceChoices, { class: 'catalog-panel' }); catalogPanel.hidden = true;
  const matchingCatalog = el("div", null, catalogPanel);
  el('div', 'or', sourceChoices, { class: 'muted source-or' });
  const searchChoiceLabel = el('label', null, sourceChoices, { class: 'checkbox-row' });
  const searchChoice = el('input', null, searchChoiceLabel, { type: 'radio', name: 'lyrics-source', value: 'search' });
  el('span', 'Search for lyrics', searchChoiceLabel);
  const catalogCheckStatus = el('p', 'Checking catalog availability…', searchSection, { class: 'muted', role: 'status' });
  const lyricsSearchPanel = el('div', null, searchSection, { class: 'lyrics-search-panel' });
  let checkedCatalogGeneration = -1, availableCatalog = [], catalogKnown = false;
  let lyricsSource = 'catalog';
  let catalogLoad = null, catalogLanguageChoice = null, catalogLoading = false;
  function updateLyricsSource() {
    const hasCatalog = availableCatalog.length > 0;
    sourceChoices.hidden = !hasCatalog;
    catalogPanel.hidden = !hasCatalog;
    const searchParent = hasCatalog ? sourceChoices : searchSection;
    if (lyricsSearchPanel.parentElement !== searchParent) searchParent.append(lyricsSearchPanel);
    lyricsSearchPanel.hidden = hasCatalog && lyricsSource === 'catalog';
    catalogChoice.checked = hasCatalog && lyricsSource === 'catalog';
    searchChoice.checked = !catalogChoice.checked;
    if (catalogLoad) catalogLoad.disabled = !catalogChoice.checked || catalogLoading;
    if (catalogLanguageChoice) catalogLanguageChoice.disabled = !catalogChoice.checked || catalogLoading;
  }
  catalogChoice.addEventListener('change', () => { lyricsSource = 'catalog'; updateLyricsSource(); });
  searchChoice.addEventListener('change', () => { lyricsSource = 'search'; updateLyricsSource(); });
  async function findCatalogMatch() {
    const token = generation, requestedId = videoId;
    checkedCatalogGeneration = token;
    matchingCatalog.replaceChildren();
    catalogLoad = null; catalogLanguageChoice = null; catalogLoading = false;
    catalogCheckStatus.hidden = false;
    catalogCheckStatus.textContent = 'Checking catalog availability…';
    try {
      const entries = await request({ type: 'catalog-search', videoId: requestedId });
      if (generation !== token) return;
      availableCatalog = entries; catalogKnown = true;
      updatePublicationState();
      updateLyricsSource();
      catalogCheckStatus.hidden = true;
      renderCatalogChoices(entries, token, requestedId);
    } catch (error) {
      if (generation === token) {
        availableCatalog = []; catalogKnown = false;
        catalogCheckStatus.textContent = error.message; updateLyricsSource(); updatePublicationState();
      }
    }
  }
  function renderCatalogChoices(entries, token, requestedId) {
    matchingCatalog.replaceChildren();
    catalogLoad = null; catalogLanguageChoice = null;
    if (entries.length) {
      const languageName = code => { try { return new Intl.DisplayNames(['en'], { type: 'language' }).of(code); } catch (_) { return code; } };
      let languageChoice = null;
      if (entries.length > 1) {
        languageChoice = el('select', null, el('label', 'Translation', matchingCatalog));
        entries.forEach((entry, i) => el('option', languageName(entry.translationLanguage), languageChoice, { value: String(i) }));
        languageChoice.value = String(Math.max(0, entries.findIndex(entry => entry.translationLanguage === 'en')));
      }
      const load = button(entries.length === 1 ? `Use ${languageName(entries[0].translationLanguage)} translation` : 'Use selected translation', matchingCatalog, async () => {
        if (load.disabled || lyricsSource !== 'catalog') return;
        requireProject();
        const entry = entries[languageChoice ? Number(languageChoice.value) : 0];
        if (!entry || generation !== token) return;
        const snapshot = JSON.stringify(project);
        catalogLoading = true; updateLyricsSource();
        try {
          const imported = C.validate(await request({ type: 'catalog-load', videoId: requestedId, file: entry.file, source: entry.source, language: entry.translationLanguage }));
          if (generation !== token || lyricsSource !== 'catalog') return;
          if (JSON.stringify(project) !== snapshot) throw new Error('Project changed while downloading. Load again to review replacement.');
          if (await acceptProject(imported, true)) notify('Catalog lyrics, translation and timing loaded.');
        } finally { if (generation === token) { catalogLoading = false; updateLyricsSource(); } }
      });
      catalogLoad = load; catalogLanguageChoice = languageChoice; updateLyricsSource();
    }
  }

  function updatePublicationState() {
    const entry = catalogKnown && project && availableCatalog.find(e => e.videoId === videoId && e.translationLanguage === project.translationLanguage);
    const published = !!entry;
    deleteRemote.hidden = !published;
    updateTranslationLink(entry);
    if (catalogKnown && !repositorySection.hidden) repositorySection.open = !published;
  }
  function updateTranslationLink(entry) {
    openTranslation.hidden = !entry?.source?.repo || !entry.source.branch || !entry.file;
    openTranslation.removeAttribute('href');
    if (!openTranslation.hidden) {
      const repo = entry.source.repo.split('/').map(encodeURIComponent).join('/');
      const file = entry.file.split('/').map(encodeURIComponent).join('/');
      openTranslation.href = `https://github.com/${repo}/blob/${encodeURIComponent(entry.source.branch)}/${file}`;
    }
  }
  el('p', 'Search by song or artist. Choose a recording from the results.', lyricsSearchPanel, { class: 'muted' });
  el('label', 'Song or artist', lyricsSearchPanel, { for: 'lyrics-query' });
  const queryRow = el('div', null, lyricsSearchPanel, { class: 'lyrics-search-row' });
  const query = el('input', null, queryRow, { id: 'lyrics-query', type: 'text' });
  let queryDirty = false;
  let queryReady = false;
  let searchRequest = 0;
  query.addEventListener("input", () => {
    if (!videoId) return;
    lyricsSource = 'search'; updateLyricsSource();
    queryDirty = true;
    resetSearchResults();
    browser.storage.local.set({ [`lyricsSearch:${videoId}`]: { query: query.value } }).catch(fail);
  });
  function currentVideoTitle() {
    // YouTube updates its URL before the watch page metadata finishes loading.
    const watch = document.querySelector("ytd-watch-flexy");
    if (!videoId || watch?.getAttribute("video-id") !== videoId) return "";
    return watch.querySelector("ytd-watch-metadata h1")?.textContent?.trim() || "";
  }
  function updateVideoTitle() {
    const currentTitle = currentVideoTitle();
    if (currentTitle) {
      title.textContent = currentTitle;
      if (queryReady && !queryDirty) query.value = currentTitle;
    }
  }
  const searchButton = button("Search", queryRow, async () => {
    requireProject();
    if (searchButton.disabled) return;
    searchButton.disabled = true;
    resetSearchResults();
    const currentGeneration = generation, requestId = searchRequest;
    try {
    notify("Searching LRCLIB, then Genius if needed…");
    const found = await request({ type: "search", query: query.value });
    if (currentGeneration !== generation || requestId !== searchRequest) return;
    results = found.results; resultList.replaceChildren();
    results.forEach((row, index) => el("option", `${row.provider.toUpperCase()} · ${row.artist} — ${row.title} (${Math.round(row.duration || 0)}s; ${row.syncedLyrics ? "timed" : "untimed"})`, resultList, { value: String(index) }));
    resultRow.hidden = !results.length;
    noResults.hidden = !!results.length;
    updateSelectionWarning();
    notify([...(found.warnings || []), results.length ? "Choose a recording. Live timing may need correction." : "No results. Try another title or import a lyrics file."].join(" "));
    } catch (error) {
      if (currentGeneration === generation && requestId === searchRequest) throw error;
    } finally { searchButton.disabled = false; }
  });
  const resultRow = el('div', null, lyricsSearchPanel, { class: 'lyrics-search-row' });
  resultRow.hidden = true;
  const resultList = el("select", null, resultRow, { "aria-label": "Lyrics recordings" });
  const noResults = el('p', 'No results found.', lyricsSearchPanel, { class: 'muted', role: 'status' });
  noResults.hidden = true;
  const selectionWarning = el("p", untimedMessage, lyricsSearchPanel, { class: "muted warning", role: "status" });
  selectionWarning.hidden = true;
  function resetSearchResults() {
    searchRequest++;
    results = []; resultList.replaceChildren();
    resultRow.hidden = true; noResults.hidden = true; selectionWarning.hidden = true;
  }
  function updateSelectionWarning() {
    const source = results[Number(resultList.value)];
    selectionWarning.hidden = !source || !!source.syncedLyrics;
  }
  resultList.addEventListener("change", updateSelectionWarning);
  button("Use selected lyrics", resultRow, () => {
    requireProject(); const source = results[Number(resultList.value)]; if (!source) throw new Error("Search and select a recording first.");
    let blocks = source.syncedLyrics ? C.parseLrc(source.syncedLyrics) : [];
    if (!blocks.length) blocks = source.plainLyrics.split(/\r?\n/).filter(line => line.trim()).map(line => C.block(line));
    if (!blocks.length) throw new Error("This recording has no lyrics.");
    if (!replaceAllowed()) return;
    project.blocks = blocks; project.offset = 0; project.originalLanguage = "und"; project.title = source.title; project.artist = source.artist;
    project.source = { provider: source.provider, url: source.url };
    selected = 0; refresh(); save({ manualLoad: true });
  });
  const { field: geniusKey, removeButton: removeGeniusKey } = keyInput("Genius Client Access Token (fallback search)", lyricsSearchPanel, "Genius",
    () => request({ type: "save-genius-settings", apiKey: "" }).then(geniusKeyStatus));
  const geniusKeyStatus = saved => {
    geniusKey.placeholder = saved.hasApiKey ? "Genius key saved" : "Enter a Genius API access token";
    removeGeniusKey.hidden = !saved.hasApiKey;
  };
  request({ type: "genius-settings" }).then(geniusKeyStatus).catch(fail);
  geniusKey.addEventListener("change", async () => {
    const apiKey = geniusKey.value.trim(); geniusKey.value = "";
    if (apiKey) request({ type: "save-genius-settings", apiKey }).then(geniusKeyStatus).catch(fail);
  });
  const automatic = section("AI features");
  const usageBox = el("div", null, automatic, { style: "margin:10px 0;padding:10px;border:1px solid #41516d;border-radius:8px" });
  const usageRow = el("div", null, usageBox, { class: "row" });
  const usageTotal = el("strong", "This month: loading costs…", usageRow);
  const usageDetailsButton = button("Details", usageRow, () => {
    usageDetails.hidden = !usageDetails.hidden;
    usageDetailsButton.setAttribute("aria-expanded", String(!usageDetails.hidden));
    refreshUsage().catch(fail);
  });
  usageDetailsButton.setAttribute("aria-expanded", "false");
  const usageDetails = el("div", null, usageBox); usageDetails.hidden = true;
  const usageMonth = el("select", null, el("label", "Month", usageDetails));
  const usageTable = el("table", null, usageDetails, { style: "width:100%;text-align:left;font-size:12px;border-spacing:6px" });
  const usageNote = el("p", "", usageDetails, { class: "muted" });
  const audioCreditPrice = input("AudioShake price per API credit (USD)", usageDetails, "", "number");
  audioCreditPrice.min = "0"; audioCreditPrice.step = "0.001"; audioCreditPrice.placeholder = "Price paid ÷ credits purchased";
  audioCreditPrice.style.appearance = "textfield";
  el("p", "Used for new tasks and recorded credits without a price. Previously priced tasks keep their saved cost. Leave blank if unknown.", usageDetails, { class: "muted" });
  const usageActions = el("div", null, usageDetails, { class: "row" });
  button("Save credit price", usageActions, async () => {
    usageSummary = await request({ type: "save-usage-settings", settings: { audioCreditUSD: audioCreditPrice.value === "" ? null : Number(audioCreditPrice.value) } });
    renderUsage();
  });
  button("Refresh costs", usageActions, refreshUsage);
  const usageLinks = el("div", null, usageDetails, { class: "row", style: "margin-top:12px" });
  el("a", "OpenAI API rates ↗", usageLinks, { href: "https://developers.openai.com/api/docs/pricing", target: "_blank", rel: "noopener noreferrer" });
  el("span", "·", usageLinks);
  el("a", "AudioShake billing ↗", usageLinks, { href: "https://dashboard.audioshake.ai", target: "_blank", rel: "noopener noreferrer" });
  let usageSummary = null, usagePriceLoaded = false;
  const costText = month => `${month.unknown ? "At least " : "Estimated "}$${month.usd.toFixed(4)} USD${month.unknown ? ` + ${month.unknown} unpriced request${month.unknown === 1 ? "" : "s"}` : ""}`;
  function renderUsage() {
    if (!usageSummary) return;
    const current = usageSummary.months.find(month => month.month === usageSummary.currentMonth);
    usageTotal.textContent = `This month (${usageSummary.currentMonth}): Estimated $${current.usd.toFixed(2)} USD`;
    const previous = usageMonth.value;
    usageMonth.replaceChildren();
    usageSummary.months.forEach(month => el("option", month.month, usageMonth, { value: month.month }));
    usageMonth.value = usageSummary.months.some(month => month.month === previous) ? previous : usageSummary.currentMonth;
    usageTable.replaceChildren();
    const head = el("tr", null, el("thead", null, usageTable));
    ["Provider / model", "Calls", "Usage", "Estimated cost"].forEach(text => el("th", text, head));
    const body = el("tbody", null, usageTable);
    const selected = usageSummary.months.find(month => month.month === usageMonth.value);
    for (const model of selected.models) {
      const row = el("tr", null, body);
      el("td", model.model, row); el("td", String(model.calls), row);
      el("td", model.model.startsWith("AudioShake") ? `${model.credits} credits` : `${model.input.toLocaleString()} input (${model.cached.toLocaleString()} cached), ${model.output.toLocaleString()} output tokens`, row);
      el("td", costText(model), row);
    }
    if (!selected.models.length) el("td", "No recorded requests for this month.", el("tr", null, body), { colspan: "4" });
    usageNote.textContent = `Recorded use in this extension only; earlier unmeasured use, requests without a response and other applications are excluded. Amounts are estimates before tax, not your provider invoice. OpenAI uses each request’s model, service tier and input/cached/output tokens; rates checked ${usageSummary.ratesChecked}. Unknown prices remain unpriced. Months use your local time zone.`;
    if (!usagePriceLoaded) { audioCreditPrice.value = usageSummary.settings.audioCreditUSD ?? ""; usagePriceLoaded = true; }
  }
  async function refreshUsage() { usageSummary = await request({ type: "usage-summary" }); renderUsage(); }
  usageMonth.addEventListener("change", renderUsage);
  refreshUsage().catch(error => { usageTotal.textContent = error.message; });
  setInterval(() => { if (!panel.hidden) refreshUsage().catch(() => {}); }, 10000);

  const provider = el("select", null, el("label", "Provider", automatic));
  el("option", "OpenAI", provider, { value: "openai" });
  const { field: apiKey, removeButton: removeApiKey } = keyInput("OpenAI API key", automatic, "OpenAI", () => persistPreferences(""));
  const model = el("select", null, el("label", "Model", automatic));
  el("option", "GPT-6 Astra", model, { value: "gpt-6-astra" });
  el("option", "GPT-5.6 Sol", model, { value: "gpt-5.6-sol" });
  el("option", "GPT-5.6 Terra", model, { value: "gpt-5.6-terra" });
  el("option", "GPT-5.6 Luna", model, { value: "gpt-5.6-luna" });
  el("option", "GPT-5.5", model, { value: "gpt-5.5" });
  el("option", "GPT-5", model, { value: "gpt-5" });
  el("option", "GPT-4.1", model, { value: "gpt-4.1" });
  el("option", "GPT-4o", model, { value: "gpt-4o" });
  el("option", "GPT-4o mini", model, { value: "gpt-4o-mini" });
  const targetLanguage = input("Translation language code (e.g. en, nl, ja)", automatic, "en");
  const generateLabel = el("label", null, automatic, { class: "checkbox-row" });
  const includeFurigana = el("input", null, generateLabel, { type: "checkbox" });
  includeFurigana.checked = true;
  el("span", "Generate furigana", generateLabel);
  includeFurigana.addEventListener("change", () => persistPreferences().catch(fail));
  const convertRomaji = checkbox('Convert Japanese romaji to kanji/kana', automatic);
  convertRomaji.addEventListener('change', () => persistPreferences().catch(fail));
  let hasApiKey = false, preferredLanguage = "en";
  let preferenceQueue = Promise.resolve();
  function persistPreferences(key) {
    const message = { type: "save-translation-settings", includeFurigana: includeFurigana.checked, convertRomaji: convertRomaji.checked, model: model.value, language: targetLanguage.value.trim() };
    if (key !== undefined) message.apiKey = key;
    preferenceQueue = preferenceQueue.catch(() => {}).then(() => request(message));
    return preferenceQueue.then(saved => {
      hasApiKey = saved.hasApiKey;
      apiKey.placeholder = hasApiKey ? "API key saved — enter a new key to replace it" : "Enter your OpenAI API key";
      removeApiKey.hidden = !hasApiKey;
      preferredLanguage = message.language;
    });
  }
  const preferencesReady = request({ type: "translation-settings" }).then(saved => {
    includeFurigana.checked = saved.includeFurigana !== false;
    convertRomaji.checked = saved.convertRomaji !== false;
    model.value = saved.model; preferredLanguage = saved.language; hasApiKey = saved.hasApiKey;
    apiKey.placeholder = hasApiKey ? "API key saved — enter a new key to replace it" : "Enter your OpenAI API key";
    removeApiKey.hidden = !hasApiKey;

    targetLanguage.value = preferredLanguage;
  });
  preferencesReady.catch(fail);
  apiKey.addEventListener("change", () => {
    if (apiKey.value.trim()) persistPreferences(apiKey.value).then(() => { apiKey.value = ""; }).catch(fail);
  });
  model.addEventListener("change", () => { persistPreferences().catch(fail); });
  targetLanguage.addEventListener("change", () => {
    if (!project) return;
    if (!/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(targetLanguage.value.trim())) {
      targetLanguage.value = project.translationLanguage;
      fail(new Error("Enter a language code such as en, nl or pt-BR.")); return;
    }
    setLanguage(targetLanguage.value.trim());
  });
  el("p", "Translate all lines sends the lyrics to OpenAI once for translation and, when selected, contextual Japanese furigana. Lines already in the target language keep an empty translation. It does not listen to audio. Dictionary generation remains available under Display & timing. OpenAI API charges apply. Keys stay in extension storage and are excluded from exports.", automatic, { class: "muted" });
  const automaticStatus = el("p", "", automatic, { role: "status" });
  const translateButton = button("Translate all lines", automatic, async () => {
    if (translateButton.disabled) return;
    requireProject();
    const requestedProject = project, requestedGeneration = generation;
    translateButton.disabled = true;
    translateButton.setAttribute("aria-busy", "true");
    translateButton.textContent = "Translating…";
    automaticStatus.textContent = "Translating all lines…";
    try {
      await preferencesReady;
      await persistPreferences(apiKey.value.trim() || undefined);
      apiKey.value = "";
      if (project !== requestedProject || generation !== requestedGeneration) return;
      if (!hasApiKey) throw new Error("Enter your OpenAI API key.");
      if (!project.blocks.some(row => row.text.trim())) throw new Error("Add original lyrics in Line editor first.");
      const originalProject = project, currentGeneration = generation, language = project.translationLanguage;
      const withReadings = includeFurigana.checked;
      const snapshot = () => JSON.stringify(project.blocks.map(row => [row.id, row.text, row.translations[language] || "", withReadings ? row.furigana : null]));
      const before = snapshot();
      const response = await request({ type: "translate", model: model.value, language, includeFurigana: withReadings, convertRomaji: convertRomaji.checked,
        lines: project.blocks.map(row => ({ id: row.id, text: row.text })) });
      if (generation !== currentGeneration || project !== originalProject) return;
      if (project.translationLanguage !== language || snapshot() !== before) throw new Error("Lyrics or translations changed during the request. Result discarded; translate again to use your latest edits.");
      if (project.blocks.some(row => row.translations[language]?.trim() || (withReadings && row.furigana)) && !window.confirm(withReadings ? "Replace existing translations and furigana, including manual reading corrections?" : "Replace existing translations? Existing furigana will be kept.")) {
        automaticStatus.textContent = "Translation discarded. Existing translations kept."; return;
      }
      const translations = response.lines;
      if (!Array.isArray(translations) || !/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(response.originalLanguage)) throw new Error('Invalid AI response.');
      const converted = translations.some(row => project.blocks.find(b => b.id === row.id)?.text !== row.text);
      if (converted && !window.confirm('Apply Japanese romaji conversion to the original lyrics as well? Timing will be kept.')) { automaticStatus.textContent = 'Translation discarded.'; return; }
      const byId = new Map(translations.map(row => [row.id, row]));
      if (translations.length !== project.blocks.length || byId.size !== project.blocks.length) throw new Error("Incomplete AI result.");
      for (const row of project.blocks) {
        const result = byId.get(row.id);
        if (!result || typeof result.translation !== "string" || typeof result.text !== "string") throw new Error("Invalid AI result.");
        if (withReadings) C.validateFurigana(result.text, result.furigana);
      }
      for (const row of project.blocks) {
        if (row.text !== byId.get(row.id).text) delete row.furigana;
        row.text = byId.get(row.id).text;
        row.translations = { [language]: byId.get(row.id).translation };
        if (withReadings) row.furigana = byId.get(row.id).furigana;
      }
      project.originalLanguage = response.originalLanguage;
      if (withReadings) { project.furiganaEnabled = true; showFurigana.checked = true; }
      renderRows(); editor.open = true; save();
      automaticStatus.textContent = `Translated ${translations.length} lines. Review them in Line editor.`;
    } catch (error) {
      if (generation === requestedGeneration) automaticStatus.textContent = error.message;
    } finally {
      translateButton.disabled = false;
      translateButton.removeAttribute("aria-busy");
      translateButton.textContent = "Translate all lines";
    }
  });
  el("h3", "AudioShake timing", automatic);
  const { field: audioKey, removeButton: removeAudioKey } = keyInput("AudioShake API key", automatic, "AudioShake", () => saveAudioPreferences(true));
  const audioLanguage = el("select", null, el("label", "Audio language", automatic));
  for (const [code, label] of [["auto", "Auto"], ["en", "English"], ["ja", "Japanese"], ["nl", "Dutch"], ["de", "German"], ["fr", "French"], ["es", "Spanish"], ["pt", "Portuguese"], ["it", "Italian"], ["ko", "Korean"], ["zh", "Chinese"]]) el("option", label, audioLanguage, { value: code });
  let audioPreferences = Promise.resolve();
  const showAudioSettings = saved => {
    audioKey.placeholder = saved.hasApiKey ? "AudioShake key saved" : "Enter your AudioShake API key";
    removeAudioKey.hidden = !saved.hasApiKey;
  };
  const audioReady = request({ type: "audioshake-settings" }).then(saved => { audioLanguage.value = saved.language; showAudioSettings(saved); });
  audioReady.catch(fail);
  function saveAudioPreferences(clear = false) {
    const apiKey = clear ? "" : audioKey.value.trim() || undefined;
    audioKey.value = "";
    const language = audioLanguage.value;
    audioPreferences = audioPreferences.catch(() => {}).then(() => request({ type: "save-audioshake-settings", language, apiKey })).then(showAudioSettings);
    return audioPreferences;
  }
  audioKey.addEventListener("change", () => saveAudioPreferences().catch(fail));
  audioLanguage.addEventListener("change", () => saveAudioPreferences().catch(fail));
  el("p", "Generate timed lyrics uses this complete video’s audio, reusing a temporary download when available, and uploads it to AudioShake along with any existing lyrics. Existing lyrics are automatically aligned to the recording, preserving text, translations and furigana. Without existing lyrics, AudioShake recognizes the lyrics. AudioShake charges apply. Up to 45 minutes; no livestreams. When timing finishes, review the preview before Apply. Cancel stops local work; a submitted server task may continue.", automatic, { class: "muted" });
  let helperReady = false, helperAvailable = false, timingJob = null, timingBusy = false, timingPollBusy = false, clearingAudio = false;
  let audioCacheExists = false, audioCacheCheck = 0;
  const timingStatus = el("p", "", automatic, { role: "status" });
  const timingPreview = el("div", null, automatic, { style: "max-height:240px;overflow:auto" });
  let shownTimingResult = null;
  const timingActions = el("div", null, automatic, { class: "row" });
  const timingStart = button("Generate timed lyrics", timingActions, startTiming);
  async function startTiming() {
    requireProject();
    if (document.querySelector("#movie_player.ad-showing")) throw new Error("Wait for the main video, not an advertisement.");
    const media = video(), seconds = KaraokeTiming.duration(media?.duration);
    if (document.getElementById("movie_player")?.getAttribute("data-is-live") === "true") throw new Error("Livestreams are not supported.");
    const target = project, token = generation, fingerprint = KaraokeTiming.fingerprint(project);
    timingBusy = true; updateTimingControls();
    try {
      await audioReady; await saveAudioPreferences();
      if (target !== project || token !== generation || fingerprint !== KaraokeTiming.fingerprint(project)) throw new Error("Project changed. Start timing again.");
      const job = await request({ type: "timing-start", videoId, project, duration: seconds, useExisting: project.blocks.some(row => row.text.trim()) });
      if (token === generation) { timingJob = job; showTimingJob(); }
    } finally { timingBusy = false; updateTimingControls(); }
  }
  const timingResume = button("Resume existing task", timingActions, async () => {
    requireProject();
    const requestedId = videoId;
    timingBusy = true; updateTimingControls();
    try {
      await audioReady; await saveAudioPreferences();
      const job = await request({ type: "timing-start", videoId: requestedId, resume: true });
      if (videoId === requestedId) { timingJob = job; showTimingJob(); }
    } finally { timingBusy = false; updateTimingControls(); }
  });
  const timingCancel = button("Cancel", timingActions, async () => {
    const requestedId = videoId;
    const job = await request({ type: "timing-cancel", videoId: requestedId });
    if (videoId !== requestedId) return;
    timingJob = job; timingStatus.textContent = "Stopping local work… A submitted server task may continue.";
  });
  const timingApply = button("Apply", timingActions, async () => {
    requireProject();
    const result = KaraokeTiming.apply(project, timingJob, video()?.duration);
    if (!timingJob.useExisting && project.blocks.length && !replaceAllowed()) return;
    project = result.project;
    refresh(); save();
    timingJob = await request({ type: "timing-discard", videoId });
    showTimingJob();
    notify(result.unmatched.length ? `Applied timing. Unmatched lines left untimed: ${result.unmatched.join(", ")}.` : "Applied line timing from the video beginning. Global offset reset to zero.");
  });
  const timingDiscard = button("Discard", timingActions, async () => {
    if (timingJob?.status !== "ready" && !window.confirm("Discard this task locally? A submitted AudioShake task may continue and be charged. You will no longer be able to resume it here.")) return;
    timingJob = await request({ type: "timing-discard", videoId }); showTimingJob();
  });
  const clearAudio = button("Clear audio file", timingActions, async () => {
    if (clearAudio.disabled) return;
    const token = generation, requestedId = videoId;
    audioCacheCheck++;
    clearingAudio = true; updateTimingControls();
    audioCacheStatus.textContent = "Removing audio file…";
    try {
      const result = await request({ type: "timing-clear-audio", videoId: requestedId });
      if (token !== generation) return;
      audioCacheExists = false;
      audioCacheStatus.textContent = result.removed ? "Audio file removed. The next timing request will download it again." : "No downloaded audio file is stored for this video.";
    } catch (error) {
      if (token === generation) audioCacheStatus.textContent = error.message;
    } finally { clearingAudio = false; updateTimingControls(); void refreshAudioCache(); }
  });
  const audioCacheStatus = el("p", "", automatic, { class: "muted", role: "status" });
  let audioCacheVideoId = null;
  async function refreshAudioCache() {
    if (!helperAvailable || !videoId || clearingAudio) return;
    const token = generation, check = ++audioCacheCheck, requestedId = videoId;
    try {
      const state = await request({ type: 'timing-audio-status', videoId: requestedId });
      if (token !== generation || check !== audioCacheCheck) return;
      audioCacheExists = state.exists;
    } catch (error) {
      if (token !== generation || check !== audioCacheCheck) return;
      audioCacheExists = false; audioCacheStatus.textContent = error.message;
    }
    updateTimingControls();
  }
  function updateTimingControls() {
    timingStart.disabled = !helperReady || timingBusy || clearingAudio || !!timingJob;
    timingResume.hidden = !timingJob || !["interrupted", "cancelled"].includes(timingJob.status);
    timingResume.disabled = !helperReady || timingBusy || clearingAudio;
    timingCancel.hidden = !timingJob || timingJob.status !== "running";
    timingApply.hidden = !timingJob || timingJob.status !== "ready";
    timingDiscard.hidden = !timingJob || timingJob.status === "running";
    clearAudio.disabled = !audioCacheExists || !helperAvailable || !videoId || timingBusy || clearingAudio || timingJob?.status === "running";
  }
  function showTimingJob() {
    if (audioCacheVideoId !== videoId) { audioCacheVideoId = videoId; audioCacheExists = false; audioCacheCheck++; audioCacheStatus.textContent = ""; }
    updateTimingControls();
    if (!timingJob) { timingStatus.textContent = ""; timingPreview.replaceChildren(); shownTimingResult = null; return; }
    const previewKey = timingJob.status === "ready" ? `${timingJob.requestId}:${KaraokeTiming.fingerprint(project)}` : null;
    if (previewKey && shownTimingResult === previewKey) return;
    const task = timingJob.taskId ? ` Task: ${timingJob.taskId}.` : "";
    timingStatus.textContent = timingJob.error || `${timingJob.status}: ${timingJob.stage || ""}${timingJob.percent == null ? "" : ` ${timingJob.percent}%`}.${task}`;
    if (timingJob.status === "cancelled") timingStatus.textContent = `Local work cancelled. A submitted task may still run.${task}`;
    if (timingJob.status === "ready" && shownTimingResult !== previewKey) {
      timingPreview.replaceChildren();
      timingApply.disabled = true;
      try {
        const preview = KaraokeTiming.apply(project, timingJob, video()?.duration);
        timingStatus.textContent = `Ready to review: ${preview.project.blocks.length} lines.${task} ${preview.unmatched.length ? `Unmatched lines left untimed: ${preview.unmatched.join(", ")}.` : "All lines matched."}`;
        for (const row of preview.project.blocks) el("p", `${row.start === null ? "Untimed" : `${row.start.toFixed(2)}–${row.end.toFixed(2)}s`} · ${row.text}`, timingPreview, { class: "muted" });
        timingApply.disabled = false;
      } catch (error) { timingStatus.textContent = error.message; }
      shownTimingResult = previewKey;
    }
  }
  async function pollTiming() {
    if (!videoId || !project || timingPollBusy || timingBusy || panel.hidden) return;
    timingPollBusy = true;
    const token = generation;
    try {
      const job = await request({ type: "timing-status", videoId });
      if (token === generation) { timingJob = job; showTimingJob(); }
      await refreshAudioCache();
    } catch (error) { if (token === generation) timingStatus.textContent = error.message; }
    finally { timingPollBusy = false; }
  }
  setInterval(pollTiming, 1500);
  const helperSection = section("Linux audio helper");
  const helperStatus = el("p", "Checking helper…", helperSection, { role: "status" });
  button("Check again", helperSection, checkHelper);
  const installation = el("details", null, helperSection);
  el("summary", "Installation instructions", installation);
  el("p", "Download and extract the helper archive, then run the installer from its directory. It reads /etc/os-release, checks your package manager and verifies packages before suggesting a command. System commands must be run by you in a terminal. The helper installs only under your user account.", installation, { class: "muted" });
  el("a", "Download Linux helper", installation, { href: browser.runtime.getURL("native-helper.zip"), download: "runrun-karaoke-helper.zip" });
  const distroChoice = el("select", null, el("label", "Distribution (optional before helper installation)", installation));
  for (const [value, label] of [["", "Detect automatically"], ["arch", "Arch / EndeavourOS"], ["debian", "Debian / Ubuntu"], ["fedora", "Fedora"], ["opensuse", "openSUSE"], ["unknown", "Other / manual"]]) el("option", label, distroChoice, { value });
  const installCommand = input("Installer command (after extracting the archive)", installation, "sh install.sh"); installCommand.readOnly = true;
  distroChoice.addEventListener("change", () => { installCommand.value = `sh install.sh${distroChoice.value ? ` --distro ${distroChoice.value}` : ""}`; });
  button("Copy command", installation, () => navigator.clipboard.writeText(installCommand.value));
  el("p", "The installer prefers official repositories and never invokes sudo or an AUR helper. If a package cannot be verified, follow your distribution’s documentation for Python 3.10+, FFmpeg, yt-dlp and Deno. Update: extract the latest helper and run sh install.sh again. Remove: sh install.sh --uninstall. Uninstalling the extension does not remove the helper.", installation, { class: "muted" });
  async function checkHelper() {
    helperStatus.textContent = "Checking helper and dependencies…";
    const state = await request({ type: "helper-status" });
    helperReady = state.ready;
    helperAvailable = state.protocol === 1;
    void refreshAudioCache();
    helperStatus.textContent = state.error || `${state.distro?.PRETTY_NAME || "Linux"} · Protocol ${state.protocol}${state.protocol !== 1 ? " (update required)" : ""}\n` + Object.entries(state.dependencies || {}).map(([name, info]) => `${name}: ${info.available ? info.version : "missing"}`).join("\n");
    helperStatus.style.whiteSpace = "pre-wrap";
    installation.open = !helperReady;
    if (!helperReady) helperSection.open = true;
    updateTimingControls();
  }
  checkHelper().catch(fail);
  const repositorySection = section("Lyrics repositories · GitHub");
  // Developer mode only changes visibility; saved repository settings stay intact.
  repositorySection.hidden = true;
  try {
    repositorySection.hidden = localStorage.getItem("runrunKaraoke.developerMode") !== "true";
  } catch (_) { /* Keep developer controls hidden when localStorage is unavailable. */ }
  el("p", "One repository is used for the translations catalog, Surprise Me and publication. Publishing saves the current translation to its language file, with lyrics, timing, furigana and display settings. Other language files remain on GitHub. A GitHub token with write access is required.", repositorySection, { class: "muted" });
  // Keep the saved token inside an extension-origin frame, outside YouTube's DOM.
  const repositoryFrame = el("div", null, repositorySection, { style: "position:relative" });
  const repositoryPreferences = el("iframe", null, repositoryFrame, {
    src: browser.runtime.getURL("src/settings.html"), title: "GitHub repository settings",
    style: "width:100%;height:640px;border:0;display:block;color-scheme:dark"
  });
  window.addEventListener("message", event => {
    if (event.source !== repositoryPreferences.contentWindow || event.origin !== browser.runtime.getURL("").replace(/\/$/, "")) return;
    if (event.data?.type === "karaoke-repository-height" && Number.isFinite(event.data.height)) {
      repositoryPreferences.style.height = `${Math.max(100, Math.min(2000, event.data.height))}px`;

    }
  });
  const repositoryActions = el("div", null, repositorySection, { class: "row" });
  const repositoryStatus = el("p", "", repositorySection, { id: "repository-status", role: "status", "aria-live": "polite" });
  function repositoryNotify(message, error = false) {
    repositoryStatus.textContent = message;
    repositoryStatus.classList.toggle("error", error);
  }
  function repositoryButton(label, action) {
    return button(label, repositoryActions, async () => {
      repositoryNotify("");
      try { await action(); }
      catch (error) { repositoryNotify(error.message || String(error), true); }
    });
  }
  const publicationReview = el("div", null, repositorySection, { role: "region", "aria-label": "Confirm GitHub publication", style: "padding:12px;border:1px solid #b58aef;border-radius:8px;margin-top:12px" });
  publicationReview.hidden = true;
  const publishButton = repositoryButton("Publish to GitHub", async () => {
    publicationReview.hidden = true;
    requireProject();
    if (!project.blocks.some(b => b.text.trim())) throw new Error("Load lyrics before publishing.");
    const snapshot = C.validate(project), currentGeneration = generation, videoTitle = currentVideoTitle();
    if (!videoTitle) throw new Error("Wait for the YouTube video title before publishing.");
    publishButton.disabled = true; publishButton.textContent = "Checking destination…";
    try {
      const preferences = await request({ type: "repository-settings" });
      if (!preferences.repository?.repo) throw new Error('GitHub repository is missing.');
      if (!preferences.hasToken) throw new Error('GitHub token is missing.');
      const destination = await request({ type: "repository-inspect", project: snapshot, videoTitle });
      if (generation !== currentGeneration || currentVideoTitle() !== videoTitle || JSON.stringify(project) !== JSON.stringify(snapshot)) throw new Error("Project changed. Start publishing again.");
      publicationReview.replaceChildren();
      el("h3", destination.sha ? "Replace the existing GitHub file?" : "Publish this project on GitHub?", publicationReview);
      el("p", `${destination.target.repo} · ${destination.target.branch}`, publicationReview);
      el("p", destination.file, publicationReview, { style: "overflow-wrap:anywhere" });
      el("p", "This publishes the current translation with its lyrics, timing, furigana and display settings in one commit. Other remote languages are kept.", publicationReview);
      const actions = el("div", null, publicationReview, { class: "row" });
      const confirm = button("Confirm publication", actions, async () => {
        confirm.disabled = true; cancel.disabled = true; publishButton.disabled = true;
        try {
          if (generation !== currentGeneration || currentVideoTitle() !== videoTitle || JSON.stringify(project) !== JSON.stringify(snapshot)) throw new Error("Project changed. Start publishing again.");
          repositoryNotify("Publishing…");
          await request({ type: "repository-publish", project: snapshot, videoTitle, sha: destination.sha, target: destination.target });
          publicationReview.hidden = true;
          if (generation === currentGeneration) {
            repositorySection.open = false; catalogKnown = false; updatePublicationState();
            updateTranslationLink({ source: destination.target, file: destination.file });
          }
          if (generation === currentGeneration) repositoryNotify(`Published to ${destination.target.repo}. The catalog updates after the repository Action finishes.`);
        } catch (error) {
          publicationReview.hidden = true;
          repositoryNotify(error.message || String(error), true);
        } finally { confirm.disabled = false; cancel.disabled = false; publishButton.disabled = false; }
      });
      const cancel = button("Cancel", actions, () => {
        publicationReview.hidden = true;
        repositoryNotify("Publication cancelled. Nothing was uploaded.");
      });
      publicationReview.hidden = false;
      repositoryNotify("Review the destination below and choose Confirm publication.");
      publicationReview.scrollIntoView({ block: "nearest" });
      confirm.focus({ preventScroll: true });
    } finally { publishButton.disabled = false; publishButton.textContent = "Publish to GitHub"; }
  });
  publishButton.className = 'primary-button';
  const openTranslation = el('a', 'Open in GitHub', repositoryActions, { class: 'button-link', target: '_blank', rel: 'noopener noreferrer' });
  openTranslation.hidden = true;
  const deleteRemote = repositoryButton('Delete from GitHub', async () => {
    requireProject();
    publicationReview.hidden = true;
    const token = generation, requestedId = videoId, language = project.translationLanguage;
    deleteRemote.disabled = true;
    try {
      const settings = await request({ type: 'repository-settings' });
      if (!settings.repository?.repo) throw new Error('GitHub repository is missing.');
      if (!settings.hasToken) throw new Error('GitHub token is missing.');
      const target = settings.repository;
      const entries = await request({ type: 'catalog-search', videoId: requestedId });
      if (token !== generation || project?.translationLanguage !== language) throw new Error('Video or translation language changed. Start deletion again.');
      const entry = entries.find(row => row.videoId === requestedId && row.translationLanguage === language);
      if (!entry) throw new Error(`No ${language} translation was found on GitHub for this video.`);
      const review = await request({ type: 'repository-delete-inspect', target, file: entry.file, videoId: requestedId });
      if (token !== generation || project?.translationLanguage !== language) throw new Error('Video or translation language changed. Start deletion again.');
      if (review.languages.length !== 1 || review.languages[0] !== language) throw new Error('This GitHub file contains multiple or different translation languages and cannot be deleted as this single translation.');
      if (!window.confirm(`Delete the ${language} translation from GitHub?\n\n${target.repo} · ${target.branch}\n${review.file}\n\nYour local lyrics and translations will be kept.`)) {
        return;
      }
      if (token !== generation || project?.translationLanguage !== language) throw new Error('Video or translation language changed. Start deletion again.');
      await request({ type: 'repository-delete', target, file: review.file, sha: review.sha, videoId: requestedId });
      if (token === generation) {
        availableCatalog = entries.filter(row => row.file !== review.file); catalogKnown = true;
        renderCatalogChoices(availableCatalog, token, requestedId);
        updatePublicationState(); updateLyricsSource();
        repositoryNotify('Translation deleted from GitHub. Local lyrics and translations kept. The catalog updates after the repository Action finishes.');
      }
    } finally { deleteRemote.disabled = false; }
  });
  deleteRemote.className = 'danger';
  deleteRemote.hidden = true;
  const manual = section("Import / export");
  const clearLines = button('Clear all lines', null, async () => {
    requireProject();
    if (!project.blocks.length) return;
    if (!window.confirm('Clear all lyric lines, including all translations, timing and furigana?')) return;
    generation++;
    const target = project, token = generation, state = storageState;
    state.deleting = true; panel.inert = true;
    clearLines.disabled = true;
    try {
      await saveQueue;
      if (generation !== token || project !== target) return;
      const cleared = await request({ type: 'project-clear-lines', videoId, revision: state.revision });
      Object.assign(state, cleared);
      if (generation !== token) return;
      project = C.validate(cleared.project); localDeleted = true; selected = 0; refresh(); notify('All lines cleared. Add a line, load lyrics or generate timed lyrics to start again.');
    } finally { state.deleting = false; panel.inert = false; clearLines.disabled = false; }
  });
  clearLines.className = "danger";
  clearLines.hidden = true;
  const importFile = input("Import .lrc or project .json", manual, "", "file"); importFile.accept = ".lrc,.json";
  importFile.addEventListener("change", async () => {
    try {
      requireProject(); const currentGeneration = generation; const file = importFile.files[0]; if (!file) return;
      if (file.size > 3000000) throw new Error("Import must be smaller than 3 MB.");
      const text = await file.text(); if (generation !== currentGeneration) return;
      if (file.name.toLowerCase().endsWith(".json")) {
        const imported = C.validate(JSON.parse(text));
        // File imports belong to the current video, regardless of their original video.
        imported.videoId = videoId;
        imported.videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        imported.videoTitle = currentVideoTitle() || project.videoTitle;
        await acceptProject(imported, true); return;
      } else {
        const blocks = C.importLyrics(text); if (!replaceAllowed()) return; project.blocks = blocks; project.offset = 0; project.originalLanguage = "und";
      }
      selected = 0; refresh(); save({ manualLoad: true });
    } catch (error) { fail(error); } finally { importFile.value = ""; }
  });
  const exportButton = button("Export project JSON", manual, () => {
    requireProject();
    project.videoTitle = currentVideoTitle() || project.videoTitle;
    const text = JSON.stringify(C.exportProject(project), null, 2);
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const link = el("a", null, root, { href: url, download: `karaoke-${videoId}.json` }); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  for (const timed of [true, false]) button(timed ? "Export timed LRC" : "Export untimed LRC", manual, () => {
    requireProject();
    const text = C.exportLrc(project, timed);
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const link = el("a", null, root, { href: url, download: `karaoke-${videoId}${timed ? "" : "-untimed"}.lrc` });
    link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  el("p", "Project JSON preserves original language, the current translation and its language, timing, furigana and display settings. Use JSON to back up translations. LRC exports original lyrics only, with or without timing. Timed export requires every line to have a start time and includes the delay.", manual, { class: "muted" });
  const tutorial = KaraokeTutorial.create({ root, panel, trigger: tutorialButton, storage: browser.storage.local, steps: [
    { id: "surprise", chapter: "Basics", title: "Surprise me", target: () => surpriseButton.hidden ? tutorialButton : surpriseButton, text: "When available, Surprise Me opens a random catalog video with Karaoke and Settings on. Your local edits stay safe. Following a link or entering another address turns Karaoke off and closes Settings." },
    { id: "catalog", chapter: "Basics", title: "Choose a catalog translation", target: () => sourceChoices.hidden ? searchSection.querySelector('summary') : sourceChoices, text: "When this video has catalog translations, choose Use lyrics translation from catalog or Search for lyrics. The catalog button stays visible but is disabled when search is selected. The catalog offers a language selector only when multiple translations exist. Without a catalog translation, only search is shown. Replacing existing lyrics asks for confirmation." },
    { id: "search", chapter: "Basics", title: "Find your song", target: () => lyricsSearchPanel.hidden ? searchChoice : query, text: "Choose Search for lyrics to search by song or artist. The addon tries LRCLIB first, then Genius if no lyrics are found. After searching, choose a result and click Use selected lyrics. If nothing matches, No results found appears. This is an alternative to loading a catalog translation." },
    { id: "languages", chapter: "Basics", title: "Choose a translation language", target: () => editorLanguage, text: "Enter a language code such as en, fr or nl. This keeps the current text; Translate all lines replaces it with a new translation after confirmation. Each song has one local translation. Lyrics language identifies the original text. English is the default; your last choice is remembered." },
    { id: "dictionary", chapter: "Basics", title: "Add furigana", target: () => generateFurigana, text: "Furigana are small kana readings above kanji. Generate them with the dictionary; Show furigana is enabled automatically. The dictionaries download once; lyrics stay on your computer. Check the readings against the singing." },
    { id: "edit", chapter: "Basics", title: "Correct lyrics", target: () => rows.querySelector(".block.selected textarea, .block textarea") || editor, text: "Edit Original lyrics or the translation in Line editor. Changes save locally. Changing original text clears that line’s furigana, so generate or correct its readings afterward." },
    { id: "readings", chapter: "Basics", title: "Correct readings", target: () => rows.querySelector(".block.selected .furigana-editor") || rows.querySelector(".furigana-editor") || generateFurigana, text: "Open Edit furigana readings to correct a word’s kana. Listen to the singer to choose the right reading. Changes save automatically. Generate furigana first if no readings are shown." },
    { id: "global-timing", chapter: "Basics", title: "Align the whole song", target: () => startAt, text: "Start at sets when the first lyric begins, for example 0:33. Or select a line and use Sync with video position. Shifts affecting other lines ask for confirmation. The cross inside Start at sets the first lyric to 0:00 and shifts all timed lyrics by the same amount." },
    { id: "line-timing", chapter: "Basics", title: "Time individual lines", target: () => rows.querySelector(".block.selected .row + .row, .block .row + .row") || editor, text: "Enter Start and End as minutes:seconds, such as 3:32.250. Changing a timed Start also shifts later lines after confirmation. End changes only this line. A blank End lasts until the next timed line." },
    { id: "play", chapter: "Basics", title: "Ready to sing", target: () => fontSize, text: "Set size and position separately for the original and translation, or hide either one. These settings save with the project. Opening Settings enables Karaoke; closing it leaves Karaoke on. Use the Karaoke button or Alt+K to toggle it." },
    { id: "ai", chapter: "Advanced", title: "AI features", target: () => automatic.querySelector("summary"), text: "OpenAI translates text and can add furigana. AudioShake recognizes and times lyrics from audio. Each needs its own API key and charges for requests. Starting without lyrics? Generate timed lyrics, apply the result, then translate: both languages use the same timing." },
    { id: "ai-furigana", chapter: "Advanced", title: "AI features · Translation and furigana", target: () => apiKey, text: "Choose a model and translation language, then click Translate all lines. The source language is detected automatically. Generate furigana and Convert Japanese romaji to kanji/kana are on by default; turn either off if unwanted. Existing work asks for confirmation before replacement. Lines already in the target language need no translation. OpenAI receives text, not audio." },
    { id: "ai-audio-setup", chapter: "Advanced", title: "AI features · Audio setup", target: () => helperSection.querySelector("summary"), text: "Audio timing needs the Linux audio helper. Follow Installation instructions and click Check again. Enter your AudioShake key in AI features; leave Audio language on Auto for detection. Videos up to 45 minutes are supported; livestreams are not." },
    { id: "audio-timing", chapter: "Advanced", title: "AI features · Generate timed lyrics", target: () => timingStart, text: "Existing lyrics are automatically aligned to the recording while preserving text, translations and furigana. Without existing lyrics, AudioShake recognizes what is actually sung. Generate timed lyrics sends the full audio to AudioShake and starts a paid task. Downloaded audio is reused while still cached. Clear audio file is available when the local copy exists and no task is running. Removing it makes the next task download it again." },
    { id: "ai-timing-review", chapter: "Advanced", title: "AI features · Review timing", target: () => timingActions, text: "When timing finishes, review the preview before Apply. Recognized lyrics replace existing text, translations and furigana after confirmation. Apply resets the overall timing shift; uncertain matches stay untimed. Discard keeps your project. Cancel stops local waiting; a submitted task may still be charged. Resume continues the same task." },
    { id: "ai-costs", chapter: "Advanced", title: "AI features · Monthly costs", target: () => usageRow, text: "The total shows this month’s recorded costs. Open Details to choose a month and compare providers. For AudioShake, enter your USD price per API credit and save it. These are estimates for this extension, not your provider’s invoice." },
    { id: "terms", chapter: "Advanced", title: "Fix a recurring reading", target: () => correctionTerm, text: "Enter a word and its correct kana reading, then apply it throughout this song. A shortcut beside a line’s reading can fill these fields for you. Other projects are unchanged." },
    { id: "structure", chapter: "Advanced", title: "Adapt a live performance", target: () => rows.querySelector(".block.selected .row, .block .row") || editor, text: "Add, repeat, move or delete lines to match the performance. Repeated lines need their own timing. Jump to lets you check a line against the video. Set End before the next line starts to leave a gap." },
    { id: "export", chapter: "Files", title: "Back up to your computer", target: () => exportButton, text: "Export project JSON backs up original lyrics, the current translation, timing, furigana and display settings. Use it to keep or share a complete project. LRC exports only original lyrics, with or without timing. API keys and GitHub tokens are never included." },
    { id: "import", chapter: "Files", title: "Import lyrics from a file", target: () => importFile, text: "Import JSON to restore a complete project. Matching original lyrics let you replace the current translation after confirmation. Older files with multiple translations use their selected language. Different lyrics require replacing the whole project. LRC imports original lyrics only. Files are loaded into the current video, so check the timing." },
  ] });
  function replaceAllowed() { return !project.blocks.length || window.confirm("Replace the current lyrics and timing? Export your project first if you want to keep a copy."); }
  const editor = section("Line editor"); editor.open = true;
  editor.before(termCorrection);
  const editorToolbar = el("div", null, editor, { class: "editor-toolbar" });
  const clock = el("p", "", editorToolbar);
  editorToolbar.append(clearLines);
  el("p", "Enter video times as minutes:seconds (for example 3:32 or 3:32.250), including the delay. Blank end times last until the next timed line.", editor, { class: "muted" });
  const rows = el("div", null, editor, { id: "rows" });
  const editorLanguage = input('Translation language code', editor, 'en');
  editor.insertBefore(editorLanguage.parentNode, rows);
  editorLanguage.addEventListener('change', () => {
    try {
      requireProject();
      setLanguage(editorLanguage.value);
    } catch (error) { editorLanguage.value = project?.translationLanguage || 'en'; fail(error); }
  });
  const originalLanguage = input('Lyrics language code', editor, 'und');
  editor.insertBefore(originalLanguage.parentNode, rows);
  originalLanguage.addEventListener('change', () => {
    requireProject();
    const language = originalLanguage.value.trim();
    if (!/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(language)) { originalLanguage.value = project.originalLanguage; throw new Error('Enter a language code such as sr, ja or en.'); }
    project.originalLanguage = language; save();
  });
  function setLanguage(language) {
    requireProject();
    project = C.renameTranslationLanguage(project, language);
    preferredLanguage = project.translationLanguage; targetLanguage.value = preferredLanguage;
    renderRows(); updatePublicationState(); persistPreferences().catch(fail); save();
  }
  function refreshLanguages() {
    editorLanguage.value = project?.translationLanguage || 'en';
    originalLanguage.value = project?.originalLanguage || 'und';
  }
  async function acceptProject(incoming, fullImport = false) {
    requireProject();
    const merged = C.mergeTranslations(project, incoming);
    if (merged.replacement) {
      if (!window.confirm('The original lyrics differ. Replace the entire project, including the current translation, timing and display settings? Export JSON first to keep a backup.')) return false;
    } else if (merged.conflicts.length && !window.confirm(`Replace the current ${project.translationLanguage} translation with the ${incoming.translationLanguage} translation? ${fullImport ? 'Timing, furigana and display settings will be reviewed next.' : 'Timing will be kept.'}`)) return false;
    if (fullImport && project.blocks.length && !merged.replacement) {
      if (!window.confirm('Import this project’s timing, furigana and display settings as well? Cancel keeps your current project.')) return false;
      const translations = merged.project.blocks;
      const byId = new Map(translations.map(row => [row.id, row]));
      merged.project = { ...incoming, blocks: incoming.blocks.map((row, i) => ({ ...row, translations: (byId.get(row.id) || translations[i]).translations })) };
    }
    project = C.singleTranslation(merged.project); selected = 0; localDeleted = false; refresh();
    await save({ manualLoad: true }); return true;
  }
  const sources = section("Source");
  function renderSources() {
    sources.querySelectorAll("a").forEach(node => node.remove());
    const source = project?.source;
    if (source) el("a", `${source.provider} ↗ `, sources, { href: source.url, target: "_blank", rel: "noopener noreferrer" });
  }
  function refresh() {
    shownTimingResult = null;
    updateTimingControls();
    updateSelectionWarning();
    updateFuriganaButton();
    updateTimingFields();
    refreshDisplay();
    showFurigana.checked = !!project?.furiganaEnabled;
    furiganaStatus.textContent = "";
    correctionStatus.textContent = ""; correctionTerm.value = ""; correctionReading.value = "";
    furiganaStatus.classList.remove("warning");
    targetLanguage.value = project?.translationLanguage || "en";
    title.textContent = videoId ? "Loading video title…" : "Open a YouTube watch page to begin.";
    updateVideoTitle();
    renderRows(); renderSources(); updatePublicationState();
  }
  function insertLine(index) {
    requireProject();
    project.blocks.splice(index, 0, C.block());
    selected = index;
    renderRows(); save();
  }
  function renderRows() {
    clearLines.hidden = !project?.blocks.length;
    refreshLanguages();
    rows.replaceChildren();
    if (!project?.blocks.length) button("Add first line", rows, () => insertLine(0));
    project?.blocks.forEach((row, index) => {
      const box = el("div", null, rows, { class: `block${index === selected ? " selected" : ""}` });
      const actions = el("div", null, box, { class: "row" });
      el("span", `Line ${index + 1}`, actions, { style: "font-weight:600" });
      button("Add line before", actions, () => insertLine(index));
      button("Add line after", actions, () => insertLine(index + 1));
      button("Jump to", actions, () => { if (row.start === null || !video()) throw new Error("Set a start time first."); video().currentTime = Math.max(0, row.start + project.offset); });
      button("↑", actions, () => { if (index) { [project.blocks[index - 1], project.blocks[index]] = [row, project.blocks[index - 1]]; selected = index - 1; renderRows(); save(); } }).ariaLabel = "Move line up";
      button("↓", actions, () => { if (index < project.blocks.length - 1) { [project.blocks[index + 1], project.blocks[index]] = [row, project.blocks[index + 1]]; selected = index + 1; renderRows(); save(); } }).ariaLabel = "Move line down";
      button("Repeat", actions, () => { project.blocks.splice(index + 1, 0, { ...C.block(row.text), translations: { ...row.translations }, ...(row.furigana ? { furigana: structuredClone(row.furigana) } : {}) }); selected = index + 1; renderRows(); save(); });
      button("Delete", actions, () => { const dirty = row.text.trim() || Object.values(row.translations).some(text => text.trim()) || row.start !== null || row.end !== null || row.furigana?.length; if (dirty && !window.confirm(`Delete line ${index + 1}?`)) return; project.blocks.splice(index, 1); selected = Math.min(selected, project.blocks.length); renderRows(); save(); });
      const times = el("div", null, box, { class: "row" });
      for (const key of ["start", "end"]) {
        const field = input(key === "start" ? "Start" : "End", times, row[key] === null ? "" : formatTime(row[key] + project.offset));
        field.placeholder = "0:32.250";
        field.style.width = "110px";
        field.addEventListener("change", () => { const previous = row[key];
          try {
            const time = parseLineTime(field.value);
            if (key === "start") {
              if (row.start !== null && time !== null && time !== row.start + project.offset && project.blocks.slice(index + 1).some(b => b.start !== null || b.end !== null) && !confirmShift()) { updateTimingFields(); return; }
              C.moveLineStart(project, row, time);
            }
            else {
              row.end = time === null ? null : Number((time - project.offset).toFixed(3));
              C.validate(project);
            }
            updateTimingFields(); renderRows(); save();
          }
          catch (error) { row[key] = previous; renderRows(); fail(error); } });
      }
      const text = input("Original lyrics", box, row.text, "textarea"); text.addEventListener("input", () => { row.text = text.value; delete row.furigana; furiganaEditor?.remove(); save(); });
      let furiganaEditor;
      if (row.furigana) {
        furiganaEditor = el("details", null, box, { class: "furigana-editor" });
        el("summary", "Edit furigana readings", furiganaEditor);
        button("Correct a combined term throughout this song", furiganaEditor, () => {
          termCorrection.open = true;
          correctionTerm.value = ""; correctionReading.value = "";
          termCorrection.scrollIntoView({ block: "nearest" }); correctionTerm.focus();
        });
        row.furigana.forEach(part => {
          if (part[1] === null) return;
          const reading = input(part[0], furiganaEditor, part[1]);
          button("Use this reading throughout this song…", furiganaEditor, () => {
            termCorrection.open = true;
            correctionTerm.value = part[0]; correctionReading.value = reading.value;
            termCorrection.scrollIntoView({ block: "nearest" }); correctionReading.focus();
          });
          reading.addEventListener("change", () => {
            const previous = part[1]; part[1] = reading.value.trim();
            try { C.validateFurigana(row.text, row.furigana); save(); }
            catch (error) { part[1] = previous; reading.value = previous; fail(error); }
          });
        });
        button("Clear this line’s furigana", furiganaEditor, () => { delete row.furigana; renderRows(); save(); });
      }
      const translation = input(`Translation (${project.translationLanguage})`, box, row.translations[project.translationLanguage] || "", "textarea");
      translation.addEventListener("input", () => { row.translations[project.translationLanguage] = translation.value; save(); });
    });
  }
  function mark() {
    requireProject(); C.stamp(project.blocks, selected, playbackTime()); selected++; renderRows(); save();
  }
  document.addEventListener("keydown", event => {
    const path = event.composedPath();
    if (path.some(node => node.matches?.("input,textarea,select,[contenteditable=true]"))) return;
    if (!panel.hidden && event.altKey && event.shiftKey && event.code === "KeyM") {
      event.preventDefault(); event.stopPropagation(); try { mark(); } catch (error) { fail(error); }
    }
  }, true);
  // Keep editor interactions away from YouTube, including when the host is
  // inside the fullscreen player. Preserve default input/button behavior.
  for (const type of ["click", "dblclick", "pointerdown", "pointerup", "mousedown", "mouseup", "keydown", "keypress", "keyup"]) {
    host.addEventListener(type, event => event.stopPropagation());
  }
  const overlayHost = document.createElement("div");
  overlayHost.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:60";
  const overlayRoot = overlayHost.attachShadow({ mode: "open" }); overlayRoot.append(style.cloneNode(true));
  const overlay = el("div", null, overlayRoot, { id: "overlay" });
  const caption = el("div", null, overlay, { id: "caption" });
  const original = el("div", "", caption, { id: "original" });
  const translationOverlay = el('div', null, overlayRoot, { style: 'position:absolute;left:5%;right:5%;text-align:center;pointer-events:none;text-shadow:0 2px 5px #000,0 0 8px #000' });
  const translated = el("div", "", translationOverlay, { id: "translated", style: 'display:inline-block;max-width:100%;background:#07111bd9;border-radius:10px;padding:6px 14px' });
  const next = el("div", "", caption, { id: "next" });
  function renderOriginal(node, row) {
    node.replaceChildren();
    if (!row) return;
    if (!project.furiganaEnabled || !row.furigana) { node.textContent = row.text.trim(); return; }
    const start = row.text.length - row.text.trimStart().length, end = row.text.trimEnd().length;
    let offset = 0;
    for (const [segment, reading] of row.furigana) {
      const text = segment.slice(Math.max(0, start - offset), Math.max(0, end - offset));
      offset += segment.length;
      if (!text) continue;
      if (!reading) { node.append(document.createTextNode(text)); continue; }
      const aligned = C.alignKana(text, reading);
      node.append(document.createTextNode(aligned.prefix));
      if (aligned.base && aligned.annotation) {
        const ruby = el("ruby", aligned.base, node);
        el("rt", aligned.annotation, ruby);
      } else node.append(document.createTextNode(aligned.base));
      node.append(document.createTextNode(aligned.suffix));
    }
  }
  function separateCaptions() {
    // Measure the preferred positions afresh after text, ruby or viewport changes.
    overlay.style.transform = "";
    translationOverlay.style.transform = "";
    if (overlay.hidden || translationOverlay.hidden) return;
    const originalBounds = caption.getBoundingClientRect();
    const translationBounds = translated.getBoundingClientRect();
    const originalAbove = Number(position.value) >= Number(translationPosition.value);
    const upper = originalAbove ? originalBounds : translationBounds;
    const lower = originalAbove ? translationBounds : originalBounds;
    const overlap = upper.bottom + 8 - lower.top;
    if (overlap > 0) {
      (originalAbove ? overlay : translationOverlay).style.transform = `translateY(-${Math.ceil(overlap)}px)`;
    }
  }
  let lastCaption = "";
  function tick() {
    const media = video(), player = document.getElementById("movie_player");
    if (player && overlayHost.parentNode !== player) player.append(overlayHost);
    const container = document.fullscreenElement || document.body;
    if (container && host.parentNode !== container) container.append(host);
    const currentId = location.pathname === "/watch" ? new URL(location.href).searchParams.get("v") : null;
    if (currentId !== videoId) {
      enabled = false; globalThis.KaraokeSetPressed?.(false); panel.hidden = true;
      publicationReview.hidden = true;
      availableCatalog = []; catalogKnown = false; localDeleted = false;
      lyricsSource = 'catalog'; updateLyricsSource(); catalogCheckStatus.hidden = true;
      videoId = currentId; project = null; selected = 0; resetSearchResults(); automaticStatus.textContent = ""; generation++;
      timingJob = null; shownTimingResult = null; showTimingJob();
      surpriseCheck++; surpriseButton.hidden = true;
      matchingCatalog.replaceChildren();
      repositoryNotify("");
      query.value = ""; queryDirty = false; queryReady = false;
      const token = generation; refresh(); notify("");
      if (videoId && /^[\w-]{11}$/.test(videoId)) {
        const requestedId = videoId;
        const searchKey = `lyricsSearch:${requestedId}`;
        browser.storage.local.get(searchKey).then(saved => {
          if (token !== generation) return;
          if (!queryDirty && typeof saved[searchKey]?.query === "string") {
            query.value = saved[searchKey].query;
            queryDirty = true;
          }
          queryReady = true;
          updateVideoTitle();
        }).catch(error => {
          if (token !== generation) return;
          queryReady = true;
          fail(error);
        });
        (async () => {
          await preferencesReady;
          const saved = await request({ type: 'project-read', videoId: requestedId });
          if (token !== generation) return;
          storageState = saved;
          localDeleted = saved.blocked;
          project = saved.project ? C.validate(saved.project) : C.project(requestedId, currentVideoTitle() || document.title.replace(/ - YouTube$/, '').trim());
          if (!saved.project) project.translationLanguage = preferredLanguage;
          searchSection.open = !project.blocks.length;
          void refreshSurpriseButton();
          refresh(); notify(saved.project ? 'Loaded saved project.' : 'Choose catalog translations or search for lyrics.');
          const surprise = await request({ type: 'surprise-arrival', videoId: requestedId });
          if (token !== generation) return;
          if (surprise) setEditorOpen(true);
          const snapshot = JSON.stringify(project), state = storageState;
          if (!saved.dirty && !saved.blocked) {
            try {
              const loaded = await request({ type: 'project-auto', videoId: requestedId, revision: saved.revision });
              if (token !== generation) return;
              if (JSON.stringify(project) !== snapshot) return;
              if (loaded.revision >= state.revision) Object.assign(state, loaded);
              if (loaded.project && !loaded.dirty && !loaded.blocked) { project = C.validate(loaded.project); refresh(); notify('English catalog translation loaded and saved locally.'); }
            } catch (error) { if (token === generation) notify(`Local project kept. ${error.message}`, true); }
          }
          if (token === generation) void findCatalogMatch();
        })().catch(fail);
      }
    }
    updateVideoTitle();
    if (!panel.hidden && project && checkedCatalogGeneration !== generation) void findCatalogMatch();
    if (!panel.hidden) tutorial.maybeStart(!!project && !!currentId);
    
    const active = project && media ? C.activeBlock(project.blocks, media.currentTime, project.offset) : null;
    const hidden = !enabled || !active || !currentId || player?.classList.contains("ad-showing");
    overlay.hidden = hidden || !showOriginal.checked;
    translationOverlay.hidden = hidden || !showTranslation.checked || !active?.translations[project?.translationLanguage];
    translationOverlay.style.bottom = `${translationPosition.value}%`;
    translated.style.fontSize = `${translationSize.value}px`;
    overlay.style.fontSize = `${fontSize.value}px`;
    overlay.style.bottom = `${position.value}%`;
    const nextRow = active && showNext.checked ? project.blocks.filter(row => row.start !== null && row.start > active.start && row.text.trim()).sort((a, b) => a.start - b.start)[0] : null;
    const values = [active?.text || "", active?.translations[project?.translationLanguage] || "", nextRow?.text || ""].map(text => text.trim());
    const signature = JSON.stringify([values, project?.furiganaEnabled, active?.furigana, nextRow?.furigana]);
    if (signature !== lastCaption) { renderOriginal(original, active); translated.textContent = values[1]; renderOriginal(next, nextRow); translated.hidden = !values[1]; next.hidden = !values[2]; lastCaption = signature; }
    separateCaptions();
    if (!panel.hidden) clock.textContent = `Video: ${(media?.currentTime || 0).toFixed(2)}s · ${project?.blocks.length || 0} lines`;
  }
  document.body.append(host);
  const pendingMcpInputs = new WeakSet();
  root.addEventListener('input', event => pendingMcpInputs.add(event.target));
  root.addEventListener('change', event => pendingMcpInputs.delete(event.target), true);
  browser.runtime.onMessage.addListener(message => {
    if (!['mcp-snapshot', 'mcp-reload'].includes(message.type)) return;
    return (async () => {
    try {
      requireProject();
      if (message.videoId !== videoId) throw new Error('Video changed.');
      const token = generation;
      await saveQueue;
      if (token !== generation) throw new Error('Video changed.');
      if (root.activeElement && pendingMcpInputs.has(root.activeElement)) throw new Error('Finish editing the active field before using MCP.');
      if (message.type === 'mcp-snapshot') {
        return { project: C.exportProject(C.singleTranslation(project)), revision: storageState.revision, duration: video()?.duration ?? null };
      }
      if (storageState.revision !== message.revision || JSON.stringify(C.exportProject(C.singleTranslation(project))) !== JSON.stringify(message.previous)) {
        throw new Error('Local editor changed during MCP apply. Reload to see the saved proposal; current editor edits were preserved.');
      }
      project = C.validate(message.state.project); storageState = message.state;
      generation++; selected = Math.min(selected, Math.max(0, project.blocks.length - 1));
      refresh(); notify('Reviewed lyrics and translation applied through MCP.');
      void findCatalogMatch();
      return { applied: true };
    } catch (error) {
      if (message.type === 'mcp-reload') fail(error);
      return { error: error.message };
    }
    })();
  });
  tick(); setInterval(tick, 100);
  globalThis.KaraokeUI = type => {
    if (type === "toggle-enabled") return setEnabled(!enabled);
    if (type === "toggle-editor") return setEditorOpen(panel.hidden);
    if (type === "open-editor") return setEditorOpen(true);
    return { enabled, settingsOpen: !panel.hidden, videoId, language: project?.translationLanguage, lyricsLanguage: project?.originalLanguage, lines: project?.blocks.length, dirty: storageState.dirty, blocked: storageState.blocked };
  };
})();
