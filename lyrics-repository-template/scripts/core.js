/* Shared by Firefox extension contexts and the Node test suite. */
(function (root) {
  "use strict";
  const id = () => globalThis.crypto.randomUUID();
  function block(text = "", start = null, end = null) {
    return { id: id(), start, end, text, translations: {} };
  }
  function project(videoId, title = "") {
    title = title.trim();
    return { schemaVersion: 3, furiganaEnabled: false, videoId, videoUrl: `https://www.youtube.com/watch?v=${videoId}`, videoTitle: title, title, artist: "", originalLanguage: "ja", translationLanguage: "en", offset: 0, source: null, blocks: [] };
  }
  function validate(value) {
    if (!value || ![1, 2, 3].includes(value.schemaVersion)) throw new Error("Unsupported project schema.");
    value = { ...value };
    if (value.schemaVersion === 1) {
      value.schemaVersion = 2;
      value.furiganaEnabled = false;
    }
    if (typeof value.furiganaEnabled !== "boolean") throw new Error("Invalid furigana visibility.");
    if (!/^[\w-]{11}$/.test(value.videoId)) throw new Error("Invalid YouTube video ID.");
    // The video ID is authoritative, including when importing older projects.
    value.videoUrl = `https://www.youtube.com/watch?v=${value.videoId}`;
    if (value.videoTitle === undefined) value.videoTitle = "";
    for (const key of ["videoTitle", "title", "artist", "originalLanguage", "translationLanguage"]) {
      if (typeof value[key] !== "string" || value[key].length > 2000) throw new Error(`Invalid ${key}.`);
    }
    value.videoTitle = value.videoTitle.trim();
    value.title = value.title.trim();
    if (!Number.isFinite(value.offset) || Math.abs(value.offset) > 86400) throw new Error("Invalid timing offset.");
    if (!Array.isArray(value.blocks) || value.blocks.length > 10000) throw new Error("Invalid block list.");
    if (value.schemaVersion < 3) {
      if (value.sources !== undefined) {
        if (!Array.isArray(value.sources) || value.sources.length > 100) throw new Error("Invalid sources.");
        value.source = value.sources.at(-1) ?? null;
      }
      value.schemaVersion = 3;
    }
    delete value.sources;
    const ids = new Set();
    for (const row of value.blocks) {
      if (!row || typeof row.id !== "string" || !row.id || ids.has(row.id)) throw new Error("Block IDs must be unique.");
      ids.add(row.id);
      if (typeof row.text !== "string" || row.text.length > 20000) throw new Error("Invalid lyrics text.");
      if (row.furigana !== undefined) validateFurigana(row.text, row.furigana);
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
    const source = value.source;
    if (source !== null) {
      if (!source || Array.isArray(source) || typeof source.provider !== "string" || typeof source.url !== "string" || !/^https:\/\//.test(source.url)) throw new Error("Invalid source link.");
      value.source = { provider: source.provider, url: source.url };
    }
    return JSON.parse(JSON.stringify(value));
  }
  function validateFurigana(text, parts) {
    if (!Array.isArray(parts) || parts.length > text.length || parts.some(part =>
      !Array.isArray(part) || part.length !== 2 || typeof part[0] !== "string" || !part[0] ||
      (part[1] !== null && (typeof part[1] !== "string" || !/^[\p{Script=Hiragana}\p{Script=Katakana}ー・\s]+$/u.test(part[1]) || part[1].length > 1000))) ||
      parts.map(part => part[0]).join("") !== text) throw new Error("Invalid furigana: segments must exactly match the original lyrics and readings must be kana.");
    return parts;
  }
  function replaceFuriganaTerm(text, parts, term, reading) {
    if (!term || !/[\p{Script=Han}]/u.test(term)) throw new Error("Enter a term containing kanji.");
    validateFurigana(term, [[term, reading]]);
    validateFurigana(text, parts);
    const spans = [];
    let position = 0;
    for (const [base, annotation] of parts) {
      spans.push({ start: position, end: position + base.length, base, annotation });
      position += base.length;
    }
    const result = [];
    const appendRange = (start, end) => {
      for (const span of spans) {
        const left = Math.max(start, span.start), right = Math.min(end, span.end);
        if (left < right) result.push([text.slice(left, right), left === span.start && right === span.end ? span.annotation : null]);
      }
    };
    let cursor = 0, index;
    while ((index = text.indexOf(term, cursor)) !== -1) {
      appendRange(cursor, index);
      result.push([term, reading]);
      cursor = index + term.length;
    }
    appendRange(cursor, text.length);
    return result;
  }
  // Keep matching leading kana and okurigana outside the ruby annotation.
  function alignKana(text, reading) {
    let start = 0, end = text.length, readingEnd = reading.length;
    const kana = character => /[\u3040-\u30ff]/.test(character);
    while (start < end && start < readingEnd && kana(text[start]) && text[start] === reading[start]) start++;
    while (end > start && readingEnd > start && kana(text[end - 1]) && text[end - 1] === reading[readingEnd - 1]) { end--; readingEnd--; }
    return { prefix: text.slice(0, start), base: text.slice(start, end), annotation: reading.slice(start, readingEnd), suffix: text.slice(end) };
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
  function importLyrics(text) {
    if (/\[\d+:[0-5]\d/.test(text)) return parseLrc(text);
    const rows = text.replace(/^\uFEFF/, "").split(/\r?\n/)
      .filter(line => line.trim() && !/^\[[a-z]+:.*\]$/i.test(line.trim())).map(line => block(line));
    if (!rows.length) throw new Error("No lyrics found.");
    return rows;
  }
  function exportLrc(value, timed = true) {
    const project = validate(value);
    if (!project.blocks.length) throw new Error("Add lyrics first.");
    const text = row => row.text.replace(/[\r\n]+/g, " ");
    if (!timed) return project.blocks.map(text).join("\n") + "\n";
    if (project.blocks.some(row => row.start === null || row.start + project.offset < 0)) {
      throw new Error("Every line needs a non-negative video start time. Mark untimed lines or export untimed LRC.");
    }
    const timestamp = seconds => {
      const ms = Math.round(seconds * 1000);
      return `[${String(Math.floor(ms / 60000)).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}.${String(ms % 1000).padStart(3, "0")}]`;
    };
    const rows = [...project.blocks].sort((a, b) => a.start - b.start);
    const lines = [];
    rows.forEach((row, index) => {
      lines.push(timestamp(row.start + project.offset) + text(row));
      if (row.end !== null && (!rows[index + 1] || row.end < rows[index + 1].start)) {
        lines.push(timestamp(row.end + project.offset));
      }
    });
    return lines.join("\n") + "\n";
  }
  function activeBlock(rows, videoTime, offset = 0) {
    let active = null;
    for (const row of rows) {
      if (row.start !== null && row.start + offset <= videoTime && (!active || row.start >= active.start)) active = row;
    }
    if (!active || (active.end !== null && videoTime >= active.end + offset) || !active.text.trim()) return null;
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
  function moveLineStart(value, row, videoSeconds) {
    const index = value.blocks.indexOf(row);
    if (index < 0) throw new Error("Load lyrics and select a line first.");
    if (videoSeconds !== null && !Number.isFinite(videoSeconds)) throw new Error("Invalid start time.");
    const start = videoSeconds === null ? null : Number((videoSeconds - value.offset).toFixed(3));
    const delta = start === null || row.start === null ? 0 : start - row.start;
    const blocks = value.blocks.map((block, position) => {
      if (position < index) return block;
      const shift = time => time === null ? null : Number((time + delta).toFixed(3));
      return { ...block, start: position === index ? start : shift(block.start), end: shift(block.end) };
    });
    // Validate the entire shift before applying any times to the current project.
    validate({ ...value, blocks });
    for (let position = index; position < blocks.length; position++) {
      value.blocks[position].start = blocks[position].start;
      value.blocks[position].end = blocks[position].end;
    }
  }
  function syncLine(value, row, seconds) {
    if (!row || !value.blocks.includes(row)) throw new Error("Load lyrics and select a line first.");
    if (!Number.isFinite(seconds)) throw new Error("Invalid start time.");
    const previousStart = row.start, previousOffset = value.offset;
    if (row.start === null) row.start = Number((seconds - value.offset).toFixed(3));
    else value.offset = Number((seconds - row.start).toFixed(3));
    try { validate(value); }
    catch (error) { row.start = previousStart; value.offset = previousOffset; throw error; }
  }
  const api = { replaceFuriganaTerm, validateFurigana, alignKana, block, project, validate, parseLrc, importLyrics, exportLrc, activeBlock, stamp, matchTranslation, moveLineStart, syncLine };
  root.KaraokeCore = api;
  if (typeof module !== "undefined") module.exports = api;
})(globalThis);
