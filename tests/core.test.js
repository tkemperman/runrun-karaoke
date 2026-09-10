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
  p.blocks[0].translations.en = 'Hello'; p.sources = [{ provider: 'example', url: 'https://example.com/', original: 'Original source' }];
  const result = C.validate(JSON.parse(JSON.stringify(p)));
  assert.deepEqual(result, p); assert.notEqual(result.blocks, p.blocks);
});
test('invalid imports reject unsupported schemas, bad times and duplicate IDs', () => {
  const p = C.project('h3chCOV_phw'); p.blocks = [C.block('A', 3, 2)];
  assert.throws(() => C.validate(p), /End time/);
  p.blocks[0].end = 4; p.blocks.push({...p.blocks[0]});
  assert.throws(() => C.validate(p), /unique/);
  assert.throws(() => C.validate({...p, schemaVersion: 2}), /schema/);
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
