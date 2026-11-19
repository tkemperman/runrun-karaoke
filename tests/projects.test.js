'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../src/core.js');
const P = require('../src/projects.js');
function fixture(initial = {}) {
  const data = structuredClone(initial);
  const store = P.create({
    get: async keys => Object.fromEntries(keys.map(k => [k, structuredClone(data[k])])),
    set: async values => Object.assign(data, structuredClone(values)),
    remove: async key => { delete data[key]; }
  }, C);
  return { store, data };
}
function project() { const p = C.project('abcdefghijk'); p.blocks = [C.block('First', 1, 2), C.block('Second', 3, 4)]; p.blocks.forEach(r => r.translations.en = 'English'); return p; }
test('saving trims lyric and translation edges while preserving readings, internal whitespace and editor input', async () => {
  const {store,data}=fixture(), p=project();
  p.blocks[0].text=' \n海  へ\n進め\r\n\n';
  p.blocks[0].furigana=[[' \n',null],['海','うみ'],['  へ\n',null],['進め','すすめ'],['\r\n\n',null]];
  p.blocks[0].translations={en:' \nTo  the sea\nGo!\n\n',nl:'\tNaar zee\r\n'};
  p.blocks[1].text=' \n\t';p.blocks[1].furigana=[[' \n\t',null]];
  const before=structuredClone(p);
  const saved=await store.write(p.videoId,p,0);
  const row=data[`project:${p.videoId}`].blocks[0];
  assert.equal(row.text,'海  へ\n進め');
  assert.deepEqual(row.furigana,[['海','うみ'],['  へ\n',null],['進め','すすめ']]);
  assert.deepEqual(row.translations,{en:'To  the sea\nGo!'});
  assert.equal(row.id,p.blocks[0].id);assert.equal(row.start,1);assert.equal(row.end,2);
  assert.equal(saved.project.blocks[1].text,'');assert.deepEqual(saved.project.blocks[1].furigana,[]);
  assert.deepEqual(C.validate(saved.project),saved.project);
  assert.deepEqual(C.exportProject(saved.project),saved.project);
  assert.deepEqual(p,before);
});
test('export trims whitespace within boundary furigana segments without losing their readings', () => {
  const p=project();p.blocks[0].text='\n 海へ \n';p.blocks[0].furigana=[['\n 海','うみ'],['へ \n',null]];
  const exported=C.exportProject(p);
  assert.equal(exported.blocks[0].text,'海へ');
  assert.deepEqual(exported.blocks[0].furigana,[['海','うみ'],['へ',null]]);
  assert.deepEqual(C.validate(exported),exported);
  assert.equal(C.exportLrc(p,false),'海へ\nSecond\n');
});
test('legacy projects are protected as local work, including original display preferences', async () => {
  const p = project(); delete p.display; p.schemaVersion = 3;
  const {store} = fixture({'project:abcdefghijk': p, displaySettings: {fontSize: 40, position: 20, showNext: true}});
  const state = await store.read(p.videoId);
  assert.equal(state.dirty,true); assert.equal(state.project.display.fontSize,40);
  const remote = project();
  assert.equal((await store.write(p.videoId,remote,0,{automatic:true})).project.blocks[0].id, p.blocks[0].id);
});
test('automatic downloads cannot replace edits made during download or from another tab', async () => {
  const {store} = fixture(), p = project();
  await store.write(p.videoId,p,0,{automatic:true});
  const edited = structuredClone(p); edited.blocks[0].text='My change';
  await store.write(p.videoId,edited,1);
  await assert.rejects(store.write(p.videoId,p,1,{automatic:true}),/changed/);
  assert.equal((await store.read(p.videoId)).project.blocks[0].text,'My change');
  assert.equal((await store.write(p.videoId,p,2,{automatic:true})).project.blocks[0].text,'My change');
});
test('queued user edit wins if a pristine download completed first', async () => {
  const {store}=fixture(), p=project();
  await store.write(p.videoId,p,0,{automatic:true});
  const edited=structuredClone(p); edited.blocks[0].text='Local';
  await store.write(p.videoId,edited,0);
  assert.equal((await store.read(p.videoId)).project.blocks[0].text,'Local');
});
test('deleting removes the project and blocks reloading and stale saves across visits', async () => {
  const {store,data}=fixture(), p=project();
  await store.write(p.videoId,p,0);
  await store.write(p.videoId,null,1,{deleted:true});
  assert.equal(data['project:abcdefghijk'],undefined);
  const state=await store.read(p.videoId); assert.equal(state.blocked,true);
  assert.equal((await store.write(p.videoId,p,state.revision,{automatic:true})).project,null);
  await assert.rejects(store.write(p.videoId,p,1),/changed/);
  await store.write(p.videoId,p,state.revision,{manualLoad:true});
  assert.equal((await store.read(p.videoId)).blocked,false);
});
test('two simultaneous writers cannot overwrite each other', async () => {
  const {store}=fixture(), p=project();
  const results=await Promise.allSettled([store.write(p.videoId,p,0),store.write(p.videoId,p,0)]);
  assert.deepEqual(results.map(r=>r.status),['fulfilled','rejected']);
});
test('changing the translation language counts as a local edit', () => {
  const p=project(), original=C.fingerprint(p); p.translationLanguage='nl';
  assert.notEqual(C.fingerprint(p),original);
  p.display.translationFontSize=40; assert.notEqual(C.fingerprint(p),original);
});
test('loading another language replaces the current translation, reports conflict and preserves timing', () => {
  const p=project(), incoming=structuredClone(p);
  incoming.translationLanguage='nl'; incoming.offset=20;
  incoming.blocks.forEach(r=>{r.translations={nl:'Nederlands'};r.start+=10;r.end+=10;});
  const merged=C.mergeTranslations(p,incoming);
  assert.equal(merged.replacement,false); assert.deepEqual(merged.conflicts,['en']);
  assert.deepEqual(merged.project.blocks[0].translations,{nl:'Nederlands'});
  assert.equal(merged.project.offset,0); assert.equal(merged.project.blocks[0].start,1);
  const again=C.mergeTranslations(merged.project,{...incoming,blocks:incoming.blocks.map(r=>({...r,translations:{nl:'Changed'}}))});
  assert.deepEqual(again.conflicts,['nl']);
  assert.deepEqual(p.blocks[0].translations,{en:'English'});
});
test('merge accepts identical text order with new IDs, but refuses different lyrics or videos', () => {
  const p=project(), incoming=structuredClone(p);
  incoming.blocks.forEach(r=>r.id=crypto.randomUUID());
  assert.equal(C.mergeTranslations(p,incoming).replacement,false);
  incoming.blocks[0].text='Different'; assert.equal(C.mergeTranslations(p,incoming).replacement,true);
  assert.equal(C.mergeTranslations(p,{...p,videoId:'12345678901'}).replacement,true);
});
test('JSON round trip keeps the current language and display; excludes storage and credentials', () => {
  const p=project();p.blocks[0].translations.nl='Nederlands';p.originalLanguage='sr';p.translationLanguage='nl';
  p.display.showOriginal=false;p.display.translationPosition=25;p.token='private';p.baseline='private';
  const result=C.validate(JSON.parse(JSON.stringify(C.exportProject(C.singleTranslation(p)))));
  assert.equal(result.originalLanguage,'sr');assert.equal(result.translationLanguage,'nl');
  assert.deepEqual(result.blocks[0].translations,{nl:'Nederlands'});
  assert.deepEqual(result.display,p.display);assert.equal(result.token,undefined);assert.equal(result.baseline,undefined);
});

test('legacy local projects use their selected translation without changing the stored source on read', async () => {
  const p=project(); p.translationLanguage='nl'; p.blocks.forEach(row=>row.translations.nl='Nederlands');
  const {store,data}=fixture({'project:abcdefghijk':p});
  const loaded=await store.read(p.videoId);
  assert.deepEqual(loaded.project.blocks[0].translations,{nl:'Nederlands'});
  assert.deepEqual(data['project:abcdefghijk'],p);
  const saved=await store.write(p.videoId,loaded.project,loaded.revision);
  assert.equal(saved.project.translationLanguage,'nl');
  assert.deepEqual(data['project:abcdefghijk'].blocks[0].translations,{nl:'Nederlands'});
});
