"use strict";
// Providers return source data; applying it to a project is a separate user action.
const KaraokeProviders = new Map([
  ["lrclib", {
    label: "LRCLIB", type: "lyrics",
    async search(query) {
      const plan = KaraokeSearch.plan(query);
      const rows = new Map();
      let successful = false, lastError;
      const searchQueries = async queries => {
        // Limit concurrency to two requests, and retain valid results if another variant fails.
        for (let i = 0; i < queries.length; i += 2) {
          await Promise.all(queries.slice(i, i + 2).map(async variant => {
            try {
              const url = new URL("https://lrclib.net/api/search");
              url.searchParams.set("q", variant);
              const data = await fetchSource(url.href, "json");
              if (!Array.isArray(data)) throw new Error("Unexpected LRCLIB response.");
              successful = true;
              for (const row of data) if (!rows.has(row.id)) rows.set(row.id, row);
            } catch (error) { lastError = error; }
          }));
        }
      };
      await searchQueries(plan.targeted);
      if (!rows.size) await searchQueries(plan.fallback);
      if (!rows.size && lastError) throw lastError;
      if (!successful) throw new Error("Lyrics search failed.");
      return KaraokeSearch.rank([...rows.values()], plan).slice(0, 40).map(row => ({
        id: row.id, title: row.trackName, artist: row.artistName, duration: row.duration,
        syncedLyrics: row.syncedLyrics || "", plainLyrics: row.plainLyrics || "",
        url: `https://lrclib.net/api/get/${row.id}`
      }));
    }
  }]
]);
async function fetchSource(url, format) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, { signal: controller.signal, credentials: "omit", redirect: "error" });
    if (!response.ok) throw new Error(`Source returned HTTP ${response.status}.`);
    const text = await response.text();
    if (text.length > 3000000) throw new Error("Source response is too large.");
    return format === "json" ? JSON.parse(text) : text;
  } finally { clearTimeout(timeout); }
}
