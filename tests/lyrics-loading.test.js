const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const C = require('../src/core.js');

const source = fs.readFileSync('src/content.js', 'utf8');
const extract = (start, end) => source.slice(source.indexOf(start), source.indexOf(end));

function fixture(accepted = true) {
  const project = C.project('abcdefghijk');
  project.blocks = [C.block('First', 10, 15), C.block('Second', 20)];
  project.offset = 3;
  const saved = [], confirmations = [];
  const context = {
    C, project, selected: 0, videoId: project.videoId, resultRow: {}, resultList: { value: '0' }, results: [],
    startAt: {}, resetStartAt: {}, timingWarning: {}, untimedMessage: 'Untimed lyrics',
    showFurigana: {}, furiganaStatus: { classList: { remove() {} } },
    correctionStatus: {}, correctionTerm: {}, correctionReading: {}, targetLanguage: {}, title: {},
    window: { confirm: message => { confirmations.push(message); return accepted; } },
    requireProject() {}, replaceAllowed: () => accepted,
    updateTimingControls() {}, updateSelectionWarning() {}, updateFuriganaButton() {}, refreshDisplay() {},
    updateVideoTitle() {}, renderRows() {}, renderSources() {}, updatePublicationState() {},
    save() { saved.push(C.validate(context.project)); },
    button(label, parent, action) { context.loadLyrics = action; }
  };
  vm.createContext(context);
  vm.runInContext([
    extract('  function firstTimedLyric()', '  function parseLineTime'),
    extract('  async function acceptProject(', '  const sources ='),
    extract('  function refresh() {', '  function insertLine('),
    extract('  button("Use selected lyrics"', '  const { field: geniusKey')
  ].join('\n'), context);
  context.refresh();
  assert.equal(context.startAt.value, '0:13');
  return { context, saved, confirmations };
}

test('loading LRCLIB timing replaces the previous Start at and saves without the old offset', () => {
  const { context, saved } = fixture();
  context.results = [{ provider: 'lrclib', url: 'https://lrclib.net/api/get/1', title: 'Song', artist: 'Artist',
    syncedLyrics: '[00:00.00]\n[00:05.145]First\n[00:12.00]Second' }];
  context.loadLyrics();
  assert.equal(context.startAt.value, '0:05.145');
  assert.equal(context.project.offset, 0);
  assert.equal(saved[0].blocks[1].start, 5.145);
});

test('loading untimed LRCLIB lyrics clears the previous Start at', () => {
  const { context } = fixture();
  context.results = [{ provider: 'lrclib', url: 'https://lrclib.net/api/get/1', title: 'Song', artist: 'Artist',
    plainLyrics: 'First\nSecond' }];
  context.loadLyrics();
  assert.equal(context.startAt.value, '');
  assert.equal(context.project.offset, 0);
  assert.equal(context.timingWarning.hidden, false);
});

test('loading a GitHub project with matching lyrics restores its Start at, including its offset', async () => {
  const { context, saved } = fixture();
  const incoming = structuredClone(context.project);
  incoming.offset = 1.5;
  incoming.blocks[0].start = 5.145;
  incoming.blocks[1].start = 18;
  assert.equal(await context.acceptProject(incoming, true), true);
  assert.equal(context.startAt.value, '0:06.645');
  assert.equal(saved[0].offset, 1.5);
  assert.equal(saved[0].blocks[0].start, 5.145);
  assert.equal(saved[0].blocks[1].start, 18);
});

test('loading untimed GitHub lyrics clears Start at even when the imported project has an offset', async () => {
  const { context, saved } = fixture();
  const incoming = structuredClone(context.project);
  incoming.blocks.forEach(row => { row.start = null; row.end = null; });
  assert.equal(await context.acceptProject(incoming, true), true);
  assert.equal(context.startAt.value, '');
  assert.equal(context.timingWarning.hidden, false);
  assert.equal(saved[0].blocks.every(row => row.start === null), true);
  context.project = saved[0];
  context.refresh();
  assert.equal(context.startAt.value, '');
});

test('cancelling imported timing preserves both Start at and the current project', async () => {
  const { context, saved } = fixture(false);
  const before = structuredClone(context.project);
  const incoming = structuredClone(before);
  incoming.offset = 0;
  assert.equal(await context.acceptProject(incoming, true), false);
  assert.equal(context.startAt.value, '0:13');
  assert.deepEqual(context.project, before);
  assert.equal(saved.length, 0);
});
