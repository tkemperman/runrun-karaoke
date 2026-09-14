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
    button { cursor: pointer; border: 1px solid #526078; border-radius: 7px; padding: 7px 11px; background: #28354b; color: #fff; }
    details > button + button { margin-inline-start: 8px; }
    button:hover { background: #3c4d69; } button:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible { outline: 2px solid #67e8f9; outline-offset: 2px; }
    a.primary-button { display: inline-flex; align-items: center; border: 1px solid #60a5fa; border-radius: 7px; padding: 7px 11px; background: #2563eb; color: #fff; text-decoration: none; }
    a.primary-button:hover { background: #1d4ed8; }
    a.primary-button:focus-visible { outline: 2px solid #67e8f9; outline-offset: 2px; }
    button:disabled { cursor: wait; opacity: .65; }
    button[aria-busy=true]::before { content: ""; display: inline-block; width: 1em; height: 1em; margin-right: 8px; vertical-align: -.15em; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: translation-spin .75s linear infinite; }
    @keyframes translation-spin { to { transform: rotate(360deg); } }
    input, textarea, select { border: 1px solid #526078; border-radius: 5px; padding: 7px; background: #121c2b; color: #fff; min-width: 0; }
    textarea { width: 100%; min-height: 65px; resize: vertical; } input[type=number] { width: 90px; }
    label { display: flex; flex-direction: column; gap: 4px; margin: 8px 0; } a { color: #82e5f0; }
    label.checkbox-row { flex-direction: row; align-items: center; gap: 8px; cursor: pointer; }
    .sync-row { margin: 8px 0; } .sync-row input { width: 100px; }
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
  function section(title) { const node = el("details", null, panel); el("summary", title, node); return node; }
  const panel = el("section", null, root, { id: "panel", "aria-label": "ルンルンKARAOKE editor" }); panel.hidden = true;
  const header = el("header", null, panel); el("h2", "ルンルンKARAOKE", header);
  button("Close", header, () => { tutorial.close(false); panel.hidden = true; });
  const headerActions = el("div", null, header, { class: "row", style: "flex-basis:100%;justify-content:flex-start" });
  const tutorialButton = button("Tutorial", headerActions, () => tutorial.open());
  tutorialButton.style.cssText = "display:inline-flex;align-items:center;gap:7px;background:#7542b5;border-color:#b58aef";
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
  function save() {
    if (!project) return;
    updateFuriganaButton();
    updateTimingFields();
    let snapshot;
    try { snapshot = C.validate(project); } catch (error) { fail(error); return; }
    const currentGeneration = generation;
    saveQueue = saveQueue.catch(() => {}).then(() => request({ type: "save", project: snapshot }));
    saveQueue.then(() => { if (generation === currentGeneration) notify("Saved locally."); }, fail);
  }
  function requireProject() { if (!project) throw new Error("Wait for the video project to load."); }
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
    if (open) setEnabled(true);
    return { enabled };
  }
  el("label", "Start at", display, { for: "lyrics-start-at" });
  const syncRow = el("div", null, display, { class: "row sync-row" });
  const startAt = el("input", null, syncRow, { id: "lyrics-start-at", type: "text" });
  el("span", "or", syncRow);
  startAt.placeholder = "0:32.250";
  startAt.addEventListener("change", () => {
    try {
      requireProject();
      const first = firstTimedLyric() || project.blocks.find(row => row.text.trim());
      if (!first) throw new Error("Load lyrics or add a lyric line first.");
      const match = startAt.value.trim().match(/^(-?)(\d+):([0-5]\d)(?:\.(\d{1,3}))?$/);
      if (!match) throw new Error("Use minutes:seconds for Start at, for example 0:33 or 1:05.5.");
      const seconds = (Number(match[2]) * 60 + Number(match[3]) + Number(`0.${match[4] || 0}`)) * (match[1] ? -1 : 1);
      C.syncLine(project, first, seconds);
      renderRows();
      save();
    } catch (error) { updateTimingFields(); fail(error); }
  });
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
    C.syncLine(project, row, media.currentTime);
    renderRows();
    save();
  }).title = "Sync selected line to current video position";
  el("p", "Start at sets when the first lyric begins. Select a line in the Line editor and click Sync as it begins in the video. For a timed line, this shifts all lyrics together; for an untimed line, it sets that line’s start. Lyrics without timing still need each remaining line marked in the Line editor.", display, { class: "muted" });
  const fontSize = input("Text size", display, "30", "range"); fontSize.min = "18"; fontSize.max = "60";
  const position = input("Distance above bottom of video (%)", display, "13", "range"); position.min = "5"; position.max = "60";
  browser.storage.local.get("displaySettings").then(({ displaySettings: settings }) => {
    if (settings) { fontSize.value = settings.fontSize || 30; position.value = settings.position || 13; showNext.checked = !!settings.showNext; }
  }).catch(fail);
  browser.storage.onChanged.addListener((changes, area) => {
    const settings = changes.displaySettings?.newValue;
    if (area === "local" && settings) { fontSize.value = settings.fontSize; position.value = settings.position; showNext.checked = settings.showNext; }
  });
  const nextLabel = el("label", null, display, { class: "checkbox-row" }); const showNext = el("input", null, nextLabel, { type: "checkbox" }); el("span", "Show next line", nextLabel);
  for (const field of [fontSize, position, showNext]) field.addEventListener("change", () => {
    browser.storage.local.set({ displaySettings: { fontSize: Number(fontSize.value), position: Number(position.value), showNext: showNext.checked } }).catch(fail);
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
  const matchingCatalog = el("div", null, searchSection);
  let checkedCatalogGeneration = -1;
  async function findCatalogMatch() {
    const token = generation, requestedId = videoId;
    checkedCatalogGeneration = token;
    matchingCatalog.replaceChildren();
    const status = el("p", "Checking the karaoke catalog for this video…", matchingCatalog, { role: "status", class: "muted" });
    try {
      const entries = await request({ type: "catalog-search", videoId: requestedId });
      if (generation !== token) return;
      status.textContent = entries.length ? "Catalog lyrics found for this exact YouTube video:" : "No catalog lyrics found for this video. You can search LRCLIB below.";
      for (const entry of entries) {
        const load = button(`Load catalog lyrics · ${entry.translationLanguage}`, matchingCatalog, async () => {
          requireProject();
          const snapshot = JSON.stringify(project);
          load.disabled = true;
          try {
            const imported = C.validate(await request({ type: "catalog-load", videoId: requestedId, file: entry.file }));
            if (generation !== token) return;
            if (JSON.stringify(project) !== snapshot) throw new Error("Project changed while downloading. Load again to review replacement.");
            if (!replaceAllowed()) return;
            project = imported; selected = 0; refresh(); save();
            notify("Loaded catalog lyrics.");
          } finally { load.disabled = false; }
        });
      }
    } catch (error) {
      if (generation === token) status.textContent = "Could not check the catalog. You can still search LRCLIB below.";
    }
  }
  el("p", "Search LRCLIB for an alternative recording:", searchSection, { class: "muted" });
  const query = input("Song or artist", searchSection);
  let queryDirty = false;
  let queryReady = false;
  query.addEventListener("input", () => {
    if (!videoId) return;
    queryDirty = true;
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
      if (project && project.videoTitle !== currentTitle) {
        project.videoTitle = currentTitle;
        save();
      }
      if (queryReady && !queryDirty) query.value = currentTitle;
    }
  }
  button("Search LRCLIB", searchSection, async () => {
    requireProject(); const currentGeneration = generation; notify("Searching LRCLIB…");
    const found = await request({ type: "search", query: query.value });
    if (currentGeneration !== generation) return;
    results = found; resultList.replaceChildren();
    results.forEach((row, index) => el("option", `${row.artist} — ${row.title} (${Math.round(row.duration || 0)}s; ${row.syncedLyrics ? "timed" : "untimed"})`, resultList, { value: String(index) }));
    updateSelectionWarning();
    notify(results.length ? "Choose a recording. Live timing may need correction." : "No results. Try another title, import a lyrics file, or create lines in Line editor.");
  });
  const resultList = el("select", null, searchSection, { "aria-label": "Lyrics recordings", style: "width:100%;margin:8px 0" });
  const selectionWarning = el("p", untimedMessage, searchSection, { class: "muted warning", role: "status" });
  selectionWarning.hidden = true;
  function updateSelectionWarning() {
    const source = results[Number(resultList.value)];
    selectionWarning.hidden = !source || !!source.syncedLyrics;
  }
  resultList.addEventListener("change", updateSelectionWarning);
  button("Use selected lyrics", searchSection, () => {
    requireProject(); const source = results[Number(resultList.value)]; if (!source) throw new Error("Search and select a recording first.");
    const blocks = source.syncedLyrics ? C.parseLrc(source.syncedLyrics) : source.plainLyrics.split(/\r?\n/).filter(line => line.trim()).map(line => C.block(line));
    if (!blocks.length) throw new Error("This recording has no lyrics.");
    if (!replaceAllowed()) return;
    project.blocks = blocks; project.title = source.title; project.artist = source.artist;
    project.source = { provider: "lrclib", url: source.url };
    selected = 0; refresh(); save();
  });
  const automatic = section("AI translation");
  const provider = el("select", null, el("label", "Provider", automatic));
  el("option", "OpenAI", provider, { value: "openai" });
  const apiKey = input("OpenAI API key", automatic, "", "password");
  apiKey.autocomplete = "off";
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
  let hasApiKey = false, preferredLanguage = "en";
  let preferenceQueue = Promise.resolve();
  function persistPreferences(key) {
    const message = { type: "save-translation-settings", model: model.value, language: targetLanguage.value.trim() };
    if (key !== undefined) message.apiKey = key;
    preferenceQueue = preferenceQueue.catch(() => {}).then(() => request(message));
    return preferenceQueue.then(saved => {
      hasApiKey = saved.hasApiKey;
      apiKey.placeholder = hasApiKey ? "API key saved — enter a new key to replace it" : "Enter your OpenAI API key";
      preferredLanguage = message.language;
    });
  }
  const preferencesReady = request({ type: "translation-settings" }).then(saved => {
    model.value = saved.model; preferredLanguage = saved.language; hasApiKey = saved.hasApiKey;
    apiKey.placeholder = hasApiKey ? "API key saved — enter a new key to replace it" : "Enter your OpenAI API key";
    if (project) { project.translationLanguage = preferredLanguage; renderRows(); }
    targetLanguage.value = preferredLanguage;
  });
  preferencesReady.catch(fail);
  apiKey.addEventListener("change", () => {
    if (apiKey.value.trim()) persistPreferences(apiKey.value).then(() => { apiKey.value = ""; }).catch(fail);
  });
  model.addEventListener("change", () => { persistPreferences().catch(fail); });
  button("Remove saved API key", automatic, async () => { await persistPreferences(""); apiKey.value = ""; });
  targetLanguage.addEventListener("change", () => {
    if (!project) return;
    if (!/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(targetLanguage.value.trim())) {
      targetLanguage.value = project.translationLanguage;
      fail(new Error("Enter a language code such as en, nl or pt-BR.")); return;
    }
    project.translationLanguage = targetLanguage.value.trim(); renderRows(); save(); persistPreferences().catch(fail);
  });
  el("p", "Both actions send the full original lyrics to OpenAI. Translate all lines uses the selected target language. Generate furigana uses the song context to choose Japanese readings; it does not listen to the audio. Without an API key, use dictionary generation under Display & timing. API usage is billed by OpenAI. Your key and preferences are saved locally in this extension. The key is excluded from project exports.", automatic, { class: "muted" });
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
      const snapshot = () => JSON.stringify(project.blocks.map(row => [row.id, row.text, row.translations[language] || ""]));
      const before = snapshot();
      const translations = await request({ type: "translate", model: model.value, language,
        lines: project.blocks.map(row => ({ id: row.id, text: row.text })) });
      if (generation !== currentGeneration || project !== originalProject) return;
      if (project.translationLanguage !== language || snapshot() !== before) throw new Error("Lyrics or translations changed during the request. Result discarded; translate again to use your latest edits.");
      if (project.blocks.some(row => row.translations[language]?.trim()) && !window.confirm("Replace existing translations with the automatic translation?")) {
        automaticStatus.textContent = "Translation discarded. Existing translations kept."; return;
      }
      const byId = new Map(translations.map(row => [row.id, row.translation]));
      for (const row of project.blocks) row.translations[language] = byId.get(row.id);
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
  const aiFuriganaStatus = el("p", "", automatic, { role: "status" });
  const aiFuriganaButton = button("Generate furigana", automatic, async () => {
    if (aiFuriganaButton.disabled) return;
    requireProject();
    const target = project, token = generation;
    const snapshot = () => JSON.stringify(target.blocks.map(row => [row.id, row.text, row.furigana]));
    const before = snapshot();
    if (!target.blocks.some(row => /[\p{Script=Han}]/u.test(row.text))) {
      aiFuriganaStatus.textContent = "No lyrics with kanji found to generate furigana for."; return;
    }
    if (hasFurigana() && !window.confirm("Generate furigana with AI? This replaces existing readings, including manual and song-wide term corrections. Lyrics, translations and timing are preserved.")) return;
    aiFuriganaButton.disabled = true;
    aiFuriganaButton.setAttribute("aria-busy", "true");
    aiFuriganaButton.textContent = "Generating furigana…";
    aiFuriganaStatus.textContent = "Generating furigana using the full song as context…";
    try {
      await preferencesReady;
      await persistPreferences(apiKey.value.trim() || undefined);
      apiKey.value = "";
      if (project !== target || generation !== token) return;
      if (!hasApiKey) throw new Error("Enter your OpenAI API key, or use dictionary generation under Display & timing.");
      if (snapshot() !== before) throw new Error("Lyrics or furigana changed. Generate again to use your latest edits.");
      const readings = await request({ type: "ai-furigana", model: model.value,
        lines: target.blocks.map(row => ({ id: row.id, text: row.text })) });
      if (project !== target || generation !== token) return;
      if (snapshot() !== before) throw new Error("Lyrics or furigana changed during the request. Result discarded; generate again to use your latest edits.");
      const byId = new Map(readings.map(row => [row.id, row.furigana]));
      const updates = target.blocks.map(row => [row, C.validateFurigana(row.text, byId.get(row.id))]);
      for (const [row, parts] of updates) row.furigana = parts;
      target.furiganaEnabled = true; showFurigana.checked = true;
      renderRows(); save();
      aiFuriganaStatus.textContent = "Generated furigana with song context. Review readings in Line editor.";
    } catch (error) {
      if (project === target && generation === token) aiFuriganaStatus.textContent = error.message;
    } finally {
      aiFuriganaButton.disabled = false;
      aiFuriganaButton.removeAttribute("aria-busy");
      aiFuriganaButton.textContent = "Generate furigana";
    }
  });
  const repositorySection = section("Lyrics repositories · GitHub");
  // Developer mode only changes visibility; saved repository settings stay intact.
  repositorySection.hidden = true;
  try {
    repositorySection.hidden = localStorage.getItem("runrunKaraoke.developerMode") !== "true";
  } catch (_) { /* Keep developer controls hidden when localStorage is unavailable. */ }
  el("p", "Configure separate retrieval and upload repositories below. Search downloads the public catalog; publishing sends the complete project, including original lyrics, translations, timing and furigana, to your upload repository.", repositorySection, { class: "muted" });
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
  const repositoryQuery = input("Filter catalog by title, artist or video ID (blank: this video)", repositorySection);
  const repositoryResults = el("select", null, repositorySection, { "aria-label": "Repository projects", style: "width:100%;margin:8px 0" });
  let catalogEntries = [], catalogSource = null;
  function filterCatalog() {
    const q = repositoryQuery.value.trim().toLocaleLowerCase();
    repositoryResults.replaceChildren();
    for (const entry of catalogEntries.filter(e => q ? `${e.title} ${e.artist} ${e.videoId}`.toLocaleLowerCase().includes(q) : e.videoId === videoId)) {
      el("option", `${entry.title || entry.videoId} · ${entry.artist} · ${entry.translationLanguage}${entry.videoId === videoId ? " · this video" : " · other video"}`, repositoryResults, { value: entry.file });
    }
  }
  repositoryQuery.addEventListener("input", filterCatalog);
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
  const catalogButton = repositoryButton("Search repository", async () => {
    requireProject(); const currentGeneration = generation;
    catalogButton.disabled = true; catalogButton.textContent = "Searching…";
    try {
      const preferences = await request({ type: "repository-settings" });
      const entries = await request({ type: "repository-search", source: preferences.retrieval });
      if (generation !== currentGeneration) return;
      catalogEntries = entries; catalogSource = preferences.retrieval; filterCatalog();
      repositoryNotify(`${repositoryResults.options.length} matching projects. Change the filter to search the catalog.`);
    } finally { catalogButton.disabled = false; catalogButton.textContent = "Search repository"; }
  });
  const repositoryLoad = repositoryButton("Load selected project", async () => {
    requireProject();
    const entry = catalogEntries.find(e => e.file === repositoryResults.value);
    if (!entry) throw new Error("Search and select a repository project first.");
    if (entry.videoId !== videoId) {
      repositoryNotify(`Open https://www.youtube.com/watch?v=${entry.videoId} to load this performance.`); return;
    }
    const currentGeneration = generation, snapshot = JSON.stringify(project);
    repositoryLoad.disabled = true;
    try {
      const preferences = await request({ type: "repository-settings" });
      if (JSON.stringify(preferences.retrieval) !== JSON.stringify(catalogSource)) throw new Error("Retrieval settings changed. Search again.");
      const imported = C.validate(await request({ type: "repository-load", file: entry.file, videoId, source: catalogSource }));
      if (generation !== currentGeneration || JSON.stringify(project) !== snapshot) throw new Error("Project changed while downloading. Load again to review replacement.");
      if (!replaceAllowed()) return;
      project = imported; selected = 0; refresh(); save();
    } finally { repositoryLoad.disabled = false; }
  });
  const contributionNotice = el("div", null, repositorySection, { role: "region", "aria-label": "Publication options", style: "padding:12px;border:1px solid #b58aef;border-radius:8px;margin-top:12px" });
  contributionNotice.hidden = true;
  async function offerContribution(target) {
    const preferenceKey = `preferPullRequest:${target.repo}`;
    const saved = await browser.storage.local.get(preferenceKey);
    contributionNotice.replaceChildren();
    contributionNotice.hidden = false;
    function showGuide() {
      contributionNotice.replaceChildren();
      el("h3", "Contribute via pull request", contributionNotice);
      el("p", `Destination: ${target.repo}. Export your project, add the JSON file to your fork in the catalog’s translations folder, then open a pull request to submit it for review. A GitHub account is required. Automatic submission is not available yet.`, contributionNotice);
      button("Export project JSON", contributionNotice, () => exportButton.click());
      el("a", "Open GitHub fork page ↗", contributionNotice, { href: `https://github.com/${target.repo}/fork`, target: "_blank", rel: "noopener noreferrer", style: "display:block;color:#c6a0fa;margin-top:8px" });
      button("Show publication options again", contributionNotice, async () => {
        await browser.storage.local.remove(preferenceKey);
        await offerContribution(target);
      });
    }
    if (saved[preferenceKey]) { showGuide(); return; }
    el("h3", "Choose how to publish", contributionNotice);
    el("p", "Set up a GitHub token to publish directly to a repository you can write to, or contribute via a pull request for review. Without a token, the PR route currently continues manually on GitHub.", contributionNotice);
    const label = el("label", null, contributionNotice, { class: "checkbox-row" });
    const remember = el("input", null, label, { type: "checkbox", style: "width:auto;flex-shrink:0" });
    el("span", "Do not show again — use pull requests when no token is available", label);
    button("Set up token", contributionNotice, () => {
      contributionNotice.hidden = true;
      repositoryPreferences.scrollIntoView({ block: "center" });
      repositoryPreferences.focus();
    });
    button("Continue via PR", contributionNotice, async () => {
      try {
        if (remember.checked) await browser.storage.local.set({ [preferenceKey]: true });
        showGuide();
      } catch (error) { repositoryNotify(error.message, true); }
    });
    button("Cancel", contributionNotice, () => { contributionNotice.hidden = true; });
  }
  const publishButton = repositoryButton("Publish project to GitHub", async () => {
    requireProject();
    if (!project.blocks.some(b => b.text.trim())) throw new Error("Load lyrics before publishing.");
    const snapshot = C.validate(project), currentGeneration = generation, videoTitle = currentVideoTitle();
    if (!videoTitle) throw new Error("Wait for the YouTube video title before publishing.");
    publishButton.disabled = true; publishButton.textContent = "Checking destination…";
    try {
      const preferences = await request({ type: "repository-settings" });
      if (!preferences.hasToken) {
        await offerContribution(preferences.publishing);
        contributionNotice.scrollIntoView({ block: "nearest" });
        return;
      }
      contributionNotice.hidden = true;
      const destination = await request({ type: "repository-inspect", project: snapshot, videoTitle });
      if (generation !== currentGeneration || currentVideoTitle() !== videoTitle || JSON.stringify(project) !== JSON.stringify(snapshot)) throw new Error("Project changed. Start publishing again.");
      if (!window.confirm(`${destination.sha ? "Replace the existing file" : "Publish this project"} on GitHub?\n\n${destination.target.repo} · ${destination.target.branch}\n${destination.file}\n\nThis uploads all lyrics, translations, timing and furigana in this project.`)) return;
      publishButton.textContent = "Publishing…";
      await request({ type: "repository-publish", project: snapshot, videoTitle, sha: destination.sha, target: destination.target });
      if (generation === currentGeneration) repositoryNotify(`Published to ${destination.target.repo}. The catalog updates after the repository Action finishes; search again shortly.`);
    } finally { publishButton.disabled = false; publishButton.textContent = "Publish project to GitHub"; }
  });
  const manual = section("Import / export");
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
        if (!replaceAllowed()) return; project = imported;
      } else {
        const blocks = C.importLyrics(text); if (!replaceAllowed()) return; project.blocks = blocks;
      }
      selected = 0; refresh(); save();
    } catch (error) { fail(error); } finally { importFile.value = ""; }
  });
  const exportButton = button("Export project JSON", manual, () => {
    requireProject();
    project.videoTitle = currentVideoTitle() || project.videoTitle;
    const text = JSON.stringify(C.validate(project), null, 2);
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
  el("p", "Project JSON preserves the complete project. LRC exports original lyrics only, with or without timing. Timed export requires every line to have a start time and includes the delay.", manual, { class: "muted" });
  const tutorial = KaraokeTutorial.create({ root, panel, trigger: tutorialButton, storage: browser.storage.local, steps: [
    { id: "search", chapter: "Basics", title: "Find your song", target: () => query, text: "Find lyrics checks the karaoke catalog for an exact YouTube video match. If available, use Load catalog lyrics. You can always search LRCLIB by song title or artist instead; choose a recording and click Use selected lyrics. Timed lyrics are the quickest start; live performances may need timing corrections. You can try every control while this guide stays open." },
    { id: "dictionary", chapter: "Basics", title: "Add furigana", target: () => generateFurigana, text: "Add furigana (small kana above kanji to show pronunciation) using the EDICT2 and ENAMDICT dictionaries. The dictionaries download on first use; lyrics are processed locally. This adds pronunciation help, not translations. Show furigana turns it on or off. Check the readings against the singing." },
    { id: "edit", chapter: "Basics", title: "Correct lyrics", target: () => rows.querySelector(".block.selected textarea, .block textarea") || editor, text: "Edit Original lyrics in the Line editor, or change the translation underneath. Changing original text clears that line’s furigana readings, so generate them again afterward. No lines yet? Search for lyrics or use Import / export." },
    { id: "readings", chapter: "Basics", title: "Correct readings", target: () => rows.querySelector(".block.selected .furigana-editor") || rows.querySelector(".furigana-editor") || generateFurigana, text: "Edit furigana readings shows the kana for each annotated part of a line. Correct a reading to match the singing; changes save automatically. If no readings are available yet, generate furigana first." },
    { id: "global-timing", chapter: "Basics", title: "Align the whole song", target: () => startAt, text: "Enter when the first lyric starts, for example 0:33. Or select a line and click Sync with video position as it is sung. For timed lyrics, this shifts the song together. For fine adjustments, enter a precise Start at time, such as 0:33.250." },
    { id: "line-timing", chapter: "Basics", title: "Time individual lines", target: () => rows.querySelector(".block.selected .row + .row, .block .row + .row") || editor, text: "Enter Start and End as minutes:seconds (for example 3:32 or 3:32.250). Start edits shift that line and following lines; End edits only change that line’s end. Leave End blank to continue until the next timed line. Untimed lyrics need a Start time for every line." },
    { id: "play", chapter: "Basics", title: "Ready to sing", target: () => fontSize, text: "Opening Settings turns Karaoke on automatically; closing Settings leaves it on. Use Karaoke below the video (default shortcut Alt+K) to turn it off or on. Adjust text size, position and Show next line here. Your edits save locally per video. That is the basic workflow! Close this guide to sing, or choose Next for optional advanced features; Tutorial resumes here." },
    { id: "ai", chapter: "Advanced", title: "Translate with AI", target: () => apiKey, text: "Enter your OpenAI API key, choose a model and target language, then click Translate all lines. This optional action sends original lyrics to OpenAI and incurs API charges. Your key is saved locally and excluded from project exports. Review the resulting translation." },
    { id: "ai-furigana", chapter: "Advanced", title: "Generate contextual readings", target: () => aiFuriganaButton, text: "AI Generate furigana uses the full song text as context with the same key and model. It does not listen to the performance. Regeneration asks before replacing existing readings, including your corrections; review the result against the singing." },
    { id: "terms", chapter: "Advanced", title: "Fix a recurring reading", target: () => correctionTerm, text: "Enter a term and its kana reading to correct every exact occurrence in this song. Per-line furigana shortcuts can fill these fields for you. This changes this project, not a global dictionary." },
    { id: "structure", chapter: "Advanced", title: "Adapt a live performance", target: () => rows.querySelector(".block.selected .row, .block .row") || editor, text: "Use Add line before or Add line after for extra vocals, Repeat for a repeated lyric, arrows to reorder and Delete to remove a line. Repeated lines need their own timing. Jump to previews a timed line. Set its End before the next line’s Start to create a gap for an instrumental passage." },
    { id: "export", chapter: "Files", title: "Back up to your computer", target: () => exportButton, text: "Export project JSON saves originals, translations, furigana, timing and video information in one file on your computer. Use it as a backup before replacing lyrics or to share your work. API keys and GitHub tokens are never included. Export timed LRC shares original lyrics with video timing; Export untimed LRC shares original lyrics without timestamps. LRC does not preserve translations, furigana or project metadata; use JSON for a complete backup." },
    { id: "import", chapter: "Files", title: "Import lyrics from a file", target: () => importFile, text: "Import a project JSON to load its lyrics, translations, furigana and timing into the current video. No video matching is performed. Choose an LRC file to import lyrics with or without timestamps. Untimed lyrics still need timing in Line editor. Replacement asks for confirmation." },
  ] });
  function replaceAllowed() { return !project.blocks.length || window.confirm("Replace the current lyrics and timing? Export your project first if you want to keep a copy."); }
  const editor = section("Line editor"); editor.open = true;
  editor.before(termCorrection);
  el("p", "Enter video times as minutes:seconds (for example 3:32 or 3:32.250), including the delay. Blank end times last until the next timed line.", editor, { class: "muted" });
  const clock = el("p", "", editor);
  const rows = el("div", null, editor, { id: "rows" });
  const sources = section("Source");
  function renderSources() {
    sources.querySelectorAll("a").forEach(node => node.remove());
    const source = project?.source;
    if (source) el("a", `${source.provider} ↗ `, sources, { href: source.url, target: "_blank", rel: "noopener noreferrer" });
  }
  function refresh() {
    updateSelectionWarning();
    updateFuriganaButton();
    updateTimingFields();
    showFurigana.checked = !!project?.furiganaEnabled;
    furiganaStatus.textContent = "";
    correctionStatus.textContent = ""; correctionTerm.value = ""; correctionReading.value = "";
    furiganaStatus.classList.remove("warning");
    targetLanguage.value = project?.translationLanguage || "en";
    title.textContent = videoId ? "Loading video title…" : "Open a YouTube watch page to begin.";
    updateVideoTitle();
    renderRows(); renderSources();
  }
  function insertLine(index) {
    requireProject();
    project.blocks.splice(index, 0, C.block());
    selected = index;
    renderRows(); save();
  }
  function renderRows() {
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
            if (key === "start") C.moveLineStart(project, row, time);
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
  // Keep editor keystrokes from reaching YouTube's global playback shortcuts.
  panel.addEventListener("keydown", event => event.stopPropagation());
  const overlayHost = document.createElement("div");
  overlayHost.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:60";
  const overlayRoot = overlayHost.attachShadow({ mode: "open" }); overlayRoot.append(style.cloneNode(true));
  const overlay = el("div", null, overlayRoot, { id: "overlay" });
  const caption = el("div", null, overlay, { id: "caption" });
  const original = el("div", "", caption, { id: "original" });
  const translated = el("div", "", caption, { id: "translated" });
  const next = el("div", "", caption, { id: "next" });
  function renderOriginal(node, row) {
    node.replaceChildren();
    if (!row) return;
    if (!project.furiganaEnabled || !row.furigana) { node.textContent = row.text; return; }
    for (const [text, reading] of row.furigana) {
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
  let lastCaption = "";
  function tick() {
    const media = video(), player = document.getElementById("movie_player");
    if (player && overlayHost.parentNode !== player) player.append(overlayHost);
    const container = document.fullscreenElement || document.body;
    if (container && host.parentNode !== container) container.append(host);
    const currentId = location.pathname === "/watch" ? new URL(location.href).searchParams.get("v") : null;
    if (currentId !== videoId) {
      videoId = currentId; project = null; selected = 0; results = []; resultList.replaceChildren(); automaticStatus.textContent = ""; generation++;
      matchingCatalog.replaceChildren();
      catalogEntries = []; catalogSource = null; repositoryResults.replaceChildren(); repositoryQuery.value = ""; repositoryNotify("");
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
        request({ type: "load", videoId }).then(saved => {
          if (token !== generation) return;
          project = saved ? C.validate(saved) : C.project(requestedId, document.querySelector("ytd-watch-metadata h1")?.textContent?.trim() || document.title.replace(/ - YouTube$/, ""));
          project.translationLanguage = preferredLanguage;
          refresh(); notify(saved ? "Loaded saved project." : "Search for lyrics, import a file or create lines.");
        }).catch(fail);
      }
    }
    updateVideoTitle();
    if (!panel.hidden && project && checkedCatalogGeneration !== generation) void findCatalogMatch();
    tutorial.maybeStart(!!project && !!currentId);
    
    const active = project && media ? C.activeBlock(project.blocks, media.currentTime, project.offset) : null;
    overlay.hidden = !enabled || !active || !currentId || player?.classList.contains("ad-showing");
    overlay.style.fontSize = `${fontSize.value}px`;
    overlay.style.bottom = `${position.value}%`;
    const nextRow = active && showNext.checked ? project.blocks.filter(row => row.start !== null && row.start > active.start && row.text.trim()).sort((a, b) => a.start - b.start)[0] : null;
    const values = [active?.text || "", active?.translations[project?.translationLanguage] || "", nextRow?.text || ""];
    const signature = JSON.stringify([values, project?.furiganaEnabled, active?.furigana, nextRow?.furigana]);
    if (signature !== lastCaption) { renderOriginal(original, active); translated.textContent = values[1]; renderOriginal(next, nextRow); translated.hidden = !values[1]; next.hidden = !values[2]; lastCaption = signature; }
    if (!panel.hidden) clock.textContent = `Video: ${(media?.currentTime || 0).toFixed(2)}s · ${project?.blocks.length || 0} lines`;
  }
  document.body.append(host);
  tick(); setInterval(tick, 100);
  globalThis.KaraokeUI = type => {
    if (type === "toggle-enabled") return setEnabled(!enabled);
    if (type === "toggle-editor") return setEditorOpen(panel.hidden);
    if (type === "open-editor") return setEditorOpen(true);
    return { enabled };
  };
})();
