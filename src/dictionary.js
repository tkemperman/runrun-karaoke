// Adapted from Furikazan, Copyright (c) 2026 SilverwoodsLabs, MIT (see furikazan-LICENSE.txt).
"use strict";

const KaraokeDictionary = (() => {
  const DATABASE_NAME = "runrun-karaoke-furigana";
  const STORE_NAME = "dictionaries";
  const RECORD_ID = "edict2";
  // Version 7 is the first complete combined EDICT2 + ENAMDICT index. Matcher
  // improvements are applied at runtime and must not invalidate this download.
  const MINIMUM_DATA_VERSION = 7;
  const SOURCE_URL = "https://www.edrdg.org/pub/Nihongo/edict2.gz";
  const NAMES_SOURCE_URL = "https://www.edrdg.org/pub/Nihongo/enamdict.gz";
  const KANJI = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
  const OVERRIDES = new Map([
    ["一人", "ひとり"],
    ["二人", "ふたり"],
    ["今日", "きょう"],
    ["前に", "まえに"],
    ["来る", "くる"],
    ["来た", "きた"],
    ["来て", "きて"],
    ["来ない", "こない"],
    ["来なかった", "こなかった"],
    ["来ます", "きます"],
    ["来ました", "きました"]
  ]);

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function transact(mode, operation) {
    const db = await openDatabase();
    try {
      return await new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const request = operation(transaction.objectStore(STORE_NAME));
        transaction.oncomplete = () => resolve(request.result);
        transaction.onabort = () => reject(transaction.error || new Error("Dictionary storage aborted."));
        transaction.onerror = () => reject(transaction.error);
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  }

  async function load() {
    const record = await transact("readonly", store => store.get(RECORD_ID));
    return record
      && record.dataVersion >= MINIMUM_DATA_VERSION
      && Array.isArray(record.entries)
      && Number.isFinite(record.wordCount)
      && Number.isFinite(record.nameCount)
      ? record
      : null;
  }

  function remove() {
    return transact("readwrite", store => store.delete(RECORD_ID));
  }

  function parseEdict(text, namesText) {
    const readings = new Map(OVERRIDES);
    const priorities = new Map([...OVERRIDES.keys()].map(word => [word, Infinity]));
    const verbs = [];
    const addEntries = (source, includeVerbs, basePriority) => {
      for (const line of source.split("\n")) {
        const match = line.match(/^(.+?) \[(.+?)\] \//);
        if (!match) continue;
        // EDICT separates alternative readings with semicolons. The first is
        // the preferred/common reading; showing the whole field as furigana
        // produces annotations such as "せんせい;せんじょう".
        const rawReading = match[2].split(";")[0];
        const reading = rawReading.replace(/\(.+?\)/g, "").trim();
        const rawWords = match[1].split(";");
        for (const rawWord of rawWords) {
          const word = rawWord.replace(/\(.+?\)/g, "").trim();
          // Priority markers on a headword apply only to that spelling, not
          // every alternative on the same line. Prefer an exact standalone
          // entry over a secondary spelling such as 秋 in 時(P);刻;秋 [とき].
          const priority = basePriority
            + (rawWords.length === 1 ? 2 : 0)
            + (rawWord.includes("(P)") ? 10 : 0)
            + (rawReading.includes("(P)") ? 5 : 0)
            + (rawWords.length === 1 && line.includes("(P)") ? 3 : 0);
          if (word && reading && KANJI.test(word) && priority > (priorities.get(word) ?? -Infinity)) {
            readings.set(word, reading);
            priorities.set(word, priority);
            if (includeVerbs && /\(v1|\(v5[bgknmristu]/.test(line)) verbs.push([word, reading, line]);
          }
        }
      }
    };
    addEntries(text, true, 0);
    let wordCount = readings.size;
    // Proper names fill gaps in the general dictionary without replacing its
    // normal vocabulary readings.
    addEntries(namesText, false, -10);
    const nameCount = readings.size - wordCount;
    addVerbForms(readings, verbs);
    wordCount += readings.size - wordCount - nameCount;
    // Explicitly authoritative for ambiguous counter readings in unsegmented text.
    for (const [word, reading] of OVERRIDES) readings.set(word, reading);
    return { entries: [...readings], wordCount, nameCount };
  }

  const IMPERATIVES = {
    v1: ["る", "ろ"], v5r: ["る", "れ"], v5u: ["う", "え"],
    v5t: ["つ", "て"], v5k: ["く", "け"], v5g: ["ぐ", "げ"],
    v5s: ["す", "せ"], v5n: ["ぬ", "ね"], v5b: ["ぶ", "べ"], v5m: ["む", "め"]
  };

  // Cached indexes lack POS tags. Require matching negative and polite forms
  // before inferring a verb class; a kana ending alone could belong to a noun.
  function cachedImperatives(entries) {
    const readings = new Map(entries), result = new Map();
    const stems = { v1: ["", ""], v5r: ["ら", "り"], v5u: ["わ", "い"],
      v5t: ["た", "ち"], v5k: ["か", "き"], v5g: ["が", "ぎ"],
      v5s: ["さ", "し"], v5n: ["な", "に"], v5b: ["ば", "び"], v5m: ["ま", "み"] };
    for (const [word, reading] of entries) {
      for (const [type, [from, to]] of Object.entries(IMPERATIVES)) {
        if (!word.endsWith(from) || !reading.endsWith(from)) continue;
        const base = word.slice(0, -1), kana = reading.slice(0, -1);
        const [negative, polite] = stems[type];
        const negativeReading = readings.get(base + negative + "ない");
        const politeReading = readings.get(base + polite + "ます");
        if (!negativeReading?.endsWith(negative + "ない") || !politeReading?.endsWith(polite + "ます") ||
            negativeReading.slice(0, -(negative.length + 2)) !== politeReading.slice(0, -(polite.length + 2))) continue;
        // Old indexes may have generated forms from a superseded rare reading.
        // Use the current preferred dictionary-form reading for the imperative.
        result.set(base + to, kana + to);
      }
    }
    return result;
  }

  function addVerbForms(readings, verbs) {
    const endings = {
      v1: [["る", "た"], ["る", "て"], ["る", "ない"], ["る", "なかった"], ["る", "ます"], ["る", "ました"]],
      v5r: [["る", "った"], ["る", "って"], ["る", "らない"], ["る", "ります"], ["る", "りました"]],
      v5u: [["う", "った"], ["う", "って"], ["う", "わない"], ["う", "います"], ["う", "いました"]],
      v5t: [["つ", "った"], ["つ", "って"], ["つ", "たない"], ["つ", "ちます"], ["つ", "ちました"]],
      v5k: [["く", "いた"], ["く", "いて"], ["く", "かない"], ["く", "きます"], ["く", "きました"]],
      v5g: [["ぐ", "いだ"], ["ぐ", "いで"], ["ぐ", "がない"], ["ぐ", "ぎます"], ["ぐ", "ぎました"]],
      v5s: [["す", "した"], ["す", "して"], ["す", "さない"], ["す", "します"], ["す", "しました"]],
      v5n: [["ぬ", "んだ"], ["ぬ", "んで"], ["ぬ", "なない"], ["ぬ", "にます"], ["ぬ", "にました"]],
      v5b: [["ぶ", "んだ"], ["ぶ", "んで"], ["ぶ", "ばない"], ["ぶ", "びます"], ["ぶ", "びました"]],
      v5m: [["む", "んだ"], ["む", "んで"], ["む", "まない"], ["む", "みます"], ["む", "みました"]]
    };
    for (const [word, reading, line] of verbs) {
      if (readings.get(word) !== reading) continue;
      const type = Object.keys(endings).find(key => line.includes(`(${key}`));
      if (!type) continue;
      for (const [from, to] of [...endings[type], IMPERATIVES[type]]) {
        if (!word.endsWith(from) || !reading.endsWith(from)) continue;
        const inflectedWord = word.slice(0, -from.length) + to;
        const inflectedReading = reading.slice(0, -from.length) + to;
        if (!readings.has(inflectedWord)) readings.set(inflectedWord, inflectedReading);
      }
    }
    // 行く is the well-known irregular te/ta form among godan -ku verbs.
    readings.set("行った", "いった");
    readings.set("行って", "いって");
  }

  async function download(onProgress) {
    onProgress?.("downloading");
    const [response, namesResponse] = await Promise.all([
      fetch(SOURCE_URL, { cache: "no-store", signal: AbortSignal.timeout(180000) }),
      fetch(NAMES_SOURCE_URL, { cache: "no-store", signal: AbortSignal.timeout(180000) })
    ]);
    if (!response.ok || !response.body) throw new Error(`Dictionary download failed (${response.status})`);
    if (!namesResponse.ok || !namesResponse.body) throw new Error(`Names download failed (${namesResponse.status})`);
    onProgress?.("extracting");
    const decode = async sourceResponse => {
      const decompressed = sourceResponse.body.pipeThrough(new DecompressionStream("gzip"));
      const bytes = await new Response(decompressed).arrayBuffer();
      return new TextDecoder("euc-jp").decode(bytes);
    };
    const [text, namesText] = await Promise.all([decode(response), decode(namesResponse)]);
    onProgress?.("indexing");
    const { entries, wordCount, nameCount } = parseEdict(text, namesText);
    if (entries.length < 100000) throw new Error("The downloaded dictionary appears incomplete");
    const record = {
      id: RECORD_ID,
      dataVersion: MINIMUM_DATA_VERSION,
      entries,
      count: entries.length,
      wordCount,
      nameCount,
      downloadedAt: new Date().toISOString(),
      sourceLastModified: response.headers.get("Last-Modified") || null
    };
    await transact("readwrite", store => store.put(record));
    return record;
  }

  function createMatcher(entries) {
    const root = new Map();
    const addToTrie = (word, reading) => {
      let node = root;
      for (const character of word) {
        if (!node.has(character)) node.set(character, new Map());
        node = node.get(character);
      }
      node.reading = reading;
    };
    for (const [word, reading] of entries) addToTrie(word, reading);
    for (const [word, reading] of cachedImperatives(entries)) addToTrie(word, reading);
    // Apply small, authoritative ambiguity/inflection fixes at runtime too,
    // so extension updates do not require downloading the source data again.
    for (const [word, reading] of OVERRIDES) addToTrie(word, reading);

    function segment(text, debug = false) {
      const parts = [];
      const trace = [];
      let plain = "";
      const flush = () => {
        if (plain) parts.push([plain, null]);
        plain = "";
      };
      for (let index = 0; index < text.length;) {
        if (isKonnichiwaGreeting(text, index)) {
          if (debug) trace.push({ index, input: text.slice(index), rule: "standalone-greeting", chosen: { text: "今日は", reading: "こんにちは" } });
          flush();
          parts.push(["今日は", "こんにちは"]);
          index += 3;
          continue;
        }
        let node = root;
        let cursor = index;
        let best = null;
        const candidates = [];
        while (cursor < text.length && node.has(text[cursor])) {
          node = node.get(text[cursor++]);
          if (node.reading) {
            best = { end: cursor, reading: node.reading };
            if (debug) candidates.push({ text: text.slice(index, cursor), reading: node.reading });
          }
        }
        if (!best) {
          if (debug) trace.push({ index, input: text.slice(index), candidates, chosen: null, action: "keep-plain-character", character: text[index] });
          plain += text[index++];
          continue;
        }
        // A dictionary may contain the complete spelling 今日は with the
        // greeting reading こんにちは. If the conservative greeting rule above
        // did not accept this context, never let longest-match consume は:
        // parse 今日 as きょう and leave the particle untouched.
        const forcedToday = text.startsWith("今日は", index);
        if (forcedToday) best = { end: index + 2, reading: "きょう" };
        const matchedText = text.slice(index, best.end);
        // 今日 has several dictionary readings, but in running text it is
        // きょう. The greeting case was already handled above as the complete
        // phrase 今日は → こんにちは, so no stored entry may override this.
        const dictionaryReading = best.reading;
        if (matchedText === "今日") best.reading = "きょう";
        if (debug) trace.push({
          index,
          input: text.slice(index),
          candidates,
          chosen: { text: matchedText, reading: best.reading },
          rule: forcedToday ? "split-non-greeting-今日は" : matchedText === "今日" ? "force-today-reading" : "longest-dictionary-match",
          dictionaryReading
        });
        flush();
        parts.push([matchedText, best.reading]);
        index = best.end;
      }
      flush();
      const result = parts.some(([, reading]) => reading) ? parts : null;
      return debug ? { parts: result, trace } : result;
    }

    function isKonnichiwaGreeting(text, index) {
      if (!text.startsWith("今日は", index)) return false;
      const before = text.slice(0, index);
      const after = text.slice(index + 3);
      const startsPhrase = !before || /[\s「『（([:：]$/.test(before);
      // Be deliberately conservative: in 今日は暑い, 今日 is きょう.
      // Treat the kanji spelling as the greeting only when the phrase ends
      // there or is immediately closed by greeting-like punctuation.
      const endsPhrase = !after || /^[！!。]\s*(?:[」』）)\]]|$)/.test(after);
      return startsPhrase && endsPhrase;
    }
    return { segment };
  }

  return { SOURCE_URL, NAMES_SOURCE_URL, load, remove, download, createMatcher };
})();

if (typeof module !== "undefined") module.exports = KaraokeDictionary;
