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
    button:hover { background: #3c4d69; } button:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible { outline: 2px solid #67e8f9; outline-offset: 2px; }
    button:disabled { cursor: wait; opacity: .65; }
    button[aria-busy=true]::before { content: ""; display: inline-block; width: 1em; height: 1em; margin-right: 8px; vertical-align: -.15em; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: translation-spin .75s linear infinite; }
    @keyframes translation-spin { to { transform: rotate(360deg); } }
    input, textarea, select { border: 1px solid #526078; border-radius: 5px; padding: 7px; background: #121c2b; color: #fff; min-width: 0; }
    textarea { width: 100%; min-height: 65px; resize: vertical; } input[type=number] { width: 90px; }
    label { display: flex; flex-direction: column; gap: 4px; margin: 8px 0; } a { color: #82e5f0; }
    label.checkbox-row { flex-direction: row; align-items: center; gap: 8px; cursor: pointer; }
    .sync-row { margin: 8px 0; } .sync-row input { width: 100px; }
    .checkbox-row input[type=checkbox] { flex: 0 0 auto; width: 16px; height: 16px; margin: 0; padding: 0; accent-color: #67e8f9; cursor: pointer; }
    #panel { position: fixed; right: 16px; top: 70px; width: min(550px, calc(100vw - 32px)); max-height: calc(100vh - 140px); overflow: auto; z-index: 2147483647; background: #182235; border: 1px solid #526078; border-radius: 12px; padding: 16px; box-shadow: 0 12px 40px #0009; }
    header, .row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; } header { justify-content: space-between; } h2 { margin: 0; font-size: 20px; } p { margin: 8px 0; } .muted { color: #b4c0d4; font-size: 12px; }
    details { border-top: 1px solid #39465c; padding: 12px 0; } summary { cursor: pointer; font-weight: 650; }
    #status { white-space: pre-wrap; color: #8de9dd; } #status.error { color: #ffb4b4; }
    .muted.warning { color: #fef08a; background: #422f12; border: 1px solid #eab308; border-radius: 7px; padding: 10px 12px; }
    #rows { display: grid; gap: 12px; } .block { padding: 10px; border: 1px solid #41516d; border-radius: 8px; } .block.selected { border-color: #67e8f9; } .block label { font-size: 12px; }
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
  const inlineHost = document.createElement("span");
  inlineHost.dataset.ytExtension = "youtube-karaoke";
  inlineHost.style.cssText = "display:inline-flex;align-items:center;margin-left:8px;flex-shrink:0";
  const inlineRoot = inlineHost.attachShadow({ mode: "open" });
  const inlineStyle = document.createElement("style");
  inlineStyle.textContent = `button { display:inline-flex;align-items:center;gap:8px;font: 500 14px system-ui,sans-serif; height:36px; border:0; border-radius:18px; padding:0 16px; cursor:pointer; color:var(--yt-spec-text-primary,#fff); background:var(--yt-spec-badge-chip-background,#303030); white-space:nowrap; } button[aria-pressed=true] { background:#155e75; color:#fff; } button:focus-visible { outline:2px solid #22d3ee; outline-offset:2px; }`;
  inlineStyle.textContent += ` button:first-of-type { border-radius:18px 0 0 18px; } .settings { box-sizing:border-box; width:40px; padding:0; justify-content:center; border-radius:0 18px 18px 0; border-left:1px solid var(--yt-spec-10-percent-layer,#ffffff29); } button:hover { filter:brightness(1.15); }`;
  inlineRoot.append(inlineStyle);
  const inlineToggle = button("Karaoke", inlineRoot, () => setEnabled(!enabled));
  inlineToggle.setAttribute("aria-pressed", "false");
  inlineToggle.title = "Turn karaoke subtitles on or off";
  const microphone = document.createElement("span");
  microphone.setAttribute("aria-hidden", "true");
  microphone.style.cssText = "display:inline-block;width:19px;height:19px;flex-shrink:0;background-color:currentColor;mask-mode:alpha;mask-size:contain;mask-repeat:no-repeat;mask-position:center";
  microphone.style.maskImage = `url("${browser.runtime.getURL("src/microphone.png")}")`;
  inlineToggle.prepend(microphone);
  const inlineSettings = button("", inlineRoot, () => { panel.hidden = !panel.hidden; });
  inlineSettings.className = "settings";
  inlineSettings.title = "Karaoke Settings";
  inlineSettings.setAttribute("aria-label", "Toggle karaoke settings");
  const gear = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  gear.setAttribute("viewBox", "0 0 24 24");
  gear.setAttribute("width", "24");
  gear.setAttribute("height", "24");
  gear.setAttribute("fill", "currentColor");
  gear.setAttribute("aria-hidden", "true");
  const gearPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  gearPath.setAttribute("d", "M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.61-.22l-2.49 1a7.1 7.1 0 0 0-1.69-.98l-.38-2.65A.49.49 0 0 0 14 2h-4a.49.49 0 0 0-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1a.49.49 0 0 0-.61.22l-2 3.46a.49.49 0 0 0 .12.64l2.11 1.65a8.4 8.4 0 0 0 0 1.96l-2.11 1.65a.5.5 0 0 0-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46a.5.5 0 0 0-.12-.64l-2.11-1.65ZM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z");
  gear.append(gearPath);
  inlineSettings.append(gear);
  function mountInlineButton() {
    if (location.pathname !== "/watch") { inlineHost.remove(); return; }
    const owner = document.querySelector("ytd-watch-metadata #owner");
    if (!owner) return;
    const transcript = owner.querySelector('[data-yt-extension="transcript-copier"]');
    if (transcript) {
      if (transcript.nextElementSibling !== inlineHost) transcript.after(inlineHost);
    } else if (inlineHost.parentNode !== owner) owner.append(inlineHost);
  }
  const panel = el("section", null, root, { id: "panel", "aria-label": "ルンルンKARAOKE editor" }); panel.hidden = true;
  const header = el("header", null, panel); el("h2", "ルンルンKARAOKE", header);
  button("Close", header, () => { panel.hidden = true; });
  const title = el("p", "Open a YouTube video to begin.", panel, { class: "muted" });
  const status = el("p", "", panel, { id: "status", role: "status" });
  const untimedMessage = "These lyrics have no timing. Set the first line with Start at or Sync, then mark each remaining line in the Line editor as the vocals begin. Setting the first line does not automatically time the rest of the song.";
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
  function setEnabled(value) { enabled = value; inlineToggle.setAttribute("aria-pressed", String(enabled)); if (enabled && !project?.blocks.length) panel.hidden = false; return { enabled }; }
  const offset = input("Delay in seconds (+ later / − earlier)", display, "0", "number"); offset.step = "0.1";
  offset.addEventListener("change", () => { if (project) { project.offset = Number(offset.value); renderRows(); save(); } });
  el("label", "Start at", display, { for: "lyrics-start-at" });
  const syncRow = el("div", null, display, { class: "row sync-row" });
  const startAt = el("input", null, syncRow, { id: "lyrics-start-at", type: "text" });
  el("span", "or", syncRow);
  startAt.placeholder = "0:33";
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
    offset.value = project?.offset || 0;
    const first = firstTimedLyric();
    startAt.disabled = !project;
    if (!first) { startAt.value = ""; return; }
    const milliseconds = Math.round((first.start + project.offset) * 1000);
    const absolute = Math.abs(milliseconds);
    const seconds = String(Math.floor(absolute / 1000) % 60).padStart(2, "0");
    const fraction = String(absolute % 1000).padStart(3, "0").replace(/0+$/, "");
    startAt.value = `${milliseconds < 0 ? "-" : ""}${Math.floor(absolute / 60000)}:${seconds}${fraction ? `.${fraction}` : ""}`;
  }
  button("Sync with video position", syncRow, () => {
    requireProject();
    const row = project.blocks[selected];
    if (!row) throw new Error("Select a line in the Line editor first.");
    const media = video();
    if (!media || document.querySelector("#movie_player.ad-showing")) throw new Error("Wait for the main video (not an advertisement).");
    C.syncLine(project, row, media.currentTime);
    offset.value = project.offset;
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
  const searchSection = section("Find lyrics · LRCLIB");
  const query = input("Song or artist", searchSection);
  let queryDirty = false;
  let queryReady = false;
  query.addEventListener("input", () => {
    if (!videoId) return;
    queryDirty = true;
    browser.storage.local.set({ [`lyricsSearch:${videoId}`]: { query: query.value } }).catch(fail);
  });
  function updateVideoTitle() {
    if (!videoId) return;
    // YouTube updates its URL before the watch page metadata finishes loading.
    const watch = document.querySelector("ytd-watch-flexy");
    if (watch?.getAttribute("video-id") !== videoId) return;
    const currentTitle = watch.querySelector("ytd-watch-metadata h1")?.textContent?.trim();
    if (currentTitle) {
      title.textContent = currentTitle;
      if (queryReady && !queryDirty) query.value = currentTitle;
    }
  }
  button("Search", searchSection, async () => {
    requireProject(); const currentGeneration = generation; notify("Searching LRCLIB…");
    const found = await request({ type: "search", query: query.value });
    if (currentGeneration !== generation) return;
    results = found; resultList.replaceChildren();
    results.forEach((row, index) => el("option", `${row.artist} — ${row.title} (${Math.round(row.duration || 0)}s; ${row.syncedLyrics ? "timed" : "untimed"})`, resultList, { value: String(index) }));
    updateSelectionWarning();
    notify(results.length ? "Choose a recording. Live timing may need correction." : "No results. Try another title, or paste lyrics.");
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
    project.sources.push({ provider: "lrclib", url: source.url, original: source.syncedLyrics || source.plainLyrics });
    selected = 0; refresh(); save();
  });
  const translationSection = section("Manual translation");
  const translationDraft = input("Translation (one line per original lyrics line)", translationSection, "", "textarea");
  function applyTranslation(allowMismatch = false) {
    translationWarning.hidden = true;
    requireProject();
    let matches;
    try { matches = C.matchTranslation(project.blocks, translationDraft.value, allowMismatch); }
    catch (error) {
      if (error.code !== "TRANSLATION_LINE_COUNT") throw error;
      translationWarningText.textContent = error.message;
      translationWarning.hidden = false;
      return;
    }
    const language = project.translationLanguage;
    if (matches.some(({ row, text }) => row.translations[language]?.trim() && row.translations[language] !== text) && !window.confirm("Replace existing translations with the pasted translation?")) return;
    for (const { row, text } of matches) row.translations[language] = text;
    renderRows();
    rows.closest("details").open = true;
    save();
  }
  button("Apply translation", translationSection, () => applyTranslation());
  const translationWarning = el("div", null, translationSection, { role: "alert" });
  translationWarning.hidden = true;
  const translationWarningText = el("p", "", translationWarning);
  button("Apply anyway", translationWarning, () => applyTranslation(true));
  button("Cancel", translationWarning, () => { translationWarning.hidden = true; });
  translationDraft.addEventListener("input", () => { translationWarning.hidden = true; });
  el("p", "Apply matches lines in order, skipping blank lines. Different line counts show a warning with an Apply anyway option. Review the result in Line editor. Pasted text is temporary until applied.", translationSection, { class: "muted" });
  const automatic = section("AI translations");
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
  const manual = section("Paste lyrics & import / export");
  const originalDraft = input("Original lyrics (one block per line), or timed LRC", manual, "", "textarea");
  button("Use pasted lyrics", manual, () => {
    requireProject();
    const value = originalDraft.value.trim(); if (!value) throw new Error("Paste lyrics first.");
    const blocks = /\[\d+:[0-5]\d/.test(value) ? C.parseLrc(value) : value.split(/\r?\n/).filter(line => line.trim()).map(line => C.block(line));
    if (!replaceAllowed()) return;
    project.blocks = blocks; selected = 0; refresh(); save();
  });
  const importFile = input("Import .lrc or project .json", manual, "", "file"); importFile.accept = ".lrc,.json";
  importFile.addEventListener("change", async () => {
    try {
      requireProject(); const currentGeneration = generation; const file = importFile.files[0]; if (!file) return;
      if (file.size > 3000000) throw new Error("Import must be smaller than 3 MB.");
      const text = await file.text(); if (generation !== currentGeneration) return;
      if (file.name.toLowerCase().endsWith(".json")) {
        const imported = C.validate(JSON.parse(text));
        if (imported.videoId !== videoId) throw new Error("This project belongs to another video. Open its YouTube video before importing.");
        if (!replaceAllowed()) return; project = imported;
      } else {
        const blocks = C.parseLrc(text); if (!replaceAllowed()) return; project.blocks = blocks;
      }
      selected = 0; refresh(); save();
    } catch (error) { fail(error); } finally { importFile.value = ""; }
  });
  button("Export project JSON", manual, () => {
    requireProject(); const text = JSON.stringify(C.validate(project), null, 2);
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const link = el("a", null, root, { href: url, download: `karaoke-${videoId}.json` }); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  function replaceAllowed() { return !project.blocks.length || window.confirm("Replace the current lyrics and timing? Export your project first if you want to keep a copy."); }
  const editor = section("Line editor"); editor.open = true;
  editor.before(termCorrection);
  el("p", "Select a line, then mark it as the vocals begin. Alt+Shift+M marks the next line while this editor is open (outside text fields). Times are video seconds, including the delay. Blank end times last until the next timed line.", editor, { class: "muted" });
  const clock = el("p", "", editor);
  const stampButton = button("Mark selected line now", editor, mark);
  button("End previous line now", editor, () => {
    requireProject(); const row = project.blocks[selected - 1]; if (!row || row.start === null) throw new Error("Mark a line first.");
    const end = playbackTime(); if (end <= row.start) throw new Error("End time must follow the start."); row.end = end; renderRows(); save();
  });
  button("Add line", editor, () => { requireProject(); project.blocks.push(C.block()); selected = project.blocks.length - 1; renderRows(); save(); });
  const rows = el("div", null, editor, { id: "rows" });
  const sources = section("Saved sources");
  function renderSources() {
    sources.querySelectorAll("a").forEach(node => node.remove());
    for (const source of project?.sources || []) el("a", `${source.provider} ↗ `, sources, { href: source.url, target: "_blank", rel: "noopener noreferrer" });
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
  function renderRows() {
    rows.replaceChildren();
    project?.blocks.forEach((row, index) => {
      const box = el("div", null, rows, { class: `block${index === selected ? " selected" : ""}` });
      const actions = el("div", null, box, { class: "row" });
      button(`${index === selected ? "● " : ""}Line ${index + 1}`, actions, () => { selected = index; renderRows(); });
      button("Seek", actions, () => { if (row.start === null || !video()) throw new Error("Set a start time first."); video().currentTime = Math.max(0, row.start + project.offset); });
      button("↑", actions, () => { if (index) { [project.blocks[index - 1], project.blocks[index]] = [row, project.blocks[index - 1]]; selected = index - 1; renderRows(); save(); } }).ariaLabel = "Move line up";
      button("↓", actions, () => { if (index < project.blocks.length - 1) { [project.blocks[index + 1], project.blocks[index]] = [row, project.blocks[index + 1]]; selected = index + 1; renderRows(); save(); } }).ariaLabel = "Move line down";
      button("Repeat", actions, () => { project.blocks.splice(index + 1, 0, { ...C.block(row.text), translations: { ...row.translations }, ...(row.furigana ? { furigana: structuredClone(row.furigana) } : {}) }); selected = index + 1; renderRows(); save(); });
      button("Delete", actions, () => { if (!window.confirm(`Delete line ${index + 1}?`)) return; project.blocks.splice(index, 1); selected = Math.min(selected, project.blocks.length); renderRows(); save(); });
      const times = el("div", null, box, { class: "row" });
      for (const key of ["start", "end"]) {
        const field = input(key === "start" ? "Start (s)" : "End (s)", times, row[key] === null ? "" : Number((row[key] + project.offset).toFixed(3)), "number"); field.step = "0.001";
        field.addEventListener("change", () => { const previous = row[key];
          row[key] = field.value === "" ? null : Number((Number(field.value) - project.offset).toFixed(3));
          try { C.validate(project); save(); }
          catch (error) { row[key] = previous; renderRows(); fail(error); } });
      }
      const text = input("Original lyrics", box, row.text, "textarea"); text.addEventListener("input", () => { row.text = text.value; delete row.furigana; furiganaEditor?.remove(); save(); });
      let furiganaEditor;
      if (row.furigana) {
        furiganaEditor = el("details", null, box);
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
    stampButton.textContent = selected < (project?.blocks.length || 0) ? `Mark line ${selected + 1} now` : "All lines marked — select a line to retime";
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
  browser.runtime.onMessage.addListener(message => {
    if (message.type === "get-state") return Promise.resolve({ enabled });
    if (message.type === "toggle-enabled") return Promise.resolve(setEnabled(!enabled));
    if (message.type === "open-editor") { panel.hidden = false; return Promise.resolve({ enabled }); }
  });
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
      videoId = currentId; project = null; selected = 0; results = []; resultList.replaceChildren(); translationDraft.value = ""; translationWarning.hidden = true; originalDraft.value = ""; automaticStatus.textContent = ""; generation++;
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
          refresh(); notify(saved ? "Loaded saved project." : "Search for lyrics or paste your own.");
        }).catch(fail);
      }
    }
    updateVideoTitle();
    
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
  mountInlineButton(); setInterval(mountInlineButton, 1000);
})();
