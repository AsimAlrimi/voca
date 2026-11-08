import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../common/Icon";
import useWordLookup from "../../hooks/useWordLookup";
import { playPronunciation } from "../../services/dictionaryService";
import { addWord } from "../../services/vocabularyService";

const POPOVER_WIDTH = 360;
const GAP = 10;

/**
 * Shows the definition of a word selected in the PDF and saves it to vocabulary.
 * variant "popover": anchored next to the selection (desktop).
 * variant "sheet": non-modal bottom sheet (mobile), so reading isn't blocked.
 *
 * Parent should key this component by word so local state resets per selection.
 */
export default function WordLookupPanel({ selection, book, variant, onClose, onSaved }) {
  const { word, page, sentence, rect } = selection;
  const { status, lookup, existing, retry, markSaved } = useWordLookup(word);

  const [senseIndex, setSenseIndex] = useState(0);
  const [showExtras, setShowExtras] = useState(false);
  const [note, setNote] = useState("");
  const [exampleDraft, setExampleDraft] = useState(null); // null = use dictionary example
  const [definitionDraft, setDefinitionDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [justSaved, setJustSaved] = useState(false);

  const panelRef = useRef(null);
  const [position, setPosition] = useState(null);

  const entry = lookup?.ok ? lookup.entry : null;
  const sense = entry?.senses[senseIndex] ?? null;
  const displayWord = entry?.word ?? word;
  const example = exampleDraft ?? sense?.example ?? "";

  // Close on Escape.
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Position the desktop popover so it never covers the selected word: below or above
  // (whichever has more room, height capped to fit), else beside the selection.
  useLayoutEffect(() => {
    if (variant !== "popover" || !rect) return;
    const natural = panelRef.current?.scrollHeight ?? 320;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const TOP_LIMIT = 64; // reader toolbar
    const MIN_USABLE = 260;
    const spaceBelow = vh - rect.bottom - GAP - 12;
    const spaceAbove = rect.top - GAP - TOP_LIMIT;
    const centeredLeft = Math.min(Math.max(12, rect.left + rect.width / 2 - POPOVER_WIDTH / 2), vw - POPOVER_WIDTH - 12);

    let next;
    if (spaceBelow >= Math.min(natural, MIN_USABLE) && (spaceBelow >= natural || spaceBelow >= spaceAbove)) {
      next = { left: centeredLeft, top: rect.bottom + GAP, maxHeight: spaceBelow };
    } else if (spaceAbove >= Math.min(natural, MIN_USABLE)) {
      const height = Math.min(natural, spaceAbove);
      next = { left: centeredLeft, top: rect.top - GAP - height, maxHeight: spaceAbove };
    } else {
      // Not enough vertical room: place beside the selection.
      const rightRoom = vw - rect.right - GAP - 12;
      const left = rightRoom >= POPOVER_WIDTH ? rect.right + GAP : Math.max(12, rect.left - GAP - POPOVER_WIDTH);
      const maxHeight = vh - TOP_LIMIT - 12;
      const top = Math.min(Math.max(TOP_LIMIT, rect.top + rect.height / 2 - Math.min(natural, maxHeight) / 2), vh - 12 - Math.min(natural, maxHeight));
      next = { left, top, maxHeight };
    }
    setPosition(next);
  }, [variant, rect, status, showExtras, justSaved]);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const record = await addWord({
        word: displayWord,
        phonetic: entry?.phonetic,
        audio: entry?.audio,
        pos: sense?.pos,
        definition: sense?.definition ?? definitionDraft,
        example,
        origin: entry?.origin,
        synonyms: entry?.synonyms,
        note,
        source: { bookId: book.id, bookTitle: book.title, page, sentence: sentence || "" },
      });
      markSaved(record);
      setJustSaved(true);
      onSaved(record);
    } catch (error) {
      console.error("Saving word failed", error);
      setSaveError(error.message || "Couldn't save this word.");
    } finally {
      setSaving(false);
    }
  };

  const isSheet = variant === "sheet";
  const containerClass = isSheet
    ? "fixed inset-x-0 bottom-0 z-40 max-h-[70dvh] rounded-t-2xl border-t pb-[calc(1rem+env(safe-area-inset-bottom))]"
    : "fixed z-40 rounded-2xl border";
  const style = isSheet
    ? undefined
    : {
        width: POPOVER_WIDTH,
        left: position?.left ?? -9999,
        top: position?.top ?? -9999,
        maxHeight: position?.maxHeight,
      };

  return (
    <section
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-label={`Definition of ${displayWord}`}
      className={`${containerClass} flex animate-slide-up flex-col overflow-hidden border-border-strong bg-surface-raised text-text-primary shadow-[0_12px_40px_rgba(0,0,0,0.6)]`}
      style={style}
    >
      {isSheet && <div className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-border-strong" aria-hidden="true" />}

      {/* Header */}
      <div className="flex items-start gap-2 px-4 pb-2 pt-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h2 className="m-0 break-words text-xl font-semibold tracking-tight">{displayWord}</h2>
            {entry?.phonetic && <span className="text-sm text-text-secondary">{entry.phonetic}</span>}
          </div>
          {lookup?.matchedForm && (
            <p className="m-0 mt-0.5 text-xs text-text-muted">
              Base form of “{word}”
            </p>
          )}
        </div>
        {entry?.audio && (
          <button
            type="button"
            className="icon-btn"
            aria-label={`Play pronunciation of ${displayWord}`}
            onClick={() => playPronunciation(entry.audio)}
          >
            <Icon name="volume" size={18} />
          </button>
        )}
        <button type="button" className="icon-btn -mr-2" aria-label="Close definition" onClick={onClose}>
          <Icon name="x" size={18} />
        </button>
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-1">
        {status === "loading" && (
          <div className="space-y-2 py-2" role="status" aria-label="Looking up definition">
            <div className="h-3 w-16 animate-pulse rounded bg-border-strong" />
            <div className="h-3 w-full animate-pulse rounded bg-border-strong" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-border-strong" />
          </div>
        )}

        {status === "found" && entry && (
          <div className="space-y-1.5" role="radiogroup" aria-label="Meanings">
            {entry.senses.map((item, index) => {
              const selected = index === senseIndex;
              return (
                <button
                  key={`${item.pos}-${index}`}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setSenseIndex(index)}
                  className={`block w-full rounded-xl border px-3 py-2 text-left transition-colors ${
                    selected ? "border-border-strong bg-surface-hover" : "border-transparent hover:bg-surface-hover/60"
                  }`}
                >
                  {item.pos && <span className="chip mb-1 mr-1.5">{item.pos}</span>}
                  <span className={`text-sm leading-relaxed ${selected ? "text-text-primary" : "text-text-secondary"}`}>
                    {item.definition}
                  </span>
                </button>
              );
            })}
            {entry.senses.length > 1 && (
              <p className="m-0 px-1 text-[11px] text-text-muted">Tap the meaning that fits your book, then save.</p>
            )}
          </div>
        )}

        {status === "failed" && (
          <div className="py-1">
            <p className="m-0 flex items-start gap-2 text-sm text-text-secondary">
              <span className="mt-0.5 text-warning">
                <Icon name={lookup?.reason === "offline" ? "wifiOff" : "alert"} size={16} />
              </span>
              <span>
                {lookup?.message} You can still save “{word}” and add a definition later.
              </span>
            </p>
            {lookup?.reason !== "not_found" && (
              <button type="button" className="btn btn-ghost mt-1 min-h-9 px-2 text-sm" onClick={retry}>
                <Icon name="refresh" size={15} /> Try again
              </button>
            )}
            <label className="mt-2 block">
              <span className="mb-1 block text-xs text-text-secondary">Your definition (optional)</span>
              <textarea
                className="input min-h-16 resize-y"
                value={definitionDraft}
                onChange={(e) => setDefinitionDraft(e.target.value)}
                placeholder="What does it mean here?"
                rows={2}
              />
            </label>
          </div>
        )}

        {sentence && status !== "loading" && (
          <p className="m-0 mt-3 border-l-2 border-border-strong pl-3 text-xs italic leading-relaxed text-text-secondary">
            “{sentence}”
            <span className="not-italic text-text-muted"> — p. {page}</span>
          </p>
        )}

        {status !== "loading" && !existing && (
          <div className="mt-3">
            <button
              type="button"
              className="flex min-h-9 items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary"
              aria-expanded={showExtras}
              onClick={() => setShowExtras((v) => !v)}
            >
              <Icon name="chevronDown" size={14} className={`transition-transform ${showExtras ? "rotate-180" : ""}`} />
              Add a note or example
            </button>
            {showExtras && (
              <div className="mt-1 space-y-2">
                <textarea
                  className="input min-h-16 resize-y"
                  aria-label="Note"
                  placeholder="Personal note (optional)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                />
                <textarea
                  className="input min-h-16 resize-y"
                  aria-label="Example sentence"
                  placeholder="Example sentence (optional)"
                  value={example}
                  onChange={(e) => setExampleDraft(e.target.value)}
                  rows={2}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border px-4 pt-3">
        {saveError && (
          <p role="alert" className="m-0 mb-2 text-sm text-danger">
            {saveError}
          </p>
        )}

        {existing ? (
          <div className="flex items-center gap-3">
            <p className="m-0 flex flex-1 items-center gap-2 text-sm" role="status">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success/15 text-success">
                <Icon name="check" size={14} strokeWidth={2.5} />
              </span>
              {justSaved ? "Saved to Vocabulary" : "Already in your vocabulary"}
            </p>
            <Link to="/vocabulary" className="btn btn-secondary min-h-9 no-underline">
              View
            </Link>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-primary w-full"
            onClick={handleSave}
            disabled={saving || status === "loading"}
          >
            <Icon name="plus" size={17} />
            {saving ? "Saving…" : status === "failed" && !definitionDraft.trim() ? "Save without definition" : "Save to Vocabulary"}
          </button>
        )}
      </div>
    </section>
  );
}
