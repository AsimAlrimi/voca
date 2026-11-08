import { STORES, getByKey, runTransaction } from "../utils/indexedDB";

function emptyProgress(bookId) {
  return {
    bookId,
    lastPage: 1,
    pageCount: 0,
    bookmarks: [],
    lastOpenedAt: null,
    updatedAt: Date.now(),
  };
}

export async function getProgress(bookId) {
  return (await getByKey(STORES.readingProgress, bookId)) ?? emptyProgress(bookId);
}

/**
 * Read-modify-write inside one transaction so concurrent updates
 * (page change + bookmark toggle) can't overwrite each other.
 */
function updateProgress(bookId, change) {
  return runTransaction(STORES.readingProgress, "readwrite", (stores, setResult) => {
    const store = stores[STORES.readingProgress];
    const request = store.get(bookId);
    request.onsuccess = () => {
      const current = request.result ?? emptyProgress(bookId);
      const next = { ...current, ...change(current), bookId, updatedAt: Date.now() };
      store.put(next);
      setResult(next);
    };
  });
}

export function markOpened(bookId, pageCount) {
  return updateProgress(bookId, (current) => ({
    lastOpenedAt: Date.now(),
    pageCount: pageCount || current.pageCount,
  }));
}

export function saveLastPage(bookId, page) {
  return updateProgress(bookId, () => ({ lastPage: page }));
}

/** Adds or removes `page` from the book's bookmarks. Returns the updated progress. */
export function toggleBookmark(bookId, page) {
  return updateProgress(bookId, (current) => {
    const has = current.bookmarks.includes(page);
    const bookmarks = has
      ? current.bookmarks.filter((p) => p !== page)
      : [...current.bookmarks, page].sort((a, b) => a - b);
    return { bookmarks };
  });
}
