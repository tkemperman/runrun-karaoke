"use strict";
// Keep each artist's preferred catalog spelling first. Nicknames are hints, not identities of recordings.
const KaraokeSearch = (() => {
  const artistAliases = [
    ["宝鐘マリン", "Houshou Marine", "Houshou Marin", "Senchou"],
    ["FUWAMOCO", "FuwaMoco", "Fuwa Moco"]
  ];
  const normalize = text => text.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
  const contains = (text, alias) => (` ${normalize(text)} `).includes(` ${normalize(alias)} `);
  function plan(query) {
    const original = query.trim();
    const artists = artistAliases.filter(group => group.some(alias => contains(original, alias)));
    // Only remove familiar video annotations; preserve unknown brackets and the original query.
    const cleaned = original.replace(/[\[【(](?:official(?: music video)?|mv|pv|lyrics?|live|cover|karaoke|歌枠)[\]】)]/gi, " ").trim();
    const parts = cleaned.split(/\s+[-–—]\s+/);
    let title = parts.length === 2 ? parts[1] : cleaned;
    if (parts.length === 2 && artists.some(group => group.some(alias => contains(parts[1], alias))) && !artists.some(group => group.some(alias => contains(parts[0], alias)))) title = parts[0];
    for (const group of artists) for (const alias of group) {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      title = title.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "giu"), " ");
    }
    if (artists.length) title = title.replace(/\b(?:sing|sings|singing|cover|x)\b/gi, " ");
    title = title.replace(/^[\s:–—-]+|[\s:–—-]+$/g, "").replace(/\s+/g, " ");
    const unique = values => {
      const seen = new Set();
      return values.filter(value => {
        const key = normalize(value);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };
    return {
      title, artists,
      targeted: unique(artists.flatMap(group => group.map(alias => title ? `${title} ${alias}` : alias))).slice(0, 8),
      fallback: unique([original, title])
    };
  }
  function rank(rows, search) {
    const title = normalize(search.title);
    const score = row => {
      const candidate = normalize(row.trackName || "");
      const titleMatch = title && (` ${candidate} `).includes(` ${title} `);
      const artistMatch = search.artists.some(group => group.some(alias => contains(row.artistName || "", alias)));
      return (titleMatch ? 10 : 0) + (artistMatch ? 20 : 0) + (title && candidate === title ? 5 : 0);
    };
    return [...rows].sort((a, b) => score(b) - score(a));
  }
  return { plan, rank };
})();
if (typeof module !== "undefined") module.exports = KaraokeSearch;
