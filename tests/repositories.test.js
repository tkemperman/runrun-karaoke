const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const C = require('../src/core.js');
const R = require('../src/repositories.js');
const source = { repo: 'owner/lyrics', branch: 'main' };
function project() {
  const p = C.project('abcdefghijk', '海の歌');
  p.artist = 'Example'; p.blocks = [C.block('海', 1.25, 3)];
  p.blocks[0].translations.en = 'Sea'; p.blocks[0].furigana = [['海', 'うみ']];
  p.furiganaEnabled = true; p.offset = 0.125;
  return p;
}
function mock(t, responses) {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options });
    assert.ok(responses.length, 'Unexpected network request');
    const response = responses.shift();
    return { status: response.status || 200, ok: (response.status || 200) < 400, text: async () => response.text ?? JSON.stringify(response.data) };
  });
  return calls;
}
test('repository config accepts GitHub URLs and rejects foreign hosts and unsafe paths', () => {
  assert.equal(R.repository('https://github.com/owner/lyrics.git/'), 'owner/lyrics');
  for (const value of ['https://evil.test/a/b', 'owner/repo/extra', 'owner/..', 'a/b?token=x']) assert.throws(() => R.repository(value));
  for (const file of ['../secret', 'translations/../secret.json', 'https://evil.test/a.json', 'translations/a%2fb.json']) assert.throws(() => R.path(file));
  assert.throws(() => R.settings({ retrieval: { repo: 'a/b', branch: '../main' } }));
});
test('public catalog and project retrieval never send authorization and preserve Unicode and timing', async t => {
  const p = project(); const file = 'translations/abcdefghijk/en.json';
  const calls = mock(t, [{data:{schemaVersion:1,entries:[R.entry(p,file)]}}, {data:p}]);
  assert.equal((await R.catalog(source))[0].videoId, p.videoId);
  assert.deepEqual(await R.retrieve(source, file, p.videoId), p);
  for (const call of calls) {
    assert.ok(call.url.startsWith('https://raw.githubusercontent.com/owner/lyrics/main/'));
    assert.equal(call.options.headers, undefined);
    assert.equal(call.options.credentials, 'omit'); assert.equal(call.options.redirect, 'error');
  }
});
test('invalid catalogs, malformed JSON and mismatching projects fail without changing local data', async t => {
  const p = project(), before = JSON.stringify(p), file = 'translations/abcdefghijk/en.json';
  const e = R.entry(p,file);
  assert.throws(() => R.index({schemaVersion:1,entries:[e,e]}), /Invalid/);
  assert.throws(() => R.index({schemaVersion:1,entries:[{...e,file:'../private.json'}]}), /path/);
  mock(t,[{text:'invalid'}, {data:p}, {data:{...p,blocks:[{...p.blocks[0],start:-1}]}}]);
  await assert.rejects(R.catalog(source), /invalid JSON/);
  await assert.rejects(R.retrieve(source,file,'12345678901'), /another video/);
  await assert.rejects(R.retrieve(source,file,p.videoId), /Times/);
  assert.equal(JSON.stringify(p),before);
});
test('new Unicode projects publish once, exclude extra metadata, and use authenticated Contents API', async t => {
  const p = project(); p.token = 'accidental-secret'; p.blocks[0].settings = { token:'accidental-secret' };
  const calls = mock(t,[{status:404},{data:{content:{}}}]);
  const destination = await R.inspect(source,'saved-token',p,'Live 海の歌');
  assert.equal(destination.sha,null);
  assert.equal(destination.file, 'translations/live-海の歌-abcdefghijk/en.json');
  assert.ok(calls[0].url.includes('live-%E6%B5%B7%E3%81%AE%E6%AD%8C-abcdefghijk/en.json'));
  await R.publish(source,'saved-token',p,destination.sha,'Live 海の歌');
  const put = calls[1]; assert.equal(put.options.method,'PUT');
  assert.equal(put.url, calls[0].url.split('?')[0]);
  assert.equal(put.options.headers.Authorization,'Bearer saved-token');
  const body = JSON.parse(put.options.body);
  assert.equal(body.branch,'main'); assert.equal(body.sha,undefined);
  const decoded = Buffer.from(body.content,'base64').toString('utf8');
  assert.ok(!decoded.includes('accidental-secret'));
  assert.deepEqual(JSON.parse(decoded),{...R.cleanProject(p), videoTitle: 'Live 海の歌'});
});
test('updates carry the reviewed SHA; conflicts and API errors never expose response bodies', async t => {
  const sha = 'a'.repeat(40), p = project();
  const calls = mock(t,[{data:{type:'file',sha}},{status:409,text:'sensitive response saved-token'}]);
  const destination = await R.inspect(source,'saved-token',p,'Live 海の歌');
  await assert.rejects(R.publish(source,'saved-token',p,destination.sha,'Live 海の歌'), error => /409/.test(error.message) && !/saved-token|sensitive/.test(error.message));
  assert.equal(JSON.parse(calls[1].options.body).sha,sha);
  assert.equal(calls.length,2);
});
test('invalid projects, tokens and file revisions fail before network access', async t => {
  const calls = mock(t,[]), p = project();
  await assert.rejects(R.publish(source,'',p,null,'Video title'), /token/);
  await assert.rejects(R.publish(source,'token',p,undefined,'Video title'), /destination/);
  await assert.rejects(R.publish(source,'token',{...p,videoId:'invalid'},null), /video ID/);
  assert.equal(calls.length,0);
});
test('template generator indexes valid files deterministically and preserves previous index on invalid input', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(),'karaoke-catalog-'));
  try {
    fs.cpSync('lyrics-repository-template',temp,{recursive:true});
    const directory = path.join(temp,'translations','abcdefghijk-海の歌');
    fs.mkdirSync(directory);
    const file = path.join(directory,'en.json');
    fs.writeFileSync(file,JSON.stringify(project()));
    execFileSync(process.execPath,[path.join(temp,'scripts/build-index.js')]);
    const before = fs.readFileSync(path.join(temp,'index.json'),'utf8');
    assert.equal(R.index(JSON.parse(before))[0].title,'海の歌');
    execFileSync(process.execPath,[path.join(temp,'scripts/build-index.js')]);
    assert.equal(fs.readFileSync(path.join(temp,'index.json'),'utf8'),before);
    fs.writeFileSync(file,'{}');
    assert.throws(() => execFileSync(process.execPath,[path.join(temp,'scripts/build-index.js')],{stdio:'pipe'}));
    assert.equal(fs.readFileSync(path.join(temp,'index.json'),'utf8'),before);
  } finally { fs.rmSync(temp,{recursive:true,force:true}); }
});
test('template validators stay aligned with the extension', () => {
  for (const file of ['core.js','repositories.js']) assert.equal(fs.readFileSync(`src/${file}`,'utf8'),fs.readFileSync(`lyrics-repository-template/scripts/${file}`,'utf8'));
});

test('repository exports retain only the last source of legacy projects', () => {
  const p = project();
  p.schemaVersion = 2; delete p.source;
  p.sources = [
    { provider: 'lrclib', url: 'https://lrclib.net/api/get/10831983' },
    { provider: 'lrclib', url: 'https://lrclib.net/api/get/15913865', original: '歌' }
  ];
  const exported = R.cleanProject(p);
  assert.deepEqual(exported.source, { provider: 'lrclib', url: p.sources[1].url });
  assert.equal(exported.sources, undefined);
  assert.deepEqual(exported.blocks, p.blocks);
  assert.equal(p.sources.length, 2);
});

test('title slugs collapse whitespace and hyphens, separate punctuation, and retain Unicode', () => {
  assert.equal(R.titleSlug('  My   SONG -- Live!  '), 'my-song-live');
  assert.equal(R.titleSlug('バラライカ (第27話〜51話 OP)'), 'バラライカ-第27話-51話-op');
  assert.equal(R.titleSlug('Été\tCafe\u0301 中文 한글'), 'été-café-中文-한글');
  assert.equal(R.titleSlug('../A_ B? #C/🎵'), 'a-b-c');
  assert.equal(R.titleSlug(' 🎵?! '), 'untitled');
  assert.equal(R.titleSlug('【Hololive EN / Gawr Gura】Miki Matsubara - Stay With Me'), 'hololive-en-gawr-gura-miki-matsubara-stay-with-me');
  assert.ok(Buffer.byteLength(R.titleSlug('歌'.repeat(2000))) <= 220);
});
test('Unicode catalog paths load using encoded URLs while legacy paths remain valid', async t => {
  const p = project(), file = 'translations/abcdefghijk-海の歌/en.json';
  assert.equal(R.path(file), file);
  assert.equal(R.path('translations/abcdefghijk/en.json'), 'translations/abcdefghijk/en.json');
  for (const invalid of ['translations/歌/../en.json', 'translations/歌%2f/en.json', 'translations/歌?x/en.json', 'translations/歌#x/en.json']) assert.throws(() => R.path(invalid));
  const calls = mock(t, [{data:p}]);
  assert.deepEqual(await R.retrieve(source,file,p.videoId),p);
  assert.ok(calls[0].url.endsWith('abcdefghijk-%E6%B5%B7%E3%81%AE%E6%AD%8C/en.json'));
});

test('video ID still matches after title changes independently of the folder name', async t => {
  const p = project();
  p.title = 'A completely different title';
  const file = 'translations/abcdefghijk-海の歌/en.json';
  const calls = mock(t, [{data:{schemaVersion:1,entries:[R.entry(p,file)]}}, {data:p}, {data:p}]);
  const entries = await R.catalog(source);
  const match = entries.find(entry => entry.videoId === p.videoId);
  assert.equal(match.file, file);
  assert.deepEqual(await R.retrieve(source,match.file,p.videoId),p);
  await assert.rejects(R.retrieve(source,match.file,'12345678901'), /another video/);
  assert.equal(calls.length, 3);
});

test('publishing requires the actual video title and never falls back to the lyric title', async t => {
  const p = project(), calls = mock(t, []);
  for (const videoTitle of [undefined, null, '', '   ', 42]) {
    await assert.rejects(R.inspect(source, 'token', p, videoTitle), /YouTube video title/);
    await assert.rejects(R.publish(source, 'token', p, null, videoTitle), /YouTube video title/);
  }
  assert.equal(calls.length, 0);
});

test('repository export adds a canonical video URL to existing projects', () => {
  const p = project();
  delete p.videoUrl;
  const exported = R.cleanProject(p);
  assert.equal(exported.videoUrl, `https://www.youtube.com/watch?v=${p.videoId}`);
  assert.equal(p.videoUrl, undefined);
  assert.deepEqual(exported.blocks, p.blocks);
});

test('video titles retain punctuation and case in JSON while folder names are sanitized', async t => {
  const p = project(), videoTitle = '【Hololive EN / Gawr Gura】Miki Matsubara - Stay With Me';
  const calls = mock(t, [{data:{}}]);
  const result = await R.publish(source, 'token', p, null, videoTitle);
  assert.equal(result.file, 'translations/hololive-en-gawr-gura-miki-matsubara-stay-with-me-abcdefghijk/en.json');
  const payload = JSON.parse(Buffer.from(JSON.parse(calls[0].options.body).content, 'base64').toString('utf8'));
  assert.equal(payload.videoTitle, videoTitle);
  assert.equal(payload.title, p.title);
  assert.equal(payload.videoUrl, 'https://www.youtube.com/watch?v=abcdefghijk');
});
