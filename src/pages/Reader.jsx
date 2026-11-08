import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import PDFReader from "../components/pdf/PDFReader";
import StatusMessage from "../components/common/StatusMessage";
import useObjectUrl from "../hooks/useObjectUrl";
import { getBook } from "../services/bookService";
import { getProgress } from "../services/readingProgressService";

export default function Reader() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [state, setState] = useState({ bookId: null, status: "loading", book: null, progress: null, error: null });

  useEffect(() => {
    let cancelled = false;
    Promise.all([getBook(bookId), getProgress(bookId)])
      .then(([book, progress]) => {
        if (cancelled) return;
        setState({ bookId, status: book ? "ready" : "not-found", book, progress, error: null });
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Opening book failed", error);
        setState({ bookId, status: "error", book: null, progress: null, error });
      });
    return () => {
      cancelled = true;
    };
  }, [bookId]);

  // One object URL per opened book; revoked when the reader closes or the book changes.
  const fileUrl = useObjectUrl(state.bookId === bookId ? state.book?.file : null);

  // The reader's own back button always lands on the Library. If we came from the Library,
  // go back in history (so browser back/forward stays natural); otherwise (direct link,
  // refresh in a fresh tab) replace the entry with the Library.
  const goToLibrary = useCallback(() => {
    if (location.state?.fromLibrary && location.key !== "default") navigate(-1);
    else navigate("/", { replace: true });
  }, [location.key, location.state, navigate]);

  const status = state.bookId === bookId ? state.status : "loading";

  if (status === "loading" || (status === "ready" && !fileUrl)) {
    return (
      <FullScreen>
        <StatusMessage type="loading" title="Opening book…" />
      </FullScreen>
    );
  }

  if (status !== "ready") {
    return (
      <FullScreen>
        <StatusMessage
          type={status === "error" ? "error" : "empty"}
          icon="book"
          title={status === "error" ? "Couldn't open this book" : "Book not found"}
          message={
            status === "error"
              ? state.error?.message
              : "This book isn't in your library on this device. It may have been deleted."
          }
          action={
            <button type="button" className="btn btn-secondary" onClick={() => navigate("/", { replace: true })}>
              Back to Library
            </button>
          }
        />
      </FullScreen>
    );
  }

  return (
    <PDFReader
      key={bookId}
      book={state.book}
      fileUrl={fileUrl}
      initialProgress={state.progress}
      onBack={goToLibrary}
    />
  );
}

function FullScreen({ children }) {
  return <div className="flex min-h-dvh items-center justify-center bg-background p-6">{children}</div>;
}
