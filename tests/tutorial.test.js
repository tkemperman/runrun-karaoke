"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");

function fixture(saved, failSave = false) {
  const elements = [];
  class Element {
    constructor(tag) { this.tagName = tag.toUpperCase(); this.children = []; this.listeners = {}; this.hidden = false; this.style = {}; this.offsetHeight = 250; this.classes = new Set(); this.classList = { add: v => this.classes.add(v), remove: v => this.classes.delete(v) }; elements.push(this); }
    append(child) { this.children.push(child); child.parentElement = this; }
    setAttribute(key, value) { this[key] = value; }
    addEventListener(type, listener) { this.listeners[type] = listener; }
    focus() { this.focused = true; }
    scrollIntoView() {}
    getBoundingClientRect() { return { left: 700, top: 200 }; }
    fire(type) { this.listeners[type]?.({}); }
  }
  let data = saved;
  const context = { module: { exports: {} }, document: { createElement: tag => new Element(tag) }, window: { innerHeight: 900, addEventListener() {} }, MutationObserver: class { observe() {} }, ResizeObserver: class { observe() {} } };
  vm.runInNewContext(fs.readFileSync("src/tutorial.js", "utf8"), context);
  const root = new Element("div"), panel = new Element("section"), trigger = new Element("button"), field = new Element("input");
  panel.append(field);
  const guide = context.module.exports.create({ root, panel, trigger, storage: {
    get: async () => ({ karaokeTutorial: data }),
    set: async value => { if (failSave) throw Error("Storage unavailable"); data = value.karaokeTutorial; }
  }, steps: ["first", "second", "third"].map(id => ({ id, chapter: "Basics", title: id, text: id, target: () => field })) });
  return { guide, elements, panel, trigger, data: () => data, find: text => elements.find(e => e.textContent === text), card: elements.find(e => e.id === "tutorial") };
}
const settle = () => new Promise(resolve => setImmediate(resolve));
test("tutorial starts once when a video is ready, preserves position on close, and restores after reload", async () => {
  const f = fixture(); await settle();
  f.guide.maybeStart(false); assert.equal(f.card.hidden, true);
  f.guide.maybeStart(true); await settle(); assert.equal(f.card.hidden, false);
  f.find("Next").fire("click"); await settle(); assert.equal(f.data().step, "second");
  f.guide.close(); f.guide.maybeStart(true); await settle(); assert.equal(f.card.hidden, true);
  await f.guide.open(); assert.equal(f.elements.find(e => e.tagName === "H3").textContent, "second");
  const reloaded = fixture(f.data()); await settle();
  reloaded.guide.maybeStart(true); assert.equal(reloaded.card.hidden, true);
  await reloaded.guide.open(); assert.equal(reloaded.elements.find(e => e.tagName === "H3").textContent, "second");
  reloaded.find("Previous").fire("click"); await settle(); assert.equal(reloaded.data().step, "first");
});
test("chapter jumps and finishing retain the last step without restarting automatically", async () => {
  const f = fixture(); await f.guide.open();
  const select = f.elements.find(e => e.tagName === "SELECT"); select.value = "2"; select.fire("change");
  await settle(); assert.equal(f.data().step, "third");
  f.find("Finish").fire("click"); assert.equal(f.card.hidden, true);
  f.guide.maybeStart(true); assert.equal(f.card.hidden, true);
});
test("unknown saved steps fall back safely and storage failures leave navigation usable", async () => {
  const f = fixture({ visited: true, step: "removed" }, true); await f.guide.open(); await settle();
  assert.equal(f.elements.find(e => e.tagName === "H3").textContent, "first");
  assert.ok(f.elements.some(e => e.textContent?.includes("Could not save")));
  f.find("Next").fire("click"); assert.equal(f.elements.find(e => e.tagName === "H3").textContent, "second");
});
