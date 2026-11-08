import { STORES, StorageError, getAll, getByIndex, runTransaction } from "../utils/indexedDB";
import { normalizeWord } from "../utils/words";

const EDITABLE_FIELDS = ["word", "phonetic", "pos", "definition", "example", "origin", "synonyms", "note", "audio"];

function clean(value) {
  return typeof value === "string" ? value.trim() : value;
}

/** Build a complete vocabulary record from partial input. */
export function createWordRecord(input) {
  const now = Date.now();
  const word = clean(input.word);
  return {
    id: crypto.randomUUID(),
    word,
    wordKey: normalizeWord(word),
    phonetic: clean(input.phonetic) || "",
    audio: input.audio || "",
    pos: clean(input.pos) || "",
    definition: clean(input.definition) || "",
    example: clean(input.example) || "",
    origin: clean(input.origin) || "",
    synonyms: Array.isArray(input.synonyms) ? input.synonyms.filter(Boolean) : [],
    note: clean(input.note) || "",
    source: input.source ?? null, // { bookId, bookTitle, page, sentence } | null
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
}

function duplicateError(word, cause) {
  return new StorageError("duplicate", `"${word}" is already in your vocabulary.`, cause);
}

export async function listWords() {
  const words = await getAll(STORES.vocabulary);
  return words.sort((a, b) => b.createdAt - a.createdAt);
}

export function findWord(word) {
  return getByIndex(STORES.vocabulary, "wordKey", normalizeWord(word));
}

/** Adds a word. Rejects with code "duplicate" if the word already exists. */
export async function addWord(input) {
  const record = createWordRecord(input);
  if (!record.word || !record.wordKey) throw new StorageError("invalid", "A word is required.");
  try {
    await runTransaction(STORES.vocabulary, "readwrite", (stores) => {
      stores[STORES.vocabulary].add(record);
    });
  } catch (error) {
    if (error.code === "constraint") throw duplicateError(record.word, error);
    throw error;
  }
  return record;
}

/** Updates editable fields. Returns the updated record. */
export async function updateWord(id, changes) {
  const patch = {};
  EDITABLE_FIELDS.forEach((field) => {
    if (field in changes) patch[field] = clean(changes[field]);
  });
  if ("word" in patch) {
    if (!patch.word) throw new StorageError("invalid", "A word is required.");
    patch.wordKey = normalizeWord(patch.word);
  }

  let updated;
  try {
    updated = await runTransaction(STORES.vocabulary, "readwrite", (stores, setResult) => {
      const store = stores[STORES.vocabulary];
      const request = store.get(id);
      request.onsuccess = () => {
        if (!request.result) {
          setResult(null);
          return;
        }
        const next = { ...request.result, ...patch, updatedAt: Date.now() };
        store.put(next);
        setResult(next);
      };
    });
  } catch (error) {
    if (error.code === "constraint") throw duplicateError(patch.word, error);
    throw error;
  }
  if (!updated) throw new StorageError("not_found", "This word no longer exists. It may have been deleted.");
  return updated;
}

/** Deletes a word and its practice stats atomically. */
export function deleteWord(id) {
  return runTransaction([STORES.vocabulary, STORES.practiceStats], "readwrite", (stores) => {
    stores[STORES.vocabulary].delete(id);
    stores[STORES.practiceStats].delete(id);
  });
}
