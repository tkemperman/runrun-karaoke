const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../src/core.js');

test('translation matching skips gaps and preserves repeated lines and project data', () => {
  const rows = [C.block('歌', 1, 2), C.block('', 2, 3), C.block('歌', 3, 4)];
  rows[0].translations.en = 'Existing';
  const before = JSON.stringify(rows);
  const matches = C.matchTranslation(rows, '\uFEFF First passage\r\n\r\nSecond passage\r\n');
  assert.deepEqual(matches.map(m => [m.row.id, m.text]), [[rows[0].id, 'First passage'], [rows[2].id, 'Second passage']]);
  assert.equal(JSON.stringify(rows), before);
  assert.throws(() => C.matchTranslation(rows, 'Only one'), /Apply anyway/);
  assert.throws(() => C.matchTranslation(rows, 'One\nTwo\nThree'), /Apply anyway/);
  assert.deepEqual(C.matchTranslation(rows, 'Only one', true).map(m => [m.row.id, m.text]), [[rows[0].id, 'Only one']]);
  assert.deepEqual(C.matchTranslation(rows, 'One\nTwo\nThree', true).map(m => m.text), ['One', 'Two']);
  assert.throws(() => C.matchTranslation(rows, '  '), /Paste a translation/);
  assert.throws(() => C.matchTranslation([], 'One'), /Load lyrics/);
  assert.equal(JSON.stringify(rows), before);
});

test('LRC supports repeated timestamps, fractions, metadata and offsets', () => {
  const rows = C.parseLrc('[ar:Example]\n[offset:500]\n[00:01.2][00:05.250]Sample\n[00:03.00]\n[00:08]Last');
  assert.deepEqual(rows.map(r => [r.start, r.end, r.text]), [[1.7, 3.5, 'Sample'], [3.5, 5.75, ''], [5.75, 8.5, 'Sample'], [8.5, null, 'Last']]);
  assert.equal(new Set(rows.map(r => r.id)).size, 4);
});
test('selection handles boundaries, gaps, backward seeks and offset sign', () => {
  const rows = [C.block('A', 1, 3), C.block('B', 5, 7)];
  assert.equal(C.activeBlock(rows, 0), null);
  assert.equal(C.activeBlock(rows, 1).text, 'A');
  assert.equal(C.activeBlock(rows, 3), null);
  assert.equal(C.activeBlock(rows, 6).text, 'B');
  assert.equal(C.activeBlock(rows, 2).text, 'A');
  assert.equal(C.activeBlock(rows, 2, 2), null);
  assert.equal(C.activeBlock(rows, 3, 2).text, 'A');
  assert.equal(C.activeBlock(rows, 0, -1).text, 'A');
});
test('blank LRC entries clear the previous line without bringing it back', () => {
  const rows = C.parseLrc('[00:01]A\n[00:02]\n[00:04]B');
  assert.equal(C.activeBlock(rows, 3), null);
  assert.equal(C.activeBlock(rows, 4).text, 'B');
});
test('untimed blocks never appear, open ends stop at the next timed block', () => {
  const rows = [C.block('untimed'), C.block('A', 2), C.block('B', 5, 6)];
  assert.equal(C.activeBlock(rows, 0), null);
  assert.equal(C.activeBlock(rows, 5).text, 'B');
  assert.equal(C.activeBlock(rows, 7), null);
});
test('JSON round trip preserves Japanese, translations and source provenance', () => {
  const p = C.project('h3chCOV_phw'); p.blocks = [C.block('こんにちは', 1, 2)];
  p.blocks[0].translations.en = 'Hello'; p.source = { provider: 'example', url: 'https://example.com/' };
  const result = C.validate(JSON.parse(JSON.stringify(p)));
  assert.deepEqual(result, p); assert.notEqual(result.blocks, p.blocks);
});
test('invalid imports reject unsupported schemas, bad times and duplicate IDs', () => {
  const p = C.project('h3chCOV_phw'); p.blocks = [C.block('A', 3, 2)];
  assert.throws(() => C.validate(p), /End time/);
  p.blocks[0].end = 4; p.blocks.push({...p.blocks[0]});
  assert.throws(() => C.validate(p), /unique/);
  assert.throws(() => C.validate({...p, schemaVersion: 99}), /schema/);
  assert.throws(() => C.parseLrc('plain text'), /No timed/);
});
test('live stamping closes the preceding line and permits retiming', () => {
  const rows = [C.block('A'), C.block('B')];
  C.stamp(rows, 0, 10); C.stamp(rows, 1, 12);
  assert.equal(rows[0].end, 12); assert.equal(rows[1].start, 12);
  assert.throws(() => C.stamp(rows, 1, 9), /after/);
  assert.throws(() => C.stamp(rows, 2, 15), /valid/);
  C.stamp(rows, 0, 20); assert.equal(rows[0].end, null);
});

test('offset aligns lyrics with the exact video start and end', () => {
  const rows = [C.block('First', 15.27, 21.82), C.block('Next', 21.82, 25)];
  const delay = 33 - rows[0].start;
  assert.equal(C.activeBlock(rows, 32.999, delay), null);
  assert.equal(C.activeBlock(rows, 33, delay), rows[0]);
  assert.equal(C.activeBlock(rows, 36.64, delay), rows[0]);
  assert.equal(C.activeBlock(rows, 21.82 + delay, delay), rows[1]);
  assert.equal(C.activeBlock(rows, 25 + delay, delay), null);
  assert.equal(C.activeBlock(rows, 5, 5 - rows[0].start), rows[0]);
});

test('sync initializes untimed lyrics and preserves existing timing and fractional video position', () => {
  const p = C.project('h3chCOV_phw');
  p.blocks = [C.block('First'), C.block('Second')];
  C.syncLine(p, p.blocks[0], 33.125);
  assert.equal(p.blocks[0].start, 33.125);
  assert.equal(p.blocks[1].start, null);
  assert.equal(p.offset, 0);
  C.syncLine(p, p.blocks[0], 35.375);
  assert.equal(p.offset, 2.25);
  C.syncLine(p, p.blocks[1], 40.5);
  assert.equal(p.blocks[1].start + p.offset, 40.5);
  assert.equal(p.blocks[0].start + p.offset, 35.375);
  C.syncLine(p, p.blocks[1], 42.625);
  assert.equal(p.blocks[0].start + p.offset, 37.5);
  assert.equal(p.blocks[1].start + p.offset, 42.625);
});

test('sync rejects invalid times without changing the project', () => {
  const p = C.project('h3chCOV_phw');
  p.blocks = [C.block('First'), C.block('Second', 10)];
  const before = JSON.stringify(p);
  assert.throws(() => C.syncLine(p, p.blocks[0], -1), /Times/);
  assert.throws(() => C.syncLine(p, p.blocks[1], 100000), /offset/);
  assert.throws(() => C.syncLine(p, p.blocks[0], NaN), /Invalid/);
  assert.throws(() => C.syncLine(p, undefined, 33), /Load lyrics/);
  assert.equal(JSON.stringify(p), before);
});

test('legacy projects retain only the last source without changing the input', () => {
  const p = C.project('abcdefghijk');
  p.blocks = [C.block('歌', 1, 2)];
  p.blocks[0].translations.en = 'Song';
  p.schemaVersion = 2; delete p.source;
  p.sources = [
    { provider: 'lrclib', url: 'https://lrclib.net/api/get/10831983' },
    { provider: 'lrclib', url: 'https://lrclib.net/api/get/15913865', original: '歌' }
  ];
  const before = JSON.stringify(p);
  const result = C.validate(p);
  assert.deepEqual(result.source, { provider: 'lrclib', url: p.sources[1].url });
  assert.equal(result.sources, undefined);
  assert.equal(result.schemaVersion, 3);
  assert.deepEqual(result.blocks, p.blocks);
  assert.equal(JSON.stringify(p), before);
  assert.deepEqual(C.validate(JSON.parse(JSON.stringify(result))), result);
  assert.equal(C.validate(C.project('abcdefghijk')).source, null);
});

test('video URL is derived from the matching ID for new and imported projects', () => {
  const p = C.project('G3xEh7dHg68');
  const expected = 'https://www.youtube.com/watch?v=G3xEh7dHg68';
  assert.equal(p.videoUrl, expected);
  delete p.videoUrl;
  assert.equal(C.validate(p).videoUrl, expected);
  assert.equal(p.videoUrl, undefined);
  p.videoUrl = 'https://www.youtube.com/watch?v=3n91MZ6-z6M';
  const result = C.validate(p);
  assert.equal(result.videoUrl, expected);
  assert.deepEqual(C.validate(JSON.parse(JSON.stringify(result))), result);
});

test('original video titles survive JSON round trips and older projects can omit them', () => {
  const title = '【Live / 歌】Original Title!';
  const p = C.project('abcdefghijk', title);
  assert.equal(C.validate(JSON.parse(JSON.stringify(p))).videoTitle, title);
  delete p.videoTitle;
  assert.equal(C.validate(p).videoTitle, '');
  assert.equal(p.videoTitle, undefined);
  assert.throws(() => C.validate({...p, videoTitle: []}), /videoTitle/);
});

test('moving a line start shifts its end and later rows equally, with offset applied once', () => {
  const p = C.project('abcdefghijk'); p.offset = 9.21;
  p.blocks = [C.block('Before', 1, 3), C.block('歌', 5, 8), C.block('', 9, 10), C.block('Later', 12), C.block('Untimed')];
  p.blocks[1].translations.en = 'Song';
  p.blocks[1].furigana = [['歌', 'うた']];
  const original = structuredClone(p), rows = [...p.blocks];
  C.moveLineStart(p, p.blocks[1], 16.545);
  assert.deepEqual(p.blocks.map(b => [b.start,b.end]), [[1,3],[7.335,10.335],[11.335,12.335],[14.335,null],[null,null]]);
  assert.equal(p.offset, 9.21);
  assert.deepEqual(p.blocks[1].translations, original.blocks[1].translations);
  assert.deepEqual(p.blocks[1].furigana, original.blocks[1].furigana);
  p.blocks.forEach((row,index) => assert.equal(row,rows[index]));
  C.moveLineStart(p, p.blocks[1], 14.21);
  assert.deepEqual(p, original);
});
test('moving a start rejects invalid downstream times without partial changes', () => {
  const p = C.project('abcdefghijk');
  p.blocks = [C.block('Selected', 10, 12), C.block('Later in editor', 1, 2), C.block('Last', 86398, 86400)];
  const before = structuredClone(p);
  for (const start of [5, 11, NaN, Infinity, null]) {
    assert.throws(() => C.moveLineStart(p, p.blocks[0], start));
    assert.deepEqual(p, before);
  }
});
test('initial timing has no delta and open-ended rows retain their missing end', () => {
  const p = C.project('abcdefghijk'); p.offset = 2;
  p.blocks = [C.block('Untimed'), C.block('Next', 10, 12)];
  C.moveLineStart(p, p.blocks[0], 5);
  assert.deepEqual(p.blocks.map(b => [b.start,b.end]), [[3,null],[10,12]]);
  C.moveLineStart(p, p.blocks[0], 6);
  assert.deepEqual(p.blocks.map(b => [b.start,b.end]), [[4,null],[11,13]]);
  C.moveLineStart(p, p.blocks[0], null);
  assert.deepEqual(p.blocks.map(b => [b.start,b.end]), [[null,null],[11,13]]);
});

test('LRC export includes video offset and instrumental boundaries without changing the project', () => {
  const project = C.project('abcdefghijk');
  project.offset = 0.125;
  project.blocks = [C.block('First', 59.999, 61), C.block('Second', 63, 65)];
  project.blocks[0].translations.en = 'Translation';
  const before = JSON.stringify(project);
  const text = C.exportLrc(project);
  assert.equal(text, '[01:00.124]First\n[01:01.125]\n[01:03.125]Second\n[01:05.125]\n');
  assert.deepEqual(C.importLyrics(text).map(row => [row.text, row.start]), [['First', 60.124], ['', 61.125], ['Second', 63.125], ['', 65.125]]);
  assert.equal(C.exportLrc(project, false), 'First\nSecond\n');
  assert.equal(JSON.stringify(project), before);
});

test('untimed LRC imports metadata and lyrics; timed export rejects missing or negative video timing', () => {
  const project = C.project('abcdefghijk');
  project.blocks = C.importLyrics('\uFEFF[ar:Example]\nFirst\n\nSecond');
  assert.deepEqual(project.blocks.map(row => [row.text, row.start]), [['First', null], ['Second', null]]);
  assert.throws(() => C.exportLrc(project), /Every line/);
  assert.equal(C.exportLrc(project, false), 'First\nSecond\n');
  project.blocks = [C.block('First', 1, 2)];
  project.offset = -2;
  assert.throws(() => C.exportLrc(project), /Every line/);
  assert.throws(() => C.importLyrics('[ar:Example]\n'), /No lyrics/);
});
