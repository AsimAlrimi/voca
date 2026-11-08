import test from "node:test";
import assert from "node:assert/strict";
import { lookupWord } from "../src/services/dictionaryService.js";

const ENTRY = [{ word: "laconic", phonetic: "/ləˈkɒnɪk/", meanings: [{ partOfSpeech: "adjective", synonyms: ["terse"], definitions: [{ definition: "Using few words." }] }] }];
const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });

function mockFetch(responses) {
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    const next = responses.shift();
    if (next instanceof Error) throw next;
    return next;
  };
  return calls;
}

test("retries after a transient network failure (e.g. 502 without CORS)", async () => {
  const calls = mockFetch([new TypeError("Failed to fetch"), json(ENTRY)]);
  const result = await lookupWord("laconic");
  assert.equal(result.ok, true);
  assert.equal(result.entry.senses[0].definition, "Using few words.");
  assert.equal(calls.length, 2);
});

test("reports 'unavailable' when all retries fail", async () => {
  const calls = mockFetch([new TypeError("Failed to fetch"), new TypeError("Failed to fetch"), new TypeError("Failed to fetch")]);
  const result = await lookupWord("obfuscate");
  assert.deepEqual([result.ok, result.reason], [false, "unavailable"]);
  assert.equal(calls.length, 3);
});

test("does not retry 'not found'; tries base forms instead", async () => {
  const calls = mockFetch([json({}, 404), json(ENTRY)]);
  const result = await lookupWord("laconics");
  assert.equal(result.ok, true);
  assert.equal(result.matchedForm, "laconic");
  assert.equal(calls.length, 2);
  assert.match(calls[1], /laconic$/);
});
