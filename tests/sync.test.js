const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const C = require('../src/core.js');

const source = fs.readFileSync('src/content.js', 'utf8');
const syncControl = source.slice(source.indexOf('  button("Sync with video position"'), source.indexOf('  el("p", "Start at sets'));

function fixture({ selected = 0, untimed = false, accepted = true } = {}) {
  const project = C.project('abcdefghijk');
  project.offset = 0.5;
  project.blocks = [C.block('First', 10, 12), C.block('Second', untimed ? null : 15)];
  const media = { currentTime: 1.145 };
  const calls = { confirmations: 0, renders: 0, saves: 0 };
  let click;
  vm.runInNewContext(syncControl, {
    C, project, selected, syncRow: {}, requireProject() {}, video: () => media,
    document: { querySelector: () => null },
    button(label, parent, action) { click = action; return {}; },
    confirmShift() { calls.confirmations++; media.currentTime = 5.145; return accepted; },
    renderRows() { calls.renders++; }, save() { calls.saves++; }
  });
  return { project, media, calls, click };
}

test('sync uses the click position even when playback advances during confirmation', () => {
  const { project, media, calls, click } = fixture();
  click();
  assert.equal(media.currentTime, 5.145);
  assert.equal(Number((project.blocks[0].start + project.offset).toFixed(3)), 1.145);
  assert.equal(Number((project.blocks[1].start + project.offset).toFixed(3)), 6.145);
  assert.deepEqual(calls, { confirmations: 1, renders: 1, saves: 1 });
});

test('sync anchors the selected line and applies an existing offset only once', () => {
  const { project, click } = fixture({ selected: 1 });
  click();
  assert.equal(Number((project.blocks[1].start + project.offset).toFixed(3)), 1.145);
  assert.equal(project.blocks[0].start, 10);
  assert.equal(project.blocks[1].start, 15);
});

test('cancelling sync leaves timing unchanged and does not save', () => {
  const { project, calls, click } = fixture({ accepted: false });
  const before = structuredClone(project);
  click();
  assert.deepEqual(project, before);
  assert.deepEqual(calls, { confirmations: 1, renders: 0, saves: 0 });
});

test('sync initializes an untimed selected line without shifting other lyrics', () => {
  const { project, calls, click } = fixture({ selected: 1, untimed: true });
  click();
  assert.equal(project.blocks[1].start, 0.645);
  assert.equal(project.blocks[0].start, 10);
  assert.equal(project.offset, 0.5);
  assert.deepEqual(calls, { confirmations: 0, renders: 1, saves: 1 });
});

function startAtFixture({ offset = 0, accepted = true, untimed = false } = {}) {
  const project = C.project('abcdefghijk');
  project.offset = offset;
  project.blocks = untimed
    ? [C.block('First'), C.block('Second')]
    : [C.block('First', 5, 7), C.block('Second', 10, 12)];
  let saves = 0;
  const context = {
    C, project, display: {}, timingWarning: {}, untimedMessage: '', requireProject() {},
    el() { return { value: '', addEventListener() {}, setAttribute() {} }; },
    button(label, parent, action) { return { click: action, setAttribute() {} }; },
    window: { confirm: () => accepted }, renderRows() {},
    save() { saves++; context.ui.updateTimingFields(); }
  };
  const controls = source.slice(source.indexOf('  el("label", "Start at"'), source.indexOf('  function parseLineTime'));
  vm.runInNewContext(controls + '\nglobalThis.ui = { startAt, resetStartAt, updateTimingFields };', context);
  context.ui.updateTimingFields();
  return { project, ui: context.ui, saves: () => saves };
}

test('Start at cross sets the first lyric to zero, including with no existing offset', () => {
  for (const offset of [0, 3, -2]) {
    const { project, ui, saves } = startAtFixture({ offset });
    ui.resetStartAt.click();
    assert.equal(ui.startAt.value, '0:00');
    assert.equal(project.offset, -5);
    assert.deepEqual(project.blocks.map(row => [row.start + project.offset, row.end + project.offset]), [[0, 2], [5, 7]]);
    assert.equal(saves(), 1);
  }
});

test('cancelling the Start at cross preserves the displayed time and saved timing', () => {
  const { project, ui, saves } = startAtFixture({ offset: 3, accepted: false });
  const before = structuredClone(project);
  ui.resetStartAt.click();
  assert.deepEqual(project, before);
  assert.equal(ui.startAt.value, '0:08');
  assert.equal(saves(), 0);
});

test('Start at cross initializes the first untimed lyric at zero', () => {
  const { project, ui } = startAtFixture({ untimed: true });
  ui.resetStartAt.click();
  assert.equal(ui.startAt.value, '0:00');
  assert.equal(project.blocks[0].start, 0);
  assert.equal(project.blocks[1].start, null);
});
