const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../src/core.js');
const T = require('../src/timing.js');
function project(texts) {
  const p = C.project('F-iI4-BkwXg'); p.blocks = texts.map(text => C.block(text)); return p;
}
const line = (text, start, end = start + 1) => ({text, start, end});
test('alignment retains IDs, translations and Japanese readings, including repeated lines', () => {
  const p = project(['海へ', 'Go!', '海へ']); p.offset = 5;
  p.blocks[0].furigana = [['海', 'うみ'], ['へ', null]];
  p.blocks[0].translations.en = 'To the sea';
  const before = structuredClone(p);
  const result = T.preview(p, {lines:[line('海へ',1),line('Go',3),line('海へ',5)]}, 10, true);
  assert.deepEqual(result.unmatched, []);
  assert.equal(result.project.offset, 0);
  assert.deepEqual(result.project.blocks.map(row=>row.id), p.blocks.map(row=>row.id));
  assert.deepEqual(result.project.blocks[0].furigana,p.blocks[0].furigana);
  assert.deepEqual(result.project.blocks[0].translations,p.blocks[0].translations);
  assert.deepEqual(p,before);
});
test('ambiguous repetitions and missing lines stay untimed instead of shifting timestamps', () => {
  const p = project(['Again', 'Again', 'Next', 'Missing']);
  p.blocks.forEach(row=>{row.start=9;row.end=10;});
  const result = T.preview(p,{lines:[line('Again',1),line('Next',3)]},15,true);
  assert.deepEqual(result.unmatched,[1,2,4]);
  assert.deepEqual(result.project.blocks.map(row=>row.start),[null,null,3,null]);
});
test('recognition creates new lines without inheriting translations or furigana', () => {
  const p=project(['Old']); p.blocks[0].translations.en='old';
  const result=T.preview(p,{language:'ja',lines:[{text:'朝',words:[{text:'朝',start:1,end:2}]}]},5,false);
  assert.equal(result.project.blocks[0].text,'朝');
  assert.notEqual(result.project.blocks[0].id,p.blocks[0].id);
  assert.deepEqual(result.project.blocks[0].translations,{});
  assert.equal(result.project.originalLanguage,'ja');
});
test('invalid durations, reversed times, invalid ends and out-of-order results fail atomically', () => {
  for (const seconds of [NaN,Infinity,0,-1,2701]) assert.throws(()=>T.duration(seconds));
  for (const lines of [[line('a',-1)], [line('a',2,1)], [line('a',1,11)], [line('a',4),line('b',1)], [line('a',0,9),line('b',2,3)], [{text:'a',start:'1',end:2}],[]]) assert.throws(()=>T.preview(project(['a']),{lines},10,true));
});
test('edited text, translations, timing, readings, offset, video and duration reject stale results', () => {
  const p=project(['海']);
  const job={fingerprint:T.fingerprint(p),duration:10,useExisting:true,result:{lines:[line('海',1)]}};
  for (const mutate of [p=>p.blocks[0].text='川',p=>p.blocks[0].translations.en='sea',p=>p.blocks[0].start=2,p=>p.blocks[0].furigana=[['海','うみ']],p=>p.offset=1,p=>p.videoId='abcdefghijk']) {
    const copy=structuredClone(p);mutate(copy);assert.throws(()=>T.apply(copy,job,10),/changed/);
  }
  assert.throws(()=>T.apply(p,job,11),/changed/);
  assert.equal(T.apply(p,job,10).project.blocks[0].start,1);
});
