import { hashString } from "../../utils/format";

const COVER_GRADIENTS = [
  "linear-gradient(150deg, #1d2b53 0%, #0f3460 100%)",
  "linear-gradient(150deg, #2d1b69 0%, #11736a 100%)",
  "linear-gradient(150deg, #3a1c32 0%, #7a2e3b 100%)",
  "linear-gradient(150deg, #0f0c29 0%, #302b63 100%)",
  "linear-gradient(150deg, #1f2a1f 0%, #3f5e3a 100%)",
  "linear-gradient(150deg, #2b2118 0%, #6b4a2b 100%)",
  "linear-gradient(150deg, #18232e 0%, #35556d 100%)",
];

/** Generated cover: color derived from the book id, title as typography. */
export default function BookCover({ book, className = "", compact = false }) {
  const gradient = COVER_GRADIENTS[hashString(book.id) % COVER_GRADIENTS.length];

  return (
    <div
      className={`relative flex aspect-[2/3] flex-col justify-between overflow-hidden p-3 ${className}`}
      style={{ background: gradient }}
      aria-hidden="true"
    >
      <span className="absolute inset-y-0 left-0 w-1.5 bg-black/25" />
      {!compact && (
        <>
      <span className="line-clamp-5 pl-1 text-[13px] font-semibold leading-snug text-white/90 [text-wrap:balance]">
        {book.title}
      </span>
      <span className="pl-1 text-[10px] font-medium uppercase tracking-[0.14em] text-white/50">PDF</span>
        </>
      )}
    </div>
  );
}
