import { STORES, getAll, runTransaction } from "../utils/indexedDB";

/** Map of wordId → { wordId, seen, correct, streak, lastPracticedAt } */
export async function getAllStats() {
  const stats = await getAll(STORES.practiceStats);
  return new Map(stats.map((item) => [item.wordId, item]));
}

/** Records one answer. Read-modify-write in a single transaction. */
export function recordAnswer(wordId, isCorrect) {
  return runTransaction(STORES.practiceStats, "readwrite", (stores, setResult) => {
    const store = stores[STORES.practiceStats];
    const request = store.get(wordId);
    request.onsuccess = () => {
      const current = request.result ?? { wordId, seen: 0, correct: 0, streak: 0, lastPracticedAt: null };
      const next = {
        ...current,
        seen: current.seen + 1,
        correct: current.correct + (isCorrect ? 1 : 0),
        streak: isCorrect ? current.streak + 1 : 0,
        lastPracticedAt: Date.now(),
      };
      store.put(next);
      setResult(next);
    };
  });
}
