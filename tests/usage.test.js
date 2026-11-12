const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const U=require('../src/usage.js');
const response=(model,patch={})=>({id:'response-one',model,created_at:1793505600,service_tier:'default',usage:{input_tokens:1000,input_tokens_details:{cached_tokens:200},output_tokens:100},...patch});
test('cost follows the actual response model and distinguishes input, cached input and output',()=>{
 const terra=U.openAI(response('gpt-5.6-terra'),'gpt-6-astra');
 assert.equal(terra.model,'gpt-5.6-terra');
 assert.ok(Math.abs(terra.usd-.00284)<1e-12);
 const astra=U.openAI(response('gpt-6-astra'),'gpt-6-astra');assert.ok(astra.usd>terra.usd);
 const mini=U.openAI(response('gpt-4o-mini-2024-07-18'),'gpt-4o');assert.ok(Math.abs(mini.usd-.000195)<1e-12);
 assert.equal(terra.ratesChecked,'2026-11-12');
});
test('service tiers, long context and unknown prices are explicit',()=>{
 const normal=U.openAI(response('gpt-5.6-terra'),'gpt-5.6-terra');
 assert.equal(U.openAI(response('gpt-5.6-terra',{service_tier:'priority'}),'gpt-5.6-terra').usd,normal.usd*2);
 assert.equal(U.openAI(response('gpt-5.6-terra',{service_tier:'flex'}),'gpt-5.6-terra').usd,normal.usd/2);
 const long=U.openAI(response('gpt-5.6-terra',{usage:{input_tokens:300000,output_tokens:1000}}),'gpt-5.6-terra');assert.equal(long.usd,1.218);
 for(const patch of [{model:'unknown-model'},{service_tier:'unknown-tier'},{usage:{}},{usage:{input_tokens:2,output_tokens:1,input_tokens_details:{cached_tokens:3}}}]) assert.equal(U.openAI(response('gpt-5.6-terra',patch),'gpt-5.6-terra').usd,null);
});
test('month/model breakdown keeps known sums and marks unpriced calls without inventing costs',()=>{
 const ledger={entries:{
  a:{provider:'OpenAI',model:'gpt-5.6-terra',at:'2026-11-12T12:00:00Z',usd:.1,input:100,output:20},
  b:{provider:'OpenAI',model:'gpt-6-astra',at:'2026-11-12T12:00:00Z',usd:.3},
  c:{provider:'AudioShake',model:'alignment',at:'2026-11-12T12:00:00Z',credits:4,usd:null},
  d:{provider:'OpenAI',model:'gpt-5.6-terra',at:'2026-10-12T12:00:00Z',usd:.7}
 }};
 const s=U.summarize(ledger,{},Date.parse('2026-11-12T12:00:00Z'));
 assert.equal(s.currentMonth,'2026-11');assert.equal(s.months[0].usd,.4);assert.equal(s.months[0].unknown,1);assert.equal(s.months[0].models.length,3);assert.equal(s.months[1].usd,.7);
});
function harness(){
 const saved={};const browser={storage:{local:{get:async keys=>Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(k=>[k,structuredClone(saved[k])])),set:async value=>Object.assign(saved,structuredClone(value))}}};
 const c={browser,crypto:globalThis.crypto,Date};vm.createContext(c);vm.runInContext(fs.readFileSync('src/usage.js','utf8'),c);return {u:c.KaraokeUsage,saved};
}
test('resumed AudioShake tasks are counted once; price changes preserve already priced history',async()=>{
 const {u,saved}=harness();await u.recordAudio('task-1',null);await u.recordAudio('task-1',4,'2026-11-12T12:00:00Z');
 assert.equal(Object.keys(saved.aiUsageLedger.entries).length,1);
 await u.saveSettings({audioCreditUSD:.25});assert.equal(saved.aiUsageLedger.entries['audioshake:task-1'].usd,1);
 await u.recordAudio('task-1',null);assert.equal(saved.aiUsageLedger.entries['audioshake:task-1'].credits,4);
 await u.saveSettings({audioCreditUSD:.5});await u.recordAudio('task-1',4);assert.equal(saved.aiUsageLedger.entries['audioshake:task-1'].usd,1);
 await u.recordAudio('task-2',4);assert.equal(saved.aiUsageLedger.entries['audioshake:task-2'].usd,2);
});
test('concurrent usage writes retain all models and no lyrics or credentials',async()=>{
 const {u,saved}=harness();await Promise.all(['gpt-5','gpt-4o-mini','gpt-6-astra'].map((model,i)=>u.recordOpenAI(response(model,{id:String(i),apiKey:'secret',output:[{text:'private lyrics'}]}),model)));
 assert.equal(Object.keys(saved.aiUsageLedger.entries).length,3);assert.ok(!JSON.stringify(saved).includes('secret'));assert.ok(!JSON.stringify(saved).includes('private lyrics'));
 const summary=await u.summary();assert.ok(summary.months.length);await assert.rejects(u.saveSettings({audioCreditUSD:-1}));
});
test('unknown model variants are not priced as their base model',()=>{
 for(const model of ['gpt-5-pro','gpt-4.1-mini','gpt-4o-unknown']) assert.equal(U.openAI(response(model),model).usd,null);
});
test('final AudioShake credits update a provisional cost using the original unit price',async()=>{
 const {u,saved}=harness();
 await u.saveSettings({audioCreditUSD:.18});await u.recordAudio('task-1',0);
 await u.saveSettings({audioCreditUSD:.25});await u.recordAudio('task-1',4);
 assert.equal(saved.aiUsageLedger.entries['audioshake:task-1'].usd,.72);
 assert.equal(saved.aiUsageLedger.entries['audioshake:task-1'].creditUSD,.18);
});
