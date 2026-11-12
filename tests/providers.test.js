const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
function harness(lrclib,genius) {
 const c={KaraokeSearch:require('../src/search.js'),URL,AbortController,setTimeout,clearTimeout};
 vm.createContext(c);vm.runInContext(fs.readFileSync('src/providers.js','utf8')+'\nglobalThis.P=KaraokeProviders;',c);
 let calls=0;
 c.P.set('lrclib',{search:lrclib});c.P.set('genius',{search:async()=>{calls++;return genius();}});
 return {search:()=>c.KaraokeLyricsSearch('test','key'),calls:()=>calls};
}
test('untimed LRCLIB text is usable and never triggers Genius',async()=>{
 const h=harness(async()=>[{plainLyrics:'Hello\nHello',syncedLyrics:''}],()=>assert.fail());
 assert.equal((await h.search()).results.length,1);assert.equal(h.calls(),0);
});
test('empty or metadata-only results trigger Genius, preserving warnings on network failure',async()=>{
 for (const lrclib of [async()=>[],async()=>[{plainLyrics:'',syncedLyrics:'[ar:Artist]'}],async()=>{throw Error('Offline');}]) {
 const h=harness(lrclib,()=>({results:[{provider:'genius',plainLyrics:'Line'}],warnings:[]}));
 const result=await h.search();assert.equal(h.calls(),1);assert.equal(result.results[0].provider,'genius');
 if(result.warnings.length) assert.match(result.warnings[0],/Offline/);
 }
});
test('Genius blocks stay errors, not empty searches',async()=>{
 const h=harness(async()=>[],()=>{throw Error('Genius blocked this request (HTTP 403).');});
 await assert.rejects(h.search(),/blocked/);
 const empty=harness(async()=>[],()=>({results:[],warnings:[]}));assert.equal((await empty.search()).results.length,0);
});
