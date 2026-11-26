const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../src/core.js');
const T = require('../src/timing.js');
function fixture() {
  const p = C.project('abcdefghijk'); p.offset = 2;
  p.blocks = [{ ...C.block('海へ Go!', 1, 6), translations: { en: 'To the sea!' }, furigana: [['海', 'うみ'], ['へ Go!', null]],
    sweep: [{text:'海へ ', start:1, end:2}, {text:'Go!', start:4, end:5}] }];
  return p;
}
test('sweep round trips with ruby, translation and offset; legacy projects migrate without inventing sweep', () => {
  const p = fixture();
  assert.deepEqual(C.validate(JSON.parse(JSON.stringify(C.exportProject(p)))), p);
  const old = C.project(p.videoId); old.schemaVersion = 4; old.blocks = [C.block('Before', 0, 1)];
  assert.equal(C.validate(old).schemaVersion, 5);
  assert.equal(C.validate(old).blocks[0].sweep, undefined);
  assert.equal(old.schemaVersion, 4);
});
test('sweep follows absolute playback time, pauses, gaps, seek backwards and segment boundaries', () => {
  const p = fixture(), row = p.blocks[0];
  for (const [time, position] of [[2,0],[3,0],[3.5,1.5],[4,3],[5,3],[6,3],[6.5,4.5],[7,6],[3.5,1.5],[3.5,1.5]])
    assert.equal(C.sweepPosition(row,time,p.offset),position);
});
test('invalid sweep is rejected atomically, including mismatched text and split graphemes', () => {
  for (const change of [p=>p.blocks[0].sweep=[],p=>p.blocks[0].sweep=null,p=>p.blocks[0].end=null,
    p=>p.blocks[0].sweep[0].text='空',p=>p.blocks[0].sweep[1].start=1.5,p=>p.blocks[0].sweep[1].end=7,
    p=>p.blocks[0].sweep[0].start=0,p=>p.blocks[0].sweep[0].end=NaN,p=>p.blocks[0].sweep[0].end=1]) {
    const p=fixture();change(p);const before=structuredClone(p);assert.throws(()=>C.validate(p),/Sweep|sweep/);assert.deepEqual(p,before);
  }
  const p=fixture();p.blocks[0].text='e\u0301';delete p.blocks[0].furigana;
  p.blocks[0].sweep=[{text:'e',start:1,end:2},{text:'\u0301',start:2,end:3}];
  assert.throws(()=>C.validate(p),/grapheme/);
});
test('manual timing shifts move sweep with the line; failed shifts preserve the entire project', () => {
  const p=fixture();C.moveLineStart(p,p.blocks[0],5);
  assert.deepEqual(p.blocks[0].sweep.map(s=>[s.start,s.end]),[[3,4],[6,7]]);
  const before=structuredClone(p);assert.throws(()=>C.moveLineStart(p,p.blocks[0],0));assert.deepEqual(p,before);
  C.syncLine(p,p.blocks[0],9);assert.equal(C.sweepPosition(p.blocks[0],9,p.offset),0);
});
test('new line alignment and manual stamping invalidate old word timing', () => {
  const p=fixture();const aligned=T.preview(p,{lines:[{text:p.blocks[0].text,start:2,end:4}]},10,true);
  assert.equal(aligned.project.blocks[0].sweep,undefined);assert.ok(p.blocks[0].sweep);
  C.stamp(p.blocks,0,2);assert.equal(p.blocks[0].sweep,undefined);
});
test('export trims whitespace without losing matching segment text', () => {
  const p=fixture();p.blocks[0].text='  海へ Go!  ';delete p.blocks[0].furigana;
  p.blocks[0].sweep[0].text='  海へ ';p.blocks[0].sweep[1].text='Go!  ';
  const result=C.exportProject(p);assert.equal(result.blocks[0].sweep.map(s=>s.text).join(''),'海へ Go!');C.validate(result);
});

test('exporting an all-whitespace swept row removes empty sweep', () => {
  const p=C.project('abcdefghijk');p.blocks=[{...C.block(' ',0,1),sweep:[{text:' ',start:0,end:1}]}];
  const result=C.exportProject(p);assert.equal(result.blocks[0].sweep,undefined);C.validate(result);
});

test('highlight color defaults to pink and persists in project exports', () => {
  const p=fixture();assert.equal(p.display.sweepColor,'#f472b6');
  delete p.display.sweepColor;assert.equal(C.validate(p).display.sweepColor,'#f472b6');
  p.display.sweepColor='#ff0088';assert.equal(C.exportProject(p).display.sweepColor,'#ff0088');
  for(const color of ['red','#abc','#12345678','url(https://example.com)',null,7]) {
    p.display.sweepColor=color;assert.throws(()=>C.validate(p),/highlight color/);
  }
});

test('display color picker saves a color string alongside numeric and checkbox fields', () => {
  const fs=require('node:fs'), vm=require('node:vm');
  const source=fs.readFileSync('src/content.js','utf8');
  const controls=source.slice(source.indexOf('  const fontSize = input('),source.indexOf('  const furiganaLabel ='));
  const p=fixture();const fields={};let saves=0;
  const node=()=>({style:{},addEventListener(type,fn){this[type]=fn;}});
  const ctx={C,project:p,display:{},input(label,parent,value,type){const field={...node(),value,type};fields[label]=field;return field;},
    el(tag,text,parent,attrs={}){return {...node(),...attrs};},requireProject(){},save(){saves++;}};
  vm.runInNewContext(controls+'\nrefreshDisplay();',ctx);
  fields['Original lyrics color'].value='#ffff00';fields['Translation color'].value='#00ff00';
  fields['Highlight color'].value='#ff0088';fields['Highlight color'].change();
  assert.equal(p.display.lyricsColor,'#ffff00');assert.equal(p.display.translationColor,'#00ff00');
  assert.equal(p.display.sweepColor,'#ff0088');assert.equal(p.display.fontSize,30);assert.equal(p.display.showOriginal,true);
  assert.equal(C.validate(p).display.sweepColor,'#ff0088');assert.equal(saves,1);
});

test('original and translated colors migrate independently and reject unsafe CSS values', () => {
  const p=fixture();delete p.display.lyricsColor;delete p.display.translationColor;
  const migrated=C.validate(p);assert.equal(migrated.display.lyricsColor,'#ffffff');assert.equal(migrated.display.translationColor,'#a5f3fc');
  for (const key of ['lyricsColor','translationColor']) {
    const changed=structuredClone(migrated);changed.display[key]='#aabbcc';
    assert.equal(C.exportProject(changed).display[key],'#aabbcc');
    changed.display[key]='url(https://example.com)';assert.throws(()=>C.validate(changed),/color/);
  }
});
