import { STORES, StorageError, runTransaction } from "../utils/indexedDB";
import { buildBackup, parseBackup, planImport } from "../utils/backup";
import { listWords } from "./vocabularyService";

const LAST_EXPORT_KEY = "voca.lastExportAt";

export function getLastExportAt() {
  try {
    return Number(localStorage.getItem(LAST_EXPORT_KEY)) || null;
  } catch {
    return null; // storage blocked (e.g. private mode) — treat as "never exported"
  }
}

function setLastExportAt(time) {
  try {
    localStorage.setItem(LAST_EXPORT_KEY, String(time));
  } catch (error) {
    console.warn("Couldn't remember export time", error);
  }
}

function downloadFile(file) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Exports all words as JSON. On touch devices that support sharing files (iOS/Android),
 * opens the share sheet (e.g. "Save to Files"); otherwise downloads the file.
 * Returns { status: "shared" | "downloaded" | "cancelled", count }.
 */
export async function exportVocabulary() {
  const words = await listWords();
  const date = new Date().toISOString().slice(0, 10);
  const json = JSON.stringify(buildBackup(words), null, 2);
  const file = new File([json], `voca-vocabulary-${date}.json`, { type: "application/json" });

  const prefersShare = window.matchMedia("(pointer: coarse)").matches;
  if (prefersShare && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Voca vocabulary backup" });
      setLastExportAt(Date.now());
      return { status: "shared", count: words.length };
    } catch (error) {
      if (error.name === "AbortError") return { status: "cancelled", count: words.length };
      console.warn("Share failed, falling back to download", error);
    }
  }

  downloadFile(file);
  setLastExportAt(Date.now());
  return { status: "downloaded", count: words.length };
}

/** Reads a backup file and computes what an import would change. Nothing is written. */
export async function prepareImport(file) {
  const content = await file.text();
  const { entries, invalid } = parseBackup(content);
  const existing = await listWords();
  return planImport(existing, entries, invalid);
}

/**
 * Applies a prepared import in ONE transaction: either every word is written or none.
 * Uses add() for new words so a word added since planning aborts the import instead of
 * silently overwriting it.
 */
export async function applyImport(plan) {
  try {
    await runTransaction(STORES.vocabulary, "readwrite", (stores) => {
      const store = stores[STORES.vocabulary];
      plan.toAdd.forEach((record) => store.add(record));
      plan.toUpdate.forEach((record) => store.put(record));
    });
  } catch (error) {
    if (error.code === "constraint") {
      throw new StorageError(
        "conflict",
        "Your vocabulary changed while importing. Nothing was imported — please try again.",
        error
      );
    }
    throw error;
  }
  return { added: plan.toAdd.length, updated: plan.toUpdate.length };
}
