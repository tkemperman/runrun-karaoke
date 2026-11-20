'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('src/content.js', 'utf8');
const controls = source.slice(source.indexOf('  const searchSection ='), source.indexOf("  el('p', 'Search by song or artist."));
function fixture(entries) {
  const nodes = [], requests = [];
  function el(tag, text, parent, attrs = {}) {
    const node = { tag, textContent: text, attrs, children: [], hidden: false, disabled: false,
      listeners: {}, addEventListener(type, fn) { this.listeners[type] = fn; },
      append(child) {
        if (child.parentElement) child.parentElement.children = child.parentElement.children.filter(node => node !== child);
        this.children.push(child); child.parentElement = this;
      },
      replaceChildren() { this.children = []; } };
    parent?.append(node); nodes.push(node); return node;
  }
  const context = {
    generation: 1, videoId: 'abcdefghijk', project: { translationLanguage: 'en', blocks: [{ text: 'Existing' }] },
    deleteRemote: { hidden: true },
    openTranslation: { hidden: true, removeAttribute(name) { delete this[name]; } },
    repositorySection: { hidden: true }, Intl, el, section: text => el('details', text),
    button: (text, parent, action) => { const node = el('button', text, parent); node.click = action; return node; },
    C: { validate: value => value }, requireProject() {}, notify() {},
    acceptProject: async (value, fullImport) => { context.loaded = value; context.fullImport = fullImport; return true; },
    request: async message => { requests.push(message); return message.type === 'catalog-search' ? entries : { language: message.language }; }
  };
  vm.runInNewContext(controls + '\nglobalThis.ui = { findCatalogMatch, updatePublicationState, sourceChoices, catalogPanel, lyricsSearchPanel, matchingCatalog, catalogChoice, searchChoice };', context);
  return { context, nodes, requests, ui: context.ui };
}
const entry = language => ({ videoId: 'abcdefghijk', translationLanguage: language, file: `translations/${language}.json`, source: {} });
test('GitHub deletion is visible only for a known catalog match for the current video and language', async () => {
  const f = fixture([entry('en')]);
  assert.equal(f.context.deleteRemote.hidden, true);
  await f.ui.findCatalogMatch();
  assert.equal(f.context.deleteRemote.hidden, false);
  f.context.project.translationLanguage = 'nl'; f.ui.updatePublicationState();
  assert.equal(f.context.deleteRemote.hidden, true);
  f.context.project.translationLanguage = 'en'; f.ui.updatePublicationState();
  assert.equal(f.context.deleteRemote.hidden, false);
  f.context.videoId = '12345678901'; f.ui.updatePublicationState();
  assert.equal(f.context.deleteRemote.hidden, true);
  f.context.videoId = 'abcdefghijk';
  f.context.request = async () => { throw Error('Catalog unavailable'); };
  await f.ui.findCatalogMatch();
  assert.equal(f.context.deleteRemote.hidden, true);
});
test('Open in GitHub links to the matching GitHub file and clears stale destinations', async () => {
  const english = { ...entry('en'), file: 'translations/日本語/en.json', source: { repo: 'example/catalog', branch: 'lyrics/review' } };
  const f = fixture([english]); await f.ui.findCatalogMatch();
  assert.equal(f.context.openTranslation.hidden, false);
  assert.equal(f.context.openTranslation.href, 'https://github.com/example/catalog/blob/lyrics%2Freview/translations/%E6%97%A5%E6%9C%AC%E8%AA%9E/en.json');
  f.context.project.translationLanguage = 'nl'; f.ui.updatePublicationState();
  assert.equal(f.context.openTranslation.hidden, true);
  assert.equal(f.context.openTranslation.href, undefined);
  f.context.project.translationLanguage = 'en'; f.ui.updatePublicationState();
  f.context.request = async () => { throw Error('Catalog unavailable'); };
  await f.ui.findCatalogMatch();
  assert.equal(f.context.openTranslation.hidden, true);
  assert.equal(f.context.openTranslation.href, undefined);
});
test('without catalog matches only the search form is offered', async () => {
  const f = fixture([]); await f.ui.findCatalogMatch();
  assert.equal(f.ui.sourceChoices.hidden, true);
  assert.equal(f.ui.catalogPanel.hidden, true);
  assert.equal(f.ui.lyricsSearchPanel.hidden, false);
  assert.notEqual(f.ui.lyricsSearchPanel.parentElement, f.ui.sourceChoices);
  assert.equal(f.ui.matchingCatalog.children.length, 0);
});
test('one catalog translation needs no language selector and switching modes never loads lyrics', async () => {
  const f = fixture([entry('en')]); await f.ui.findCatalogMatch();
  assert.equal(f.ui.sourceChoices.hidden, false);
  assert.equal(f.ui.catalogPanel.hidden, false);
  assert.equal(f.ui.lyricsSearchPanel.hidden, true);
  assert.equal(f.nodes.some(node => node.tag === 'select'), false);
  const load = f.nodes.find(node => node.textContent === 'Use English translation');
  assert.equal(load.disabled, false);
  f.ui.searchChoice.listeners.change();
  assert.equal(f.ui.catalogPanel.hidden, false); assert.equal(f.ui.lyricsSearchPanel.hidden, false);
  assert.equal(f.ui.lyricsSearchPanel.parentElement, f.ui.sourceChoices);
  assert.equal(load.disabled, true);
  await load.click();
  assert.equal(f.requests.some(message => message.type === 'catalog-load'), false);
  await f.ui.findCatalogMatch();
  assert.equal(f.ui.lyricsSearchPanel.hidden, false);
  assert.equal(f.nodes.findLast(node => node.textContent === 'Use English translation').disabled, true);
  f.ui.catalogChoice.listeners.change();
  assert.equal(f.ui.catalogPanel.hidden, false); assert.equal(f.ui.lyricsSearchPanel.hidden, true);
  assert.equal(f.requests.some(message => message.type === 'catalog-load'), false);
  await f.nodes.findLast(node => node.textContent === 'Use English translation').click();
  assert.equal(f.context.loaded.language, 'en');
  assert.equal(f.context.fullImport, true);
});
test('multiple catalog translations default to English and load the selected language', async () => {
  const f = fixture([entry('nl'), entry('en'), entry('ja')]); await f.ui.findCatalogMatch();
  const select = f.nodes.find(node => node.tag === 'select');
  assert.equal(select.value, '1'); assert.equal(select.children.length, 3);
  f.ui.searchChoice.listeners.change(); assert.equal(select.disabled, true);
  f.ui.catalogChoice.listeners.change(); assert.equal(select.disabled, false);
  select.value = '2';
  await f.nodes.find(node => node.textContent === 'Use selected translation').click();
  assert.equal(f.context.loaded.language, 'ja');
  assert.equal(f.context.fullImport, true);
});
test('switching to search during a catalog download keeps the load button disabled and discards that result', async () => {
  const f = fixture([entry('en')]); await f.ui.findCatalogMatch();
  let finish;
  f.context.request = () => new Promise(resolve => { finish = resolve; });
  const load = f.nodes.find(node => node.textContent === 'Use English translation');
  const pending = load.click();
  assert.equal(load.disabled, true);
  f.ui.searchChoice.listeners.change();
  finish({ language: 'en' }); await pending;
  assert.equal(f.context.loaded, undefined);
  assert.equal(load.disabled, true);
  assert.equal(f.ui.lyricsSearchPanel.hidden, false);
});
test('catalog errors keep search available and stale responses cannot show another video’s options', async () => {
  const failed = fixture([]); failed.context.request = async () => { throw Error('Catalog unavailable'); };
  await failed.ui.findCatalogMatch();
  assert.equal(failed.ui.sourceChoices.hidden, true); assert.equal(failed.ui.lyricsSearchPanel.hidden, false);
  const stale = fixture([entry('en')]);
  stale.context.request = async () => { stale.context.generation++; return [entry('en')]; };
  await stale.ui.findCatalogMatch();
  assert.equal(stale.ui.sourceChoices.hidden, true); assert.equal(stale.ui.matchingCatalog.children.length, 0);
});
