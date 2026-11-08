import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  clearDictionaryCache,
  getSynonyms,
  lookupWord,
  parseEntries,
} from "../src/services/dictionaryService.js";

const ENTRY = [
  {
    word: "laconic",
    phonetic: "/ləˈkɒnɪk/",
    meanings: [{ partOfSpeech: "adjective", synonyms: ["terse"], definitions: [{ definition: "Using few words." }] }],
  },
];

// Shape of a real multi-entry response ("bear"), trimmed.
const BEAR = [
  {
    word: "bear",
    phonetic: "/bɛə(ɹ)/",
    phonetics: [
      { text: "/bɛə(ɹ)/", audio: "" },
      { text: "/bɑɹ/", audio: "https://x/bear-us.mp3" },
    ],
    sourceUrls: ["https://en.wiktionary.org/wiki/bear"],
    meanings: [
      {
        partOfSpeech: "noun",
        synonyms: [],
        antonyms: ["bull"],
        definitions: [
          { definition: "A large mammal of the family Ursidae.", example: "The bear ate the honey.", synonyms: [] },
          { definition: "A rough, unmannerly person.", synonyms: ["boor"] },
        ],
      },
    ],
  },
  {
    word: "bear",
    phonetic: "/bɛə(ɹ)/",
    phonetics: [{ text: "/bɑɹ/", audio: "https://x/bear-us.mp3" }],
    meanings: [
      {
        partOfSpeech: "verb",
        synonyms: ["carry", "tolerate"],
        definitions: [{ definition: "To carry something." }, { definition: "To put up with." }],
      },
      { partOfSpeech: "noun", definitions: [{ definition: "a large mammal of the family ursidae." }] }, // duplicate
    ],
  },
];

const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });

function mockFetch(responder) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push(String(url));
    return responder(String(url), init, calls.length);
  };
  return calls;
}

beforeEach(() => clearDictionaryCache());

// ── Parsing ─────────────────────────────────────────────────────────────────
test("parseEntries: all meanings grouped by part of speech, duplicates removed", () => {
  const e = parseEntries(BEAR);
  assert.deepEqual(e.meanings.map((m) => m.pos), ["noun", "verb"]);
  assert.equal(e.senses.length, 4); // 2 nouns (duplicate dropped) + 2 verbs
  assert.deepEqual(e.meanings[1].senses.map((i) => e.senses[i].definition), ["To carry something.", "To put up with."]);
  assert.equal(e.senses[0].example, "The bear ate the honey.");
});

test("parseEntries: senses keep their own synonyms or inherit their part of speech's", () => {
  const e = parseEntries(BEAR);
  assert.deepEqual(e.senses[1].synonyms, ["boor"]);
  assert.deepEqual(e.senses[2].synonyms, ["carry", "tolerate"]);
  assert.deepEqual(e.senses[0].antonyms, ["bull"]);
  assert.ok(e.synonyms.includes("carry") && e.synonyms.includes("boor"));
});

test("parseEntries: pronunciations deduplicated, US audio preferred, source link kept", () => {
  const e = parseEntries(BEAR);
  assert.equal(e.pronunciations.length, 2);
  assert.equal(e.audio, "https://x/bear-us.mp3");
  assert.equal(e.pronunciations[0].accent, "US");
  assert.equal(e.phonetic, "/bɛə(ɹ)/");
  assert.equal(e.sourceUrl, "https://en.wiktionary.org/wiki/bear");
});

test("parseEntries: missing phonetics/audio are fine; no definitions → null", () => {
  const e = parseEntries([{ word: "sonder", meanings: [{ partOfSpeech: "noun", definitions: [{ definition: "x y z" }] }] }]);
  assert.equal(e.phonetic, "");
  assert.equal(e.audio, "");
  assert.deepEqual(e.pronunciations, []);
  assert.equal(parseEntries([{ word: "a", meanings: [{ partOfSpeech: "noun", definitions: [] }] }]), null);
  assert.equal(parseEntries([]), null);
});

// ── Lookup behaviour ────────────────────────────────────────────────────────
test("retries after a transient network failure (e.g. 502 without CORS)", async () => {
  const calls = mockFetch((url, init, n) => (n === 1 ? Promise.reject(new TypeError("Failed to fetch")) : json(ENTRY)));
  const result = await lookupWord("laconic");
  assert.equal(result.ok, true);
  assert.equal(result.entry.senses[0].definition, "Using few words.");
  assert.equal(calls.length, 2);
});

test("reports 'unavailable' when all retries fail", async () => {
  const calls = mockFetch(() => Promise.reject(new TypeError("Failed to fetch")));
  const result = await lookupWord("obfuscate");
  assert.deepEqual([result.ok, result.reason], [false, "unavailable"]);
  assert.equal(calls.length, 3);
});

test("a timeout is reported quickly and not retried", async () => {
  const calls = mockFetch(
    (url, init) =>
      new Promise((resolve, reject) => init.signal.addEventListener("abort", () => reject(init.signal.reason)))
  );
  const started = Date.now();
  const result = await lookupWord("slow", { timeoutMs: 50 });
  assert.deepEqual([result.ok, result.reason], [false, "timeout"]);
  assert.equal(calls.length, 1);
  assert.ok(Date.now() - started < 1000);
});

test("does not retry 'not found'; tries base forms instead", async () => {
  const calls = mockFetch((url) => (url.endsWith("/laconics") ? json({}, 404) : json(ENTRY)));
  const result = await lookupWord("laconics");
  assert.equal(result.ok, true);
  assert.equal(result.matchedForm, "laconic");
  assert.equal(calls.length, 2);
});

test("a response with no usable definitions is treated as not found", async () => {
  mockFetch(() => json([{ word: "zzz", meanings: [] }]));
  const result = await lookupWord("zzz");
  assert.deepEqual([result.ok, result.reason], [false, "not_found"]);
});

test("concurrent lookups share one request; later lookups come from the cache", async () => {
  let release;
  const gate = new Promise((r) => (release = r));
  const calls = mockFetch(async () => {
    await gate;
    return json(ENTRY);
  });
  const a = lookupWord("Laconic");
  const b = lookupWord("laconic ");
  release();
  const [ra, rb] = await Promise.all([a, b]);
  assert.ok(ra.ok && rb.ok);
  assert.equal(calls.length, 1);
  await lookupWord("laconic");
  assert.equal(calls.length, 1, "served from cache");
});

test("aborting one caller doesn't cancel the shared request for another", async () => {
  let release;
  const gate = new Promise((r) => (release = r));
  const calls = mockFetch(async () => {
    await gate;
    return json(ENTRY);
  });
  const controller = new AbortController();
  const first = lookupWord("laconic", { signal: controller.signal });
  const second = lookupWord("laconic");
  controller.abort();
  await assert.rejects(first);
  release();
  assert.equal((await second).ok, true);
  assert.equal(calls.length, 1);
});

test("base-form results are cached under the base form too", async () => {
  const calls = mockFetch((url) => (url.endsWith("/laconics") ? json({}, 404) : json(ENTRY)));
  await lookupWord("laconics");
  await lookupWord("laconic");
  assert.equal(calls.length, 2, "no extra request for the base form");
});

// ── Optional synonyms ───────────────────────────────────────────────────────
test("getSynonyms: never rejects; failures give an empty list", async () => {
  mockFetch(() => Promise.reject(new TypeError("Failed to fetch")));
  assert.deepEqual(await getSynonyms("happy", { timeoutMs: 50 }), []);
});

test("getSynonyms: results are cached", async () => {
  const calls = mockFetch(() => json([{ word: "glad" }, { word: "content" }]));
  assert.deepEqual(await getSynonyms("happy"), ["glad", "content"]);
  assert.deepEqual(await getSynonyms("Happy"), ["glad", "content"]);
  assert.equal(calls.length, 1);
});
