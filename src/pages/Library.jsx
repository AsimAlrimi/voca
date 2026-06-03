import { useState, useRef } from "react";
import PDFReader from "../components/pdf/PDFReader";
import { useEffect } from "react";
import { saveBook, loadBooks } from "../services/bookService";

 
const COVER_GRADIENTS = [
  "linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)",
  "linear-gradient(135deg, #2d1b69 0%, #11998e 100%)",
  "linear-gradient(135deg, #1c1c1c 0%, #4a4a4a 100%)",
  "linear-gradient(135deg, #0f0c29 0%, #302b63 100%)",
  "linear-gradient(135deg, #0a0a0a 0%, #2d2d2d 100%)",
  "linear-gradient(135deg, #1a1a1a 0%, #3d3d3d 100%)",
];


 
export default function Library() {
  const [openFile, setOpenFile] = useState(null);
  const [books, setBooks] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  useEffect(() => {
  async function fetchBooks() {
    const storedBooks = await loadBooks();

    const booksWithUrls = storedBooks.map((book) => ({
      ...book,
      url: URL.createObjectURL(book.file),
    }));

    setBooks(booksWithUrls);
  }

  fetchBooks();
}, []);

const handleDrop = (e) => {
  e.preventDefault();
  setDragOver(false);
  handleFileSelect(e.dataTransfer.files[0]);
};
 
  const handleFileSelect = async (file) => {
    if (!file || file.type !== "application/pdf") return;

    const savedBook = await saveBook(file);

    setBooks((prev) => [
      ...prev,
      {
        ...savedBook,
        url: URL.createObjectURL(file),
      },
    ]);
  };
  
  if (openFile) {
    return <PDFReader fileUrl={openFile.url} onClose={() => setOpenFile(null)} />;
  }
 
  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-[var(--color-text-primary)] m-0">
            Library
          </h1>
          <p className="text-[var(--color-text-secondary)] text-sm mt-1">
            {books.length} book{books.length !== 1 ? "s" : ""}
          </p>
        </div>
 
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-accent-dim)] text-[var(--color-text-primary)] text-sm font-medium hover:bg-[var(--color-surface-raised)] hover:border-[var(--color-text-muted)] transition-all cursor-pointer"
        >
          + Add PDF
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files[0])}
        />
      </div>
 
      {/* Empty drop zone */}
      {books.length === 0 && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-3 min-h-[180px] rounded-xl border border-dashed cursor-pointer transition-all ${
            dragOver
              ? "border-[var(--color-text-muted)] bg-[var(--color-surface-raised)]"
              : "border-[var(--color-border)] hover:border-[var(--color-text-muted)] hover:bg-[var(--color-surface)]"
          }`}
        >
          <span className="text-3xl">📚</span>
          <p className="text-[var(--color-text-secondary)] text-sm m-0">
            Drag & drop a PDF, or click <strong className="text-[var(--color-text-primary)]">+ Add PDF</strong>
          </p>
        </div>
      )}
 
      {/* Book grid */}
      {books.length > 0 && (
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
          {books.map((book, index) => (
            <BookCard
              key={book.id}
              book={book}
              gradient={COVER_GRADIENTS[index % COVER_GRADIENTS.length]}
              onOpen={() => book.url && setOpenFile(book)}
            />
          ))}
 
          {/* Add card */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`rounded-xl border border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
              dragOver
                ? "border-[var(--color-text-muted)] bg-[var(--color-surface-raised)]"
                : "border-[var(--color-border)] hover:border-[var(--color-text-muted)] hover:bg-[var(--color-surface)]"
            }`}
            style={{ aspectRatio: "2/3" }}
          >
            <span className="text-xl text-[var(--color-text-muted)]">+</span>
            <span className="text-[11px] text-[var(--color-text-muted)]">Add PDF</span>
          </div>
        </div>
      )}
    </div>
  );
}
 
function BookCard({ book, gradient, onOpen }) {
  const [hovered, setHovered] = useState(false);
 
  return (
    <div
      onClick={book.url ? onOpen : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`rounded-xl overflow-hidden transition-all duration-200 ${
        book.url ? "cursor-pointer" : "cursor-default opacity-50"
      }`}
      style={{
        transform: hovered && book.url ? "translateY(-3px)" : "none",
        boxShadow: hovered && book.url
          ? "0 8px 24px rgba(0,0,0,0.45)"
          : "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      {/* Cover */}
      <div
        className="relative flex items-center justify-center p-4"
        style={{ aspectRatio: "2/3", background: gradient }}
      >
        <span className="text-white/90 text-xs font-semibold text-center leading-snug drop-shadow">
          {book.title}
        </span>
 
        {/* Hover overlay */}
        {book.url && (
          <div
            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${
              hovered ? "opacity-100" : "opacity-0"
            }`}
            style={{ background: "rgba(0,0,0,0.5)" }}
          >
            <span className="text-white text-xs font-semibold px-3 py-1.5 rounded-md border border-white/30 bg-white/15 backdrop-blur-sm">
              Open
            </span>
          </div>
        )}
      </div>
 
      {/* Info */}
      <div className="px-2 py-2.5 bg-[var(--color-surface)]">
        <p className="text-[var(--color-text-primary)] text-xs font-semibold truncate m-0">
          {book.title}
        </p>
        <p className="text-[var(--color-text-secondary)] text-[11px] truncate mt-0.5 m-0">
          {book.author}
        </p>
      </div>
    </div>
  );
}