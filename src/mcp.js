/* Optional local MCP bridge. No keys, arbitrary storage, scripts or paid APIs are exposed. */
(function (root) {
  'use strict';
  function create({ core, store, tabs, settings, repository }) {
    const normalize = project => core.exportProject(core.singleTranslation(project));
    async function contexts() {
      const result = [];
      for (const tab of await tabs.query({ url: 'https://www.youtube.com/*' })) {
        const url = new URL(tab.url), videoId = url.pathname === '/watch' && url.searchParams.get('v');
        if (!/^[\w-]{11}$/.test(videoId)) continue;
        const info = await tabs.sendMessage(tab.id, { type: 'mcp-snapshot', videoId }).catch(() => null);
        result.push({ tabId: tab.id, videoId, title: tab.title, active: tab.active, ...(info?.error ? { error: info.error } : { duration: info?.duration }) });
      }
      return result;
    }
    async function read(videoId) {
      if (!/^[\w-]{11}$/.test(videoId)) throw new Error('Invalid video ID.');
      const opened = (await tabs.query({ url: `https://www.youtube.com/*` })).filter(tab => {
        const url = new URL(tab.url); return url.pathname === '/watch' && url.searchParams.get('v') === videoId;
      });
      const snapshots = [];
      for (const tab of opened) {
        const snapshot = await tabs.sendMessage(tab.id, { type: 'mcp-snapshot', videoId });
        if (!snapshot || snapshot.error) throw new Error(snapshot?.error || 'Wait for the video editor to load.');
        snapshots.push(snapshot);
      }
      const state = await store.read(videoId), preferences = await settings();
      const project = state.project || snapshots[0]?.project || core.project(videoId);
      if (!state.project && !snapshots.length) project.translationLanguage = preferences.language;
      for (const snapshot of snapshots) {
        if (snapshot.revision !== state.revision || (state.project && JSON.stringify(normalize(snapshot.project)) !== JSON.stringify(state.project))) {
          throw new Error('An open editor has unsaved or conflicting changes. Save/reload it before reviewing lyrics.');
        }
      }
      return { ...state, project, hasLyrics: project.blocks.some(row => row.text.trim()), targetLanguage: project.translationLanguage,
        duration: snapshots[0]?.duration ?? null, tabs: opened.map(tab => tab.id) };
    }
    async function dispatch(message) {
      const a = message.arguments || {};
      switch (message.operation) {
        case 'list': return contexts();
        case 'read': return read(a.videoId);
        case 'validate': return normalize(a.project);
        case 'apply': {
          const before = await read(a.project.videoId);
          if (before.revision !== a.revision) throw new Error('Project changed since review. Make a new proposal.');
          const saved = await store.write(a.project.videoId, normalize(a.project), a.revision, { manualLoad: true, strict: true });
          const editorUpdates = await Promise.all(before.tabs.map(tabId => tabs.sendMessage(tabId, {
            type: 'mcp-reload', videoId: a.project.videoId, previous: before.project, revision: a.revision, state: saved
          }).catch(error => ({ error: error.message }))));
          return { ...saved, editorUpdates };
        }
        case 'publication-review': {
          const state = await read(a.videoId);
          if (state.revision !== a.revision) throw new Error('Project changed. Review the current lyrics before publishing.');
          const target = await repository.preferences();
          return { ...await repository.inspect(target, state.project), target: target.source, project: state.project, revision: state.revision };
        }
        case 'publish': {
          const state = await read(a.videoId);
          if (state.revision !== a.review.revision || JSON.stringify(state.project) !== JSON.stringify(a.review.project)) throw new Error('Project changed after publication review.');
          const target = await repository.preferences();
          if (JSON.stringify(target.source) !== JSON.stringify(a.review.target)) throw new Error('Repository settings changed. Review publication again.');
          return repository.publish(target, state.project, a.review.sha);
        }
        default: throw new Error('Unsupported MCP operation.');
      }
    }
    return { dispatch };
  }
  let port = null;
  function connect(dispatch) {
    if (port) return;
    try {
      const connection = browser.runtime.connectNative('com.runrun.karaoke.mcp');
      port = connection;
      connection.onDisconnect.addListener(() => { if (port === connection) port = null; });
      connection.onMessage.addListener(async message => {
        let response;
        try { response = { data: await dispatch(message) }; }
        catch (error) { response = { error: error.message }; }
        try { connection.postMessage(response); } catch (_) { /* The MCP client disconnected. */ }
      });
    } catch (_) { port = null; }
  }
  root.KaraokeMCP = { create, connect };
  if (typeof module !== 'undefined') module.exports = root.KaraokeMCP;
})(globalThis);
