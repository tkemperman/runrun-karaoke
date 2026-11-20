const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../src/translation.js');
const requestLines = lines => lines.map((line, index) => ({ id: String(index + 1), text: line.text }));
function wire(payload, original) {
  const copy = structuredClone(payload);
  for (const output of copy.output || []) for (const content of output.content || []) {
    if (content.type !== 'output_text') continue;
    const data = JSON.parse(content.text);
    for (const row of data.lines || []) {
      const index = original.findIndex(line => line.id === row.id);
      if (index >= 0) row.id = String(index + 1);
    }
    content.text = JSON.stringify(data);
  }
  return copy;
}
const lines = [{ id: 'a', text: 'A new morning' }, { id: 'b', text: 'A new morning' }];
const response = entries => ({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ lines: entries }) }] }] });
const translationResponse = (entries, language) => ({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify({ originalLanguage: language, lines: entries }) }] }] });
const entries = [{ id: 'b', translation: 'Een nieuwe ochtend' }, { id: 'a', translation: 'Een nieuwe ochtend' }];
test('translation maps reordered responses by ID and keeps repeated lines separate', () => {
  assert.deepEqual(T.parse(response(entries), lines), entries.toReversed());
});
test('explicit same-language results become empty translations while missing and invalid values fail', () => {
  assert.deepEqual(T.parse(response([{ id: 'b', translation: null }, { id: 'a', translation: null }]), lines),
    lines.map(({ id }) => ({ id, translation: '' })));
  for (const invalid of [undefined, '', ' ', false, 0, {}, []]) {
    assert.throws(() => T.parse(response([{ id: 'a', translation: null }, { id: 'b', translation: invalid }]), lines));
  }
});
for (const includeFurigana of [false, true]) test(`mixed-language lyrics skip target-language lines with furigana ${includeFurigana ? 'on' : 'off'}`, async () => {
  const original = [
    { id: 'a', text: '青い空' },
    { id: 'b', text: 'A blue sky!' },
    { id: 'c', text: 'A blue sky!' },
    { id: 'd', text: '' }
  ];
  const result = await T.translate({ apiKey: 'test', model: 'gpt-5', language: 'en', lines: original, includeFurigana }, async (_url, options) => {
    const body = JSON.parse(options.body);
    assert.deepEqual(JSON.parse(body.input).lines, requestLines(original));
    assert.match(body.instructions, /language of each supplied lyrics line individually/);
    assert.match(body.instructions, /already entirely in the target language, return null/);
    assert.deepEqual(body.text.format.schema.properties.lines.items.properties.translation.type, ['string', 'null']);
    return { ok: true, json: async () => wire(translationResponse(original.toReversed().map(row => ({
      ...row,
      translation: row.id === 'a' ? 'A blue sky' : row.id === 'd' ? '' : null,
      ...(includeFurigana ? { segments: row.id === 'a'
        ? [{ text: '青い', reading: 'あおい' }, { text: '空', reading: 'そら' }]
        : row.text ? [{ text: row.text, reading: null }] : [] } : {})
    })), 'ja'), original) };
  });
  assert.deepEqual(result.lines.map(({ id, text, translation }) => ({ id, text, translation })),
    original.map(row => ({ ...row, translation: row.id === 'a' ? 'A blue sky' : '' })));
  if (includeFurigana) {
    assert.deepEqual(result.lines[0].furigana, [['青い', 'あおい'], ['空', 'そら']]);
    assert.deepEqual(result.lines[1].furigana, [['A blue sky!', null]]);
  }
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
    assert.deepEqual(JSON.parse(body.input), { target_language: 'nl', lines: requestLines(lines) });
    assert.deepEqual(body.text.format.schema.properties.lines.items.properties.id.enum, ['1', '2']);
    return { ok: true, json: async () => wire(translationResponse(entries.map(row => ({ ...row, text: lines.find(l => l.id === row.id).text })), 'en'), lines) };
  });
  assert.equal(result.originalLanguage, 'en');
  assert.deepEqual(result.lines, entries.toReversed().map(row => ({ ...row, text: lines.find(l => l.id === row.id).text })));
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
    assert.deepEqual(JSON.parse(body.input), { lines: requestLines(japanese) });
    assert.equal(body.store, false);
    assert.equal(body.text.format.strict, true);
    assert.equal(body.text.format.name, 'lyrics_furigana');
    assert.match(body.instructions, /complete song as context/);
    const variants = body.text.format.schema.properties.lines.items.properties.segments.items.anyOf;
    const unannotated = variants.find(v => v.properties.reading.type === 'null');
    const pattern = new RegExp(unannotated.properties.text.pattern, 'u');
    for (const text of ['あの海', '一つ', '𠮷', '々']) assert.equal(pattern.test(text), false);
    for (const text of ['あの', 'カナ', 'Hello', '！ ']) assert.equal(pattern.test(text), true);
    const annotated = variants.find(v => v.properties.reading.type === 'string');
    assert.equal(new RegExp(annotated.properties.reading.pattern).test(' '), false);
    return { ok: true, json: async () => wire(response(readings), japanese) };
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
test('automatic furigana still requires kana even though manual reverse ruby is supported', () => {
  const lines = [{ id: 'a', text: 'ドーマン' }];
  const payload = response([{ id: 'a', segments: [{ text: 'ドーマン', reading: '道満' }] }]);
  assert.throws(() => T.parseFurigana(payload, lines), /non-kana furigana/);
});
test('combined translation and furigana use one request and both are validated before returning', async () => {
  let calls=0;
  const combined=readings.map(row=>({...row,text:japanese.find(l=>l.id===row.id).text,translation:row.id==='c'?'':'Translated'}));
  const result=await T.translate({apiKey:'key',model:'gpt-5',language:'en',lines:japanese,includeFurigana:true},async (_url,options)=>{
    calls++; const body=JSON.parse(options.body), format=body.text.format;
    assert.match(body.instructions, /Every segment containing kanji must have a non-empty kana reading/);
    assert.equal(format.name,'lyrics_translation');
    assert.deepEqual(format.schema.properties.lines.items.required,['id','segments','text','translation']);
    return {ok:true,json:async()=>wire(translationResponse(combined,'ja'),japanese)};
  });
  assert.equal(calls,1); assert.equal(result.lines[0].translation,'Translated'); assert.ok(result.lines[0].furigana);
  for (const patch of [{translation:''},{segments:[]},{id:'bad'}]) {
    await assert.rejects(T.translate({apiKey:'key',model:'gpt-5',language:'en',lines:japanese,includeFurigana:true},async()=>({ok:true,json:async()=>wire(response(combined.map(row=>row.id==='a'?{...row,...patch}:row)),japanese)})));
  }
});
test('missing readings in mixed kana and kanji report original line numbers without returning partial translations', async () => {
  const original = [{ id: 'first', text: 'あの海' }, { id: 'second', text: '空' }];
  const payload = translationResponse([
    { id: 'second', text: '空', translation: 'Sky', segments: [{ text: '空', reading: 'そら' }] },
    { id: 'first', text: 'あの海', translation: 'That sea', segments: [{ text: 'あの海', reading: null }] }
  ], 'ja');
  let calls = 0;
  await assert.rejects(T.translate({ apiKey: 'test', model: 'gpt-5', language: 'en', lines: original, includeFurigana: true }, async () => {
    calls++; return { ok: true, json: async () => wire(payload, original) };
  }), /line 1\. Nothing was changed.*turn off Generate furigana/);
  assert.equal(calls, 1);
  payload.output[0].content[0].text = JSON.stringify({ originalLanguage: 'ja', lines: [
    { id: 'second', text: '空', translation: 'Sky', segments: [{ text: '空', reading: 'そら' }] },
    { id: 'first', text: 'あの海', translation: 'That sea', segments: [{ text: 'あの', reading: null }, { text: '海', reading: 'うみ' }] }
  ] });
  const result = await T.translate({ apiKey: 'test', model: 'gpt-5', language: 'en', lines: original, includeFurigana: true }, async () => ({ ok: true, json: async () => wire(payload, original) }));
  assert.deepEqual(result.lines.map(row => row.id), ['first', 'second']);
  assert.deepEqual(result.lines[0].furigana, [['あの', null], ['海', 'うみ']]);
});
test('billable usage is reported before result validation, without returning credentials or lyric content',async()=>{
 const usage={input_tokens:123,output_tokens:456,input_tokens_details:{cached_tokens:10}};
 let received;
 await assert.rejects(T.translate({apiKey:'private',model:'gpt-5',language:'en',lines,includeFurigana:true,onUsage:async data=>{received=data;}},async()=>({ok:true,json:async()=>({...response(entries),id:'response-billed',model:'gpt-5',usage})})));
 assert.equal(received.id,'response-billed');assert.deepEqual(received.usage,usage);assert.equal(received.output,undefined);assert.equal(received.apiKey,undefined);
});

test('source language is detected without assuming Japanese, and Serbian text cannot be rewritten',async()=>{
 const original=[{id:'a',text:'Dobro jutro'}];
 const result=await T.translate({apiKey:'test',model:'gpt-5',language:'en',lines:original},async(_url,options)=>{
  const body=JSON.parse(options.body);assert.match(body.instructions,/Do not assume Japanese/);assert.ok(body.text.format.schema.required.includes('originalLanguage'));
  return {ok:true,json:async()=>wire(translationResponse([{id:'a',text:'Dobro jutro',translation:'Good morning'}],'sr'),original)};
 });
 assert.equal(result.originalLanguage,'sr');assert.equal(result.lines[0].text,'Dobro jutro');
 await assert.rejects(T.translate({apiKey:'test',model:'gpt-5',language:'en',lines:original},async()=>({ok:true,json:async()=>wire(translationResponse([{id:'a',text:'おはよう',translation:'Good morning'}],'sr'),original)})),/outside/);
});
test('romaji conversion can be enabled or disabled and retains line IDs',async()=>{
 const original=[{id:'a',text:'umi'}];
 const fetcher=async()=>({ok:true,json:async()=>wire(translationResponse([{id:'a',text:'海',translation:'Sea'}],'ja'),original)});
 const result=await T.translate({apiKey:'test',model:'gpt-5',language:'en',lines:original},fetcher);
 assert.equal(result.lines[0].id,'a');assert.equal(result.lines[0].text,'海');
 await assert.rejects(T.translate({apiKey:'test',model:'gpt-5',language:'en',lines:original,convertRomaji:false},fetcher),/outside/);
});

test('short request IDs restore distinct persistent IDs for reordered identical lyrics', async () => {
  const original = [
    { id: '91f2c5d5-69fc-472c-aff5-c7126946c012', text: 'Hello' },
    { id: 'c1a7f1a6-6ec3-4c30-b908-c447a961a931', text: 'Hello' }
  ];
  const before = structuredClone(original);
  const result = await T.translate({ apiKey: 'test', model: 'gpt-5', language: 'nl', lines: original }, async (_url, options) => {
    const body = JSON.parse(options.body);
    assert.deepEqual(JSON.parse(body.input).lines, [{ id: '1', text: 'Hello' }, { id: '2', text: 'Hello' }]);
    assert.equal(original.some(row => options.body.includes(row.id)), false);
    assert.deepEqual(body.text.format.schema.properties.lines.items.properties.id, { type: 'string', enum: ['1', '2'] });
    assert.equal(body.text.format.schema.properties.lines.minItems, 2);
    assert.equal(body.text.format.schema.properties.lines.maxItems, 2);
    return { ok: true, json: async () => translationResponse([
      { id: '2', text: 'Hello', translation: 'Hoi' },
      { id: '1', text: 'Hello', translation: 'Hallo' }
    ], 'en') };
  });
  assert.deepEqual(result.lines, [{ ...original[0], translation: 'Hallo' }, { ...original[1], translation: 'Hoi' }]);
  assert.deepEqual(original, before);
});

test('unknown and duplicate request IDs are rejected without guessing by text or response order', async () => {
  for (const [id, error] of [['unknown', /unknown translation line ID at result 2/], ['1', /duplicate translations for line 1/]]) {
    let calls = 0;
    await assert.rejects(T.translate({ apiKey: 'test', model: 'gpt-5', language: 'nl', lines }, async () => {
      calls++;
      return { ok: true, json: async () => translationResponse([
        { id: '1', text: lines[0].text, translation: 'Eerste' },
        { id, text: lines[1].text, translation: 'Tweede' }
      ], 'en') };
    }), error);
    assert.equal(calls, 1);
  }
});

test('invalid translation values identify the affected line rather than reporting an ID error', () => {
  assert.throws(() => T.parse(response([{ id: 'b', translation: false }, entries[1]]), lines), /invalid translation for line 2/);
});

test('large requests constrain IDs without exceeding the Structured Outputs enum limit', async () => {
  const original = Array.from({ length: 1001 }, (_, i) => ({ id: `saved-${i}`, text: 'Hello' }));
  await T.translate({ apiKey: 'test', model: 'gpt-5', language: 'en', lines: original }, async (_url, options) => {
    const body = JSON.parse(options.body), id = body.text.format.schema.properties.lines.items.properties.id;
    assert.equal(id.enum, undefined);
    const pattern = new RegExp(id.pattern);
    for (const value of ['1', '1000', '1001']) assert.equal(pattern.test(value), true);
    for (const value of ['0', '01', '1002', 'saved-1']) assert.equal(pattern.test(value), false);
    return { ok: true, json: async () => translationResponse(requestLines(original).map(row => ({ ...row, translation: null })), 'en') };
  });
});
