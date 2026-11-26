'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const C = require('../src/core.js');
const P = require('../src/projects.js');
const M = require('../src/mcp.js');
function fixture(translate) {
  const p = C.project('abcdefghijk', 'Live'); p.blocks = [C.block('海', 2, 4)]; p.blocks[0].translations.en = 'Sea';
  const data = { ['project:' + p.videoId]: p }, messages = [];
  const store = P.create({ get: async keys => Object.fromEntries(keys.map(key => [key, structuredClone(data[key])])), set: async values => Object.assign(data, structuredClone(values)), remove: async key => { delete data[key]; } }, C);
  const f = { data, p, store, messages, opened: [], publicationCount: 0 };
  f.mcp = M.create({ core: C, store, translate, settings: async () => ({ language: 'nl', model: 'gpt-5' }), tabs: {
    query: async () => f.opened,
    sendMessage: async (id, message) => { messages.push(message); return f.snapshot; }
  }, repository: {
    preferences: async () => ({ source: { repo: 'example/catalog', branch: f.branch || 'main' }, token: 'secret-test-token' }),
    inspect: async () => ({ sha: 'head', files: [{ file: 'translations/live/en.json' }] }),
    publish: async () => { f.publicationCount++; return { revision: 'published' }; }
  }});
  return f;
}
test('MCP reads saved project and target language without credentials; empty projects use preferences', async () => {
  const f = fixture();
  const state = await f.mcp.dispatch({ operation: 'read', arguments: { videoId: f.p.videoId } });
  assert.equal(state.targetLanguage, 'en'); assert.equal(state.hasLyrics, true);
  assert.ok(!JSON.stringify(state).includes('secret'));
  const empty = await f.mcp.dispatch({ operation: 'read', arguments: { videoId: '01234567890' } });
  assert.equal(empty.targetLanguage, 'nl'); assert.equal(empty.hasLyrics, false);
  await assert.rejects(f.mcp.dispatch({ operation: 'get-api-key' }), /Unsupported/);
});
test('MCP validates reverse ruby and atomically applies with stale revision rejection', async () => {
  const f = fixture(), proposal = structuredClone(f.p);
  proposal.blocks[0].text = 'ドーマン'; proposal.blocks[0].furigana = [['ドーマン', '道満']]; proposal.blocks[0].translations.en = 'Dōman';
  const saved = await f.mcp.dispatch({ operation: 'apply', arguments: { project: proposal, revision: 0 } });
  assert.equal(saved.project.blocks[0].translations.en, 'Dōman');
  assert.deepEqual(saved.project.blocks[0].furigana, [['ドーマン', '道満']]);
  await assert.rejects(f.mcp.dispatch({ operation: 'apply', arguments: { project: f.p, revision: 0 } }), /changed/);
  assert.equal((await f.store.read(f.p.videoId)).project.blocks[0].text, 'ドーマン');
});
test('strict writes reject a clean automatic update that arrived between MCP read and write', async () => {
  const f = fixture();
  delete f.data['project:' + f.p.videoId];
  await f.store.write(f.p.videoId, f.p, 0, { automatic: true });
  await assert.rejects(f.store.write(f.p.videoId, f.p, 0, { strict: true }), /changed/);
});
test('MCP refuses conflicting open editor and sends refresh only after saving', async () => {
  const f = fixture(); f.opened = [{ id: 3, url: 'https://www.youtube.com/watch?v=abcdefghijk' }];
  f.snapshot = { project: structuredClone(f.p), revision: 0, duration: 5 };
  f.snapshot.project.blocks[0].text = 'Unsaved';
  await assert.rejects(f.mcp.dispatch({ operation: 'read', arguments: { videoId: f.p.videoId } }), /unsaved/);
  f.snapshot.project = f.p;
  await f.mcp.dispatch({ operation: 'apply', arguments: { project: f.p, revision: 0 } });
  assert.equal(f.messages.at(-1).type, 'mcp-reload'); assert.equal(f.messages.at(-1).state.revision, 1);
});
test('MCP publication review excludes token and rejects changed project or destination', async () => {
  const f = fixture();
  const review = await f.mcp.dispatch({ operation: 'publication-review', arguments: { videoId: f.p.videoId, revision: 0 } });
  assert.ok(!JSON.stringify(review).includes('secret-test-token')); assert.equal(f.publicationCount, 0);
  f.branch = 'other';
  await assert.rejects(f.mcp.dispatch({ operation: 'publish', arguments: { videoId: f.p.videoId, review } }), /settings changed/);
  f.branch = 'main'; await f.store.write(f.p.videoId, f.p, 0);
  await assert.rejects(f.mcp.dispatch({ operation: 'publish', arguments: { videoId: f.p.videoId, review } }), /Project changed/);
  assert.equal(f.publicationCount, 0);
});

const settle = () => new Promise(resolve => setImmediate(resolve));
test('MCP translation runs once in the background, preserves IDs/timing and does not apply results', async () => {
  let finish, calls = 0, options;
  const f = fixture(value => { calls++; options = value; return new Promise(resolve => { finish = resolve; }); });
  const [job, repeated] = await Promise.all([1, 2].map(() => f.mcp.dispatch({ operation: 'start-translation', arguments: { videoId: f.p.videoId } })));
  assert.equal(job.jobId, repeated.jobId); assert.equal(job.status, 'running');
  await settle();
  assert.equal(calls, 1); assert.equal(options.model, 'gpt-5'); assert.equal(options.language, 'en');
  assert.equal(options.includeFurigana, true); assert.equal(options.apiKey, undefined);
  finish({ originalLanguage: 'ja', lines: [{ id: f.p.blocks[0].id, text: '海', translation: 'The sea', furigana: [['海', 'うみ']] }] });
  await settle();
  const result = await f.mcp.dispatch({ operation: 'translation-status', arguments: { videoId: f.p.videoId, jobId: job.jobId } });
  assert.equal(result.status, 'completed'); assert.equal(result.project.blocks[0].translations.en, 'The sea');
  assert.equal(result.project.blocks[0].start, 2); assert.equal(result.project.blocks[0].id, f.p.blocks[0].id);
  assert.equal((await f.store.read(f.p.videoId)).project.blocks[0].translations.en, 'Sea');
  assert.equal(result.revision, 0);
  await assert.rejects(f.mcp.dispatch({ operation: 'translation-status', arguments: { videoId: f.p.videoId, jobId: 'other' } }), /unavailable/);
});
test('MCP translation rejects changed projects and reports validation failures without writing', async () => {
  let finish;
  const f = fixture(() => new Promise(resolve => { finish = resolve; }));
  const job = await f.mcp.dispatch({ operation: 'start-translation', arguments: { videoId: f.p.videoId, includeFurigana: false } });
  await settle();
  await f.store.write(f.p.videoId, f.p, 0);
  finish({ originalLanguage: 'ja', lines: [{ id: f.p.blocks[0].id, text: '海', translation: 'The sea' }] });
  await settle();
  const result = await f.mcp.dispatch({ operation: 'translation-status', arguments: { videoId: f.p.videoId, jobId: job.jobId } });
  assert.equal(result.status, 'error'); assert.match(result.error, /changed during translation/); assert.equal(result.project, undefined);
  const broken = fixture(() => { const error = new Error('Invalid furigana on line 1'); error.furiganaDetails = { line: 1 }; throw error; });
  const failed = await broken.mcp.dispatch({ operation: 'start-translation', arguments: { videoId: broken.p.videoId } });
  await settle();
  const details = await broken.mcp.dispatch({ operation: 'translation-status', arguments: { videoId: broken.p.videoId, jobId: failed.jobId } });
  assert.equal(details.status, 'error'); assert.deepEqual(details.furiganaDetails, { line: 1 });
});
test('MCP translation rejects empty lyrics and invalid options before a paid request', async () => {
  const f = fixture(() => assert.fail('No API call expected'));
  await assert.rejects(f.mcp.dispatch({ operation: 'start-translation', arguments: { videoId: '01234567890' } }), /Add original/);
  await assert.rejects(f.mcp.dispatch({ operation: 'start-translation', arguments: { videoId: f.p.videoId, includeFurigana: 'yes' } }), /Invalid/);
});
