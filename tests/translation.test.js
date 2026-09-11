const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../src/translation.js');
const lines = [{ id: 'a', text: 'A new morning' }, { id: 'b', text: 'A new morning' }];
const response = entries => ({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ lines: entries }) }] }] });
const entries = [{ id: 'b', translation: 'Een nieuwe ochtend' }, { id: 'a', translation: 'Een nieuwe ochtend' }];
test('translation maps reordered responses by ID and keeps repeated lines separate', () => {
  assert.deepEqual(T.parse(response(entries), lines), entries.toReversed());
});
test('incomplete, refused, malformed, missing, duplicate, unknown and empty translations are rejected', () => {
  for (const invalid of [
    { status: 'incomplete' },
    { status: 'completed', output: [{ content: [{ type: 'refusal' }] }] },
    { status: 'completed', output: [{ content: [{ type: 'output_text', text: 'bad json' }] }] },
    response(entries.slice(1)), response([entries[0], entries[0]]),
    response([entries[0], { id: 'unknown', translation: 'Other' }]),
    response([entries[0], { id: 'a', translation: ' ' }])
  ]) assert.throws(() => T.parse(invalid, lines));
});
for (const model of ["gpt-6-astra", "gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna", "gpt-5.5", "gpt-5", "gpt-4.1", "gpt-4o", "gpt-4o-mini"]) test(`${model} sends all original lines with strict schema and no remote response storage`, async () => {
  const result = await T.translate({ apiKey: 'test-key', model, language: 'nl', lines }, async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    assert.equal(options.headers.Authorization, 'Bearer test-key');
    const body = JSON.parse(options.body);
    assert.equal(body.model, model);
    assert.equal(body.store, false);
    assert.equal(body.text.format.strict, true);
    assert.deepEqual(JSON.parse(body.input), { target_language: 'nl', lines });
    return { ok: true, json: async () => response(entries) };
  });
  assert.deepEqual(result, entries.toReversed());
});
test('API errors do not expose response bodies or credentials', async () => {
  for (const status of [401, 403, 404, 429, 500]) {
    await assert.rejects(T.translate({ apiKey: 'secret-key', model: 'gpt-6-astra', language: 'nl', lines }, async () => ({ ok: false, status })), error => !error.message.includes('secret-key'));
  }
});
test('invalid requests fail before any network call', async () => {
  for (const patch of [{ lines: [] }, { lines: [lines[0], lines[0]] }, { model: 'fake-model' }, { apiKey: '' }]) {
    await assert.rejects(T.translate({ apiKey: 'key', model: 'gpt-6-astra', language: 'nl', lines, ...patch }, () => assert.fail('No network request expected')));
  }
});

const japanese = [{ id: 'a', text: '海へ進め！' }, { id: 'b', text: 'Hello' }, { id: 'c', text: '' }];
const readings = [
  { id: 'c', segments: [] },
  { id: 'b', segments: [{ text: 'Hello', reading: null }] },
  { id: 'a', segments: [{ text: '海', reading: 'うみ' }, { text: 'へ', reading: null }, { text: '進め', reading: 'すすめ' }, { text: '！', reading: null }] }
];
test('AI furigana sends the complete context, validates segments and maps reordered IDs', async () => {
  const result = await T.generateFurigana({ apiKey: 'test-key', model: 'gpt-5', lines: japanese }, async (url, options) => {
    const body = JSON.parse(options.body);
    assert.deepEqual(JSON.parse(body.input), { lines: japanese });
    assert.equal(body.store, false);
    assert.equal(body.text.format.strict, true);
    assert.equal(body.text.format.name, 'lyrics_furigana');
    assert.match(body.instructions, /complete song as context/);
    return { ok: true, json: async () => response(readings) };
  });
  assert.deepEqual(result.map(row => row.id), ['a', 'b', 'c']);
  assert.deepEqual(result[0].furigana[2], ['進め', 'すすめ']);
  const C = require('../src/core.js');
  const project = C.project('abcdefghijk');
  project.furiganaEnabled = true;
  project.blocks = japanese.map((row, i) => ({ ...C.block(row.text, i, i + 1), id: row.id, furigana: result[i].furigana }));
  assert.deepEqual(C.validate(JSON.parse(JSON.stringify(project))), project);
});
test('AI furigana rejects altered lyrics, missing readings, invalid kana and invalid IDs atomically', () => {
  for (const segments of [
    [{ text: '海へ進め', reading: 'うみへすすめ' }],
    [{ text: '海へ進め！', reading: null }],
    [{ text: '海へ進め！', reading: 'susume' }],
    [null], []
  ]) assert.throws(() => T.parseFurigana(response([...readings.slice(0, 2), { id: 'a', segments }]), japanese));
  for (const invalid of [response(readings.slice(1)), response([readings[0], readings[0], readings[2]]),
    response([...readings.slice(0, 2), { ...readings[2], id: 'unknown' }]),
    { status: 'incomplete' }, { status: 'completed', output: [{ content: [{ type: 'refusal' }] }] },
    { status: 'completed', output: [{ content: [{ type: 'output_text', text: 'bad json' }] }] }
  ]) assert.throws(() => T.parseFurigana(invalid, japanese));
});
test('AI furigana rejects missing key before calling the API', async () => {
  await assert.rejects(T.generateFurigana({ apiKey: '', model: 'gpt-5', lines: japanese }, () => assert.fail('Unexpected network request')), /API key/);
});
