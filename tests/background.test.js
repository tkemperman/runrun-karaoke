const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const C = require('../src/core.js');

function harness(translation = {}, dictionary = {}, repositories = require("../src/repositories.js"), globals = {}) {
  const saved = {}; const sent = []; let listener, command;
  const browser = {
    runtime: { getURL: path => `moz-extension://test/${path}`, onMessage: { addListener(fn) { listener = fn; } } },
    commands: { onCommand: { addListener(fn) { command = fn; } } },
    tabs: { query: async () => [{id: 7}], sendMessage: async (...args) => sent.push(args) },
    storage: { local: {
      get: async key => Array.isArray(key) ? Object.fromEntries(key.map(k => [k, saved[k]])) : ({ [key]: saved[key] }),
      remove: async key => { delete saved[key]; },
      set: async data => Object.assign(saved, data)
    } }
  };
  vm.runInNewContext(fs.readFileSync('src/background.js', 'utf8'), {browser, KaraokeCore: C, KaraokeProjects: require("../src/projects.js"), KaraokeRepositories: repositories, KaraokeProviders: new Map(), KaraokeTranslation: translation, KaraokeDictionary: dictionary, ...globals});
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
test('manifest assets exist and activation defaults to Alt+K with a launcher for the shared Settings panel', () => {
  const m = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
  assert.equal(m.commands['toggle-karaoke'].suggested_key.default, 'Alt+K');
  assert.equal(m.browser_action.default_popup, 'src/launcher.html');
  assert.equal(m.options_ui.page, m.browser_action.default_popup);
  for (const path of m.web_accessible_resources) assert.ok(fs.existsSync(path), path);
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

const settingsSender = { url: 'moz-extension://test/src/settings.html' };
test('repository credentials can only be configured by settings and are never returned to either interface', async () => {
  const h = harness();
  const settings = { retrieval: { repo: 'community/lyrics' }, publishing: { repo: 'me/lyrics' } };
  assert.match((await h.request({ type: 'save-repository-settings', settings, token: 'secret' })).error, /Settings/);
  const savedResponse = (await h.request({ type: 'save-repository-settings', settings, token: 'secret' }, settingsSender)).data;
  assert.equal(savedResponse.hasToken, true);
  assert.equal(savedResponse.token, undefined);
  const loaded = (await h.request({ type: 'repository-settings' })).data;
  assert.equal(loaded.retrieval.repo, 'me/lyrics');
  assert.equal(loaded.token, undefined);
  assert.equal((await h.request({ type: 'repository-settings' }, settingsSender)).data.token, undefined);
  assert.equal(loaded.hasToken, true);
  await h.request({ type: 'save-repository-settings', settings }, settingsSender);
  assert.equal(h.saved.repositorySettings.token, 'secret');
  await h.request({ type: 'save-repository-settings', settings, token: '' }, settingsSender);
  assert.equal(h.saved.repositorySettings.token, '');
  assert.equal(h.saved.repositorySettings.repository.repo, 'me/lyrics');
  assert.equal(await h.request({ type: 'repository-settings' }, {}), undefined);
  assert.equal(await h.request({ type: 'repository-publish' }, settingsSender), undefined);
});
test('repository publication uses only saved credentials and rejects changed destinations', async () => {
  const R = require('../src/repositories.js'); let received;
  const h = harness({}, {}, { ...R, publishBatch: async (...args) => { received = args; return { file: 'test' }; } });
  const settings = R.settings({ publishing: { repo: 'me/lyrics' } });
  await h.request({ type: 'save-repository-settings', settings, token: 'saved-secret' }, settingsSender);
  const message = { type: 'repository-publish', target: settings.publishing, token: 'untrusted', project: C.project('abcdefghijk'), videoTitle: 'Actual video title', sha: null };
  assert.equal((await h.request(message)).data.file, 'test');
  assert.equal(received[1], 'saved-secret');
  assert.equal(received[4], 'Actual video title');
  assert.match((await h.request({ ...message, target: { repo: 'someone/else', branch: 'main' } })).error, /changed/);
  assert.match((await h.request({ type: 'repository-load', source: { repo: 'stale/repo' } })).error, /changed/);
});

test('public catalog lookup uses the configured repository and returns only exact video matches', async () => {
  const calls = [];
  const h = harness({}, {}, { ...require('../src/repositories.js'),
    catalog: async source => {
      calls.push(source);
      return [
        { videoId: 'h3chCOV_phw', file: 'translations/match/en.json' },
        { videoId: 'abcdefghijk', file: 'translations/other/en.json' }
      ];
    },
    retrieve: async (source, file, videoId) => { calls.push({ source, file, videoId }); return C.project(videoId); }
  });
  h.saved.repositorySettings = { retrieval: { repo: 'other/repo', branch: 'custom' }, token: 'private' };
  const result = await h.request({ type: 'catalog-search', videoId: 'h3chCOV_phw' });
  assert.equal(result.data.length, 1);
  assert.equal(result.data[0].videoId, 'h3chCOV_phw');
  assert.equal(calls[0].repo, 'other/repo');
  assert.equal(calls[0].branch, 'custom');
  const loaded = await h.request({ type: 'catalog-load', videoId: 'h3chCOV_phw', file: result.data[0].file });
  assert.equal(loaded.data.videoId, 'h3chCOV_phw');
  assert.equal(calls[1].source.repo, calls[0].repo);
  assert.equal(h.saved.repositorySettings.token, 'private');
  assert.match((await h.request({ type: 'catalog-search', videoId: 'invalid' })).error, /Invalid video ID/);
});
test('Surprise Me chooses a different unique video from the configured retrieval repository', async () => {
  const h = harness({}, {}, { ...require('../src/repositories.js'),
    catalog: async source => {
      assert.equal(source.repo, 'community/lyrics');
      return [
        { videoId: 'h3chCOV_phw' },
        { videoId: 'abcdefghijk' },
        { videoId: 'abcdefghijk' }
      ];
    }
  });
  const settings = { retrieval: { repo: 'community/lyrics' } };
  await h.request({ type: 'save-repository-settings', settings }, settingsSender);
  const result = await h.request({ type: 'repository-random', videoId: 'h3chCOV_phw' });
  assert.equal(result.data.videoId, 'abcdefghijk');
});
test('Surprise Me has no result for an unconfigured repository or a catalog containing only the current video', async () => {
  let catalogCalls = 0;
  const h = harness({}, {}, { ...require('../src/repositories.js'), catalog: async () => {
    catalogCalls++;
    return [{ videoId: 'h3chCOV_phw' }, { videoId: 'h3chCOV_phw' }];
  } });
  h.saved.repositorySettings = { repository: { repo: '', branch: 'main' } };
  assert.equal((await h.request({ type: 'repository-random', videoId: 'h3chCOV_phw' })).data.videoId, null);
  assert.equal(catalogCalls, 0);
  await h.request({ type: 'save-repository-settings', settings: { retrieval: { repo: 'community/lyrics' } } }, settingsSender);
  assert.equal((await h.request({ type: 'repository-random', videoId: 'h3chCOV_phw' })).data.videoId, null);
  assert.equal(catalogCalls, 1);
});
test('Surprise Me rickrolls only once each April Fools year before returning to repository videos', async () => {
  const RealDate = Date;
  class AprilFoolsDate extends RealDate {
    constructor(...args) { super(...(args.length ? args : ['2027-04-01T12:00:00'])); }
  }
  const h = harness({}, {}, { ...require('../src/repositories.js'), catalog: async () => [{ videoId: 'abcdefghijk' }] }, { Date: AprilFoolsDate });
  await h.request({ type: 'save-repository-settings', settings: { retrieval: { repo: 'community/lyrics' } } }, settingsSender);
  const availability = await h.request({ type: 'repository-random-available', videoId: 'h3chCOV_phw' });
  assert.equal(availability.data.available, true);
  const first = await h.request({ type: 'repository-random', videoId: 'h3chCOV_phw' });
  assert.equal(first.data.videoId, '668r-uYMFfA');
  assert.equal(h.saved.surpriseRickrollYear, 2027);
  const second = await h.request({ type: 'repository-random', videoId: 'h3chCOV_phw' });
  assert.equal(second.data.videoId, 'abcdefghijk');
});
test('Surprise Me skips deleted YouTube videos and automatically tries the next random candidate', async () => {
  const checked = [];
  const h = harness({}, {}, { ...require('../src/repositories.js'), catalog: async () => [
    { videoId: 'abcdefghijk' }, { videoId: 'zyxwvutsrqp' }
  ] }, {
    AbortSignal: { timeout: () => undefined },
    Math: { floor: Math.floor, random: () => 0.9 },
    fetch: async url => { checked.push(url); return { status: url.includes('abcdefghijk') ? 404 : 200 }; }
  });
  await h.request({ type: 'save-repository-settings', settings: { retrieval: { repo: 'community/lyrics' } } }, settingsSender);
  const result = await h.request({ type: 'repository-random', videoId: 'h3chCOV_phw' });
  assert.equal(result.data.videoId, 'zyxwvutsrqp');
  assert.equal(checked.length, 2);
});
test('Surprise Me stops after checking every unique candidate when all catalog videos are deleted', async () => {
  let checks = 0;
  const h = harness({}, {}, { ...require('../src/repositories.js'), catalog: async () => [
    { videoId: 'abcdefghijk' }, { videoId: 'abcdefghijk' }, { videoId: 'zyxwvutsrqp' }
  ] }, {
    AbortSignal: { timeout: () => undefined },
    fetch: async () => { checks++; return { status: 404 }; }
  });
  await h.request({ type: 'save-repository-settings', settings: { retrieval: { repo: 'community/lyrics' } } }, settingsSender);
  const result = await h.request({ type: 'repository-random', videoId: 'h3chCOV_phw' });
  assert.equal(result.data.videoId, null);
  assert.equal(checks, 2);
});

test('automatic loading uses English, stores provenance, and refuses local edits and deletion markers', async () => {
  const remote=C.project('abcdefghijk'); remote.originalLanguage='sr'; remote.blocks=[C.block('Original',0,2)];remote.blocks[0].translations.en='English';
  let retrieves=0;
  const h=harness({}, {}, {...require('../src/repositories.js'), catalog:async()=>[{videoId:remote.videoId,translationLanguage:'nl',file:'translations/test/nl.json'},{videoId:remote.videoId,translationLanguage:'en',file:'translations/test/en.json'}],retrieve:async(_s,file)=>{assert.match(file,/en.json$/);retrieves++;return structuredClone(remote);}});
  const loaded=await h.request({type:'project-auto',videoId:remote.videoId,revision:0});
  assert.equal(loaded.data.project.originalLanguage,'sr'); assert.equal(loaded.data.dirty,false);
  const edited=structuredClone(remote);edited.blocks[0].text='Own lyrics';
  await h.request({type:'project-write',project:edited,revision:loaded.data.revision});
  const preserved=await h.request({type:'project-auto',videoId:remote.videoId,revision:2});
  assert.equal(preserved.data.project.blocks[0].text,'Own lyrics'); assert.equal(retrieves,1);
  await h.request({type:'project-delete',videoId:remote.videoId,revision:2});
  const deleted=await h.request({type:'project-auto',videoId:remote.videoId,revision:3});
  assert.equal(deleted.data.project,null);assert.equal(deleted.data.blocked,true);assert.equal(retrieves,1);
});
test('no English catalog translation leaves the project untouched', async () => {
  const h=harness({}, {}, {...require('../src/repositories.js'),catalog:async()=>[{videoId:'abcdefghijk',translationLanguage:'nl'}],retrieve:async()=>assert.fail('No fallback download')});
  const result=await h.request({type:'project-auto',videoId:'abcdefghijk',revision:0});
  assert.equal(result.data.project,null);assert.equal(h.saved['project:abcdefghijk'],undefined);
});
test('Surprise Me only records a navigation intent and never writes the local project', async () => {
  const h=harness({}, {}, {...require('../src/repositories.js'),catalog:async()=>[{videoId:'abcdefghijk',translationLanguage:'en'}]});
  const p=C.project('abcdefghijk');p.blocks=[C.block('My changes')];
  await h.request({type:'project-write',project:p,revision:0});
  const before=JSON.stringify(h.saved['project:abcdefghijk']);
  await h.request({type:'repository-random',videoId:'12345678901'});
  assert.equal(JSON.stringify(h.saved['project:abcdefghijk']),before);
  assert.equal((await h.request({type:'surprise-arrival',videoId:'abcdefghijk'})).data,true);
  assert.equal((await h.request({type:'surprise-arrival',videoId:'abcdefghijk'})).data,false);
});
test('old content scripts cannot recreate a deleted project with the legacy save message', async () => {
  const h=harness(),p=C.project('abcdefghijk');
  await h.request({type:'project-delete',videoId:p.videoId,revision:0});
  assert.match((await h.request({type:'save',project:p})).error,/Reload/);
  assert.equal(h.saved['project:abcdefghijk'],undefined);
});
