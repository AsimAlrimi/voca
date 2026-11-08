import { useCallback, useEffect, useState } from "react";
import { loadBooks, removeBook, saveBook } from "../services/bookService";

/** Library state: list of books (metadata + Blob reference + progress), with loading/error. */
export default function useBooks() {
  const [books, setBooks] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const stored = await loadBooks();
      setBooks(stored);
      setError(null);
      setStatus("ready");
    } catch (err) {
      console.error("Failed to load books", err);
      setError(err);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadBooks()
      .then((stored) => {
        if (cancelled) return;
        setBooks(stored);
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load books", err);
        setError(err);
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Adds files one by one. Returns { added: Book[], failed: { file, error }[] }. */
  const addBooks = useCallback(async (files) => {
    const added = [];
    const failed = [];
    for (const file of files) {
      try {
        const book = await saveBook(file);
        added.push({ ...book, progress: null });
      } catch (err) {
        failed.push({ file, error: err });
      }
    }
    if (added.length) setBooks((prev) => [...added.reverse(), ...prev]);
    return { added, failed };
  }, []);

  const deleteBook = useCallback(async (id) => {
    await removeBook(id);
    setBooks((prev) => prev.filter((book) => book.id !== id));
  }, []);

  return { books, status, error, refresh, addBooks, deleteBook };
}
