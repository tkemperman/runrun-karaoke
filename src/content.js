(() => {
  "use strict";
  if (document.getElementById("youtube-karaoke-host")) return;
  const C = KaraokeCore;
  const host = document.createElement("div");
  host.id = "youtube-karaoke-host";
  const root = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = `
    :host { all: initial; font: 14px/1.45 system-ui, sans-serif; color: #eef2ff; }
    * { box-sizing: border-box; } [hidden] { display: none !important; }
    button, input, textarea, select { font: inherit; }
    button { cursor: pointer; border: 1px solid #526078; border-radius: 7px; padding: 7px 11px; background: #28354b; color: #fff; }
    button:hover { background: #3c4d69; } button:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible { outline: 2px solid #67e8f9; outline-offset: 2px; }
    input, textarea, select { border: 1px solid #526078; border-radius: 5px; padding: 7px; background: #121c2b; color: #fff; min-width: 0; }
    textarea { width: 100%; min-height: 65px; resize: vertical; } input[type=number] { width: 90px; }
    label { display: flex; flex-direction: column; gap: 4px; margin: 8px 0; } a { color: #82e5f0; }
    label.checkbox-row { flex-direction: row; align-items: center; gap: 8px; cursor: pointer; }
    .checkbox-row input[type=checkbox] { flex: 0 0 auto; width: 16px; height: 16px; margin: 0; padding: 0; accent-color: #67e8f9; cursor: pointer; }
    #panel { position: fixed; right: 16px; top: 70px; width: min(550px, calc(100vw - 32px)); max-height: calc(100vh - 140px); overflow: auto; z-index: 2147483647; background: #182235; border: 1px solid #526078; border-radius: 12px; padding: 16px; box-shadow: 0 12px 40px #0009; }
    header, .row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; } header { justify-content: space-between; } h2 { margin: 0; font-size: 20px; } p { margin: 8px 0; } .muted { color: #b4c0d4; font-size: 12px; }
    details { border-top: 1px solid #39465c; padding: 12px 0; } summary { cursor: pointer; font-weight: 650; }
    #status { white-space: pre-wrap; color: #8de9dd; } #status.error { color: #ffb4b4; }
    #rows { display: grid; gap: 12px; } .block { padding: 10px; border: 1px solid #41516d; border-radius: 8px; } .block.selected { border-color: #67e8f9; } .block label { font-size: 12px; }
    #overlay { position: absolute; left: 5%; right: 5%; bottom: 13%; text-align: center; z-index: 60; pointer-events: none; font-family: system-ui, sans-serif; text-shadow: 0 2px 5px #000, 0 0 8px #000; }
    #caption { display: inline-block; max-width: 100%; background: #07111bd9; border-radius: 10px; padding: 10px 20px; }
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
  const panel = el("section", null, root, { id: "panel", "aria-label": "YouTube Karaoke editor" }); panel.hidden = true;
  const header = el("header", null, panel); el("h2", "YouTube Karaoke", header);
  button("Close", header, () => { panel.hidden = true; });
  const title = el("p", "Open a YouTube video to begin.", panel, { class: "muted" });
  const status = el("p", "", panel, { id: "status", role: "status" });
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
  offset.addEventListener("change", () => { if (project) { project.offset = Number(offset.value); save(); } });
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
  const searchSection = section("Find lyrics · LRCLIB");
  const query = input("Song or artist", searchSection);
  button("Search", searchSection, async () => {
    requireProject(); const currentGeneration = generation; notify("Searching LRCLIB…");
    const found = await request({ type: "search", query: query.value });
    if (currentGeneration !== generation) return;
    results = found; resultList.replaceChildren();
    results.forEach((row, index) => el("option", `${row.artist} — ${row.title} (${Math.round(row.duration || 0)}s; ${row.syncedLyrics ? "timed" : "untimed"})`, resultList, { value: String(index) }));
    notify(results.length ? "Choose a recording. Live timing may need correction." : "No results. Try another title, or paste lyrics.");
  });
  const resultList = el("select", null, searchSection, { "aria-label": "Lyrics recordings", style: "width:100%;margin:8px 0" });
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
  button("Load original demo (not song lyrics)", manual, () => {
    requireProject(); if (!replaceAllowed()) return;
    project.blocks = [C.block("こんにちは、音楽の時間です。", 0, 5), C.block("次の行を一緒に試しましょう。", 5, 10), C.block("ここからまた始めましょう。", 12, 17)];
    ["Hello, it is time for music.", "Let us try the next line together.", "Let us start again from here."].forEach((text, i) => { project.blocks[i].translations.en = text; });
    project.offset = 0; selected = 0; refresh(); save();
  });
  function replaceAllowed() { return !project.blocks.length || window.confirm("Replace the current lyrics and timing? Export your project first if you want to keep a copy."); }
  const editor = section("Line editor"); editor.open = true;
  el("p", "Select a line, then mark it as the vocals begin. Alt+Shift+M marks the next line while this editor is open (outside text fields). Times are seconds. Blank end times last until the next timed line.", editor, { class: "muted" });
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
    offset.value = project?.offset || 0;
    title.textContent = project ? `${project.title || "Untitled video"} · ${project.videoId}` : "Open a YouTube watch page to begin.";
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
      button("Repeat", actions, () => { project.blocks.splice(index + 1, 0, { ...C.block(row.text), translations: { ...row.translations } }); selected = index + 1; renderRows(); save(); });
      button("Delete", actions, () => { if (!window.confirm(`Delete line ${index + 1}?`)) return; project.blocks.splice(index, 1); selected = Math.min(selected, project.blocks.length); renderRows(); save(); });
      const times = el("div", null, box, { class: "row" });
      for (const key of ["start", "end"]) {
        const field = input(key === "start" ? "Start (s)" : "End (s)", times, row[key] ?? "", "number"); field.step = "0.01"; field.min = "0";
        field.addEventListener("change", () => { row[key] = field.value === "" ? null : Number(field.value); save(); });
      }
      const text = input("Original lyrics", box, row.text, "textarea"); text.addEventListener("input", () => { row.text = text.value; save(); });
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
  let lastCaption = "";
  function tick() {
    const media = video(), player = document.getElementById("movie_player");
    if (player && overlayHost.parentNode !== player) player.append(overlayHost);
    const container = document.fullscreenElement || document.body;
    if (container && host.parentNode !== container) container.append(host);
    const currentId = location.pathname === "/watch" ? new URL(location.href).searchParams.get("v") : null;
    if (currentId !== videoId) {
      videoId = currentId; project = null; selected = 0; results = []; resultList.replaceChildren(); translationDraft.value = ""; translationWarning.hidden = true; originalDraft.value = ""; generation++;
      const token = generation; refresh(); notify("");
      if (videoId && /^[\w-]{11}$/.test(videoId)) {
        const requestedId = videoId;
        request({ type: "load", videoId }).then(saved => {
          if (token !== generation) return;
          project = saved ? C.validate(saved) : C.project(requestedId, document.querySelector("ytd-watch-metadata h1")?.textContent?.trim() || document.title.replace(/ - YouTube$/, ""));
          query.value = project.artist ? `${project.artist} ${project.title}` : project.title;
          refresh(); notify(saved ? "Loaded saved project." : "Search for lyrics, paste your own, or load the demo to test the overlay.");
        }).catch(fail);
      }
    }
    
    const active = project && media ? C.activeBlock(project.blocks, media.currentTime, project.offset) : null;
    overlay.hidden = !enabled || !active || !currentId || player?.classList.contains("ad-showing");
    overlay.style.fontSize = `${fontSize.value}px`;
    overlay.style.bottom = `${position.value}%`;
    const nextRow = active && showNext.checked ? project.blocks.filter(row => row.start !== null && row.start > active.start && row.text.trim()).sort((a, b) => a.start - b.start)[0] : null;
    const values = [active?.text || "", active?.translations[project?.translationLanguage] || "", nextRow?.text || ""];
    const signature = JSON.stringify(values);
    if (signature !== lastCaption) { [original.textContent, translated.textContent, next.textContent] = values; translated.hidden = !values[1]; next.hidden = !values[2]; lastCaption = signature; }
    if (!panel.hidden) clock.textContent = `Video: ${(media?.currentTime || 0).toFixed(2)}s · ${project?.blocks.length || 0} lines`;
  }
  document.body.append(host);
  tick(); setInterval(tick, 100);
  mountInlineButton(); setInterval(mountInlineButton, 1000);
})();
