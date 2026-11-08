/**
 * Word lookup via the free Dictionary API (dictionaryapi.dev), with Datamuse for synonyms.
 * Never throws for expected failures — returns { ok: false, reason } instead:
 *   "offline"     – the device is offline
 *   "not_found"   – the dictionary has no entry
 *   "unavailable" – timeout, server error, rate limit or network failure
 */
import { candidateBaseForms } from "../utils/words.js";

const DICTIONARY_URL = "https://api.dictionaryapi.dev/api/v2/entries/en/";
const DATAMUSE_URL = "https://api.datamuse.com/words";
const TIMEOUT_MS = 8000;
// Synonyms are optional: never make the user wait long for them.
const SYNONYM_TIMEOUT_MS = 2500;
const RETRY_DELAYS_MS = [700, 1500];
const MAX_SENSES = 4;

// In-memory cache for this session (successful lookups and confirmed "not found").
const cache = new Map();

export const LOOKUP_MESSAGES = {
  offline: "You're offline, so the dictionary can't be reached.",
  not_found: "No dictionary entry was found for this word.",
  unavailable: "The dictionary isn't responding right now.",
};

class LookupError extends Error {
  constructor(reason, message) {
    super(message);
    this.reason = reason;
  }
}

async function fetchJson(url, signal, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new LookupError("unavailable", "Timed out")), timeoutMs);
  const abortFromCaller = () => controller.abort(signal.reason);
  signal?.addEventListener("abort", abortFromCaller, { once: true });

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (response.status === 404) throw new LookupError("not_found", "Not found");
    if (!response.ok) throw new LookupError("unavailable", `HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    if (signal?.aborted) throw error; // caller cancelled: propagate AbortError
    if (error instanceof LookupError) throw error;
    if (controller.signal.reason instanceof LookupError) throw controller.signal.reason;
    throw new LookupError(navigator.onLine === false ? "offline" : "unavailable", error?.message);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abortFromCaller);
  }
}

function parseEntries(entries) {
  const first = entries[0];
  const senses = [];
  const synonyms = new Set();
  let origin = "";
  let phonetic = "";
  let audio = "";

  for (const entry of entries) {
    origin ||= entry.origin || "";
    phonetic ||= entry.phonetic || entry.phonetics?.find((p) => p.text)?.text || "";
    audio ||= entry.phonetics?.find((p) => p.audio)?.audio || "";

    for (const meaning of entry.meanings ?? []) {
      (meaning.synonyms ?? []).forEach((s) => synonyms.add(s));
      for (const definition of meaning.definitions ?? []) {
        (definition.synonyms ?? []).forEach((s) => synonyms.add(s));
        if (senses.length < MAX_SENSES && definition.definition) {
          senses.push({
            pos: meaning.partOfSpeech || "",
            definition: definition.definition,
            example: definition.example || "",
          });
        }
      }
    }
  }

  // Prefer variety: make sure each part of speech appears before second senses of another.
  const byPos = [];
  const seen = new Set();
  senses.forEach((s) => {
    if (!seen.has(s.pos)) {
      byPos.push(s);
      seen.add(s.pos);
    }
  });
  senses.forEach((s) => {
    if (!byPos.includes(s)) byPos.push(s);
  });

  return {
    word: first.word,
    phonetic,
    audio,
    origin,
    senses: byPos,
    synonyms: [...synonyms].slice(0, 8),
  };
}

async function fetchSynonyms(word, signal) {
  try {
    const data = await fetchJson(
      `${DATAMUSE_URL}?rel_syn=${encodeURIComponent(word)}&max=6`,
      signal,
      SYNONYM_TIMEOUT_MS
    );
    return data.map((item) => item.word);
  } catch (error) {
    if (signal?.aborted) throw error;
    // Synonyms are optional; the lookup still succeeds without them.
    console.warn(`Datamuse synonyms unavailable for "${word}"`, error);
    return [];
  }
}

/**
 * dictionaryapi.dev intermittently answers 502 without CORS headers, which the browser reports as
 * a network error. Retry transient failures up to twice with short pauses (never "not found"/offline).
 */
async function fetchDictionaryEntry(form, signal) {
  const url = DICTIONARY_URL + encodeURIComponent(form);
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await fetchJson(url, signal);
    } catch (error) {
      const retryable = error.reason === "unavailable" && navigator.onLine !== false;
      if (signal?.aborted || !retryable || attempt >= RETRY_DELAYS_MS.length) throw error;
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
      if (signal?.aborted) throw error;
    }
  }
}

/**
 * Look up a word. Tries the exact word, then likely base forms ("running" → "run").
 * Result: { ok: true, entry, query, matchedForm } | { ok: false, reason, message }
 * Rejects only with AbortError when the caller aborts via `signal`.
 */
export async function lookupWord(word, { signal } = {}) {
  const query = word.trim().toLowerCase();
  if (cache.has(query)) return cache.get(query);

  if (navigator.onLine === false) {
    return { ok: false, reason: "offline", message: LOOKUP_MESSAGES.offline };
  }

  const forms = [query, ...candidateBaseForms(query)];
  let lastReason = "not_found";

  for (const form of forms) {
    try {
      const data = await fetchDictionaryEntry(form, signal);
      const entry = parseEntries(data);
      if (entry.synonyms.length === 0) entry.synonyms = await fetchSynonyms(entry.word, signal);

      const result = { ok: true, entry, query, matchedForm: form === query ? null : entry.word };
      cache.set(query, result);
      return result;
    } catch (error) {
      if (signal?.aborted) throw error;
      lastReason = error.reason || "unavailable";
      // Only keep trying base forms when the word simply wasn't found.
      if (lastReason !== "not_found") {
        console.warn(`Dictionary lookup for "${form}" failed (${lastReason})`, error);
        break;
      }
    }
  }

  const result = { ok: false, reason: lastReason, message: LOOKUP_MESSAGES[lastReason] };
  if (lastReason === "not_found") cache.set(query, result);
  return result;
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
