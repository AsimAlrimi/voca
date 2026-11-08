import {
  STORES,
  StorageError,
  add,
  getAll,
  getByKey,
  runTransaction,
  requestPersistentStorage,
} from "../utils/indexedDB";

const PDF_SIGNATURE = "%PDF-";

function titleFromFileName(name) {
  return name.replace(/\.pdf$/i, "").replace(/[_]+/g, " ").trim() || "Untitled";
}

/** Checks MIME type / extension, then the file header, so renamed files are rejected. */
export async function validatePdfFile(file) {
  if (!file) throw new StorageError("invalid", "No file selected.");

  const looksLikePdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  if (!looksLikePdf) {
    throw new StorageError("invalid", `"${file.name}" isn't a PDF. Only PDF files can be added.`);
  }

  const header = await file.slice(0, 1024).text();
  if (!header.includes(PDF_SIGNATURE)) {
    throw new StorageError("invalid", `"${file.name}" doesn't look like a valid PDF file.`);
  }
}

/** Adds a PDF to the library. Returns the stored book metadata (without the file). */
export async function saveBook(file) {
  await validatePdfFile(file);

  const book = {
    id: crypto.randomUUID(),
    title: titleFromFileName(file.name),
    author: "Unknown",
    fileName: file.name,
    size: file.size,
    // Store as a plain Blob so the record doesn't depend on File support in IndexedDB.
    file: new Blob([file], { type: "application/pdf" }),
    createdAt: Date.now(),
  };

  await add(STORES.books, book);

  // Best effort; the browser may refuse. Not awaited by callers' UI.
  requestPersistentStorage();

  return book;
}

/** Books with their reading progress merged in, newest activity first. */
export async function loadBooks() {
  const [books, progressList] = await Promise.all([
    getAll(STORES.books),
    getAll(STORES.readingProgress),
  ]);
  const progressById = new Map(progressList.map((p) => [p.bookId, p]));

  return books
    .map((book) => ({
      ...book,
      // Books stored by the v1 app have no size field.
      size: book.size ?? book.file?.size ?? 0,
      progress: progressById.get(book.id) ?? null,
    }))
    .sort((a, b) => lastActivity(b) - lastActivity(a));
}

function lastActivity(book) {
  return book.progress?.lastOpenedAt ?? book.createdAt ?? 0;
}

export function getBook(id) {
  return getByKey(STORES.books, id);
}

/** Deletes the book and its reading progress atomically. Saved words are kept. */
export function removeBook(id) {
  return runTransaction([STORES.books, STORES.readingProgress], "readwrite", (stores) => {
    stores[STORES.books].delete(id);
    stores[STORES.readingProgress].delete(id);
  });
}
