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
test('language choice alone is not an edit; text, timing and display are', () => {
  const p=project(), original=C.fingerprint(p); p.translationLanguage='nl';
  assert.equal(C.fingerprint(p),original);
  p.display.translationFontSize=40; assert.notEqual(C.fingerprint(p),original);
});
test('merge preserves local timing and other languages, reporting overwritten translations', () => {
  const p=project(), incoming=structuredClone(p);
  incoming.translationLanguage='nl'; incoming.offset=20;
  incoming.blocks.forEach(r=>{r.translations={nl:'Nederlands'};r.start+=10;r.end+=10;});
  const merged=C.mergeTranslations(p,incoming);
  assert.equal(merged.replacement,false); assert.deepEqual(merged.conflicts,[]);
  assert.deepEqual(merged.project.blocks[0].translations,{en:'English',nl:'Nederlands'});
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
test('JSON round trip keeps all languages and display; excludes storage and credentials', () => {
  const p=project();p.blocks[0].translations.nl='Nederlands';p.originalLanguage='sr';p.translationLanguage='nl';
  p.display.showOriginal=false;p.display.translationPosition=25;p.token='private';p.baseline='private';
  const result=C.validate(JSON.parse(JSON.stringify(C.exportProject(p))));
  assert.equal(result.originalLanguage,'sr');assert.equal(result.translationLanguage,'nl');
  assert.deepEqual(result.blocks[0].translations,p.blocks[0].translations);
  assert.deepEqual(result.display,p.display);assert.equal(result.token,undefined);assert.equal(result.baseline,undefined);
});
