import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../common/Icon";
import SenseList from "../vocabulary/SenseList";
import useWordLookup from "../../hooks/useWordLookup";
import { playPronunciation } from "../../services/dictionaryService";
import { addWord } from "../../services/vocabularyService";
import { placePopover } from "../../utils/popoverPosition";

const CARD_WIDTH = 320; // on-screen px
const GAP = 10; // on-screen px
const EDGE_MARGIN = 12; // on-screen px
const SIDE_PANEL_WIDTH = 400; // keep in sync with PDFReader

/**
 * Word lookup for a selection in the PDF.
 *
 * - Default: a compact card next to the word — word, phonetic, audio, first meaning, Save, More.
 * - "More": full details — a bottom sheet on phones, a side panel on desktop (the reader makes
 *   room for it so the page isn't covered).
 *
 * Card positioning uses the *visual* viewport (pinch-zoom safe) and counter-scales the card so it
 * keeps its normal size. Parent keys this component by word so state resets per selection.
 */
export default function WordLookupPanel({
  selection,
  book,
  compact,
  viewport,
  toolbarRef,
  toolbarVisible,
  expanded,
  onExpandChange,
  onClose,
  onSaved,
}) {
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
  const audioOptions = entry?.pronunciations?.filter((p) => p.audio) ?? [];

  const scale = viewport.scale || 1;
  const presentation = !expanded ? "card" : compact ? "sheet" : "side";

  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      if (expanded) onExpandChange(false);
      else onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [expanded, onExpandChange, onClose]);

  // Card placement from the real selection rectangle and the visible area.
  const cssWidth = Math.max(240, Math.min(CARD_WIDTH, viewport.width * scale - 2 * EDGE_MARGIN));
  useLayoutEffect(() => {
    if (presentation !== "card" || !rect || !panelRef.current) return;
    let natural = 2;
    for (const child of panelRef.current.children) {
      natural += child.dataset.scrollArea ? child.scrollHeight : child.offsetHeight;
    }
    // Stay below the reader's top bar while it is shown.
    const topInset = toolbarVisible && toolbarRef?.current ? toolbarRef.current.getBoundingClientRect().bottom : viewport.top;
    setPosition(
      placePopover(
        rect,
        viewport,
        { width: cssWidth / scale, height: natural / scale },
        { gap: GAP / scale, margin: EDGE_MARGIN / scale, topInset, minUsable: 150 / scale }
      )
    );
  }, [presentation, rect, viewport, scale, cssWidth, toolbarRef, toolbarVisible, status, justSaved, existing]);

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
        synonyms: sense?.synonyms?.length ? sense.synonyms : entry?.synonyms,
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

  // ── Container per presentation ───────────────────────────────────────────
  let containerClass;
  let style;
  if (presentation === "card") {
    containerClass = "fixed z-40 animate-fade-in rounded-2xl border";
    style = {
      width: cssWidth,
      left: position?.left ?? -9999,
      top: position?.top ?? -9999,
      maxHeight: position ? position.maxHeight * scale : undefined,
      transform: scale !== 1 ? `scale(${1 / scale})` : undefined,
      transformOrigin: "0 0",
    };
  } else if (presentation === "sheet") {
    // Anchored to the bottom of the visible area (also above the iOS keyboard).
    containerClass = "fixed z-40 animate-slide-up rounded-t-2xl border-t pb-[calc(0.75rem+env(safe-area-inset-bottom))]";
    style = {
      left: viewport.left,
      width: viewport.width,
      bottom: Math.max(0, viewport.layoutHeight - (viewport.top + viewport.height)),
      maxHeight: viewport.height * 0.85,
    };
  } else {
    containerClass = "fixed inset-y-0 right-0 z-40 animate-fade-in border-l";
    style = { width: SIDE_PANEL_WIDTH };
  }

  const saveButtonLabel = saving
    ? "Saving…"
    : status === "failed" && !definitionDraft.trim()
      ? "Save without definition"
      : "Save to Vocabulary";

  const savedRow = existing && (
    <div className="flex items-center gap-2">
      <p className="m-0 flex flex-1 items-center gap-2 text-sm" role="status">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
          <Icon name="check" size={14} strokeWidth={2.5} />
        </span>
        {justSaved ? "Saved to Vocabulary" : "Already saved"}
      </p>
      <Link to="/vocabulary" className="btn btn-secondary min-h-9 px-3 no-underline">
        View
      </Link>
    </div>
  );

  return (
    <section
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-label={`Definition of ${displayWord}`}
      data-presentation={presentation}
      data-placement={presentation === "card" ? position?.placement : presentation}
      className={`${containerClass} flex flex-col overflow-hidden border-border-strong bg-surface-raised text-text-primary shadow-[0_12px_40px_rgba(0,0,0,0.6)]`}
      style={style}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {presentation === "sheet" && <div className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-border-strong" aria-hidden="true" />}

      {/* Header (shared) */}
      <div className={`flex shrink-0 items-start gap-1 px-4 pb-1 ${presentation === "side" ? "pt-4" : "pt-3"}`}>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h2 className={`m-0 break-words font-semibold tracking-tight ${presentation === "card" ? "text-lg" : "text-xl"}`}>
              {displayWord}
            </h2>
            {entry?.phonetic && <span className="text-sm text-text-secondary">{entry.phonetic}</span>}
          </div>
          {lookup?.matchedForm && <p className="m-0 mt-0.5 text-xs text-text-muted">Base form of “{word}”</p>}
        </div>
        {presentation === "card"
          ? entry?.audio && (
              <button
                type="button"
                className="icon-btn h-9 w-9"
                aria-label={`Play pronunciation of ${displayWord}`}
                onClick={() => playPronunciation(entry.audio)}
              >
                <Icon name="volume" size={17} />
              </button>
            )
          : audioOptions.slice(0, 2).map((p) => (
              <button
                key={p.audio}
                type="button"
                className="flex min-h-10 shrink-0 items-center gap-1 rounded-full px-2 text-xs text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                aria-label={`Play ${p.accent || ""} pronunciation of ${displayWord}`}
                title={p.text || undefined}
                onClick={() => playPronunciation(p.audio)}
              >
                <Icon name="volume" size={16} />
                {p.accent}
              </button>
            ))}
        {expanded && (
          <button type="button" className="icon-btn h-9 w-9" aria-label="Show less" title="Show less" onClick={() => onExpandChange(false)}>
            <Icon name="chevronDown" size={18} className={presentation === "side" ? "rotate-90" : ""} />
          </button>
        )}
        <button type="button" className="icon-btn -mr-2 h-9 w-9" aria-label="Close definition" onClick={onClose}>
          <Icon name="x" size={18} />
        </button>
      </div>

      {presentation === "card" ? (
        <CardBody
          status={status}
          entry={entry}
          sense={sense}
          lookup={lookup}
          existing={existing}
          savedRow={savedRow}
          saving={saving}
          saveError={saveError}
          onSave={handleSave}
          onRetry={retry}
          onMore={() => onExpandChange(true)}
        />
      ) : (
        <>
          <div data-scroll-area="true" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-1">
            {status === "loading" && <Skeleton />}

            {status === "found" && entry && (
              <>
                <SenseList senses={entry.senses} meanings={entry.meanings} selectedIndex={senseIndex} onSelect={setSenseIndex} />
                {entry.senses.length > 1 && (
                  <p className="m-0 mt-1.5 px-1 text-[11px] text-text-muted">Choose the meaning that fits your book.</p>
                )}
              </>
            )}

            {status === "failed" && (
              <div className="py-1">
                <FailureMessage lookup={lookup} word={word} onRetry={retry} />
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
                “{sentence}”<span className="not-italic text-text-muted"> — p. {page}</span>
              </p>
            )}

            {status === "found" && entry && <WordDetails entry={entry} sense={sense} />}

            {status !== "loading" && !existing && (
              <div className="mt-2">
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

          <div className={`shrink-0 border-t border-border px-4 pt-3 ${presentation === "sheet" ? "" : "pb-4"}`}>
            {saveError && (
              <p role="alert" className="m-0 mb-2 text-sm text-danger">
                {saveError}
              </p>
            )}
            {existing ? (
              savedRow
            ) : (
              <button type="button" className="btn btn-primary w-full" onClick={handleSave} disabled={saving || status === "loading"}>
                <Icon name="plus" size={17} />
                {saveButtonLabel}
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2 py-2" role="status" aria-label="Looking up definition">
      <div className="h-3 w-16 animate-pulse rounded bg-border-strong" />
      <div className="h-3 w-full animate-pulse rounded bg-border-strong" />
      <div className="h-3 w-4/5 animate-pulse rounded bg-border-strong" />
    </div>
  );
}

function FailureMessage({ lookup, word, onRetry, short = false }) {
  return (
    <>
      <p className="m-0 flex items-start gap-2 text-sm text-text-secondary">
        <span className="mt-0.5 text-warning">
          <Icon name={lookup?.reason === "offline" ? "wifiOff" : "alert"} size={16} />
        </span>
        <span>
          {lookup?.message}
          {!short && ` You can still save “${word}” and add a definition later.`}
        </span>
      </p>
      {lookup?.reason !== "not_found" && (
        <button type="button" className="btn btn-ghost mt-1 min-h-9 px-2 text-sm" onClick={onRetry}>
          <Icon name="refresh" size={15} /> Try again
        </button>
      )}
    </>
  );
}

/** Compact card: first meaning, Save and More. */
function CardBody({ status, entry, sense, lookup, existing, savedRow, saving, saveError, onSave, onRetry, onMore }) {
  const otherMeanings = entry ? entry.senses.length - 1 : 0;
  return (
    <div className="px-4 pb-3">
      {status === "loading" && <Skeleton />}
      {status === "found" && sense && (
        <div className="mt-0.5">
          {sense.pos && <span className="chip mb-1">{sense.pos}</span>}
          <p className="m-0 line-clamp-4 text-sm leading-relaxed text-text-primary">{sense.definition}</p>
          {otherMeanings > 0 && (
            <p className="m-0 mt-1 text-xs text-text-muted">
              +{otherMeanings} more meaning{otherMeanings === 1 ? "" : "s"}
            </p>
          )}
        </div>
      )}
      {status === "failed" && (
        <div className="mt-0.5">
          <FailureMessage lookup={lookup} short onRetry={onRetry} />
        </div>
      )}

      {saveError && (
        <p role="alert" className="m-0 mt-2 text-sm text-danger">
          {saveError}
        </p>
      )}

      <div className="mt-3">
        {existing ? (
          <div className="space-y-2">
            {savedRow}
            <button type="button" className="btn btn-ghost min-h-9 w-full" onClick={onMore}>
              More details
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button type="button" className="btn btn-primary min-h-10 flex-1" onClick={onSave} disabled={saving || status === "loading"}>
              <Icon name="plus" size={16} />
              {saving ? "Saving…" : status === "failed" ? "Save anyway" : "Save"}
            </button>
            <button type="button" className="btn btn-secondary min-h-10" onClick={onMore} disabled={status === "loading"}>
              More
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Optional extra information, collapsed so the panel stays compact. */
function WordDetails({ entry, sense }) {
  const antonyms = sense?.antonyms?.length ? sense.antonyms : entry.antonyms;
  const otherSynonyms = entry.synonyms.filter((s) => !sense?.synonyms?.includes(s));
  const transcriptions = entry.pronunciations.filter((p) => p.text);
  const hasDetails = entry.origin || antonyms.length || otherSynonyms.length || transcriptions.length > 1 || entry.sourceUrl;
  if (!hasDetails) return null;

  return (
    <details className="group mt-2 text-xs text-text-secondary">
      <summary className="flex min-h-9 cursor-pointer list-none items-center gap-1.5 font-medium hover:text-text-primary">
        <Icon name="chevronDown" size={14} className="transition-transform group-open:rotate-180" />
        More about this word
      </summary>
      <dl className="m-0 mb-1 space-y-1.5 pl-5">
        {transcriptions.length > 1 && (
          <div>
            <dt className="inline text-text-muted">Pronunciation: </dt>
            <dd className="m-0 inline">{transcriptions.map((p) => `${p.accent ? p.accent + " " : ""}${p.text}`).join(" · ")}</dd>
          </div>
        )}
        {otherSynonyms.length > 0 && (
          <div>
            <dt className="inline text-text-muted">{entry.extraSynonyms ? "Related words" : "Synonyms"}: </dt>
            <dd className="m-0 inline">{otherSynonyms.join(", ")}</dd>
          </div>
        )}
        {antonyms.length > 0 && (
          <div>
            <dt className="inline text-text-muted">Opposites: </dt>
            <dd className="m-0 inline">{antonyms.join(", ")}</dd>
          </div>
        )}
        {entry.origin && (
          <div>
            <dt className="inline text-text-muted">Origin: </dt>
            <dd className="m-0 inline">{entry.origin}</dd>
          </div>
        )}
        {entry.sourceUrl && (
          <div>
            <a href={entry.sourceUrl} target="_blank" rel="noreferrer" className="text-text-secondary underline underline-offset-2">
              Full entry on Wiktionary
            </a>
          </div>
        )}
      </dl>
    </details>
  );
}
