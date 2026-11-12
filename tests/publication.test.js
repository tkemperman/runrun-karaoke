"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

// Exercise the actual publication controls without a browser or GitHub writes.
const source = fs.readFileSync("src/content.js", "utf8");
const publication = source.slice(source.indexOf("  const publicationReview ="), source.indexOf('  const manual = section("Import / export")'));
function fixture() {
  const nodes = [], requests = [], statuses = [];
  function el(tag, text, parent, attrs = {}) {
    const node = { tag, textContent: text, attrs, hidden: false, disabled: false,
      replaceChildren() {}, scrollIntoView() {}, focus() {} };
    nodes.push(node); return node;
  }
  function button(text, parent, action) {
    const node = el("button", text, parent);
    node.click = () => node.disabled ? undefined : action();
    return node;
  }
  const context = {
    project: { blocks: [{ text: "Example lyric" }] }, generation: 1,
    C: { validate: value => structuredClone(value) },
    currentVideoTitle: () => "Example video", requireProject() {},
    el, button, repositoryButton: (text, action) => button(text, null, action),
    repositorySection: {}, contributionNotice: {}, offerContribution: async () => {},
    repositoryNotify: message => statuses.push(message),
    request: async message => {
      requests.push(message);
      if (message.type === "repository-settings") return { hasToken: true };
      if (message.type === "repository-inspect") return {
        sha: "reviewed-revision", file: "translations/example/en.json",
        target: { repo: "example/catalog", branch: "main" }
      };
      if (message.type === "repository-publish" && context.uploadError) throw Error(context.uploadError);
      return {};
    }
  };
  vm.runInNewContext(publication, context);
  return { context, nodes, requests, statuses,
    click: text => nodes.findLast(node => node.tag === "button" && node.textContent === text).click(),
    uploads: () => requests.filter(message => message.type === "repository-publish") };
}
test("publication review and cancellation do not upload", async () => {
  const f = fixture();
  await f.click("Publish project to GitHub");
  assert.equal(f.uploads().length, 0);
  assert.ok(f.nodes.some(node => node.textContent === "example/catalog · main"));
  assert.ok(f.nodes.some(node => node.textContent === "translations/example/en.json"));
  await f.click("Cancel");
  assert.equal(f.uploads().length, 0);
  assert.match(f.statuses.at(-1), /cancelled/);
});
test("explicit confirmation publishes the reviewed project and revision", async () => {
  const f = fixture(); await f.click("Publish project to GitHub");
  await f.click("Confirm publication");
  assert.equal(f.uploads().length, 1);
  assert.equal(f.uploads()[0].sha, "reviewed-revision");
  assert.equal(f.uploads()[0].project.blocks[0].text, "Example lyric");
  assert.match(f.statuses.at(-1), /Published to example\/catalog/);
});
test("project edits and navigation invalidate pending publication", async () => {
  for (const change of [f => { f.context.project.blocks[0].text = "Changed lyric"; }, f => { f.context.generation++; }, f => { f.context.currentVideoTitle = () => "Different video"; }]) {
    const f = fixture(); await f.click("Publish project to GitHub"); change(f);
    await f.click("Confirm publication");
    assert.equal(f.uploads().length, 0);
    assert.match(f.statuses.at(-1), /Project changed/);
  }
});
test("failed uploads show the error and restore publication controls", async () => {
  const f = fixture(); f.context.uploadError = "GitHub request failed (403).";
  await f.click("Publish project to GitHub"); await f.click("Confirm publication");
  assert.equal(f.statuses.at(-1), f.context.uploadError);
  assert.equal(f.nodes.find(node => node.textContent === "Publish project to GitHub").disabled, false);
  assert.equal(f.nodes.find(node => node.attrs["aria-label"] === "Confirm GitHub publication").hidden, true);
});
