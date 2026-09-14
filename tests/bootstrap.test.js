const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function harness(load) {
  let listener, requests = 0;
  const node = () => ({ style: {}, dataset: {}, setAttribute() {}, addEventListener() {}, append() {}, prepend() {}, remove() {}, attachShadow: node });
  const context = {
    document: { createElement: node, createElementNS: node, body: node(), querySelector: () => null, addEventListener() {} },
    location: { pathname: '/watch' }, MutationObserver: class { observe() {} }, requestAnimationFrame() {},
    browser: { runtime: { getURL: x => x, onMessage: { addListener(fn) { listener = fn; } }, sendMessage: async message => { requests++; assert.equal(message.type, 'load-interface'); return load(context); } } }
  };
  vm.runInNewContext(fs.readFileSync('src/bootstrap.js', 'utf8'), context);
  return { send: type => listener({ type }), requests: () => requests };
}
test('YouTube bootstrap stays idle until activation and shares concurrent loading', async () => {
  let finish;
  const actions = [];
  const h = harness(context => new Promise(resolve => { finish = () => { context.KaraokeUI = type => { actions.push(type); return { enabled: true }; }; resolve({ data: true }); }; }));
  assert.equal(h.requests(), 0);
  assert.equal((await h.send('get-state')).enabled, false);
  const first = h.send('open-editor'), second = h.send('toggle-enabled');
  assert.equal(h.requests(), 1);
  finish();
  await Promise.all([first, second]);
  assert.deepEqual(actions, ['open-editor', 'toggle-enabled']);
  await h.send('toggle-editor');
  assert.equal(h.requests(), 1);
});
test('failed interface loading can be retried', async () => {
  let attempts = 0;
  const h = harness(context => {
    if (++attempts === 1) return { error: 'Temporary failure' };
    context.KaraokeUI = () => ({ enabled: true });
    return { data: true };
  });
  await assert.rejects(h.send('open-editor'), /Temporary failure/);
  assert.equal((await h.send('open-editor')).enabled, true);
  assert.equal(h.requests(), 2);
});
