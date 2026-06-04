import { useState, useMemo } from "react";

const SAMPLE_VOCAB = [
  {
    id: 1,
    word: "ephemeral",
    phonetic: "/ɪˈfɛm(ə)r(ə)l/",
    pos: "adjective",
    definition: "Lasting for a very short time; transitory.",
    origin: "Mid 16th century: from Greek ephemeros (lasting only a day).",
    example: "The ephemeral beauty of the cherry blossoms makes them all the more precious.",
    synonyms: ["transient", "fleeting", "momentary", "short-lived"],
    added: "2025-06-01",
  },
  {
    id: 2,
    word: "sonder",
    phonetic: "/ˈsɒndə/",
    pos: "noun",
    definition: "The realization that each passerby has a life as vivid and complex as your own.",
    origin: "Coined by John Koenig in The Dictionary of Obscure Sorrows.",
    example: "Walking through the airport, she felt a wave of sonder looking at the crowd.",
    synonyms: [],
    added: "2025-06-02",
  },
  {
    id: 3,
    word: "mellifluous",
    phonetic: "/mɛˈlɪflʊəs/",
    pos: "adjective",
    definition: "Sweet or musical; pleasant to hear.",
    origin: "Late 15th century: from late Latin mellifluus, from mel (honey) + fluere (to flow).",
    example: "Her mellifluous voice filled the quiet hall.",
    synonyms: ["dulcet", "honeyed", "smooth", "melodious"],
    added: "2025-06-03",
  },
  {
    id: 4,
    word: "obfuscate",
    phonetic: "/ˈɒbfʌskeɪt/",
    pos: "verb",
    definition: "To render obscure, unclear, or unintelligible; to confuse or bewilder.",
    origin: "Mid 16th century: from Latin obfuscare, from ob- (over) + fuscare (to darken).",
    example: "The jargon seemed designed to obfuscate rather than clarify.",
    synonyms: ["obscure", "confuse", "muddle", "cloud"],
    added: "2025-06-03",
  },
  {
    id: 5,
    word: "liminal",
    phonetic: "/ˈlɪmɪn(ə)l/",
    pos: "adjective",
    definition: "Of or relating to a transitional stage; occupying a position on both sides of a boundary.",
    origin: "Late 19th century: from Latin limen, limin- (threshold).",
    example: "The empty corridor had a strange liminal quality at 3am.",
    synonyms: ["threshold", "transitional", "in-between"],
    added: "2025-06-04",
  },
];

const FILTERS = ["All", "noun", "verb", "adjective", "adverb"];

// ── Add Word Modal ────────────────────────────────────────────────────────────
function AddWordModal({ onClose, onSave, existingWords }) {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState({ type: "", text: "" });
  const [fetched, setFetched] = useState(null);
  const [timer, setTimer] = useState(null);

  const handleInput = (e) => {
    const val = e.target.value;
    setInput(val);
    setFetched(null);
    setStatus({ type: "", text: "" });
    clearTimeout(timer);
    if (!val.trim()) return;
    setStatus({ type: "", text: "Looking up..." });
    const t = setTimeout(() => fetchWord(val.trim()), 600);
    setTimer(t);
  };

  const fetchWord = async (word) => {
    try {
      const res = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error("Word not found");
      const entry = data[0];
      const meaning = entry.meanings[0];
      const def = meaning.definitions[0];
      const result = {
        id: Date.now(),
        word: entry.word,
        phonetic: entry.phonetic || "",
        pos: meaning.partOfSpeech,
        definition: def.definition,
        origin: entry.origin || "",
        example: def.example || "",
        synonyms: def.synonyms || [],
        added: new Date().toISOString().slice(0, 10),
      };
      setFetched(result);
      setStatus({
        type: "success",
        text: `Found: ${meaning.partOfSpeech} — "${def.definition.slice(0, 60)}${def.definition.length > 60 ? "…" : ""}"`,
      });
    } catch {
      setStatus({ type: "error", text: "Word not found in dictionary." });
    }
  };

  const handleSave = () => {
    if (!fetched) return;
    if (existingWords.includes(fetched.word)) {
      setStatus({ type: "error", text: "Already in your list." });
      return;
    }
    onSave(fetched);
    onClose();
  };

  const canSave = !!fetched;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md rounded-xl p-5"
        style={{
          background: "var(--color-surface)",
          border: "0.5px solid var(--color-border)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontSize: 16, fontWeight: 500, color: "var(--color-text-primary)" }}>
            Add new word
          </h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded"
            style={{ color: "var(--color-text-muted)", background: "none", border: "none", cursor: "pointer", padding: 4 }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <input
          type="text"
          value={input}
          onChange={handleInput}
          placeholder="Enter a word..."
          autoFocus
          className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none"
          style={{
            background: "var(--color-background)",
            border: "0.5px solid var(--color-border)",
            color: "var(--color-text-primary)",
            marginBottom: 8,
          }}
        />

        <p
          className="text-xs min-h-4"
          style={{
            color:
              status.type === "success"
                ? "#1d9e75"
                : status.type === "error"
                ? "#e24b4a"
                : "var(--color-text-secondary)",
          }}
        >
          {status.text}
        </p>

        <div className="flex gap-2 justify-end mt-4">
          <button
            onClick={onClose}
            className="rounded-lg px-3.5 py-2 text-sm cursor-pointer"
            style={{
              background: "var(--color-surface-raised)",
              border: "0.5px solid var(--color-border)",
              color: "var(--color-text-secondary)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="rounded-lg px-3.5 py-2 text-sm font-medium cursor-pointer"
            style={{
              background: "var(--color-accent)",
              border: "none",
              color: "var(--color-background)",
              opacity: canSave ? 1 : 0.35,
              cursor: canSave ? "pointer" : "not-allowed",
            }}
          >
            Save word
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Word Card ─────────────────────────────────────────────────────────────────
function WordCard({ entry, expanded, onToggle, onDelete }) {
  return (
    <div
      onClick={onToggle}
      className="rounded-xl px-4 py-3.5 cursor-pointer transition-all"
      style={{
        background: expanded ? "#141414" : "var(--color-surface)",
        border: `0.5px solid ${expanded ? "#2a2a2a" : "var(--color-border)"}`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Top row */}
          <div className="flex items-center gap-2.5 mb-1 flex-wrap">
            <span style={{ fontSize: 16, fontWeight: 500, color: "var(--color-text-primary)" }}>
              {entry.word}
            </span>
            {entry.phonetic && (
              <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                {entry.phonetic}
              </span>
            )}
            <span
              className="rounded px-1.5 py-0.5"
              style={{
                fontSize: 11,
                background: "var(--color-surface-raised)",
                border: "0.5px solid var(--color-border)",
                color: "var(--color-text-secondary)",
              }}
            >
              {entry.pos}
            </span>
          </div>

          {/* Definition */}
          <p
            style={{
              fontSize: 13,
              color: "var(--color-text-secondary)",
              lineHeight: 1.5,
              overflow: expanded ? "visible" : "hidden",
              whiteSpace: expanded ? "normal" : "nowrap",
              textOverflow: expanded ? "unset" : "ellipsis",
              maxWidth: expanded ? "none" : 460,
            }}
          >
            {entry.definition}
          </p>

          {/* Expanded content */}
          {expanded && (
            <div
              className="mt-3 pt-3"
              style={{ borderTop: "0.5px solid #1e1e1e" }}
              onClick={(e) => e.stopPropagation()}
            >
              {entry.origin && (
                <p style={{ fontSize: 12, color: "var(--color-text-secondary)", fontStyle: "italic", lineHeight: 1.6 }}>
                  <span style={{ color: "var(--color-text-muted)", fontStyle: "normal" }}>Origin: </span>
                  {entry.origin}
                </p>
              )}
              {entry.example && (
                <p style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 6, lineHeight: 1.5 }}>
                  <span style={{ color: "var(--color-text-muted)" }}>e.g. </span>
                  {entry.example}
                </p>
              )}
              {entry.synonyms?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {entry.synonyms.map((s) => (
                    <span
                      key={s}
                      className="rounded px-1.5 py-0.5"
                      style={{
                        fontSize: 11,
                        background: "var(--color-surface-raised)",
                        border: "0.5px solid var(--color-border)",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
              <p style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 8 }}>
                Added {entry.added}
              </p>
            </div>
          )}
        </div>

        {/* Delete button */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }}
          aria-label="Delete word"
          className="rounded flex items-center justify-center flex-shrink-0"
          style={{
            background: "none",
            border: "none",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            padding: 4,
            fontSize: 15,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#e24b4a")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-muted)")}
        >
          🗑
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Vocabulary() {
  const [vocab, setVocab] = useState(SAMPLE_VOCAB);
  const [expandedId, setExpandedId] = useState(null);
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return vocab.filter((w) => {
      const matchFilter = activeFilter === "All" || w.pos === activeFilter;
      const matchSearch = !q || w.word.includes(q) || w.definition.toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });
  }, [vocab, activeFilter, search]);

  const handleSave = (entry) => {
    setVocab((prev) => [entry, ...prev]);
  };

  const handleDelete = (id) => {
    setVocab((prev) => prev.filter((w) => w.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const toggleExpand = (id) => setExpandedId((prev) => (prev === id ? null : id));

  return (
    <>
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)" }}>
              Vocabulary
            </h1>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 2 }}>
              {vocab.length} word{vocab.length !== 1 ? "s" : ""} saved
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium"
            style={{
              background: "var(--color-accent)",
              color: "var(--color-background)",
              border: "none",
              cursor: "pointer",
            }}
          >
            + Add word
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your words..."
            className="w-full rounded-lg px-3.5 py-2.5 pr-9 text-sm outline-none"
            style={{
              background: "var(--color-surface)",
              border: "0.5px solid var(--color-border)",
              color: "var(--color-text-primary)",
            }}
          />
          <span
            className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--color-text-muted)", fontSize: 15 }}
          >
            🔍
          </span>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap mb-6">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className="rounded-full px-3 py-1 text-xs cursor-pointer transition-all"
              style={{
                background: "var(--color-surface)",
                border: `0.5px solid ${activeFilter === f ? "var(--color-accent)" : "var(--color-border)"}`,
                color: activeFilter === f ? "var(--color-text-primary)" : "var(--color-text-secondary)",
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Word list */}
        {filtered.length === 0 ? (
          <div className="text-center py-16" style={{ color: "var(--color-text-muted)" }}>
            <p style={{ fontSize: 32, marginBottom: 10 }}>📖</p>
            <p style={{ fontSize: 14 }}>No words yet. Add your first one!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {filtered.map((entry) => (
              <WordCard
                key={entry.id}
                entry={entry}
                expanded={expandedId === entry.id}
                onToggle={() => toggleExpand(entry.id)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <AddWordModal
          onClose={() => setShowModal(false)}
          onSave={handleSave}
          existingWords={vocab.map((w) => w.word)}
        />
      )}
    </>
  );
}