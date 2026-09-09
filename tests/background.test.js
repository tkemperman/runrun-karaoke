const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const C = require('../src/core.js');

function harness() {
  const saved = {}; const sent = []; let listener, command;
  const browser = {
    runtime: { onMessage: { addListener(fn) { listener = fn; } } },
    commands: { onCommand: { addListener(fn) { command = fn; } } },
    tabs: { query: async () => [{id: 7}], sendMessage: async (...args) => sent.push(args) },
    storage: { local: {
      get: async key => ({ [key]: saved[key] }),
      set: async data => Object.assign(saved, data)
    } }
  };
  vm.runInNewContext(fs.readFileSync('src/background.js', 'utf8'), {browser, KaraokeCore: C, KaraokeProviders: new Map()});
  return { saved, sent, command: name => command(name), request: (message, sender = {tab: {id: 7}, url: 'https://www.youtube.com/watch?v=h3chCOV_phw'}) => listener(message, sender) };
}
test('storage isolates projects by video and rejects invalid updates without replacing saved data', async () => {
  const h = harness(); const first = C.project('h3chCOV_phw'); first.blocks = [C.block('Original', 0, 2)];
  assert.equal((await h.request({type:'save', project:first})).data, true);
  const second = C.project('abcdefghijk'); second.title = 'Second video';
  await h.request({type:'save', project:second});
  assert.equal((await h.request({type:'load', videoId:first.videoId})).data.blocks[0].text, 'Original');
  assert.equal((await h.request({type:'load', videoId:second.videoId})).data.title, 'Second video');
  first.blocks[0].end = -1;
  assert.match((await h.request({type:'save', project:first})).error, /Times/);
  assert.equal((await h.request({type:'load', videoId:first.videoId})).data.blocks[0].end, 2);
});
test('messages from unrelated pages are ignored', async () => {
  const h = harness(); assert.equal(await h.request({type:'load', videoId:'h3chCOV_phw'}, {tab:{id:2},url:'https://example.com'}), undefined);
});
test('activation command targets the active tab', async () => {
  const h = harness(); await h.command('toggle-karaoke');
  assert.equal(h.sent[0][0], 7); assert.equal(h.sent[0][1].type, 'toggle-enabled');
});
test('manifest assets exist and activation defaults to Alt+K with settings directly in the popup', () => {
  const m = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
  assert.equal(m.commands['toggle-karaoke'].suggested_key.default, 'Alt+K');
  assert.equal(m.browser_action.default_popup, 'src/settings.html');
  for (const path of [...m.background.scripts, ...m.content_scripts.flatMap(c => c.js), m.browser_action.default_popup, m.options_ui.page]) assert.ok(fs.existsSync(path), path);
});
