const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../src/core.js');
const D = require('../src/dictionary.js');

test('furigana JSON round trip preserves readings, visibility, translations and exact timing', () => {
  const p = C.project('abcdefghijk');
  p.furiganaEnabled = true; p.offset = 1.125;
  const row = C.block('今日も食べました', 2.25, 6.75);
  row.translations.en = 'Ate today too';
  row.furigana = [['今日', 'きょう'], ['も', null], ['食べました', 'たべました']];
  p.blocks.push(row);
  assert.deepEqual(C.validate(JSON.parse(JSON.stringify(p))), p);
  p.furiganaEnabled = false;
  assert.deepEqual(C.validate(p).blocks[0].furigana, row.furigana);
  assert.equal(C.activeBlock(p.blocks, 3.375, p.offset), row);
  assert.equal(C.activeBlock(p.blocks, 7.875, p.offset), null);
});

test('legacy schema migration is non-mutating and idempotent', () => {
  const p = C.project('abcdefghijk'); p.schemaVersion = 1; delete p.furiganaEnabled;
  p.blocks.push(C.block('日本語', 0, 3));
  const migrated = C.validate(p);
  assert.equal(p.schemaVersion, 1); assert.equal(p.furiganaEnabled, undefined);
  assert.equal(migrated.schemaVersion, 2); assert.equal(migrated.furiganaEnabled, false);
  assert.deepEqual(C.validate(migrated), migrated);
});

test('imports reject mismatched, malformed, oversized and non-kana annotations', () => {
  const p = C.project('abcdefghijk'); p.blocks.push(C.block('今日'));
  for (const parts of [null, {}, [['昨日', 'きのう']], [['今日', '<img>']], [['今日', '']], [['今日', 7]], [['', null], ['今日', 'きょう']], [['今日', 'あ'.repeat(1001)]], [['今日', 'きょう', 'extra']]]) {
    p.blocks[0].furigana = parts;
    assert.throws(() => C.validate(p), /furigana/);
  }
  p.blocks[0].furigana = [['今日', null]];
  p.furiganaEnabled = 'yes'; assert.throws(() => C.validate(p), /visibility/);
  p.furiganaEnabled = true; p.blocks[0].start = NaN;
  assert.throws(() => C.validate(p), /Times/);
});

test('Furikazan matcher retains longest words, particles and conservative greeting exceptions', () => {
  const matcher = D.createMatcher([['宝鐘', 'ほうしょう'], ['宝', 'たから'], ['今日', 'こんにち'], ['今日は', 'こんにちは'], ['暑い', 'あつい']]);
  assert.deepEqual(matcher.segment('今日は暑い'), [['今日', 'きょう'], ['は', null], ['暑い', 'あつい']]);
  assert.deepEqual(matcher.segment('今日は！'), [['今日は', 'こんにちは'], ['！', null]]);
  assert.deepEqual(matcher.segment('宝鐘へ'), [['宝鐘', 'ほうしょう'], ['へ', null]]);
  assert.deepEqual(matcher.segment('二人で来ました'), [['二人', 'ふたり'], ['で', null], ['来ました', 'きました']]);
  assert.equal(matcher.segment('かな ABC 🐱'), null);
});

test('ruby alignment leaves leading kana and okurigana outside the reading', () => {
  assert.deepEqual(C.alignKana('お祝い', 'おいわい'), { prefix: 'お', base: '祝', annotation: 'いわ', suffix: 'い' });
  assert.deepEqual(C.alignKana('食べました', 'たべました'), { prefix: '', base: '食', annotation: 'た', suffix: 'べました' });
  assert.deepEqual(C.alignKana('今日', 'きょう'), { prefix: '', base: '今日', annotation: 'きょう', suffix: '' });
});

test('term correction merges split kanji and replaces every occurrence while preserving surrounding readings', () => {
  const text = '宝鐘へ宝鐘が行く';
  const parts = [['宝', 'たから'], ['鐘', 'かね'], ['へ', null], ['宝鐘', 'たからかね'], ['が', null], ['行く', 'いく']];
  const result = C.replaceFuriganaTerm(text, parts, '宝鐘', 'ほうしょう');
  assert.deepEqual(result, [['宝鐘', 'ほうしょう'], ['へ', null], ['宝鐘', 'ほうしょう'], ['が', null], ['行く', 'いく']]);
  assert.equal(parts[0][1], 'たから');
  const p = C.project('abcdefghijk');
  p.blocks.push({...C.block(text, 1, 3), furigana: result});
  assert.deepEqual(C.validate(JSON.parse(JSON.stringify(p))), p);
});

test('term correction handles embedded and adjacent terms without assigning guessed fragment readings', () => {
  assert.deepEqual(C.replaceFuriganaTerm('宝鐘宝鐘', [['宝鐘宝鐘', 'たからかねたからかね']], '宝鐘', 'ほうしょう'), [['宝鐘', 'ほうしょう'], ['宝鐘', 'ほうしょう']]);
  assert.deepEqual(C.replaceFuriganaTerm('我ら宝鐘海賊団', [['我ら', 'われら'], ['宝鐘海賊団', 'ほうしょうかいぞくだん']], '宝鐘', 'ほうしょう'), [['我ら', 'われら'], ['宝鐘', 'ほうしょう'], ['海賊団', null]]);
  assert.deepEqual(C.replaceFuriganaTerm('今日', [['今日', 'きょう']], '宝鐘', 'ほうしょう'), [['今日', 'きょう']]);
  for (const [term, reading] of [['', 'あ'], ['かな', 'かな'], ['宝鐘', '<script>'], ['宝鐘', '']]) {
    assert.throws(() => C.replaceFuriganaTerm('宝鐘', [['宝鐘', null]], term, reading));
  }
});

test('cached dictionaries recognize imperatives using matching verb forms, not isolated name readings', () => {
  const entries = [['進', 'しん'], ['進む', 'すすむ'], ['進まない', 'すすまない'], ['進みます', 'すすみます'],
    ['歌う', 'うたう'], ['歌わない', 'うたわない'], ['歌います', 'うたいます'],
    ['叫ぶ', 'さけぶ'], ['叫ばない', 'さけばない'], ['叫びます', 'さけびます'],
    ['踊る', 'おどる'], ['踊らない', 'おどらない'], ['踊ります', 'おどります'],
    ['食べる', 'たべる'], ['食べない', 'たべない'], ['食べます', 'たべます'],
    ['前進', 'ぜんしん'], ['宝', 'たから']];
  const matcher = D.createMatcher(entries);
  assert.deepEqual(matcher.segment('進め！（進め！）'), [['進め', 'すすめ'], ['！（', null], ['進め', 'すすめ'], ['！）', null]]);
  for (const [word, reading] of [['歌え', 'うたえ'], ['叫べ', 'さけべ'], ['踊れ', 'おどれ'], ['食べろ', 'たべろ']]) {
    assert.deepEqual(matcher.segment(word), [[word, reading]]);
  }
  assert.deepEqual(matcher.segment('前進'), [['前進', 'ぜんしん']]);
  assert.deepEqual(C.alignKana('進め', 'すすめ'), {prefix: '', base: '進', annotation: 'すす', suffix: 'め'});
  assert.equal(D.createMatcher([['進む', 'すすむ']]).segment('進め'), null);
});

test('imperatives use the preferred base reading when old cached inflections use a superseded rare reading', () => {
  const matcher = D.createMatcher([['進', 'しん'], ['進む', 'すすむ'], ['進まない', 'すさまない'], ['進みます', 'すさみます']]);
  assert.deepEqual(matcher.segment('進め！'), [['進め', 'すすめ'], ['！', null]]);
});
