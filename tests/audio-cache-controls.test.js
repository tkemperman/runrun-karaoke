const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('src/content.js','utf8');
const code=source.slice(source.indexOf('  async function refreshAudioCache()'),source.indexOf('  function showTimingJob()'));
function fixture(){
 const c={helperAvailable:true,helperReady:true,videoId:'abcdefghijk',generation:1,audioCacheCheck:0,audioCacheExists:false,clearingAudio:false,timingBusy:false,timingJob:null,audioCacheStatus:{},request:async()=>({exists:true})};
 for(const name of ['timingStart','timingResume','timingCancel','timingApply','timingDiscard','clearAudio'])c[name]={};
 vm.createContext(c);vm.runInContext(code,c);return c;
}
test('audio cleanup tracks actual file presence and stays safe while a task runs',async()=>{
 const c=fixture();c.updateTimingControls();assert.equal(c.clearAudio.disabled,true);
 await c.refreshAudioCache();assert.equal(c.clearAudio.disabled,false);
 c.helperReady=false;c.updateTimingControls();assert.equal(c.clearAudio.disabled,false);
 c.timingJob={status:'running'};c.updateTimingControls();assert.equal(c.clearAudio.disabled,true);
 c.timingJob=null;c.request=async()=>({exists:false});await c.refreshAudioCache();assert.equal(c.clearAudio.disabled,true);
});
test('stale file checks cannot enable cleanup after navigation or a newer check',async()=>{
 const c=fixture();let finish;c.request=()=>new Promise(resolve=>{finish=resolve;});
 const pending=c.refreshAudioCache();c.generation++;finish({exists:true});await pending;assert.equal(c.audioCacheExists,false);
 const old=c.refreshAudioCache();c.audioCacheCheck++;finish({exists:true});await old;assert.equal(c.audioCacheExists,false);
});
