const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('src/content.js', 'utf8');
const isolation = source.slice(source.indexOf('  // Keep editor'), source.indexOf('  const overlayHost'));

function fixture(paused) {
  function node(parent) {
    const listeners = new Map();
    return {
      parent,
      addEventListener(type, fn) {
        if (!listeners.has(type)) listeners.set(type, []);
        listeners.get(type).push(fn);
      },
      dispatch(event) { for (const fn of listeners.get(event.type) || []) fn(event); }
    };
  }
  const player = node(null), host = node(player), panel = node(host), sync = node(panel);
  const media = { paused };
  let activations = 0;
  sync.addEventListener('click', () => activations++);
  player.addEventListener('click', () => { media.paused = !media.paused; });
  player.addEventListener('keyup', event => { if (event.key === ' ') media.paused = !media.paused; });
  vm.runInNewContext(isolation, { host, panel });
  function dispatch(target, type, key) {
    const event = { type, key, stopped: false, defaultPrevented: false,
      stopPropagation() { this.stopped = true; },
      preventDefault() { this.defaultPrevented = true; } };
    for (let current = target; current; current = current.parent) {
      current.dispatch(event);
      if (event.stopped) break;
    }
    return event;
  }
  return { media, sync, player, dispatch, activations: () => activations };
}

test('clicking Sync in a fullscreen player preserves paused and playing states', () => {
  for (const paused of [true, false]) {
    const f = fixture(paused);
    const event = f.dispatch(f.sync, 'click');
    assert.equal(f.activations(), 1);
    assert.equal(f.media.paused, paused);
    assert.equal(event.defaultPrevented, false);
    // Direct player interaction still toggles playback normally.
    f.dispatch(f.player, 'click');
    assert.equal(f.media.paused, !paused);
  }
});

test('releasing Space on an editor button cannot toggle YouTube playback', () => {
  const f = fixture(true);
  const event = f.dispatch(f.sync, 'keyup', ' ');
  assert.equal(f.media.paused, true);
  assert.equal(event.defaultPrevented, false);
});

test('editor pointer and keyboard events stay inside the extension without cancelling native controls', () => {
  const f = fixture(true);
  for (const type of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'dblclick', 'keydown', 'keypress']) {
    const event = f.dispatch(f.sync, type);
    assert.equal(event.stopped, true, type);
    assert.equal(event.defaultPrevented, false, type);
  }
});
