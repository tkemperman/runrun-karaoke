"use strict";
let furiganaMatcherPromise;
const projectStore = KaraokeProjects.create(browser.storage.local, KaraokeCore);
const surpriseNavigation = new Map();
async function repositoryPreferences() {
  const saved = (await browser.storage.local.get('repositorySettings')).repositorySettings || {};
  const preferences = KaraokeRepositories.settings(saved);
  if (!saved.repository) {
    await browser.storage.local.set({ repositorySettingsBackup: { retrieval: saved.retrieval, publishing: saved.publishing }, repositorySettings: { repository: preferences.repository, token: saved.token || '' } });
  }
  return { saved, preferences };
}
async function youtubeVideoAvailable(videoId) {
  try {
    const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
    const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`, {
      credentials: "omit", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(10000)
    });
    return response.status !== 404;
  } catch (_) {
    // A network failure should not make the entire catalog appear unavailable.
    return true;
  }
}
async function furiganaMatcher() {
  if (!furiganaMatcherPromise) furiganaMatcherPromise = (async () => {
    const record = await KaraokeDictionary.load() || await KaraokeDictionary.download();
    return KaraokeDictionary.createMatcher(record.entries);
  })().catch(error => { furiganaMatcherPromise = null; throw error; });
  return furiganaMatcherPromise;
}
browser.runtime.onMessage.addListener(async (message, sender) => {
  const settingsPage = typeof sender.url === "string" && typeof browser.runtime.getURL === "function" && sender.url.split('?')[0] === browser.runtime.getURL("src/settings.html");
  if (!settingsPage && (!sender.tab || !sender.url?.startsWith("https://www.youtube.com/"))) return;
  if (settingsPage && !["repository-settings", "save-repository-settings"].includes(message.type)) return;
  try {
    let data;
    const key = `project:${message.videoId}`;
    switch (message.type) {
      case "usage-summary":
        data = await KaraokeUsage.summary();
        break;
      case "save-usage-settings":
        data = await KaraokeUsage.saveSettings(message.settings);
        break;
      case "helper-status":
      case "audioshake-settings":
      case "save-audioshake-settings":
      case "timing-start":
      case "timing-status":
      case "timing-cancel":
      case "timing-discard":
        data = await KaraokeNative.request(message);
        break;
      case "load-interface":
        if (sender.frameId && sender.frameId !== 0) throw new Error("Open karaoke in the main YouTube page.");
        for (const [file, symbol] of [["src/core.js", "KaraokeCore"], ["src/timing.js", "KaraokeTiming"], ["src/tutorial.js", "KaraokeTutorial"], ["src/content.js", "KaraokeUI"]]) {
          const [loaded] = await browser.tabs.executeScript(sender.tab.id, { code: `typeof ${symbol} !== "undefined"`, frameId: 0 });
          if (!loaded) await browser.tabs.executeScript(sender.tab.id, { file, frameId: 0 });
        }
        data = true;
        break;
      case "catalog-search":
      case "catalog-load": {
        if (!/^[\w-]{11}$/.test(message.videoId)) throw new Error("Invalid video ID.");
        const { preferences } = await repositoryPreferences();
        const source = preferences.repository;
        if (message.source && JSON.stringify(message.source) !== JSON.stringify(source)) throw new Error('Repository settings changed. Search again.');
        if (message.type === "catalog-search") {
          data = (await KaraokeRepositories.catalog(source)).filter(entry => entry.videoId === message.videoId).map(entry => ({ ...entry, source }));
        } else {
          data = await KaraokeRepositories.retrieve(source, message.file, message.videoId);
          if (message.language) data.translationLanguage = message.language;
        }
        break;
      }
      case "repository-settings": {
        const { saved, preferences } = await repositoryPreferences();
        data = { ...preferences, hasToken: !!saved.token };
        break;
      }
      case "save-repository-settings": {
        if (!settingsPage) throw new Error("Open extension Settings to change repositories.");
        const saved = (await browser.storage.local.get("repositorySettings")).repositorySettings || {};
        if (message.token !== undefined && (typeof message.token !== "string" || message.token.length > 1000 || /[\r\n]/.test(message.token))) throw new Error("Invalid GitHub token.");
        const preferences = KaraokeRepositories.settings(message.settings);
        const token = message.token === undefined ? saved.token || "" : message.token.trim();
        await browser.storage.local.set({ repositorySettings: { repository: preferences.repository, token } });
        data = { ...preferences, hasToken: !!token };
        break;
      }
      case "repository-search":
      case "repository-random-available":
      case "repository-random":
      case "repository-load":
      case "repository-inspect":
      case "repository-delete-inspect":
      case "repository-delete":
      case "repository-publish": {
        const { saved, preferences } = await repositoryPreferences();
        if (message.type === "repository-search") {
          if (JSON.stringify(message.source) !== JSON.stringify(preferences.retrieval)) throw new Error("Retrieval settings changed. Search again.");
          data = await KaraokeRepositories.catalog(preferences.retrieval);
        }
        if (message.type === "repository-random" || message.type === "repository-random-available") {
          if (message.videoId !== null && message.videoId !== undefined && !/^[\w-]{11}$/.test(message.videoId)) throw new Error("Invalid video ID.");
          const now = new Date();
          const aprilFoolsYear = now.getMonth() === 3 && now.getDate() === 1 ? now.getFullYear() : null;
          const prankKey = "surpriseRickrollYear";
          const prankWasShown = aprilFoolsYear !== null && (await browser.storage.local.get(prankKey))[prankKey] === aprilFoolsYear;
          if (aprilFoolsYear !== null && !prankWasShown) {
            if (message.type === "repository-random") await browser.storage.local.set({ [prankKey]: aprilFoolsYear });
            data = message.type === "repository-random" ? { videoId: "668r-uYMFfA", prank: true } : { available: true };
            break;
          }
          if (!preferences.retrieval.repo) { data = message.type === "repository-random" ? { videoId: null } : { available: false }; break; }
          const videoIds = [...new Set((await KaraokeRepositories.catalog(preferences.retrieval)).map(entry => entry.videoId))];
          const alternatives = videoIds.filter(id => id !== message.videoId);
          if (message.type === "repository-random-available") { data = { available: !!alternatives.length }; break; }
          for (let index = alternatives.length - 1; index > 0; index--) {
            const randomIndex = Math.floor(Math.random() * (index + 1));
            [alternatives[index], alternatives[randomIndex]] = [alternatives[randomIndex], alternatives[index]];
          }
          let selectedVideoId = null;
          for (const candidate of alternatives) {
            if (await youtubeVideoAvailable(candidate)) { selectedVideoId = candidate; break; }
          }
          data = { videoId: selectedVideoId };
          if (selectedVideoId) surpriseNavigation.set(sender.tab.id, { videoId: selectedVideoId, expires: Date.now() + 60000 });
        }
        if (message.type === "repository-load") {
          if (JSON.stringify(message.source) !== JSON.stringify(preferences.retrieval)) throw new Error("Retrieval settings changed. Search again.");
          data = await KaraokeRepositories.retrieve(preferences.retrieval, message.file, message.videoId);
        }
        if (message.type === "repository-inspect") data = { ...await KaraokeRepositories.inspectBatch(preferences.publishing, saved.token, message.project, message.videoTitle), target: preferences.publishing };
        if (message.type === "repository-publish") {
          if (JSON.stringify(message.target) !== JSON.stringify(preferences.publishing)) throw new Error("Upload settings changed. Check the destination again.");
          data = await KaraokeRepositories.publishBatch(preferences.publishing, saved.token, message.project, message.sha, message.videoTitle);
        }
        if (message.type === 'repository-delete-inspect' || message.type === 'repository-delete') {
          if (JSON.stringify(message.target) !== JSON.stringify(preferences.repository)) throw new Error('Repository settings changed. Review deletion again.');
          data = message.type === 'repository-delete-inspect'
            ? await KaraokeRepositories.inspectDelete(preferences.repository, saved.token, message.file, message.videoId)
            : await KaraokeRepositories.remove(preferences.repository, saved.token, message.file, message.sha, message.videoId);
        }
        break;
      }
      case 'surprise-arrival': {
        const intent = surpriseNavigation.get(sender.tab.id);
        surpriseNavigation.delete(sender.tab.id);
        data = !!intent && intent.videoId === message.videoId && intent.expires > Date.now();
        break;
      }
      case 'surprise-pending': {
        const intent = surpriseNavigation.get(sender.tab.id);
        data = !!intent && intent.videoId === message.videoId && intent.expires > Date.now();
        break;
      }
      case 'project-read': data = await projectStore.read(message.videoId); break;
      case 'project-write':
        data = await projectStore.write(message.project.videoId, message.project, message.revision, { manualLoad: message.manualLoad === true }); break;
      case 'project-delete':
        data = await projectStore.write(message.videoId, null, message.revision, { deleted: true }); break;
      case 'project-auto': {
        const previous = await projectStore.read(message.videoId);
        if (previous.dirty || previous.blocked || previous.revision !== message.revision) { data = previous; break; }
        const { preferences } = await repositoryPreferences();
        const source = preferences.repository;
        const entry = (await KaraokeRepositories.catalog(source)).find(e => e.videoId === message.videoId && e.translationLanguage === 'en');
        if (!entry) { data = previous; break; }
        const imported = await KaraokeRepositories.retrieve(source, entry.file, message.videoId);
        imported.translationLanguage = 'en';
        if (JSON.stringify((await repositoryPreferences()).preferences.repository) !== JSON.stringify(source)) throw new Error('Repository settings changed. Try again.');
        // Preserve previously loaded other languages if their shared lyrics still match.
        let candidate = imported;
        if (previous.project) {
          const incomingLanguages = new Set(imported.blocks.flatMap(row => Object.keys(row.translations)));
          const retained = { ...previous.project, translationLanguage: 'en', blocks: previous.project.blocks.map(row => ({ ...row,
            translations: Object.fromEntries(Object.entries(row.translations).filter(([language]) => !incomingLanguages.has(language))) })) };
          const merged = KaraokeCore.mergeTranslations(imported, retained);
          if (!merged.replacement) candidate = merged.project;
        }
        data = await projectStore.write(message.videoId, candidate, previous.revision, { automatic: true, source: { ...source, file: entry.file } });
        break;
      }
      case "furigana": {
        if (!Array.isArray(message.texts) || message.texts.length > 200 || message.texts.some(text => typeof text !== "string" || text.length > 20000)) throw new Error("Invalid furigana request.");
        const matcher = await furiganaMatcher();
        data = message.texts.map(text => matcher.segment(text) || (text ? [[text, null]] : []));
        break;
      }
      case "load":
        if (!/^[\w-]{11}$/.test(message.videoId)) throw new Error("Invalid video ID.");
        data = (await browser.storage.local.get(key))[key] || null;
        break;
      case "save": {
        const project = KaraokeCore.validate(message.project);
        const state = await projectStore.read(project.videoId);
        if (state.revision !== 0) throw new Error('Reload YouTube before saving with the updated extension.');
        await projectStore.write(project.videoId, project, 0);
        data = true;
        break;
      }
      case "translation-settings": {
        const saved = (await browser.storage.local.get("translationSettings")).translationSettings || {};
        data = { provider: "openai", model: saved.model || "gpt-6-astra", language: saved.language || "en", includeFurigana: saved.includeFurigana !== false, convertRomaji: saved.convertRomaji !== false, hasApiKey: !!saved.apiKey };
        break;
      }
      case "save-translation-settings": {
        const { model, language, apiKey } = message;
        if (message.convertRomaji !== undefined && typeof message.convertRomaji !== 'boolean') throw new Error('Invalid romaji preference.');
        if (message.includeFurigana !== undefined && typeof message.includeFurigana !== "boolean") throw new Error("Invalid furigana preference.");
        if (!["gpt-6-astra", "gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna", "gpt-5.5", "gpt-5", "gpt-4.1", "gpt-4o", "gpt-4o-mini"].includes(model) || typeof language !== "string" || !/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(language)) throw new Error("Invalid translation preferences.");
        if (apiKey !== undefined && (typeof apiKey !== "string" || apiKey.length > 1000)) throw new Error("Invalid API key.");
        const saved = (await browser.storage.local.get("translationSettings")).translationSettings || {};
        await browser.storage.local.set({ translationSettings: { provider: "openai", model, language, includeFurigana: message.includeFurigana ?? saved.includeFurigana ?? true, convertRomaji: message.convertRomaji ?? saved.convertRomaji ?? true, apiKey: apiKey === undefined ? saved.apiKey || "" : apiKey.trim() } });
        data = { hasApiKey: apiKey === undefined ? !!saved.apiKey : !!apiKey.trim() };
        break;
      }
      case "ai-furigana": {
        const saved = (await browser.storage.local.get("translationSettings")).translationSettings || {};
        data = await KaraokeTranslation.generateFurigana({ ...message, apiKey: saved.apiKey, onUsage: response => KaraokeUsage.recordOpenAI(response, message.model) });
        break;
      }
      case "translate": {
        const saved = (await browser.storage.local.get("translationSettings")).translationSettings || {};
        data = await KaraokeTranslation.translate({ ...message, apiKey: saved.apiKey, onUsage: response => KaraokeUsage.recordOpenAI(response, message.model) });
        break;
      }
      case "genius-settings": {
        const saved = (await browser.storage.local.get("geniusSettings")).geniusSettings || {};
        data = { hasApiKey: !!saved.apiKey };
        break;
      }
      case "save-genius-settings": {
        if (typeof message.apiKey !== "string" || message.apiKey.length > 1000 || /[\r\n]/.test(message.apiKey)) throw new Error("Invalid Genius API key.");
        await browser.storage.local.set({ geniusSettings: { apiKey: message.apiKey.trim() } });
        data = { hasApiKey: !!message.apiKey.trim() };
        break;
      }
      case "search":
        if (typeof message.query !== "string" || !message.query.trim() || message.query.length > 500) throw new Error("Enter a shorter song or artist search.");
        data = await KaraokeLyricsSearch(message.query, (await browser.storage.local.get("geniusSettings")).geniusSettings?.apiKey);
        break;
      default: throw new Error("Unknown request.");
    }
    return { data };
  } catch (error) { return { error: error.message }; }
});
browser.commands.onCommand.addListener(async command => {
  const type = { "toggle-karaoke": "toggle-enabled", "toggle-settings": "toggle-editor" }[command];
  if (!type) return;
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) browser.tabs.sendMessage(tab.id, { type }).catch(() => {});
});
