const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs');
const C=require('../src/core.js'),T=require('../src/timing.js');
function harness(saved={}) {
 const ports=[],nativeMessages=[];let status={protocol:1,ready:true},cleanup={type:'audio-cache-cleared',removed:true};
 const browser={storage:{local:{get:async key=>({[key]:structuredClone(saved[key])}),set:async values=>Object.assign(saved,structuredClone(values)),remove:async key=>{delete saved[key];}}},runtime:{
  sendNativeMessage:async(_host,message)=>{nativeMessages.push(structuredClone(message));return message.type==='clear-audio-cache'?cleanup:status;},
  connectNative:()=>{
   const p={messages:[],onMessage:{addListener:f=>{p.receive=f;}},onDisconnect:{addListener:f=>{p.lost=f;}},postMessage:m=>p.messages.push(structuredClone(m)),disconnect:()=>p.lost()};ports.push(p);return p;
  }
 }};
 const context={browser,KaraokeUsage:{recordAudio:async()=>{}},KaraokeCore:C,KaraokeTiming:T,crypto:globalThis.crypto,setTimeout,clearTimeout};
 vm.createContext(context);vm.runInContext(fs.readFileSync('src/native.js','utf8')+'\nglobalThis.N=KaraokeNative;',context);
 return {saved,ports,nativeMessages,request:m=>context.N.request(m),status:value=>{status=value;},cleanup:value=>{cleanup=value;}};
}
const videoId='F-iI4-BkwXg';
const project=C.project(videoId);project.blocks=[C.block('朝')];
function seeded() {return harness({audioShakeSettings:{apiKey:'private-key',language:'auto'}});}
const start={type:'timing-start',videoId,project,duration:15,useExisting:true};
test('native generation persists receipt before start and never returns credentials',async()=>{
 const h=seeded();const job=await h.request(start);
 assert.equal(h.ports.length,1);assert.equal(job.status,'running');
 assert.equal(h.ports[0].messages[0].apiKey,'private-key');
 assert.equal(h.ports[0].messages[0].transcript,'朝');
 assert.equal(h.saved[`timingJob:${videoId}`].requestId,job.requestId);
 assert.ok(!JSON.stringify(job).includes('private-key'));
 await assert.rejects(h.request(start),/already/);
 h.ports[0].receive({type:'task',taskId:'task-123'});
 h.ports[0].receive({type:'progress',stage:'processing'});
 const status=await h.request({type:'timing-status',videoId});assert.equal(status.taskId,'task-123');
});
test('disconnect and restart resume existing task without issuing a new request ID',async()=>{
 const h=seeded();const original=await h.request(start);const p=h.ports[0];
 p.receive({type:'task',taskId:'task-123'});await h.request({type:'timing-status',videoId});
 p.lost();const job=await h.request({type:'timing-status',videoId});assert.equal(job.status,'interrupted');
 const restarted=harness(h.saved);await restarted.request({type:'timing-start',videoId,resume:true});
 const message=restarted.ports[0].messages[0];assert.equal(message.taskId,'task-123');assert.equal(message.requestId,original.requestId);assert.equal(message.resume,true);
 await assert.rejects(restarted.request(start),/already/);
});
test('cancel forwards local cancellation and result/discard cannot resurrect task state',async()=>{
 const h=seeded();await h.request(start);const p=h.ports[0];
 await h.request({type:'timing-cancel',videoId});assert.equal(p.messages.at(-1).type,'cancel');
 p.receive({type:'cancelled',taskId:'task-123'});
 assert.equal((await h.request({type:'timing-status',videoId})).status,'cancelled');
 await h.request({type:'timing-discard',videoId});
 assert.equal(await h.request({type:'timing-status',videoId}),null);
});
test('results remain staged and task resumes are blocked until discarded',async()=>{
 const h=seeded();await h.request(start);
 h.ports[0].receive({type:'result',taskId:'task-123',result:{lines:[{text:'朝',start:1,end:2}]}});
 const job=await h.request({type:'timing-status',videoId});assert.equal(job.status,'ready');assert.equal(job.result.lines.length,1);
 assert.equal(h.saved[`project:${videoId}`],undefined);
 await assert.rejects(h.request(start),/existing/);
 await assert.rejects(h.request({type:'timing-start',videoId,resume:true}),/No interrupted/);
});
test('missing dependencies and protocol mismatch disable generation before native start',async()=>{
 const h=seeded();h.status({ready:true,protocol:99});
 assert.equal((await h.request({type:'helper-status'})).ready,false);
 await assert.rejects(h.request(start),/Install/);assert.equal(h.ports.length,0);
});
test('audio preferences preserve key when omitted and only expose saved status',async()=>{
 const h=seeded();const saved=await h.request({type:'save-audioshake-settings',language:'ja'});
 assert.equal(saved.hasApiKey,true);assert.equal(saved.apiKey,undefined);assert.equal(h.saved.audioShakeSettings.apiKey,'private-key');
 await h.request({type:'save-audioshake-settings',language:'auto',apiKey:''});assert.equal((await h.request({type:'audioshake-settings'})).hasApiKey,false);
 await assert.rejects(h.request({type:'save-audioshake-settings',language:'invalid'}));
});
test('audio cleanup sends only the current video ID and preserves projects, settings and pending results',async()=>{
 const saved={audioShakeSettings:{apiKey:'private-key',language:'ja'},[`project:${videoId}`]:project,[`timingJob:${videoId}`]:{status:'ready',taskId:'task-123',result:{lines:[]}}};
 const before=structuredClone(saved),h=harness(saved);
 assert.equal((await h.request({type:'timing-clear-audio',videoId})).removed,true);
 assert.deepEqual(h.nativeMessages,[{type:'clear-audio-cache',videoId}]);
 assert.deepEqual(saved,before);assert.equal(h.ports.length,0);
 h.cleanup({type:'audio-cache-cleared',removed:false});
 assert.equal((await h.request({type:'timing-clear-audio',videoId})).removed,false);
});
test('audio cleanup rejects active tasks, invalid video IDs and helper errors',async()=>{
 const h=seeded();await h.request(start);const count=h.nativeMessages.length;
 await assert.rejects(h.request({type:'timing-clear-audio',videoId}),/Wait for the timing task/);
 await assert.rejects(h.request({type:'timing-clear-audio',videoId:'../bad'}),/Invalid video ID/);
 assert.equal(h.nativeMessages.length,count);
 const idle=harness();idle.cleanup({type:'error',error:'Could not remove cached audio.'});
 await assert.rejects(idle.request({type:'timing-clear-audio',videoId}),/Could not remove/);
 idle.cleanup({type:'audio-cache-cleared'});
 await assert.rejects(idle.request({type:'timing-clear-audio',videoId}),/Update the Linux helper/);
});
