(() => {
  "use strict";
  let loading;
  async function activate(type) {
    if (!globalThis.KaraokeUI) {
      if (!loading) loading = browser.runtime.sendMessage({ type: "load-interface" }).then(result => {
        if (result?.error) throw new Error(result.error);
        if (!globalThis.KaraokeUI) throw new Error("Reload YouTube and try again.");
      }).finally(() => { loading = null; });
      await loading;
    }
    const state = globalThis.KaraokeUI(type);
    inlineToggle.setAttribute("aria-pressed", String(state.enabled));
    return state;
  }
  function fail(error) { inlineSettings.title = error.message; }
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
  const inlineHost = document.createElement("span");
  inlineHost.dataset.ytExtension = "youtube-karaoke";
  inlineHost.style.cssText = "display:inline-flex;align-items:center;margin-left:8px;flex-shrink:0";
  const inlineRoot = inlineHost.attachShadow({ mode: "open" });
  const inlineStyle = document.createElement("style");
  inlineStyle.textContent = `button { display:inline-flex;align-items:center;gap:8px;font: 500 14px system-ui,sans-serif; height:36px; border:0; border-radius:18px; padding:0 16px; cursor:pointer; color:var(--yt-spec-text-primary,#fff); background:var(--yt-spec-badge-chip-background,#303030); white-space:nowrap; } button[aria-pressed=true] { background:#155e75; color:#fff; } button:focus-visible { outline:2px solid #22d3ee; outline-offset:2px; }`;
  inlineStyle.textContent += ` button:first-of-type { border-radius:18px 0 0 18px; } .settings { box-sizing:border-box; width:40px; padding:0; justify-content:center; border-radius:0 18px 18px 0; border-left:1px solid var(--yt-spec-10-percent-layer,#ffffff29); } button:hover { filter:brightness(1.15); }`;
  inlineRoot.append(inlineStyle);
  const inlineToggle = button("Karaoke", inlineRoot, () => activate("toggle-enabled"));
  inlineToggle.setAttribute("aria-pressed", "false");
  inlineToggle.title = "Turn karaoke subtitles on or off";
  const microphone = document.createElement("span");
  microphone.setAttribute("aria-hidden", "true");
  microphone.style.cssText = "display:inline-block;width:19px;height:19px;flex-shrink:0;background-color:currentColor;mask-mode:alpha;mask-size:contain;mask-repeat:no-repeat;mask-position:center";
  microphone.style.maskImage = `url("${browser.runtime.getURL("src/microphone.png")}")`;
  inlineToggle.prepend(microphone);
  const inlineSettings = button("", inlineRoot, () => activate("toggle-editor"));
  inlineSettings.className = "settings";
  inlineSettings.title = "Karaoke Settings (Alt+L)";
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

  globalThis.KaraokeSetPressed = enabled => inlineToggle.setAttribute("aria-pressed", String(enabled));
  browser.runtime.onMessage.addListener(message => {
    if (message.type === "get-state") return Promise.resolve(globalThis.KaraokeUI?.("get-state") || { enabled: false });
    if (["toggle-enabled", "toggle-editor", "open-editor"].includes(message.type)) return activate(message.type);
  });
  // YouTube replaces its metadata during client-side navigation.
  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; mountInlineButton(); });
  });
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener("yt-navigate-finish", mountInlineButton);
  mountInlineButton();
})();
