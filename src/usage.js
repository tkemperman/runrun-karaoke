/* Local billing estimates. Rates: https://developers.openai.com/api/docs/pricing (2026-11-12). */
(function (root) {
  "use strict";
  const checked = "2026-11-12";
  // USD per million tokens: input, cached input, output. Default/standard service tier.
  const rates = {
    "gpt-6-astra": [10, 1, 50], "gpt-5.6-sol": [4, .4, 20],
    "gpt-5.6-terra": [2, .2, 12], "gpt-5.6-luna": [.2, .02, 1.2],
    "gpt-5.5": [5, .5, 30], "gpt-5": [1.25, .125, 10],
    "gpt-4.1": [2, .5, 8], "gpt-4o": [2.5, 1.25, 10], "gpt-4o-mini": [.15, .075, .6]
  };
  const fastRates = { "gpt-5.5": [12.5, 1.25, 75], "gpt-4.1": [3.5, .875, 14], "gpt-4o": [4.25, 2.125, 17], "gpt-4o-mini": [.25, .125, 1] };
  const finite = value => typeof value === "number" && Number.isFinite(value) && value >= 0;
  function modelName(model) {
    return Object.keys(rates).sort((a, b) => b.length - a.length).find(name => model === name || (model.startsWith(`${name}-`) && /^\d{4}-\d{2}-\d{2}$/.test(model.slice(name.length + 1))));
  }
  function openAI(response, requestedModel, now = Date.now()) {
    const model = response.model || requestedModel, name = typeof model === "string" ? modelName(model) : null;
    const usage = response.usage || {}, input = usage.input_tokens, output = usage.output_tokens;
    const cached = usage.input_tokens_details?.cached_tokens ?? 0;
    const tier = response.service_tier || "default";
    let price = name ? [...rates[name]] : null;
    const long = input > 272000 && ["gpt-6-astra", "gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna", "gpt-5.5"].includes(name);
    if (long && price) price = [price[0] * 2, price[1] * 2, price[2] * 1.5];
    if (price && ["fast", "priority"].includes(tier)) price = fastRates[name] ? (long ? null : [...fastRates[name]]) : price.map(n => n * 2);
    else if (price && tier === "flex") price = ["gpt-4.1", "gpt-4o", "gpt-4o-mini"].includes(name) ? null : price.map(n => n / 2);
    else if (!["default", "standard", "fast", "priority"].includes(tier)) price = null;
    // Unknown usage/tier is shown as unpriced instead of silently assuming zero.
    const valid = [input, output, cached].every(n => Number.isSafeInteger(n) && n >= 0) && cached <= input;
    const usd = valid && price ? ((input - cached) * price[0] + cached * price[1] + output * price[2]) / 1e6 : null;
    const timestamp = finite(response.created_at) ? response.created_at * 1000 : now;
    return { id: `openai:${response.id || crypto.randomUUID()}`, provider: "OpenAI", model: model || requestedModel,
      at: new Date(timestamp).toISOString(), input: valid ? input : null, cached: valid ? cached : null, output: valid ? output : null,
      usd, tier, rates: price, ratesChecked: checked };
  }
  function month(date) { const d = new Date(date); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }
  function summarize(ledger = { entries: {} }, settings = {}, now = Date.now()) {
    const months = new Map([[month(now), new Map()]]);
    for (const entry of Object.values(ledger.entries || {})) {
      const m = month(entry.at), modelKey = `${entry.provider} · ${entry.model}`;
      if (!months.has(m)) months.set(m, new Map());
      const groups = months.get(m);
      if (!groups.has(modelKey)) groups.set(modelKey, { model: modelKey, calls: 0, usd: 0, unknown: 0, credits: 0, input: 0, cached: 0, output: 0 });
      const row = groups.get(modelKey); row.calls++;
      const usd = entry.usd;
      if (finite(usd)) row.usd += usd; else row.unknown++;
      row.credits += entry.credits || 0;
      for (const key of ["input", "cached", "output"]) row[key] += entry[key] || 0;
    }
    return { currentMonth: month(now), startedAt: ledger.startedAt || null, settings, ratesChecked: checked,
      months: [...months].sort(([a], [b]) => b.localeCompare(a)).map(([month, groups]) => {
        const models = [...groups.values()];
        return { month, models, usd: models.reduce((sum, row) => sum + row.usd, 0), unknown: models.reduce((sum, row) => sum + row.unknown, 0) };
      }) };
  }
  let queue = Promise.resolve();
  function record(entry) {
    queue = queue.catch(() => {}).then(async () => {
      const saved = (await browser.storage.local.get("aiUsageLedger")).aiUsageLedger || { startedAt: new Date().toISOString(), entries: {} };
      const old = saved.entries[entry.id];
      // A resumed task can report its ID before its billed credits are available.
      saved.entries[entry.id] = old && finite(old.credits) && !finite(entry.credits) ? old : { ...entry, at: entry.reportedAt ? entry.at : old?.at || entry.at, ...(finite(old?.usd) ? { usd: old.usd, creditUSD: old.creditUSD, rates: old.rates } : {}) };
      if (entry.provider === "AudioShake" && finite(old?.creditUSD) && finite(entry.credits)) {
        saved.entries[entry.id].creditUSD = old.creditUSD;
        saved.entries[entry.id].usd = entry.credits * old.creditUSD;
      }
      await browser.storage.local.set({ aiUsageLedger: saved });
    });
    return queue;
  }
  async function recordAudio(taskId, credits = null, createdAt) {
    const settings = (await browser.storage.local.get("aiUsageSettings")).aiUsageSettings || {};
    const creditUSD = finite(settings.audioCreditUSD) ? settings.audioCreditUSD : null;
    const at = createdAt && Number.isFinite(Date.parse(createdAt)) ? new Date(createdAt).toISOString() : new Date().toISOString();
    return record({ id: `audioshake:${taskId}`, provider: "AudioShake", model: "alignment", at, reportedAt: !!createdAt, credits: finite(credits) ? credits : null, creditUSD, usd: finite(credits) && finite(creditUSD) ? credits * creditUSD : null });
  }
  async function summary() {
    await queue.catch(() => {});
    const saved = await browser.storage.local.get(["aiUsageLedger", "aiUsageSettings"]);
    return summarize(saved.aiUsageLedger, saved.aiUsageSettings);
  }
  async function saveSettings(value) {
    if (value.audioCreditUSD !== null && (!finite(value.audioCreditUSD) || value.audioCreditUSD > 1000000)) throw new Error("Enter a valid USD price per AudioShake credit, or leave it blank.");
    queue = queue.catch(() => {}).then(async () => {
      await browser.storage.local.set({ aiUsageSettings: { audioCreditUSD: value.audioCreditUSD } });
      const ledger = (await browser.storage.local.get("aiUsageLedger")).aiUsageLedger;
      if (ledger && finite(value.audioCreditUSD)) {
        for (const entry of Object.values(ledger.entries)) {
          if (entry.provider === "AudioShake" && finite(entry.credits) && !finite(entry.usd)) {
            entry.creditUSD = value.audioCreditUSD; entry.usd = entry.credits * value.audioCreditUSD;
          }
        }
        await browser.storage.local.set({ aiUsageLedger: ledger });
      }
    });
    await queue;
    return summary();
  }
  const api = { openAI, summarize, record, recordAudio, recordOpenAI: (response, model) => record(openAI(response, model)), summary, saveSettings };
  if (typeof module !== "undefined") module.exports = api;
  root.KaraokeUsage = api;
})(globalThis);
