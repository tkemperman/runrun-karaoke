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
