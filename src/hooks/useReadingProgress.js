import { useCallback, useEffect, useRef, useState } from "react";
import { markOpened, saveLastPage, toggleBookmark } from "../services/readingProgressService";

const SAVE_DELAY_MS = 800;

/**
 * Tracks the current page and bookmarks for a book and persists them.
 * Page saves are debounced and flushed when the reader closes or the app is hidden.
 */
export default function useReadingProgress(bookId, initialProgress) {
  const [currentPage, setCurrentPage] = useState(initialProgress?.lastPage ?? 1);
  const [pageCount, setPageCount] = useState(initialProgress?.pageCount ?? 0);
  const [bookmarks, setBookmarks] = useState(initialProgress?.bookmarks ?? []);
  const [saveError, setSaveError] = useState(null);

  const pendingPage = useRef(null);
  const timer = useRef(null);

  const flush = useCallback(() => {
    clearTimeout(timer.current);
    const page = pendingPage.current;
    if (page == null) return;
    pendingPage.current = null;
    saveLastPage(bookId, page).catch((error) => {
      console.error("Saving reading position failed", error);
      setSaveError(error);
    });
  }, [bookId]);

  const handlePageChange = useCallback(
    (page) => {
      setCurrentPage(page);
      pendingPage.current = page;
      clearTimeout(timer.current);
      timer.current = setTimeout(flush, SAVE_DELAY_MS);
    },
    [flush]
  );

  const handleDocumentLoad = useCallback(
    (numPages) => {
      setPageCount(numPages);
      markOpened(bookId, numPages).catch((error) => {
        console.error("Updating reading progress failed", error);
        setSaveError(error);
      });
    },
    [bookId]
  );

  const toggleCurrentBookmark = useCallback(async () => {
    const progress = await toggleBookmark(bookId, currentPage);
    setBookmarks(progress.bookmarks);
    return progress.bookmarks.includes(currentPage);
  }, [bookId, currentPage]);

  const removeBookmark = useCallback(
    async (page) => {
      const progress = await toggleBookmark(bookId, page);
      setBookmarks(progress.bookmarks);
    },
    [bookId]
  );

  // Flush on app hide (mobile app switch, tab close) and when leaving the reader.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [flush]);

  return {
    currentPage,
    pageCount,
    bookmarks,
    isBookmarked: bookmarks.includes(currentPage),
    saveError,
    handlePageChange,
    handleDocumentLoad,
    toggleCurrentBookmark,
    removeBookmark,
  };
}
