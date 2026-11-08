import Modal from "../common/Modal";
import Icon from "../common/Icon";

export default function BookmarksDialog({ open, bookmarks, currentPage, pageCount, onGo, onRemove, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Bookmarks" description="Pages you bookmarked in this book.">
      {bookmarks.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <span className="text-text-muted">
            <Icon name="bookmark" size={24} />
          </span>
          <p className="m-0 text-sm text-text-secondary">
            No bookmarks yet. Tap <Icon name="bookmark" size={14} className="inline align-[-2px]" /> while reading to
            bookmark the current page.
          </p>
        </div>
      ) : (
        <ul className="m-0 list-none space-y-1 p-0">
          {bookmarks.map((page) => (
            <li key={page} className="flex items-center gap-1">
              <button
                type="button"
                className={`flex min-h-11 flex-1 items-center gap-3 rounded-lg px-3 text-left text-sm hover:bg-surface-raised ${
                  page === currentPage ? "bg-surface-raised" : ""
                }`}
                onClick={() => {
                  onGo(page);
                  onClose();
                }}
              >
                <Icon name="bookmark" size={16} filled className="text-text-secondary" />
                <span className="flex-1">Page {page}</span>
                {pageCount > 0 && <span className="text-xs text-text-muted">{Math.round((page / pageCount) * 100)}%</span>}
              </button>
              <button
                type="button"
                className="icon-btn"
                aria-label={`Remove bookmark on page ${page}`}
                onClick={() => onRemove(page)}
              >
                <Icon name="trash" size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
