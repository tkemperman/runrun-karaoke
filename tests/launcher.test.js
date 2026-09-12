const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

async function launch(tabs, unavailable = false) {
  const status = { textContent: '' }, sent = [], activated = [];
  let closed = false;
  const context = vm.createContext({
    document: { getElementById: id => id === 'status' ? status : { addEventListener() {} } },
    browser: { tabs: {
      query: async () => tabs,
      sendMessage: async (id, message) => { if (unavailable) throw new Error('No receiver'); sent.push({ id, type: message.type }); },
      update: async id => activated.push(id)
    } },
    window: { close() { closed = true; } }
  });
  // Run the automatic launcher once and wait for its async work.
  const source = fs.readFileSync('src/launcher.js', 'utf8').replace(/openSettings\(\);\s*$/, '');
  vm.runInContext(source, context);
  await vm.runInContext('openSettings()', context);
  return { status: status.textContent, sent, activated, closed };
}
test('Settings launcher opens the active video instead of another recent video', async () => {
  const result = await launch([
    { id: 1, url: 'https://www.youtube.com/watch?v=abcdefghijk', lastAccessed: 20 },
    { id: 2, url: 'https://www.youtube.com/watch?v=h3chCOV_phw', active: true, lastAccessed: 10 }
  ]);
  assert.deepEqual(result.sent, [{ id: 2, type: 'open-editor' }]);
  assert.deepEqual(result.activated, [2]);
  assert.equal(result.closed, true);
});
test('Settings launcher from extension preferences selects the most recent video', async () => {
  const result = await launch([
    { id: 1, active: true, url: 'moz-extension://test/src/launcher.html' },
    { id: 2, url: 'https://www.youtube.com/watch?v=abcdefghijk', lastAccessed: 10 },
    { id: 3, url: 'https://www.youtube.com/watch?v=h3chCOV_phw', lastAccessed: 20 }
  ]);
  assert.deepEqual(result.activated, [3]);
});
test('Settings launcher explains missing videos and unavailable content scripts', async () => {
  const missing = await launch([]);
  assert.match(missing.status, /Open a YouTube video/);
  assert.equal(missing.closed, false);
  const unavailable = await launch([{ id: 1, url: 'https://www.youtube.com/watch?v=abcdefghijk' }], true);
  assert.match(unavailable.status, /Reload/);
  assert.equal(unavailable.closed, false);
});
