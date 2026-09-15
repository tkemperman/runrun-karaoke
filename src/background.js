"use strict";
let furiganaMatcherPromise;
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
      case "load-interface":
        if (sender.frameId && sender.frameId !== 0) throw new Error("Open karaoke in the main YouTube page.");
        for (const [file, symbol] of [["src/core.js", "KaraokeCore"], ["src/tutorial.js", "KaraokeTutorial"], ["src/content.js", "KaraokeUI"]]) {
          const [loaded] = await browser.tabs.executeScript(sender.tab.id, { code: `typeof ${symbol} !== "undefined"`, frameId: 0 });
          if (!loaded) await browser.tabs.executeScript(sender.tab.id, { file, frameId: 0 });
        }
        data = true;
        break;
      case "catalog-search":
      case "catalog-load": {
        if (!/^[\w-]{11}$/.test(message.videoId)) throw new Error("Invalid video ID.");
        const source = { repo: "tkemperman/runrun-karaoke-lyrics-catalog", branch: "main" };
        if (message.type === "catalog-search") {
          data = (await KaraokeRepositories.catalog(source)).filter(entry => entry.videoId === message.videoId);
        } else {
          data = await KaraokeRepositories.retrieve(source, message.file, message.videoId);
        }
        break;
      }
      case "repository-settings": {
        const saved = (await browser.storage.local.get("repositorySettings")).repositorySettings || {};
        data = { ...KaraokeRepositories.settings(saved), hasToken: !!saved.token };
        break;
      }
      case "save-repository-settings": {
        if (!settingsPage) throw new Error("Open extension Settings to change repositories.");
        const saved = (await browser.storage.local.get("repositorySettings")).repositorySettings || {};
        if (message.token !== undefined && (typeof message.token !== "string" || message.token.length > 1000 || /[\r\n]/.test(message.token))) throw new Error("Invalid GitHub token.");
        const preferences = KaraokeRepositories.settings(message.settings);
        const token = message.token === undefined ? saved.token || "" : message.token.trim();
        await browser.storage.local.set({ repositorySettings: { ...preferences, token } });
        data = { ...preferences, hasToken: !!token };
        break;
      }
      case "repository-search":
      case "repository-random-available":
      case "repository-random":
      case "repository-load":
      case "repository-inspect":
      case "repository-publish": {
        const saved = (await browser.storage.local.get("repositorySettings")).repositorySettings || {};
        const preferences = KaraokeRepositories.settings(saved);
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
            data = message.type === "repository-random" ? { videoId: "668r-uYMFfA" } : { available: true };
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
        }
        if (message.type === "repository-load") {
          if (JSON.stringify(message.source) !== JSON.stringify(preferences.retrieval)) throw new Error("Retrieval settings changed. Search again.");
          data = await KaraokeRepositories.retrieve(preferences.retrieval, message.file, message.videoId);
        }
        if (message.type === "repository-inspect") data = { ...await KaraokeRepositories.inspect(preferences.publishing, saved.token, message.project, message.videoTitle), target: preferences.publishing };
        if (message.type === "repository-publish") {
          if (JSON.stringify(message.target) !== JSON.stringify(preferences.publishing)) throw new Error("Upload settings changed. Check the destination again.");
          data = await KaraokeRepositories.publish(preferences.publishing, saved.token, message.project, message.sha, message.videoTitle);
        }
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
        await browser.storage.local.set({ [`project:${project.videoId}`]: project });
        data = true;
        break;
      }
      case "translation-settings": {
        const saved = (await browser.storage.local.get("translationSettings")).translationSettings || {};
        data = { provider: "openai", model: saved.model || "gpt-6-astra", language: saved.language || "en", hasApiKey: !!saved.apiKey };
        break;
      }
      case "save-translation-settings": {
        const { model, language, apiKey } = message;
        if (!["gpt-6-astra", "gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna", "gpt-5.5", "gpt-5", "gpt-4.1", "gpt-4o", "gpt-4o-mini"].includes(model) || typeof language !== "string" || !/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(language)) throw new Error("Invalid translation preferences.");
        if (apiKey !== undefined && (typeof apiKey !== "string" || apiKey.length > 1000)) throw new Error("Invalid API key.");
        const saved = (await browser.storage.local.get("translationSettings")).translationSettings || {};
        await browser.storage.local.set({ translationSettings: { provider: "openai", model, language, apiKey: apiKey === undefined ? saved.apiKey || "" : apiKey.trim() } });
        data = { hasApiKey: apiKey === undefined ? !!saved.apiKey : !!apiKey.trim() };
        break;
      }
      case "ai-furigana": {
        const saved = (await browser.storage.local.get("translationSettings")).translationSettings || {};
        data = await KaraokeTranslation.generateFurigana({ ...message, apiKey: saved.apiKey });
        break;
      }
      case "translate": {
        const saved = (await browser.storage.local.get("translationSettings")).translationSettings || {};
        data = await KaraokeTranslation.translate({ ...message, apiKey: saved.apiKey });
        break;
      }
      case "search":
        if (typeof message.query !== "string" || !message.query.trim() || message.query.length > 500) throw new Error("Enter a shorter song or artist search.");
        data = await KaraokeProviders.get("lrclib").search(message.query);
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
