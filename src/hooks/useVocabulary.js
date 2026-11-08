import { useCallback, useEffect, useState } from "react";
import { addWord, deleteWord, listWords, updateWord } from "../services/vocabularyService";
import { getAllStats } from "../services/practiceService";

async function loadAll() {
  const [words, stats] = await Promise.all([listWords(), getAllStats()]);
  return { words, stats };
}

/** Saved vocabulary + practice stats, with loading/error state and CRUD helpers. */
export default function useVocabulary() {
  const [words, setWords] = useState([]);
  const [stats, setStats] = useState(() => new Map());
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [error, setError] = useState(null);

  const apply = useCallback((data) => {
    setWords(data.words);
    setStats(data.stats);
    setError(null);
    setStatus("ready");
  }, []);

  const fail = useCallback((err) => {
    console.error("Loading vocabulary failed", err);
    setError(err);
    setStatus("error");
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadAll()
      .then((data) => !cancelled && apply(data))
      .catch((err) => !cancelled && fail(err));
    return () => {
      cancelled = true;
    };
  }, [apply, fail]);

  const reload = useCallback(() => loadAll().then(apply).catch(fail), [apply, fail]);

  const add = useCallback(async (input) => {
    const record = await addWord(input);
    setWords((prev) => [record, ...prev]);
    return record;
  }, []);

  const update = useCallback(async (id, changes) => {
    const record = await updateWord(id, changes);
    setWords((prev) => prev.map((w) => (w.id === id ? record : w)));
    return record;
  }, []);

  const remove = useCallback(async (id) => {
    await deleteWord(id);
    setWords((prev) => prev.filter((w) => w.id !== id));
    setStats((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  return { words, stats, status, error, reload, addWord: add, updateWord: update, deleteWord: remove };
}
