import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import useVocabulary from "../hooks/useVocabulary";
import useToast from "../hooks/useToast";
import PageHeader from "../components/layout/PageHeader";
import StatusMessage from "../components/common/StatusMessage";
import ConfirmDialog from "../components/common/ConfirmDialog";
import Icon from "../components/common/Icon";
import WordCard from "../components/vocabulary/WordCard";
import AddWordDialog from "../components/vocabulary/AddWordDialog";
import EditWordDialog from "../components/vocabulary/EditWordDialog";
import ImportDialog from "../components/vocabulary/ImportDialog";
import { applyImport, exportVocabulary, getLastExportAt, prepareImport } from "../services/backupService";
import { formatRelativeDate } from "../utils/format";

const SORTS = {
  newest: { label: "Newest", compare: (a, b) => b.createdAt - a.createdAt },
  oldest: { label: "Oldest", compare: (a, b) => a.createdAt - b.createdAt },
  az: { label: "A–Z", compare: (a, b) => a.word.localeCompare(b.word) },
};
const BACKUP_REMINDER_DAYS = 14;
const NEEDS_DEFINITION = "__needs-definition";

export default function Vocabulary() {
  const { words, stats, status, error, reload, addWord, updateWord, deleteWord } = useVocabulary();
  const toast = useToast();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [expandedId, setExpandedId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [importState, setImportState] = useState(null); // { plan, fileName }
  const [menuOpen, setMenuOpen] = useState(false);
  const [lastExportAt, setLastExportAt] = useState(() => getLastExportAt());
  const [openedAt] = useState(() => Date.now());
  const importInputRef = useRef(null);
  const menuRef = useRef(null);

  const partsOfSpeech = useMemo(
    () => [...new Set(words.map((w) => w.pos).filter(Boolean))].sort(),
    [words]
  );
  const needsDefinitionCount = useMemo(() => words.filter((w) => !w.definition).length, [words]);
  // A filter for a part of speech that no longer exists falls back to "all".
  const activeFilter =
    filter === "all" || (filter === NEEDS_DEFINITION && needsDefinitionCount) || partsOfSpeech.includes(filter)
      ? filter
      : "all";

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return words
      .filter((w) => {
        if (activeFilter === NEEDS_DEFINITION && w.definition) return false;
        if (activeFilter !== "all" && activeFilter !== NEEDS_DEFINITION && w.pos !== activeFilter) return false;
        if (!query) return true;
        return (
          w.word.toLowerCase().includes(query) ||
          w.definition.toLowerCase().includes(query) ||
          w.note?.toLowerCase().includes(query) ||
          w.source?.bookTitle?.toLowerCase().includes(query)
        );
      })
      .sort(SORTS[sort].compare);
  }, [words, search, activeFilter, sort]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (event) => {
      if (event.type === "keydown" && event.key !== "Escape") return;
      if (event.type === "pointerdown" && menuRef.current?.contains(event.target)) return;
      setMenuOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [menuOpen]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleAdd = async (input) => {
    const record = await addWord(input); // errors shown inside the dialog
    toast.show(`Added “${record.word}”`, { type: "success" });
    setExpandedId(record.id);
  };

  const handleUpdate = async (id, changes) => {
    const record = await updateWord(id, changes);
    toast.show(`Saved changes to “${record.word}”`, { type: "success" });
  };

  const handleDelete = async () => {
    const entry = deleting;
    await deleteWord(entry.id);
    setDeleting(null);
    toast.show(`Deleted “${entry.word}”`, { type: "success" });
  };

  const handleExport = async () => {
    setMenuOpen(false);
    try {
      const result = await exportVocabulary();
      if (result.status === "cancelled") return;
      setLastExportAt(getLastExportAt());
      toast.show(`Exported ${result.count} word${result.count === 1 ? "" : "s"}`, { type: "success" });
    } catch (err) {
      console.error("Export failed", err);
      toast.show(`Export failed: ${err.message}`, { type: "error" });
    }
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const plan = await prepareImport(file);
      setImportState({ plan, fileName: file.name });
    } catch (err) {
      console.error("Import failed", err);
      toast.show(err.message || "This file couldn't be imported.", { type: "error", duration: 6000 });
    }
  };

  const confirmImport = async () => {
    const { plan } = importState;
    if (plan.toAdd.length + plan.toUpdate.length === 0) {
      setImportState(null);
      return;
    }
    const result = await applyImport(plan); // throws → dialog shows error, nothing written
    setImportState(null);
    await reload();
    toast.show(`Imported: ${result.added} new, ${result.updated} updated`, { type: "success" });
  };

  // ── Render ───────────────────────────────────────────────────────────────
  const daysSinceExport = lastExportAt ? (openedAt - lastExportAt) / 86_400_000 : Infinity;
  const showBackupReminder = status === "ready" && words.length >= 5 && daysSinceExport > BACKUP_REMINDER_DAYS;

  const headerActions = (
    <>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          className="icon-btn border border-border"
          aria-label="Backup options"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <Icon name="more" size={18} />
        </button>
        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-full z-20 mt-1 min-w-52 animate-fade-in overflow-hidden rounded-xl border border-border-strong bg-surface-raised py-1 shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
          >
            <button
              type="button"
              role="menuitem"
              className="flex min-h-11 w-full items-center gap-2.5 px-3 text-left text-sm hover:bg-surface-hover disabled:opacity-40"
              onClick={handleExport}
              disabled={!words.length}
            >
              <Icon name="download" size={16} /> Export backup (.json)
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex min-h-11 w-full items-center gap-2.5 px-3 text-left text-sm hover:bg-surface-hover"
              onClick={() => {
                setMenuOpen(false);
                importInputRef.current?.click();
              }}
            >
              <Icon name="upload" size={16} /> Import backup…
            </button>
            <p className="m-0 border-t border-border px-3 py-2 text-[11px] text-text-muted">
              {lastExportAt ? `Last export ${formatRelativeDate(lastExportAt)}` : "Not exported yet"}
            </p>
          </div>
        )}
      </div>
      <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
        <Icon name="plus" size={18} />
        <span className="hidden sm:inline">Add word</span>
        <span className="sm:hidden">Add</span>
      </button>
    </>
  );

  return (
    <div>
      <PageHeader
        title="Vocabulary"
        subtitle={status === "ready" ? `${words.length} word${words.length === 1 ? "" : "s"} saved` : undefined}
        action={status === "ready" ? headerActions : null}
      />
      <input
        ref={importInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleImportFile}
      />

      {status === "loading" && <StatusMessage type="loading" title="Loading your words…" />}

      {status === "error" && (
        <StatusMessage
          type="error"
          title="Couldn't load your vocabulary"
          message={error?.message}
          action={
            <button type="button" className="btn btn-secondary" onClick={reload}>
              <Icon name="refresh" size={16} /> Try again
            </button>
          }
        />
      )}

      {status === "ready" && words.length === 0 && (
        <StatusMessage
          icon="vocabulary"
          title="No saved words yet"
          message="Select a word while reading a book to look it up and save it here. You can also add words manually or import a backup."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link to="/" className="btn btn-secondary no-underline">
                <Icon name="library" size={16} /> Open Library
              </Link>
              <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
                <Icon name="plus" size={16} /> Add a word
              </button>
            </div>
          }
        />
      )}

      {status === "ready" && words.length > 0 && (
        <>
          {showBackupReminder && (
            <div className="card mb-5 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <Icon name="info" size={18} className="hidden shrink-0 text-text-secondary sm:block" />
              <p className="m-0 flex-1 text-sm text-text-secondary">
                Your words are stored only on this device, and browsers can clear website data. Export a backup now and
                then so you don’t lose them.
              </p>
              <button type="button" className="btn btn-secondary shrink-0" onClick={handleExport}>
                <Icon name="download" size={16} /> Export
              </button>
            </div>
          )}

          <div className="mb-3 flex gap-2">
            <div className="relative flex-1">
              <Icon
                name="search"
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search words, definitions, notes"
                aria-label="Search vocabulary"
                className="input pl-9"
              />
            </div>
            <label className="sr-only" htmlFor="vocab-sort">
              Sort
            </label>
            <select
              id="vocab-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="input w-auto pr-8"
            >
              {Object.entries(SORTS).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filter">
            {[
              ["all", "All"],
              ...(needsDefinitionCount ? [[NEEDS_DEFINITION, `Needs definition (${needsDefinitionCount})`]] : []),
              ...partsOfSpeech.map((pos) => [pos, pos.charAt(0).toUpperCase() + pos.slice(1)]),
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={activeFilter === value}
                onClick={() => setFilter(value)}
                className={`min-h-9 shrink-0 rounded-full border px-3.5 text-xs transition-colors ${
                  activeFilter === value
                    ? "border-text-secondary bg-surface-raised text-text-primary"
                    : "border-border text-text-secondary hover:border-border-strong hover:text-text-primary"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <StatusMessage
              icon="search"
              title="No matching words"
              message="Try a different search or filter."
              action={
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setSearch("");
                    setFilter("all");
                  }}
                >
                  Clear filters
                </button>
              }
            />
          ) : (
            <div className="flex flex-col gap-2.5">
              {visible.map((entry) => (
                <WordCard
                  key={entry.id}
                  entry={entry}
                  stats={stats.get(entry.id)}
                  expanded={expandedId === entry.id}
                  onToggle={() => setExpandedId((id) => (id === entry.id ? null : entry.id))}
                  onEdit={setEditing}
                  onDelete={setDeleting}
                />
              ))}
            </div>
          )}
        </>
      )}

      <AddWordDialog open={adding} onClose={() => setAdding(false)} onSave={handleAdd} />
      <EditWordDialog entry={editing} onClose={() => setEditing(null)} onSave={handleUpdate} />
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this word?"
        message={deleting ? `“${deleting.word}” and its practice history will be removed.` : ""}
        confirmLabel="Delete word"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
      <ImportDialog
        plan={importState?.plan}
        fileName={importState?.fileName}
        onConfirm={confirmImport}
        onCancel={() => setImportState(null)}
      />
    </div>
  );
}
