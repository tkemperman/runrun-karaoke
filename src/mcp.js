/* Optional local MCP bridge. Keys and arbitrary storage/scripts stay private. */
(function (root) {
  'use strict';
  function create({ core, store, tabs, settings, repository, translate }) {
    const normalize = project => core.exportProject(core.singleTranslation(project));
    const translationJobs = new Map();
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
        case 'start-translation': {
          const before = await read(a.videoId);
          if (!before.hasLyrics) throw new Error('Add original lyrics before translating.');
          for (const key of ['includeFurigana', 'convertRomaji']) {
            if (a[key] !== undefined && typeof a[key] !== 'boolean') throw new Error(`Invalid ${key} option.`);
          }
          const preferences = await settings();
          const existing = translationJobs.get(a.videoId);
          if (existing?.status === 'running') return { ...existing };
          const job = { jobId: crypto.randomUUID(), videoId: a.videoId, status: 'running', revision: before.revision,
            model: preferences.model, language: before.targetLanguage,
            includeFurigana: a.includeFurigana ?? preferences.includeFurigana ?? true,
            convertRomaji: a.convertRomaji ?? preferences.convertRomaji ?? true };
          translationJobs.set(a.videoId, job);
          // Return immediately: AI requests can outlast the native bridge timeout.
          Promise.resolve().then(async () => {
            const result = await translate({ model: job.model, language: job.language,
              includeFurigana: job.includeFurigana, convertRomaji: job.convertRomaji,
              lines: before.project.blocks.map(({ id, text }) => ({ id, text })) });
            const current = await read(a.videoId);
            if (current.revision !== before.revision || JSON.stringify(current.project) !== JSON.stringify(before.project)) {
              throw new Error('Project changed during translation. Result discarded.');
            }
            const proposal = structuredClone(before.project), byId = new Map(result.lines.map(row => [row.id, row]));
            if (result.lines.length !== proposal.blocks.length || byId.size !== proposal.blocks.length) throw new Error('Incomplete AI result.');
            for (const row of proposal.blocks) {
              const translated = byId.get(row.id);
              if (!translated || typeof translated.text !== 'string' || typeof translated.translation !== 'string') throw new Error('Invalid AI result.');
              if (translated.text !== row.text) { delete row.furigana; delete row.sweep; }
              row.text = translated.text;
              row.translations = { [job.language]: translated.translation };
              if (job.includeFurigana) {
                core.validateFurigana(row.text, translated.furigana);
                row.furigana = translated.furigana;
              }
            }
            proposal.originalLanguage = result.originalLanguage;
            if (job.includeFurigana) proposal.furiganaEnabled = true;
            job.project = normalize(proposal);
            job.status = 'completed';
          }).catch(error => {
            job.status = 'error'; job.error = error.message;
            if (error.furiganaDetails) job.furiganaDetails = error.furiganaDetails;
          });
          return { ...job };
        }
        case 'translation-status': {
          if (!/^[\w-]{11}$/.test(a.videoId)) throw new Error('Invalid video ID.');
          const job = translationJobs.get(a.videoId);
          if (!job || job.jobId !== a.jobId) throw new Error('Translation job unavailable. The extension may have reloaded.');
          return { ...job };
        }
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
