"use strict";
let furiganaMatcherPromise;
async function furiganaMatcher() {
  if (!furiganaMatcherPromise) furiganaMatcherPromise = (async () => {
    const record = await KaraokeDictionary.load() || await KaraokeDictionary.download();
    return KaraokeDictionary.createMatcher(record.entries);
  })().catch(error => { furiganaMatcherPromise = null; throw error; });
  return furiganaMatcherPromise;
}
browser.runtime.onMessage.addListener(async (message, sender) => {
  if (!sender.tab || !sender.url?.startsWith("https://www.youtube.com/")) return;
  try {
    let data;
    const key = `project:${message.videoId}`;
    switch (message.type) {
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
  if (command !== "toggle-karaoke") return;
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) browser.tabs.sendMessage(tab.id, { type: "toggle-enabled" }).catch(() => {});
});
