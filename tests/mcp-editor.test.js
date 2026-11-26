'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const C = require('../src/core.js');
const source = fs.readFileSync('src/content.js', 'utf8');
const handler = source.slice(source.indexOf('  const pendingMcpInputs ='), source.indexOf('  tick(); setInterval(tick, 100);'));
function fixture() {
  const project = C.project('abcdefghijk');project.blocks=[C.block('空',1,2)]; project.blocks[0].translations.en='Sky';
  const events = {};
  const context = {project, C, videoId: project.videoId, generation: 1, storageState: {revision:4}, saveQueue:Promise.resolve(),
    selected:0, root:{activeElement:null,addEventListener:(type,fn)=>{events[type]=fn;}},
    browser:{runtime:{onMessage:{addListener:fn=>{context.receive=fn;}}}},
    hasPendingSweepEdits(){return !!context.pendingSweep;},requireProject(){},video:()=>({duration:30}),refresh(){context.refreshed=true;},notify(){},fail(error){context.failure=error.message;},findCatalogMatch(){}
  };
  vm.runInNewContext(handler,context);
  return {context,events};
}
test('MCP editor listener does not claim unrelated messages or disturb playback',async()=>{
  const {context:c}=fixture();
  assert.equal(c.receive({type:'toggle-editor'}),undefined);
  const read=await c.receive({type:'mcp-snapshot',videoId:c.videoId});
  assert.equal(read.revision,4);assert.equal(read.duration,30);assert.equal(c.refreshed,undefined);
});
test('MCP preserves unfinished form input and conflicting edits; accepted apply refreshes both texts',async()=>{
  const {context:c,events}=fixture();const field={};c.root.activeElement=field;events.input({target:field});
  assert.match((await c.receive({type:'mcp-snapshot',videoId:c.videoId})).error,/Finish editing/);
  events.change({target:field});
  const previous=C.exportProject(c.project), next=structuredClone(previous);next.blocks[0].text='海';next.blocks[0].translations.en='Sea';
  const message={type:'mcp-reload',videoId:c.videoId,revision:4,previous,state:{revision:5,project:next}};
  c.project.blocks[0].text='Local edit';
  assert.match((await c.receive(message)).error,/Local editor changed/);assert.equal(c.project.blocks[0].text,'Local edit');
  c.project=structuredClone(previous);
  assert.equal((await c.receive(message)).applied,true);assert.equal(c.project.blocks[0].text,'海');assert.equal(c.project.blocks[0].translations.en,'Sea');assert.equal(c.storageState.revision,5);
});

test('MCP blocks unapplied sweep drafts even after their input loses focus',async()=>{
  const {context:c}=fixture();c.pendingSweep=true;
  assert.match((await c.receive({type:'mcp-snapshot',videoId:c.videoId})).error,/Apply or reset/);
  const message={type:'mcp-reload',videoId:c.videoId,revision:4,previous:C.exportProject(c.project),state:{revision:5,project:c.project}};
  assert.match((await c.receive(message)).error,/Apply or reset/);assert.equal(c.storageState.revision,4);
  c.pendingSweep=false;assert.equal((await c.receive({type:'mcp-snapshot',videoId:c.videoId})).revision,4);
});
