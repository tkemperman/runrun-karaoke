/* Shared by Firefox extension contexts and the Node test suite. */
(function (root) {
  "use strict";
  const id = () => globalThis.crypto.randomUUID();
  function block(text = "", start = null, end = null) {
    return { id: id(), start, end, text, translations: {} };
  }
  function project(videoId, title = "") {
    return { schemaVersion: 1, videoId, title, artist: "", originalLanguage: "ja", translationLanguage: "en", offset: 0, sources: [], blocks: [] };
  }
  function validate(value) {
    if (!value || value.schemaVersion !== 1) throw new Error("Unsupported project schema.");
    if (!/^[\w-]{11}$/.test(value.videoId)) throw new Error("Invalid YouTube video ID.");
    for (const key of ["title", "artist", "originalLanguage", "translationLanguage"]) {
      if (typeof value[key] !== "string" || value[key].length > 2000) throw new Error(`Invalid ${key}.`);
    }
    if (!Number.isFinite(value.offset) || Math.abs(value.offset) > 86400) throw new Error("Invalid timing offset.");
    if (!Array.isArray(value.blocks) || value.blocks.length > 10000) throw new Error("Invalid block list.");
    if (!Array.isArray(value.sources) || value.sources.length > 100) throw new Error("Invalid sources.");
    const ids = new Set();
    for (const row of value.blocks) {
      if (!row || typeof row.id !== "string" || !row.id || ids.has(row.id)) throw new Error("Block IDs must be unique.");
      ids.add(row.id);
      if (typeof row.text !== "string" || row.text.length > 20000) throw new Error("Invalid lyrics text.");
      for (const key of ["start", "end"]) {
        if (row[key] !== null && (!Number.isFinite(row[key]) || row[key] < 0 || row[key] > 86400)) throw new Error("Times must be seconds between 0 and 86400, or blank.");
      }
      if (row.start === null && row.end !== null) throw new Error("Set a start before an end time.");
      if (row.end !== null && row.end <= row.start) throw new Error("End time must be after start time.");
      if (!row.translations || typeof row.translations !== "object" || Array.isArray(row.translations)) throw new Error("Invalid translations.");
      for (const [language, text] of Object.entries(row.translations)) {
        if (!/^[a-zA-Z]{2,8}(-[a-zA-Z0-9]{1,8})*$/.test(language) || typeof text !== "string" || text.length > 20000) throw new Error("Invalid translation entry.");
      }
    }
    for (const source of value.sources) {
      if (!source || typeof source.provider !== "string" || typeof source.url !== "string" || !/^https:\/\//.test(source.url)) throw new Error("Invalid source link.");
    }
    return JSON.parse(JSON.stringify(value));
  }
  function parseLrc(input) {
    const entries = [];
    const offset = Number(input.match(/\[offset:([+-]?\d+)\]/i)?.[1] || 0) / 1000;
    for (const line of input.replace(/^\uFEFF/, "").split(/\r?\n/)) {
      const tags = [...line.matchAll(/\[(\d+):([0-5]\d)(?:[.:](\d{1,3}))?\]/g)];
      const text = line.replace(/\[[^\]]*\]/g, "").trim();
      for (const tag of tags) {
        const start = Math.max(0, Number(tag[1]) * 60 + Number(tag[2]) + Number(`0.${tag[3] || 0}`) + offset);
        entries.push(block(text, start));
      }
    }
    entries.sort((a, b) => a.start - b.start);
    if (!entries.length) throw new Error("No timed LRC lines found.");
    // Blank timestamped lines remain boundaries for instrumental gaps.
    return entries.map((row, i) => ({ ...row, end: entries.slice(i + 1).find(next => next.start > row.start)?.start ?? null }));
  }
  function activeBlock(rows, videoTime, offset = 0) {
    const time = videoTime - offset;
    let active = null;
    for (const row of rows) {
      if (row.start !== null && row.start <= time && (!active || row.start >= active.start)) active = row;
    }
    if (!active || (active.end !== null && time >= active.end) || !active.text.trim()) return null;
    return active;
  }
  function stamp(rows, index, time) {
    if (!rows[index] || !Number.isFinite(time) || time < 0) throw new Error("No valid line or playback time.");
    const previous = rows[index - 1];
    if (previous?.start !== null && previous?.start >= time) throw new Error("The next line must start after the previous line.");
    if (previous?.start !== null && previous) previous.end = time;
    rows[index].start = time;
    if (rows[index].end !== null && rows[index].end <= time) rows[index].end = null;
  }
  function matchTranslation(rows, input, allowMismatch = false) {
    const targets = rows.filter(row => row.text.trim());
    const lines = input.replace(/^\uFEFF/, "").split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (!targets.length) throw new Error("Load lyrics first.");
    if (!lines.length) throw new Error("Paste a translation first.");
    if (lines.length !== targets.length && !allowMismatch) {
      const error = new Error(`Translation has ${lines.length} non-empty lines; lyrics have ${targets.length}. Apply anyway will keep unmatched original lines unchanged and ignore extra translation lines.`);
      error.code = "TRANSLATION_LINE_COUNT";
      throw error;
    }
    return targets.slice(0, lines.length).map((row, index) => ({ row, text: lines[index] }));
  }
  const api = { block, project, validate, parseLrc, activeBlock, stamp, matchTranslation };
  root.KaraokeCore = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
