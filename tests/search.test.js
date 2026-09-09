const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const S = require('../src/search.js');

test('cover title expands artist aliases without treating performers as the recording artist', () => {
  const plan = S.plan('FuwaMoco x Senchou Sing - Ahoy!');
  assert.equal(plan.title, 'Ahoy!');
  assert.ok(plan.targeted.includes('Ahoy! 宝鐘マリン'));
  assert.ok(plan.targeted.includes('Ahoy! Houshou Marine'));
  assert.ok(plan.targeted.includes('Ahoy! FUWAMOCO'));
  const ranked = S.rank([
    {id: 1, trackName: 'Ahoy!', artistName: 'Other'},
    {id: 2, trackName: 'Ahoy!! 我ら宝鐘海賊団☆', artistName: '宝鐘マリン'}
  ], plan);
  assert.equal(ranked[0].id, 2);
});
test('manual queries and uncertain titles remain available; aliases require word boundaries', () => {
  assert.deepEqual(S.plan('Unknown - A Song').fallback, ['Unknown - A Song', 'A Song']);
  assert.equal(S.plan('Senchouette - Ahoy').targeted.length, 0);
  assert.equal(S.plan('Ahoy! - Houshou Marine').title, 'Ahoy!');
  assert.equal(S.plan('宝鐘マリン Ahoy!! 我ら宝鐘海賊団☆').title, 'Ahoy!! 我ら宝鐘海賊団☆');
});
function harness(reply) {
  const calls = [];
  const context = {KaraokeSearch: S, URL, AbortController, setTimeout, clearTimeout,
    fetch: async url => {
      const q = new URL(url).searchParams.get('q'); calls.push(q);
      const data = reply(q);
      return {ok: true, text: async () => JSON.stringify(data)};
    }
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('src/providers.js', 'utf8') + '\nglobalThis.provider = KaraokeProviders.get("lrclib");', context);
  return {calls, search: q => context.provider.search(q)};
}
test('provider merges recordings by ID and skips broad searches when aliases succeed', async () => {
  const h = harness(() => [{id: 7, trackName: 'Ahoy!! 我ら宝鐘海賊団☆', artistName: '宝鐘マリン'}]);
  const rows = await h.search('Senchou Sing - Ahoy!');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].artist, '宝鐘マリン');
  assert.ok(!h.calls.includes('Ahoy!'));
});
test('provider falls back to the short title after empty targeted searches', async () => {
  const h = harness(q => q === 'Ahoy!' ? [{id: 9, trackName: 'Ahoy!', artistName: 'Other'}] : []);
  assert.equal((await h.search('Senchou Sing - Ahoy!'))[0].id, 9);
  assert.equal(h.calls.at(-1), 'Ahoy!');
});
test('partial failures preserve results, complete failures are reported', async () => {
  const h = harness(q => {
    if (q.includes('宝鐘マリン')) return [{id: 7, trackName: 'Ahoy!', artistName: '宝鐘マリン'}];
    throw new Error('Offline');
  });
  assert.equal((await h.search('Senchou - Ahoy!')).length, 1);
  await assert.rejects(harness(() => { throw new Error('Offline'); }).search('Ahoy'), /Offline/);
});
