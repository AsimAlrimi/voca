import { useCallback, useEffect, useState } from "react";
import { lookupWord } from "../services/dictionaryService";
import { findWord } from "../services/vocabularyService";

const IDLE = { status: "idle", lookup: null, existing: null };

/**
 * Looks up `word` in the dictionary and checks whether it (or its base form) is already saved.
 * Returns { status: "idle" | "loading" | "found" | "failed", lookup, existing, retry, markSaved }.
 */
export default function useWordLookup(word) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState({ key: null, ...IDLE });
  const key = word ? `${word}|${attempt}` : null;

  useEffect(() => {
    if (!key) return undefined;
    const controller = new AbortController();

    (async () => {
      let next;
      try {
        const [lookup, existingExact] = await Promise.all([
          lookupWord(word, { signal: controller.signal }),
          findWord(word),
        ]);
        let existing = existingExact;
        if (!existing && lookup.ok && lookup.matchedForm) existing = await findWord(lookup.entry.word);
        next = { status: lookup.ok ? "found" : "failed", lookup, existing };
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Word lookup failed", error);
        next = {
          status: "failed",
          lookup: { ok: false, reason: "unavailable", message: error.message || "Lookup failed." },
          existing: null,
        };
      }
      if (!controller.signal.aborted) setResult({ key, ...next });
    })();

    return () => controller.abort();
  }, [key, word]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const markSaved = useCallback((record) => setResult((current) => ({ ...current, existing: record })), []);

  const state = !key ? IDLE : result.key === key ? result : { status: "loading", lookup: null, existing: null };
  return { status: state.status, lookup: state.lookup, existing: state.existing, retry, markSaved };
}
