// Vocabulary backup file format + import planning. React-free, no storage access.
import { normalizeWord, validateWord } from "./words.js";

export const BACKUP_VERSION = 1;

export function buildBackup(words) {
  return {
    app: "voca",
    type: "vocabulary",
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    count: words.length,
    words: words.map((word) => ({
      word: word.word,
      phonetic: word.phonetic,
      audio: word.audio,
      pos: word.pos,
      definition: word.definition,
      example: word.example,
      origin: word.origin,
      synonyms: word.synonyms,
      note: word.note,
      source: word.source,
      createdAt: word.createdAt,
      updatedAt: word.updatedAt,
    })),
  };
}

export class BackupError extends Error {}

const text = (value, max = 2000) => (typeof value === "string" ? value.trim().slice(0, max) : "");
const time = (value) => (Number.isFinite(value) && value > 0 ? value : null);

function sanitizeSource(source) {
  if (!source || typeof source !== "object") return null;
  return {
    bookId: text(source.bookId, 100) || null,
    bookTitle: text(source.bookTitle, 300),
    page: Number.isInteger(source.page) && source.page > 0 ? source.page : null,
    sentence: text(source.sentence, 600),
  };
}

/** Parses and validates a backup file. Returns { entries, invalid }. Throws BackupError. */
export function parseBackup(fileText) {
  let data;
  try {
    data = JSON.parse(fileText);
  } catch {
    throw new BackupError("This file isn't valid JSON. Choose a Voca vocabulary backup (.json).");
  }
  if (!data || data.app !== "voca" || data.type !== "vocabulary" || !Array.isArray(data.words)) {
    throw new BackupError("This file isn't a Voca vocabulary backup.");
  }
  if (typeof data.version !== "number" || data.version > BACKUP_VERSION) {
    throw new BackupError("This backup was made by a newer version of Voca. Update the app and try again.");
  }

  const entries = [];
  let invalid = 0;
  for (const item of data.words) {
    const check = validateWord(item?.word);
    if (!item || typeof item !== "object" || !check.ok) {
      invalid += 1;
      continue;
    }
    const now = Date.now();
    const createdAt = time(item.createdAt) ?? now;
    entries.push({
      word: check.word,
      wordKey: normalizeWord(check.word),
      phonetic: text(item.phonetic, 100),
      audio: /^https:\/\//.test(item.audio ?? "") ? text(item.audio, 500) : "",
      pos: text(item.pos, 40),
      definition: text(item.definition),
      example: text(item.example),
      origin: text(item.origin),
      synonyms: Array.isArray(item.synonyms) ? item.synonyms.filter((s) => typeof s === "string").slice(0, 20) : [],
      note: text(item.note),
      source: sanitizeSource(item.source),
      createdAt,
      updatedAt: time(item.updatedAt) ?? createdAt,
    });
  }
  return { entries, invalid };
}

/**
 * Merge rule: match by wordKey. New → add. Existing → replace only if the imported copy
 * has a newer updatedAt (keeping the existing id so practice stats stay linked). Else skip.
 */
export function planImport(existingWords, entries, invalid = 0, createId = () => crypto.randomUUID()) {
  const existingByKey = new Map(existingWords.map((w) => [w.wordKey, w]));
  const seenInFile = new Set();
  const toAdd = [];
  const toUpdate = [];
  let skipped = invalid;

  for (const entry of entries) {
    if (seenInFile.has(entry.wordKey)) {
      skipped += 1;
      continue;
    }
    seenInFile.add(entry.wordKey);

    const current = existingByKey.get(entry.wordKey);
    if (!current) {
      toAdd.push({ ...entry, id: createId() });
    } else if (entry.updatedAt > (current.updatedAt ?? 0)) {
      toUpdate.push({ ...entry, id: current.id, createdAt: current.createdAt });
    } else {
      skipped += 1;
    }
  }

  return { toAdd, toUpdate, skipped, total: entries.length + invalid };
}
