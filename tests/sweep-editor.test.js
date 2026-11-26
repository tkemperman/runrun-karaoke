const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const C = require('../src/core.js');
const source = fs.readFileSync('src/content.js','utf8');
const renderer = source.slice(source.indexOf('  const sweepDrafts ='),source.indexOf('  function renderRows()'));
const times = source.slice(source.indexOf('  function formatTime('),source.indexOf('  button("Sync with video position"'));
function fixture(withSweep=true) {
  const project=C.project('abcdefghijk');project.offset=2;
  const row={...C.block('海へ Go!',1,6),translations:{en:'To the sea!'},furigana:[['海','うみ'],['へ Go!',null]]};
  if(withSweep) row.sweep=[{text:'海へ ',start:1,end:2},{text:'Go!',start:4,end:5}];
  project.blocks=[row];let saves=0;
  const media={currentTime:0,paused:true};
  function node(tag,text,parent,attrs={}) {
    const n={tag,textContent:text,children:[],style:{},...attrs,parent,
      setAttribute(key,value){this[key]=value;},addEventListener(type,fn){this[type]=fn;},
      replaceChildren(){this.children=[];}};
    parent?.children.push(n);return n;
  }
  const parent=node('div','');
  const context={C,project,el:node,video:()=>media,save(){saves++;},
    input(label,parent,value){const n=node('input',label,parent);n.value=value;return n;},
    button(label,parent,click){const n=node('button',label,parent);n.click=click;return n;}};
  vm.runInNewContext(times+renderer,context);
  let section=context.renderSweepEditor(parent,row);
  const all=n=>[n,...n.children.flatMap(all)];
  const button=(text,index=0)=>all(section).filter(n=>n.tag==='button'&&n.textContent===text)[index];
  const field=(type,index=1)=>all(section).find(n=>n.tag==='input'&&n['aria-label']===`${type} of timing row ${index}`);
  return {project,row,media,parent,button,field,saves:()=>saves,pending:()=>context.hasPendingSweepEdits(),
    status:()=>all(section).find(n=>n.role==='status'),
    edit(type,index,value){const n=field(type,index);n.value=value;n.input();},
    redraw(){parent.replaceChildren();section=context.renderSweepEditor(parent,row);}};
}
test('new timing rows can be created, edited and applied atomically with offsets', () => {
  const f=fixture(false);f.button('Add timing row').click();f.button('Add after').click();
  f.edit('Text',1,'海へ ');f.edit('Start',1,'0:03.250');f.edit('End',1,'0:04');
  f.edit('Text',2,'Go!');f.edit('Start',2,'0:06');f.edit('End',2,'0:07');
  assert.equal(f.row.sweep,undefined);assert.equal(f.pending(),true);assert.equal(f.saves(),0);
  f.button('Apply timing').click();
  assert.deepEqual(JSON.parse(JSON.stringify(f.row.sweep)),[{text:'海へ ',start:1.25,end:2},{text:'Go!',start:4,end:5}]);
  assert.equal(f.saves(),1);assert.equal(f.pending(),false);assert.equal(f.row.start,1);assert.ok(f.row.furigana);
});
test('invalid drafts retain the saved timing and editable values for correction', () => {
  const f=fixture(),before=structuredClone(f.row);
  for(const value of ['', 'nonsense', '0:02', '0:05', '-0:01']) {
    f.edit('Start',1,value);f.button('Apply timing').click();assert.deepEqual(f.row,before);assert.equal(f.field('Start').value,value);
  }
  f.edit('Start',1,'0:03');f.edit('End',1,'0:06.100');f.button('Apply timing').click();
  assert.deepEqual(f.row,before);assert.equal(f.saves(),0);assert.equal(f.status().hidden,false);
  f.edit('End',1,'0:04.100');f.button('Apply timing').click();assert.equal(f.status().hidden,true);assert.equal(f.saves(),1);
});
test('removing rows preserves saved timing until Apply, and removing all only removes sweep', () => {
  const f=fixture(),before=structuredClone(f.row);f.button('Remove').click();
  f.button('Apply timing').click();assert.deepEqual(f.row,before);assert.match(f.status().textContent,/exactly match/);
  f.button('Remove').click();assert.deepEqual(f.row,before);
  f.button('Apply timing').click();delete before.sweep;assert.deepEqual(f.row,before);assert.equal(f.saves(),1);
});
test('drafts survive editor redraws, reset restores saved rows, and stale base timing cannot be overwritten', () => {
  const f=fixture();f.edit('Start',1,'0:03.250');f.redraw();assert.equal(f.field('Start').value,'0:03.250');assert.equal(f.pending(),true);
  f.project.offset=3;f.button('Apply timing').click();assert.match(f.status().textContent,/changed/);assert.equal(f.saves(),0);
  f.button('Reset changes').click();assert.equal(f.field('Start').value,'0:04');assert.equal(f.pending(),false);
});
test('Jump to previews draft times without changing playback or saved timing', () => {
  const f=fixture();f.edit('Start',1,'0:03.250');
  for(const paused of [true,false]) {f.media.paused=paused;f.button('Jump to').click();assert.equal(f.media.currentTime,3.25);assert.equal(f.media.paused,paused);}
  assert.equal(f.row.sweep[0].start,1);assert.equal(f.saves(),0);
});
test('text redistribution can merge timing rows without rewriting original lyrics or translations', () => {
  const f=fixture();f.button('Remove',1).click();f.edit('Text',1,'海へ Go!');f.edit('End',1,'0:07');f.button('Apply timing').click();
  assert.equal(f.row.sweep.length,1);assert.equal(f.row.sweep[0].text,f.row.text);assert.equal(f.row.translations.en,'To the sea!');
  f.button('Apply timing').click();assert.equal(f.saves(),1);
});
