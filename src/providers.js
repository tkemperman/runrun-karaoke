"use strict";
function usableTimedLyrics(text) {
  return typeof text === "string" && text.split(/\r?\n/).some(line => /\[\d+:\d+(?:\.\d+)?\]/.test(line) && line.replace(/\[[^\]]*\]/g, "").trim());
}
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
        provider: "lrclib", id: row.id, title: row.trackName, artist: row.artistName, duration: row.duration,
        syncedLyrics: usableTimedLyrics(row.syncedLyrics) ? row.syncedLyrics : "", plainLyrics: row.plainLyrics || "",
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
    if (!response.ok) {
      if (url.startsWith("https://genius.com/") && [403, 429].includes(response.status)) throw new Error(`Genius blocked or rate-limited this lyrics page (HTTP ${response.status}).`);
      throw new Error(`Source returned HTTP ${response.status}.`);
    }
    const text = await response.text();
    if (text.length > 3000000) throw new Error("Source response is too large.");
    return format === "json" ? JSON.parse(text) : text;
  } finally { clearTimeout(timeout); }
}

function geniusLyrics(html) {
  const document = new DOMParser().parseFromString(html, "text/html");
  const containers = [...document.querySelectorAll('[data-lyrics-container="true"]')];
  if (!containers.length) {
    if (/captcha|cloudflare|access denied|verify.*human|just a moment|attention required|enable javascript and cookies/i.test(document.title + document.body.textContent)) throw new Error("Genius blocked this request. Open Genius in your browser or try later.");
    throw new Error("Genius returned no readable lyrics containers. Its page format may have changed.");
  }
  return containers.map(container => {
    container.querySelectorAll('script, style, button, [data-exclude-from-selection="true"]').forEach(node => node.remove());
    container.querySelectorAll("br").forEach(node => node.replaceWith(document.createTextNode("\n")));
    return container.textContent;
  }).join("\n").split(/\r?\n/).filter(line => !/^\s*\[[^\]]+\]\s*$/.test(line)).join("\n").trim();
}
KaraokeProviders.set("genius", {
  label: "Genius", type: "lyrics",
  async search(query, apiKey) {
    if (!apiKey) throw new Error("No usable LRCLIB lyrics. Enter a Genius API key in Settings to enable fallback.");
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 15000);
    let data;
    try {
      const response = await fetch(`https://api.genius.com/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${apiKey}` }, credentials: "omit", redirect: "error", signal: controller.signal
      });
      if ([403, 429].includes(response.status)) throw new Error(`Genius blocked or rate-limited the search (HTTP ${response.status}).`);
      if (response.status === 401) throw new Error("Invalid Genius API key.");
      if (!response.ok) throw new Error(`Genius search failed (HTTP ${response.status}).`);
      data = await response.json();
    } catch (error) {
      if (error.name === "AbortError" || error instanceof TypeError) throw new Error("Could not reach Genius. Check your connection and try again.");
      throw error;
    } finally { clearTimeout(timeout); }
    if (!Array.isArray(data?.response?.hits)) throw new Error("Unexpected Genius search response.");
    const rows = [], errors = [];
    for (const hit of data.response.hits.filter(hit => hit.type === "song").slice(0, 8)) {
      const song = hit.result;
      // Never attach the API token to song pages or follow arbitrary URLs.
      if (!/^https:\/\/genius\.com\/[^?#]+-lyrics$/.test(song?.url)) continue;
      try {
        const plainLyrics = geniusLyrics(await fetchSource(song.url, "text"));
        if (plainLyrics) rows.push({ provider: "genius", id: song.id, title: song.title, artist: song.primary_artist?.name || "", url: song.url, plainLyrics, syncedLyrics: "" });
      } catch (error) { errors.push(`Genius lyrics: ${error.message}`); }
    }
    if (!rows.length && errors.length) throw new Error(errors[0]);
    return { results: rows, warnings: errors.length ? [errors[0]] : [] };
  }
});
async function KaraokeLyricsSearch(query, apiKey) {
  const warnings = [];
  try {
    const rows = (await KaraokeProviders.get("lrclib").search(query)).filter(row => {
      // Metadata-only/instrumental rows are not useful lyrics; untimed text is.
      if (row.plainLyrics.trim()) return true;
      return usableTimedLyrics(row.syncedLyrics);
    });
    if (rows.length) return { results: rows, warnings };
  } catch (error) { warnings.push(`LRCLIB search failed: ${error.message}`); }
  try {
    const result = await KaraokeProviders.get("genius").search(query, apiKey);
    return { results: result.results, warnings: [...warnings, ...result.warnings] };
  } catch (error) { throw new Error([...warnings, error.message].join(" ")); }
}
