/* Per-video compare-and-set storage. Remote downloads never override local edits. */
(function (root) {
  "use strict";
  function create(storage, core) {
    const queues = new Map();
    function serial(videoId, action) {
      if (!/^[\w-]{11}$/.test(videoId)) return Promise.reject(new Error('Invalid video ID.'));
      const pending = (queues.get(videoId) || Promise.resolve()).catch(() => {}).then(action);
      queues.set(videoId, pending);
      return pending;
    }
    async function read(videoId) {
      const key = `project:${videoId}`, metaKey = `projectState:${videoId}`;
      const saved = await storage.get([key, metaKey, 'displaySettings']);
      const legacy = saved[key];
      const project = legacy ? core.exportProject(core.singleTranslation(legacy)) : null;
      if (project && !legacy.display && saved.displaySettings) {
        for (const field of ['fontSize', 'position', 'showNext']) {
          if (saved.displaySettings[field] !== undefined) project.display[field] = saved.displaySettings[field];
        }
      }
      const state = saved[metaKey] || { revision: 0, dirty: !!project, blocked: false };
      return { project, ...state, dirty: state.dirty || !!(project && state.baseline && core.fingerprint(project) !== state.baseline) };
    }
    async function write(videoId, value, expectedRevision, options = {}) {
      return serial(videoId, async () => {
        if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) throw new Error('Invalid project revision.');
        const previous = await read(videoId);
        // A user's queued edit wins over a freshly downloaded pristine copy,
        // but never over another user's edit or a deletion tombstone.
        if (previous.revision !== expectedRevision && (expectedRevision > previous.revision || options.automatic || options.deleted || previous.dirty || previous.blocked)) throw new Error('Project changed in another tab. Reload before saving. Your current edits remain in the editor.');
        if (options.automatic && (previous.dirty || previous.blocked)) return previous;
        const project = value ? core.exportProject(core.singleTranslation(value)) : null;
        if (project && project.videoId !== videoId) throw new Error('Project belongs to another video.');
        const state = { revision: previous.revision + 1, dirty: project ? !options.automatic : false,
          blocked: options.deleted ? true : options.manualLoad ? false : previous.blocked,
          baseline: options.automatic ? core.fingerprint(project) : previous.baseline || null,
          source: options.source || previous.source || null };
        const key = `project:${videoId}`;
        // A tombstone invalidates pending saves before the project key is removed.
        await storage.set({ [key]: project, [`projectState:${videoId}`]: state });
        if (!project) await storage.remove(key);
        return { project, ...state };
      });
    }
    return { read: videoId => serial(videoId, () => read(videoId)), write };
  }
  const api = { create };
  root.KaraokeProjects = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
