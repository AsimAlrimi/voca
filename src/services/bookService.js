import {
  addBook,
  getBooks,
  deleteBook,
} from "../utils/indexedDB";

export async function saveBook(file) {
  const book = {
    id: crypto.randomUUID(),
    title: file.name.replace(/\.pdf$/i, ""),
    author: "Unknown",
    file,
    createdAt: Date.now(),
  };

  await addBook(book);

  return book;
}

export async function loadBooks() {
  return await getBooks();
}

export async function removeBook(id) {
  await deleteBook(id);
}