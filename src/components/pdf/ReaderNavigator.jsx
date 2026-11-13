import { useState } from "react";
import Modal from "../common/Modal";
import Icon from "../common/Icon";
import { currentOutlineIndex } from "../../utils/outline";

/** Contents (PDF outline) and bookmarks in one place. */
export default function ReaderNavigator({ open, outline, outlineStatus, bookmarks, currentPage, pageCount, onGo, onRemoveBookmark, onClose }) {
  const hasOutline = outline.length > 0;
  const [tab, setTab] = useState(null); // null = automatic: Contents if the PDF has one
  const activeTab = tab ?? (hasOutline || outlineStatus === "loading" ? "contents" : "bookmarks");
  const current = currentOutlineIndex(outline, currentPage - 1);

  const go = (page) => {
    onGo(page);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Navigate" size="lg">
      <div className="mb-4 flex rounded-xl bg-background p-1" role="tablist">
        {[
          ["contents", "Contents"],
          ["bookmarks", `Bookmarks${bookmarks.length ? ` (${bookmarks.length})` : ""}`],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={activeTab === value}
            onClick={() => setTab(value)}
            className={`min-h-9 flex-1 rounded-lg text-sm transition-colors ${
              activeTab === value ? "bg-surface-hover font-medium text-text-primary" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "contents" &&
        (outlineStatus === "loading" ? (
          <p className="m-0 py-6 text-center text-sm text-text-secondary">Reading the table of contents…</p>
        ) : !hasOutline ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <span className="text-text-muted">
              <Icon name="contents" size={24} />
            </span>
            <p className="m-0 text-sm text-text-secondary">This PDF doesn’t include a table of contents.</p>
            <p className="m-0 text-xs text-text-muted">Use the progress bar, Go to page, or your bookmarks to move around.</p>
          </div>
        ) : (
          <ol className="m-0 max-h-[55dvh] list-none space-y-0.5 overflow-y-auto p-0" aria-label="Table of contents">
            {outline.map((item, index) => (
              <li key={`${item.title}-${index}`}>
                <button
                  type="button"
                  onClick={() => go(item.pageIndex + 1)}
                  aria-current={index === current ? "location" : undefined}
                  className={`flex min-h-10 w-full items-baseline gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-raised ${
                    index === current ? "bg-surface-raised font-medium text-text-primary" : "text-text-secondary"
                  }`}
                  style={{ paddingLeft: `${0.75 + item.level * 1}rem` }}
                >
                  <span className={`flex-1 ${item.level === 0 ? "text-text-primary" : ""}`}>{item.title}</span>
                  <span className="shrink-0 text-xs tabular-nums text-text-muted">{item.pageIndex + 1}</span>
                </button>
              </li>
            ))}
          </ol>
        ))}

      {activeTab === "bookmarks" &&
        (bookmarks.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <span className="text-text-muted">
              <Icon name="bookmark" size={24} />
            </span>
            <p className="m-0 text-sm text-text-secondary">
              No bookmarks yet. Tap <Icon name="bookmark" size={14} className="inline align-[-2px]" /> in the top bar to
              bookmark the page you’re on.
            </p>
          </div>
        ) : (
          <ul className="m-0 max-h-[55dvh] list-none space-y-1 overflow-y-auto p-0">
            {bookmarks.map((page) => (
              <li key={page} className="flex items-center gap-1">
                <button
                  type="button"
                  className={`flex min-h-11 flex-1 items-center gap-3 rounded-lg px-3 text-left text-sm hover:bg-surface-raised ${
                    page === currentPage ? "bg-surface-raised" : ""
                  }`}
                  onClick={() => go(page)}
                >
                  <Icon name="bookmark" size={16} filled className="text-text-secondary" />
                  <span className="flex-1">Page {page}</span>
                  {pageCount > 0 && <span className="text-xs text-text-muted">{Math.round((page / pageCount) * 100)}%</span>}
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Remove bookmark on page ${page}`}
                  onClick={() => onRemoveBookmark(page)}
                >
                  <Icon name="trash" size={16} />
                </button>
              </li>
            ))}
          </ul>
        ))}
    </Modal>
  );
}
