import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../common/Icon";
import BookCover from "./BookCover";
import { formatBytes, readingPercent } from "../../utils/format";

function progressLabel(progress) {
  if (!progress?.lastOpenedAt) return "Not started";
  if (!progress.pageCount) return `Page ${progress.lastPage}`;
  return `Page ${progress.lastPage} of ${progress.pageCount}`;
}

export default function BookCard({ book, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const percent = readingPercent(book.progress);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event) => {
      if (event.type === "keydown" && event.key !== "Escape") return;
      if (event.type === "pointerdown" && menuRef.current?.contains(event.target)) return;
      setMenuOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [menuOpen]);

  return (
    <article className="group relative">
      <Link
        to={`/read/${book.id}`}
        state={{ fromLibrary: true }}
        className="block rounded-xl focus-visible:outline-offset-4"
        aria-label={`Open ${book.title}`}
      >
        <div className="overflow-hidden rounded-xl border border-white/5 shadow-[0_2px_10px_rgba(0,0,0,0.35)] transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[0_10px_28px_rgba(0,0,0,0.5)]">
          <BookCover book={book} />
          {/* Reading progress strip */}
          <div className="h-1 bg-black/60">
            {percent !== null && (
              <div className="h-full bg-accent" style={{ width: `${Math.max(percent, 2)}%` }} />
            )}
          </div>
        </div>
      </Link>

      <div className="mt-2.5 flex items-start gap-1">
        <div className="min-w-0 flex-1">
          <h3 className="m-0 truncate text-[13px] font-medium text-text-primary" title={book.title}>
            {book.title}
          </h3>
          <p className="m-0 mt-0.5 truncate text-xs text-text-secondary">
            {progressLabel(book.progress)}
            <span className="text-text-muted"> · {formatBytes(book.size)}</span>
          </p>
        </div>

        <div className="relative -mr-1.5 -mt-1.5" ref={menuRef}>
          <button
            type="button"
            className="icon-btn"
            aria-label={`More actions for ${book.title}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Icon name="more" size={18} />
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute bottom-full right-0 z-20 mb-1 min-w-40 animate-fade-in overflow-hidden rounded-xl border border-border-strong bg-surface-raised py-1 shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
            >
              <Link
                role="menuitem"
                to={`/read/${book.id}`}
                state={{ fromLibrary: true }}
                className="flex min-h-10 items-center gap-2.5 px-3 text-sm text-text-primary no-underline hover:bg-surface-hover"
              >
                <Icon name="book" size={16} />
                {book.progress?.lastOpenedAt ? "Continue reading" : "Open"}
              </Link>
              <button
                type="button"
                role="menuitem"
                className="flex min-h-10 w-full items-center gap-2.5 px-3 text-left text-sm text-danger hover:bg-surface-hover"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(book);
                }}
              >
                <Icon name="trash" size={16} />
                Delete book
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
