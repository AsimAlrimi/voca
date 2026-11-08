/**
 * Word lookup via the free Dictionary API (dictionaryapi.dev, Wiktionary data), with
 * Datamuse as an optional synonym source.
 *
 * - Never throws for expected failures — returns { ok: false, reason, message }:
 *     "offline"     the device is offline
 *     "not_found"   no usable dictionary entry
 *     "timeout"     the dictionary took too long
 *     "unavailable" server/network error (after retries)
 * - Results are cached for the session (LRU), and concurrent lookups of the same word share
 *   one request, so reselecting a word or React re-running effects never refetches it.
 * - Synonyms from Datamuse are fetched separately (getSynonyms) so they never delay the definition.
 */
import { candidateBaseForms } from "../utils/words.js";

const DICTIONARY_URL = "https://api.dictionaryapi.dev/api/v2/entries/en/";
const DATAMUSE_URL = "https://api.datamuse.com/words";
const TIMEOUT_MS = 8000;
const SYNONYM_TIMEOUT_MS = 2500;
// Fast transient failures (e.g. 502 without CORS headers → "Failed to fetch") are retried.
// Timeouts are not retried, so the user never waits for several slow attempts.
const RETRY_DELAYS_MS = [700, 1500];
const MAX_SENSES_PER_POS = 6;
const MAX_SENSES_TOTAL = 16;
const MAX_SYNONYMS = 10;
const CACHE_LIMIT = 200;

export const LOOKUP_MESSAGES = {
  offline: "You're offline, so the dictionary can't be reached.",
  not_found: "No dictionary entry was found for this word.",
  timeout: "The dictionary is taking too long to respond.",
  unavailable: "The dictionary isn't responding right now.",
};

// ── Cache (LRU) and in-flight requests ─────────────────────────────────────
const cache = new Map();
const inflight = new Map();
const synonymCache = new Map();
const synonymInflight = new Map();

function remember(map, key, value) {
  map.delete(key);
  map.set(key, value);
  if (map.size > CACHE_LIMIT) map.delete(map.keys().next().value);
}

/** For tests and "retry from scratch". */
export function clearDictionaryCache() {
  cache.clear();
  inflight.clear();
  synonymCache.clear();
  synonymInflight.clear();
}

class LookupError extends Error {
  constructor(reason, message) {
    super(message);
    this.reason = reason;
  }
}

async function fetchJson(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new LookupError("timeout", "Timed out")), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (response.status === 404) throw new LookupError("not_found", "Not found");
    if (!response.ok) throw new LookupError("unavailable", `HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    if (error instanceof LookupError) throw error;
    if (controller.signal.reason instanceof LookupError) throw controller.signal.reason;
    throw new LookupError(navigator.onLine === false ? "offline" : "unavailable", error?.message);
  } finally {
    clearTimeout(timer);
  }
}

async function fetchDictionaryEntry(form, timeoutMs) {
  const url = DICTIONARY_URL + encodeURIComponent(form);
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await fetchJson(url, timeoutMs);
    } catch (error) {
      const retryable = error.reason === "unavailable" && navigator.onLine !== false;
      if (!retryable || attempt >= RETRY_DELAYS_MS.length) throw error;
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
    }
  }
}

// ── Parsing ────────────────────────────────────────────────────────────────
const normalize = (text) => String(text ?? "").toLowerCase().replace(/\s+/g, " ").trim();

function addUnique(list, values, limit = Infinity) {
  for (const value of values ?? []) {
    const v = typeof value === "string" ? value.trim() : "";
    if (v && !list.includes(v) && list.length < limit) list.push(v);
  }
  return list;
}

function accentFromAudio(url) {
  const match = /-(us|uk|au|ca|ie|nz|in|sa)\.mp3$/i.exec(url || "");
  return match ? match[1].toUpperCase() : "";
}

const ACCENT_ORDER = ["US", "UK", "AU", "CA"];

/**
 * Turns the API response (one or more entries) into:
 * {
 *   word, phonetic, audio,                // primary display values (saved with the word)
 *   pronunciations: [{ text, audio, accent }],
 *   meanings: [{ pos, senses: [index into senses…] }],   // grouped by part of speech
 *   senses: [{ pos, definition, example, synonyms, antonyms }],  // flat, selection index
 *   synonyms, antonyms, origin, sourceUrl
 * }
 * Returns null when there is no usable definition.
 */
export function parseEntries(entries) {
  if (!Array.isArray(entries) || entries.length === 0) return null;

  const pronunciations = [];
  const groups = new Map(); // pos → { pos, senses: [], synonyms: [], antonyms: [] }
  const seenDefinitions = new Set();
  const synonyms = [];
  const antonyms = [];
  let origin = "";
  let sourceUrl = "";
  let headlinePhonetic = "";

  for (const entry of entries) {
    origin ||= entry.origin || "";
    sourceUrl ||= entry.sourceUrls?.[0] || "";
    headlinePhonetic ||= entry.phonetic || "";

    for (const p of entry.phonetics ?? []) {
      const text = (p.text || "").trim();
      const audio = (p.audio || "").trim();
      if (!text && !audio) continue;
      const duplicate = pronunciations.some((x) => x.text === text && x.audio === audio);
      if (!duplicate) pronunciations.push({ text, audio, accent: accentFromAudio(audio) });
    }

    for (const meaning of entry.meanings ?? []) {
      const pos = (meaning.partOfSpeech || "").trim();
      if (!groups.has(pos)) groups.set(pos, { pos, senses: [], synonyms: [], antonyms: [] });
      const group = groups.get(pos);
      addUnique(group.synonyms, meaning.synonyms);
      addUnique(group.antonyms, meaning.antonyms);

      for (const def of meaning.definitions ?? []) {
        const text = (def.definition || "").trim();
        const key = `${pos}|${normalize(text)}`;
        if (!text || seenDefinitions.has(key) || group.senses.length >= MAX_SENSES_PER_POS) continue;
        seenDefinitions.add(key);
        group.senses.push({
          pos,
          definition: text,
          example: (def.example || "").trim(),
          synonyms: addUnique([], def.synonyms),
          antonyms: addUnique([], def.antonyms),
        });
      }
    }
  }

  // Flatten in part-of-speech order, keeping every group represented within the total cap.
  const groupList = [...groups.values()].filter((g) => g.senses.length);
  if (!groupList.length) return null;
  const perGroup = Math.max(1, Math.floor(MAX_SENSES_TOTAL / groupList.length));
  const senses = [];
  const meanings = [];
  for (const group of groupList) {
    const indices = [];
    for (const sense of group.senses.slice(0, Math.max(perGroup, 1))) {
      // A sense inherits its part of speech's synonyms when it has none of its own.
      indices.push(senses.length);
      senses.push({
        ...sense,
        synonyms: (sense.synonyms.length ? sense.synonyms : group.synonyms).slice(0, MAX_SYNONYMS),
        antonyms: (sense.antonyms.length ? sense.antonyms : group.antonyms).slice(0, MAX_SYNONYMS),
      });
      addUnique(synonyms, sense.synonyms, MAX_SYNONYMS);
    }
    addUnique(synonyms, group.synonyms, MAX_SYNONYMS);
    addUnique(antonyms, group.antonyms, MAX_SYNONYMS);
    meanings.push({ pos: group.pos, senses: indices });
  }

  // Primary pronunciation: prefer one with audio (US, then UK, …) and a transcription.
  const ranked = [...pronunciations].sort((a, b) => {
    const score = (p) =>
      (p.audio ? 0 : 10) + (p.text ? 0 : 5) + (ACCENT_ORDER.includes(p.accent) ? ACCENT_ORDER.indexOf(p.accent) : 4);
    return score(a) - score(b);
  });
  const primaryAudio = ranked.find((p) => p.audio)?.audio || "";
  const phonetic = headlinePhonetic || ranked.find((p) => p.text)?.text || "";

  return {
    word: entries[0].word,
    phonetic,
    audio: primaryAudio,
    pronunciations: ranked,
    meanings,
    senses,
    synonyms,
    antonyms,
    origin,
    sourceUrl,
  };
}

// ── Lookup ─────────────────────────────────────────────────────────────────
async function performLookup(query, timeoutMs) {
  const forms = [query, ...candidateBaseForms(query)];
  let lastReason = "not_found";

  for (const form of forms) {
    try {
      const entry = parseEntries(await fetchDictionaryEntry(form, timeoutMs));
      if (!entry) continue; // response without usable definitions → try the next form
      const result = { ok: true, entry, query, matchedForm: form === query ? null : entry.word };
      remember(cache, query, result);
      if (form !== query) remember(cache, form, { ...result, query: form, matchedForm: null });
      return result;
    } catch (error) {
      lastReason = error.reason || "unavailable";
      // Only keep trying base forms when the word simply wasn't found.
      if (lastReason !== "not_found") {
        console.warn(`Dictionary lookup for "${form}" failed (${lastReason})`, error);
        break;
      }
    }
  }

  const result = { ok: false, reason: lastReason, message: LOOKUP_MESSAGES[lastReason] };
  if (lastReason === "not_found") remember(cache, query, result);
  return result;
}

function abortable(promise, signal) {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      }
    );
  });
}

/**
 * Look up a word. Tries the exact word, then likely base forms ("running" → "run").
 * Result: { ok: true, entry, query, matchedForm } | { ok: false, reason, message }
 * `signal` only stops *this caller* from waiting; a shared request keeps going for others.
 */
export function lookupWord(word, { signal, timeoutMs = TIMEOUT_MS } = {}) {
  const query = String(word ?? "").trim().toLowerCase();
  if (!query) return Promise.resolve({ ok: false, reason: "not_found", message: LOOKUP_MESSAGES.not_found });

  if (cache.has(query)) {
    const hit = cache.get(query);
    remember(cache, query, hit);
    return abortable(Promise.resolve(hit), signal);
  }
  if (navigator.onLine === false) {
    return Promise.resolve({ ok: false, reason: "offline", message: LOOKUP_MESSAGES.offline });
  }

  let pending = inflight.get(query);
  if (!pending) {
    pending = performLookup(query, timeoutMs).finally(() => inflight.delete(query));
    inflight.set(query, pending);
  }
  return abortable(pending, signal);
}

/**
 * Extra synonyms from Datamuse for words whose dictionary entry has none.
 * Optional: resolves to [] on any failure, never rejects.
 */
export function getSynonyms(word, { timeoutMs = SYNONYM_TIMEOUT_MS } = {}) {
  const key = String(word ?? "").trim().toLowerCase();
  if (!key || navigator.onLine === false) return Promise.resolve([]);
  if (synonymCache.has(key)) return Promise.resolve(synonymCache.get(key));
  if (synonymInflight.has(key)) return synonymInflight.get(key);

  const pending = fetchJson(`${DATAMUSE_URL}?rel_syn=${encodeURIComponent(key)}&max=${MAX_SYNONYMS}`, timeoutMs)
    .then((data) => {
      const list = addUnique([], (Array.isArray(data) ? data : []).map((item) => item.word), MAX_SYNONYMS);
      remember(synonymCache, key, list);
      return list;
    })
    .catch((error) => {
      console.warn(`Datamuse synonyms unavailable for "${key}"`, error);
      return [];
    })
    .finally(() => synonymInflight.delete(key));
  synonymInflight.set(key, pending);
  return pending;
}

/** Plays the pronunciation audio if available. Returns false if playback failed. */
export async function playPronunciation(url) {
  if (!url) return false;
  try {
    await new Audio(url).play();
    return true;
  } catch (error) {
    console.warn("Pronunciation playback failed", error);
    return false;
  }
}
