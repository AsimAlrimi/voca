import test from "node:test";
import assert from "node:assert/strict";
import { validateWord, normalizeWord, candidateBaseForms } from "../src/utils/words.js";
import { areDefinitionsDistinct, buildQuestion, buildSession, shuffle, DIRECTIONS } from "../src/utils/practice.js";
import { parseBackup, planImport, buildBackup } from "../src/utils/backup.js";

const w = (id, word, definition, pos = "adjective") => ({ id, word, wordKey: normalizeWord(word), definition, pos });

test("validateWord: single words, punctuation, hyphenation, possessives", () => {
  assert.deepEqual(validateWord("  “Ephemeral,”  "), { ok: true, word: "Ephemeral" });
  assert.deepEqual(validateWord("extra-\nordinary"), { ok: true, word: "extraordinary" });
  assert.deepEqual(validateWord("well-known"), { ok: true, word: "well-known" });
  assert.deepEqual(validateWord("author’s"), { ok: true, word: "author" });
  assert.deepEqual(validateWord("it's"), { ok: true, word: "it's" });
  assert.equal(validateWord("cherry blossoms").reason, "multiple");
  assert.equal(validateWord("1234").reason, "empty");
  assert.equal(validateWord("abc123def").reason, "not-a-word");
  assert.equal(validateWord("x".repeat(60)).reason, "too-long");
  assert.deepEqual(validateWord("naïve"), { ok: true, word: "naïve" });
});

test("normalizeWord makes duplicates match", () => {
  assert.equal(normalizeWord(" Ephemeral "), normalizeWord("ephemeral"));
  assert.equal(normalizeWord("it’s"), "it's");
});

test("candidateBaseForms covers common inflections", () => {
  assert.ok(candidateBaseForms("running").includes("run"));
  assert.ok(candidateBaseForms("studies").includes("study"));
  assert.ok(candidateBaseForms("obfuscated").includes("obfuscate"));
});

test("areDefinitionsDistinct rejects identical / contained / near-identical definitions", () => {
  assert.equal(areDefinitionsDistinct("Lasting a short time.", "lasting a short time"), false);
  assert.equal(areDefinitionsDistinct("Very big.", "Very big in size."), false);
  assert.equal(areDefinitionsDistinct("Of large size or extent.", "Large in size or extent."), false);
  assert.equal(areDefinitionsDistinct("Lasting a short time.", "Pleasant to hear."), true);
  assert.equal(areDefinitionsDistinct("", "Pleasant to hear."), false);
});

test("buildQuestion skips ambiguous Word → Definition questions", () => {
  const pool = [
    w("1", "big", "Of large size or extent."),
    w("2", "large", "Large in size or extent."), // near-duplicate of #1
    w("3", "huge", "Of large size or extent."), // identical to #1
  ];
  assert.equal(buildQuestion(pool[0], pool, DIRECTIONS.wordToDefinition), null);
  // Definition → Word is ambiguous here too (several words fit the same definition)
  assert.equal(buildQuestion(pool[0], pool, DIRECTIONS.definitionToWord), null);
});

test("buildQuestion builds 3 unique choices with exactly one correct", () => {
  const pool = [
    w("1", "ephemeral", "Lasting a very short time."),
    w("2", "mellifluous", "Sweet or musical; pleasant to hear."),
    w("3", "laconic", "Using very few words."),
    w("4", "obfuscate", "To make something unclear.", "verb"),
  ];
  for (const type of [DIRECTIONS.wordToDefinition, DIRECTIONS.definitionToWord]) {
    for (let i = 0; i < 50; i++) {
      const q = buildQuestion(pool[0], pool, type);
      assert.equal(q.choices.length, 3);
      assert.equal(q.choices.filter((c) => c.correct).length, 1);
      assert.equal(new Set(q.choices.map((c) => c.label)).size, 3);
    }
  }
});

test("buildSession: skips ambiguous words, respects size, excludes words without definitions", () => {
  const words = [
    w("1", "ephemeral", "Lasting a very short time."),
    w("2", "mellifluous", "Sweet or musical; pleasant to hear."),
    w("3", "laconic", "Using very few words."),
    w("4", "sanguine", "Optimistic in a difficult situation."),
    w("5", "fleeting", "Lasting a very short time."), // identical to #1 → both ambiguous with each other
    w("6", "nodef", ""),
  ];
  const { questions, skipped } = buildSession(words, { direction: DIRECTIONS.wordToDefinition, size: 10 });
  const ids = questions.map((q) => q.target.id);
  assert.ok(!ids.includes("6"));
  for (const q of questions) {
    const labels = q.choices.map((c) => c.label.toLowerCase());
    assert.equal(new Set(labels).size, 3);
    if (["1", "5"].includes(q.target.id)) {
      // The twin's definition must never appear as a distractor
      assert.equal(labels.filter((l) => l.startsWith("lasting a very short")).length, 1);
    }
  }
  assert.equal(questions.length + skipped, 5);
  assert.equal(buildSession(words, { direction: DIRECTIONS.mixed, size: 2 }).questions.length, 2);
  const retry = buildSession(words, { direction: DIRECTIONS.definitionToWord, size: 10, onlyIds: ["3"] });
  assert.deepEqual(retry.questions.map((q) => q.target.id), ["3"]);
});

test("shuffle is a permutation", () => {
  const a = [1, 2, 3, 4, 5, 6];
  assert.deepEqual([...shuffle(a)].sort(), a);
});

test("backup round-trip and import plan: new / updated / skipped", () => {
  const existing = [
    { ...w("a", "ephemeral", "Old def."), createdAt: 1, updatedAt: 100 },
    { ...w("b", "laconic", "Using few words."), createdAt: 1, updatedAt: 500 },
  ];
  const file = buildBackup([
    { ...w("x", "Ephemeral", "Newer def."), createdAt: 1, updatedAt: 200 }, // newer → update
    { ...w("y", "laconic", "Older def."), createdAt: 1, updatedAt: 300 }, // older → skip
    { ...w("z", "sanguine", "Optimistic."), createdAt: 1, updatedAt: 50 }, // new
    { ...w("z2", "sanguine", "Dup in file."), createdAt: 1, updatedAt: 60 }, // duplicate in file → skip
    { word: "two words", definition: "bad" }, // invalid → skip
  ]);
  const { entries, invalid } = parseBackup(JSON.stringify(file));
  assert.equal(invalid, 1);
  const plan = planImport(existing, entries, invalid, () => "new-id");
  assert.equal(plan.toAdd.length, 1);
  assert.equal(plan.toAdd[0].word, "sanguine");
  assert.equal(plan.toUpdate.length, 1);
  assert.equal(plan.toUpdate[0].id, "a"); // keeps existing id → practice stats stay linked
  assert.equal(plan.toUpdate[0].definition, "Newer def.");
  assert.equal(plan.skipped, 3);
});

test("parseBackup rejects non-Voca files", () => {
  assert.throws(() => parseBackup("not json"), /valid JSON/);
  assert.throws(() => parseBackup(JSON.stringify({ hello: 1 })), /isn't a Voca/);
  assert.throws(() => parseBackup(JSON.stringify({ app: "voca", type: "vocabulary", version: 99, words: [] })), /newer version/);
});
