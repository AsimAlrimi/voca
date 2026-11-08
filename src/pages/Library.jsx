import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import useBooks from "../hooks/useBooks";
import useToast from "../hooks/useToast";
import BookCard from "../components/library/BookCard";
import BookCover from "../components/library/BookCover";
import ConfirmDialog from "../components/common/ConfirmDialog";
import StatusMessage from "../components/common/StatusMessage";
import Icon from "../components/common/Icon";
import PageHeader from "../components/layout/PageHeader";
import { formatBytes, formatRelativeDate, readingPercent } from "../utils/format";
import { getStorageEstimate } from "../utils/indexedDB";

function hasFiles(event) {
  return Array.from(event.dataTransfer?.types ?? []).includes("Files");
}

export default function Library() {
  const { books, status, error, refresh, addBooks, deleteBook } = useBooks();
  const toast = useToast();
  const fileInputRef = useRef(null);
  const dragDepth = useRef(0);

  const [uploading, setUploading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [bookToDelete, setBookToDelete] = useState(null);
  const [storage, setStorage] = useState(null);

  useEffect(() => {
    if (status !== "ready") return;
    let cancelled = false;
    getStorageEstimate().then((estimate) => {
      if (!cancelled) setStorage(estimate);
    });
    return () => {
      cancelled = true;
    };
  }, [status, books.length]);

  const openFilePicker = () => fileInputRef.current?.click();

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList ?? []);
    if (!files.length || uploading) return;

    setUploading(true);
    setUploadErrors([]);
    try {
      const { added, failed } = await addBooks(files);
      if (added.length) {
        toast.show(added.length === 1 ? `Added "${added[0].title}"` : `Added ${added.length} books`, {
          type: "success",
        });
      }
      if (failed.length) {
        setUploadErrors(failed.map(({ file, error: err }) => ({ name: file.name, message: err.message })));
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Page-wide drag & drop (desktop). Mobile always uses the file picker.
  const dragHandlers = {
    onDragEnter: (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth.current += 1;
      setDragging(true);
    },
    onDragOver: (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    },
    onDragLeave: (e) => {
      if (!hasFiles(e)) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragging(false);
    },
    onDrop: (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      handleFiles(e.dataTransfer.files);
    },
  };

  const confirmDelete = async () => {
    const book = bookToDelete;
    await deleteBook(book.id); // throws → ConfirmDialog shows the error and stays open
    setBookToDelete(null);
    toast.show(`Deleted "${book.title}"`, { type: "success" });
  };

  const continueBook = books.find((book) => book.progress?.lastOpenedAt);

  const addButton = (
    <button type="button" className="btn btn-primary" onClick={openFilePicker} disabled={uploading}>
      {uploading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
      ) : (
        <Icon name="plus" size={18} />
      )}
      {uploading ? "Adding…" : "Add PDF"}
    </button>
  );

  return (
    <div className="relative min-h-[60dvh]" {...dragHandlers}>
      <PageHeader
        title="Library"
        subtitle={status === "ready" ? `${books.length} book${books.length === 1 ? "" : "s"}` : undefined}
        action={status !== "error" ? addButton : null}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {uploadErrors.length > 0 && (
        <div role="alert" className="card mb-6 flex items-start gap-3 border-danger/40 p-4">
          <span className="mt-0.5 text-danger">
            <Icon name="alert" size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="m-0 text-sm font-medium text-text-primary">
              {uploadErrors.length === 1 ? "A file couldn't be added" : `${uploadErrors.length} files couldn't be added`}
            </p>
            <ul className="m-0 mt-1 list-none space-y-1 p-0">
              {uploadErrors.map((item, index) => (
                <li key={`${item.name}-${index}`} className="text-sm text-text-secondary">
                  {item.message}
                </li>
              ))}
            </ul>
          </div>
          <button type="button" className="icon-btn -m-1.5" aria-label="Dismiss" onClick={() => setUploadErrors([])}>
            <Icon name="x" size={16} />
          </button>
        </div>
      )}

      {status === "loading" && <StatusMessage type="loading" title="Loading your library…" />}

      {status === "error" && (
        <StatusMessage
          type="error"
          title="Couldn't open your library"
          message={error?.message}
          action={
            <button type="button" className="btn btn-secondary" onClick={refresh}>
              <Icon name="refresh" size={16} /> Try again
            </button>
          }
        />
      )}

      {status === "ready" && books.length === 0 && (
        <button
          type="button"
          onClick={openFilePicker}
          disabled={uploading}
          className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border-strong bg-surface/50 px-6 py-16 text-center transition hover:border-text-muted hover:bg-surface"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-surface-raised text-text-secondary">
            <Icon name="upload" size={24} />
          </span>
          <span className="text-base font-medium text-text-primary">Add your first book</span>
          <span className="max-w-xs text-sm leading-relaxed text-text-secondary">
            Choose a PDF to start reading. Select any word while you read to look it up and save it.
          </span>
          <span className="hidden text-xs text-text-muted md:block">or drag and drop PDF files here</span>
        </button>
      )}

      {status === "ready" && books.length > 0 && (
        <>
          {continueBook && <ContinueReading book={continueBook} />}

          <section aria-label="All books">
            {continueBook && (
              <h2 className="m-0 mb-3 text-xs font-medium uppercase tracking-wider text-text-muted">All books</h2>
            )}
            <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {books.map((book) => (
                <BookCard key={book.id} book={book} onDelete={setBookToDelete} />
              ))}
            </div>
          </section>
        </>
      )}

      {status === "ready" && (
        <p className="m-0 mt-10 flex items-center gap-2 text-xs text-text-muted">
          <Icon name="info" size={14} />
          Books are stored only in this browser on this device
          {storage?.usage ? ` · ${formatBytes(storage.usage)} used` : ""}.
        </p>
      )}

      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-40 flex animate-fade-in items-center justify-center bg-background/85 p-6 md:pl-52">
          <div className="flex w-full max-w-lg flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-text-muted px-6 py-16 text-center">
            <Icon name="upload" size={28} />
            <p className="m-0 text-base font-medium">Drop PDFs to add them to your library</p>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(bookToDelete)}
        title="Delete this book?"
        message={
          bookToDelete
            ? `"${bookToDelete.title}" and its reading progress and bookmarks will be removed from this device. Words you saved from it stay in your vocabulary.`
            : ""
        }
        confirmLabel="Delete book"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setBookToDelete(null)}
      />
    </div>
  );
}

function ContinueReading({ book }) {
  const percent = readingPercent(book.progress);

  return (
    <section aria-label="Continue reading" className="mb-8">
      <h2 className="m-0 mb-3 text-xs font-medium uppercase tracking-wider text-text-muted">Continue reading</h2>
      <Link
        to={`/read/${book.id}`}
        state={{ fromLibrary: true }}
        className="card flex items-center gap-4 p-3 no-underline transition hover:border-border-strong hover:bg-surface-raised sm:p-4"
      >
        <BookCover book={book} compact className="w-12 shrink-0 rounded-md sm:w-14" />
        <div className="min-w-0 flex-1">
          <p className="m-0 truncate text-[15px] font-medium text-text-primary">{book.title}</p>
          <p className="m-0 mt-1 text-xs text-text-secondary">
            Page {book.progress.lastPage}
            {book.progress.pageCount ? ` of ${book.progress.pageCount}` : ""} · opened{" "}
            {formatRelativeDate(book.progress.lastOpenedAt)}
          </p>
          {percent !== null && (
            <div className="mt-2.5 flex items-center gap-2">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-raised">
                <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(percent, 2)}%` }} />
              </div>
              <span className="text-[11px] tabular-nums text-text-muted">{percent}%</span>
            </div>
          )}
        </div>
        <span className="btn btn-secondary hidden sm:inline-flex">Continue</span>
        <span className="text-text-muted sm:hidden">
          <Icon name="chevronRight" size={20} />
        </span>
      </Link>
    </section>
  );
}
