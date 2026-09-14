/* A non-modal, locally resumable guide. It never executes the highlighted action. */
const KaraokeTutorial = (() => {
  "use strict";
  function create({ root, panel, trigger, storage, steps }) {
    const key = "karaokeTutorial";
    let index = 0, active = false, visited = false, ready = false, highlighted = null;
    let writes = Promise.resolve();
    const node = (tag, text, parent, attrs = {}) => {
      const element = document.createElement(tag);
      if (text) element.textContent = text;
      for (const [name, value] of Object.entries(attrs)) element.setAttribute(name, value);
      parent.append(element);
      return element;
    };
    node("style", `
      #tutorial { position:fixed; z-index:2147483647; width:290px; max-height:calc(100vh - 24px); overflow:auto; padding:16px; border:1px solid #b58aef; border-radius:12px; background:#281e3d; color:#f5efff; box-shadow:0 12px 40px #0009; }
      #panel > header { position:sticky; top:-12px; z-index:2; background:#182235; margin-top:-12px; padding:12px 0; }
      #tutorial h3 { margin:10px 0 6px; font-size:17px; }
      #tutorial p { line-height:1.5; }
      #tutorial select { width:100%; margin-top:8px; }
      #tutorial nav { display:flex; gap:8px; justify-content:space-between; margin-top:14px; }
      #tutorial .tutorial-top { display:flex; align-items:center; justify-content:space-between; gap:8px; }
      #tutorial-close { display:grid; place-items:center; flex:0 0 28px; width:28px; height:28px; padding:0; }
      #tutorial-close span { position:relative; display:block; width:12px; height:12px; }
      #tutorial-close span::before, #tutorial-close span::after { content:""; position:absolute; left:5px; top:0; width:2px; height:12px; border-radius:1px; background:currentColor; transform:rotate(45deg); }
      #tutorial-close span::after { transform:rotate(-45deg); }
      #tutorial-arrow { position:fixed; inset:0; pointer-events:none; z-index:2147483647; }
      #tutorial-arrow .outline, #tutorial-arrow .fill { position:absolute; inset:0; background:#b58aef; }
      #tutorial-arrow .fill { background:#281e3d; }
      .tutorial-target { outline:2px solid #c6a0fa !important; outline-offset:3px; }
      @media(max-width:900px) {
        #panel.tutorial-active { top:12px; max-height:calc(60vh - 36px); }
        #tutorial { width:calc(100vw - 32px); max-height:40vh; left:16px !important; top:auto !important; bottom:12px; }
      }
    `, root);
    const card = node("aside", "", root, { id: "tutorial", "aria-label": "Tutorial" });
    card.hidden = true;
    const top = node("div", "", card, { class: "tutorial-top" });
    const progress = node("span", "", top);
    const closeButton = node("button", "", top, { id: "tutorial-close", type: "button", "aria-label": "Close tutorial" });
    node("span", "", closeButton, { "aria-hidden": "true" });
    const jump = node("select", "", card, { "aria-label": "Tutorial chapter and step" });
    steps.forEach((step, i) => node("option", `${step.chapter} · ${step.title}`, jump, { value: String(i) }));
    const announcement = node("div", "", card, { "aria-live": "polite", "aria-atomic": "true" });
    const title = node("h3", "", announcement);
    const description = node("p", "", announcement);
    const setupLink = node("a", "Setup instructions on GitHub ↗", announcement, { target: "_blank", rel: "noopener noreferrer", style: "color:#c6a0fa" });
    setupLink.hidden = true;
    const error = node("p", "", card, { role: "status" });
    const navigation = node("nav", "", card, { "aria-label": "Tutorial navigation" });
    const previous = node("button", "Previous", navigation, { type: "button" });
    const next = node("button", "Next", navigation, { type: "button" });
    const arrow = node("div", "", root, { id: "tutorial-arrow", "aria-hidden": "true" });
    arrow.hidden = true;
    const arrowOutline = node("div", "", arrow, { class: "outline" });
    const arrowFill = node("div", "", arrow, { class: "fill" });
    function drawArrow(bounds, panelBounds) {
      const box = card.getBoundingClientRect();
      const top = Math.max(bounds.top, panelBounds.top);
      const bottom = Math.min(bounds.bottom, panelBounds.bottom);
      arrow.hidden = !highlighted || bottom <= top || bounds.width === 0;
      if (arrow.hidden) return;
      let outline, fill;
      if (box.right < panelBounds.left) {
        const y = Math.max(box.top + 24, Math.min((top + bottom) / 2, box.bottom - 24));
        // Keep the tip on the shaft axis even when the card position is clamped.
        const tipX = bounds.left - 6, tipY = y;
        // Overlap the card border so the filled pointer grows directly out of it.
        const x = box.right - 1;
        const neck = x + (tipX - x) * 0.5;
        outline = [[x, y - 6], [neck, y - 6], [neck, y - 14], [tipX, tipY], [neck, y + 14], [neck, y + 6], [x, y + 6]];
        fill = [[x, y - 5], [neck + 1, y - 5], [neck + 1, y - 12], [tipX - 2, tipY], [neck + 1, y + 12], [neck + 1, y + 5], [x, y + 5]];
      } else {
        // A compact upward pointer keeps the narrow layout clear of controls.
        const x = Math.max(box.left + 28, Math.min(bounds.left + bounds.width / 2, box.right - 28));
        const y = box.top + 1, tipY = Math.max(panelBounds.bottom + 6, box.top - 28);
        const neck = (y + tipY) / 2;
        outline = [[x - 6, y], [x - 6, neck], [x - 14, neck], [x, tipY], [x + 14, neck], [x + 6, neck], [x + 6, y]];
        fill = [[x - 5, y], [x - 5, neck - 1], [x - 11.5, neck - 1], [x, tipY + 2], [x + 11.5, neck - 1], [x + 5, neck - 1], [x + 5, y]];
      }
      const polygon = points => `polygon(${points.map(([x, y]) => `${x}px ${y}px`).join(", ")})`;
      arrowOutline.style.clipPath = polygon(outline);
      arrowFill.style.clipPath = polygon(fill);
    }
    function persist() {
      const value = { step: steps[index].id, visited: true };
      writes = writes.catch(() => {}).then(() => storage.set({ [key]: value }));
      writes.catch(() => { error.textContent = "Could not save tutorial progress. Your place is kept until this page closes."; });
    }
    const loaded = storage.get(key).then(saved => {
      visited = !!saved[key]?.visited;
      const found = steps.findIndex(step => step.id === saved[key]?.step);
      index = found < 0 ? 0 : found;
    }).catch(() => { visited = true; error.textContent = "Could not load saved tutorial progress."; }).finally(() => { ready = true; });
    function place() {
      if (!active || panel.hidden) { card.hidden = true; arrow.hidden = true; return; }
      card.hidden = false;
      const target = steps[index].target();
      if (highlighted !== target) {
        highlighted?.classList.remove("tutorial-target");
        highlighted = target;
        highlighted?.classList.add("tutorial-target");
      }
      const bounds = (target || panel).getBoundingClientRect();
      const panelBounds = panel.getBoundingClientRect();
      card.style.left = `${Math.max(12, panelBounds.left - 318)}px`;
      card.style.top = `${Math.max(12, Math.min(bounds.top, window.innerHeight - card.offsetHeight - 12))}px`;
      drawArrow(bounds, panelBounds);
    }
    function reveal() {
      const target = steps[index].target();
      for (let ancestor = target; ancestor && ancestor !== panel; ancestor = ancestor.parentElement) {
        if (ancestor.tagName === "DETAILS") ancestor.open = true;
      }
      if (target) {
        // Keep the field and its following actions visible below the Settings header.
        panel.scrollTop += target.getBoundingClientRect().top - panel.getBoundingClientRect().top - 110;
      }
      place();
    }
    function show() {
      progress.textContent = `${steps[index].chapter} · ${index + 1} / ${steps.length}`;
      jump.value = String(index);
      title.textContent = steps[index].title;
      description.textContent = steps[index].text;
      setupLink.hidden = !steps[index].link;
      if (steps[index].link) setupLink.setAttribute("href", steps[index].link);
      previous.disabled = index === 0;
      next.textContent = index === steps.length - 1 ? "Finish" : "Next";
      reveal();
      persist();
    }
    async function open() {
      await loaded;
      visited = true; active = true; panel.hidden = false; card.hidden = false;
      panel.classList.add("tutorial-active");
      trigger.setAttribute("aria-expanded", "true");
      show(); closeButton.focus({ preventScroll: true });
    }
    function close(restoreFocus = true) {
      active = false; card.hidden = true; arrow.hidden = true;
      panel.classList.remove("tutorial-active");
      highlighted?.classList.remove("tutorial-target"); highlighted = null;
      trigger.setAttribute("aria-expanded", "false");
      if (restoreFocus && !panel.hidden) trigger.focus({ preventScroll: true });
    }
    closeButton.addEventListener("click", () => close());
    previous.addEventListener("click", () => { if (index > 0) { index--; show(); } });
    next.addEventListener("click", () => { if (index === steps.length - 1) close(); else { index++; show(); } });
    jump.addEventListener("change", () => { index = Number(jump.value); show(); });
    root.addEventListener("keydown", event => {
      if (active && event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); }
    });
    panel.addEventListener("scroll", place, { passive: true });
    window.addEventListener("resize", place);
    // Rows can be rebuilt after edits; resolve targets again without moving focus.
    new MutationObserver(() => { if (active) place(); }).observe(panel, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "open"] });
    new ResizeObserver(place).observe(card);
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-controls", "tutorial");
    return { open, close, maybeStart(eligible) { if (ready && !visited && eligible) { visited = true; void open(); } } };
  }
  return { create };
})();
if (typeof module !== "undefined") module.exports = KaraokeTutorial;
