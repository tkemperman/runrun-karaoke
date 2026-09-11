const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const C = require('../src/core.js');

function harness(translation = {}, dictionary = {}) {
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
  vm.runInNewContext(fs.readFileSync('src/background.js', 'utf8'), {browser, KaraokeCore: C, KaraokeProviders: new Map(), KaraokeTranslation: translation, KaraokeDictionary: dictionary});
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
for (const model of ["gpt-6-astra", "gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna", "gpt-5.5", "gpt-5", "gpt-4.1", "gpt-4o", "gpt-4o-mini"]) test(`${model} preferences and key persist separately from projects and key is never returned`, async () => {
  const h = harness();
  const settings = { type: 'save-translation-settings', model, language: 'nl', apiKey: 'private-key' };
  assert.equal((await h.request(settings)).data.hasApiKey, true);
  const loaded = (await h.request({ type: 'translation-settings' })).data;
  assert.equal(loaded.model, model); assert.equal(loaded.language, 'nl');
  assert.equal(loaded.hasApiKey, true); assert.equal(loaded.apiKey, undefined);
  await h.request({ type: 'save-translation-settings', model: 'gpt-6-astra', language: 'en' });
  assert.equal(h.saved.translationSettings.apiKey, 'private-key');
  const project = C.project('h3chCOV_phw');
  await h.request({ type: 'save', project });
  assert.ok(!JSON.stringify((await h.request({ type: 'load', videoId: project.videoId })).data).includes('private-key'));
  await h.request({ ...settings, apiKey: '' });
  assert.equal((await h.request({ type: 'translation-settings' })).data.hasApiKey, false);
});

test('translation uses the saved key in the background without trusting a supplied key', async () => {
  let received;
  const h = harness({ translate: async args => { received = args; return [{ id: 'a', translation: 'Hallo' }]; } });
  await h.request({ type: 'save-translation-settings', model: 'gpt-6-astra', language: 'nl', apiKey: 'saved-key' });
  const result = await h.request({ type: 'translate', apiKey: 'wrong-key', model: 'gpt-6-astra', language: 'nl', lines: [{ id: 'a', text: 'Hello' }] });
  assert.equal(received.apiKey, 'saved-key');
  assert.equal(result.data[0].translation, 'Hallo');
  assert.ok(!JSON.stringify(result).includes('saved-key'));
});


test('furigana shares dictionary initialization and validates batches before accessing dictionaries', async () => {
  let loads = 0, downloads = 0;
  const dictionary = {
    load: async () => { loads++; return null; },
    download: async () => { downloads++; return { entries: [] }; },
    createMatcher: () => ({ segment: text => text === '今日' ? [['今日', 'きょう']] : null })
  };
  const h = harness({}, dictionary);
  assert.match((await h.request({ type: 'furigana', texts: [42] })).error, /Invalid/);
  assert.equal(loads, 0);
  const results = await Promise.all([h.request({ type: 'furigana', texts: ['今日', 'abc', ''] }), h.request({ type: 'furigana', texts: ['今日'] })]);
  assert.equal(loads, 1); assert.equal(downloads, 1);
  assert.equal(JSON.stringify(results[0].data), JSON.stringify([[['今日', 'きょう']], [['abc', null]], []]));
});

test('failed dictionary initialization can be retried', async () => {
  let calls = 0;
  const h = harness({}, {
    load: async () => { if (!calls++) throw new Error('Storage unavailable'); return { entries: [] }; },
    createMatcher: () => ({ segment: () => null })
  });
  assert.match((await h.request({ type: 'furigana', texts: ['今日'] })).error, /Storage unavailable/);
  assert.ok((await h.request({ type: 'furigana', texts: ['今日'] })).data);
  assert.equal(calls, 2);
});

test('AI furigana uses the stored key and keeps the key out of results', async () => {
  let received;
  const h = harness({ generateFurigana: async args => { received = args; return [{ id: 'a', furigana: [['海', 'うみ']] }]; } });
  await h.request({ type: 'save-translation-settings', model: 'gpt-5', language: 'en', apiKey: 'saved-key' });
  const result = await h.request({ type: 'ai-furigana', apiKey: 'untrusted-key', model: 'gpt-5', lines: [{ id: 'a', text: '海' }] });
  assert.equal(received.apiKey, 'saved-key');
  assert.equal(result.data[0].furigana[0][1], 'うみ');
  assert.ok(!JSON.stringify(result).includes('saved-key'));
});
