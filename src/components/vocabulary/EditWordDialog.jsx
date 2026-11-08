import { useState } from "react";
import Modal from "../common/Modal";
import Icon from "../common/Icon";
import SenseList from "./SenseList";
import useWordLookup from "../../hooks/useWordLookup";

const PARTS_OF_SPEECH = ["noun", "verb", "adjective", "adverb", "pronoun", "preposition", "conjunction", "interjection"];

export default function EditWordDialog({ entry, onClose, onSave }) {
  return (
    <Modal open={Boolean(entry)} onClose={onClose} title={entry ? `Edit “${entry.word}”` : "Edit word"} size="lg">
      {entry && <EditWordForm key={entry.id} entry={entry} onClose={onClose} onSave={onSave} />}
    </Modal>
  );
}

function EditWordForm({ entry, onClose, onSave }) {
  const [form, setForm] = useState({
    word: entry.word,
    pos: entry.pos,
    definition: entry.definition,
    example: entry.example,
    note: entry.note,
    phonetic: entry.phonetic,
    audio: entry.audio ?? "",
    origin: entry.origin,
    synonyms: entry.synonyms ?? [],
  });
  const [lookupQuery, setLookupQuery] = useState("");
  const [senseIndex, setSenseIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const { status, lookup, retry } = useWordLookup(lookupQuery);

  const set = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const applySense = () => {
    const found = lookup.entry;
    const sense = found.senses[senseIndex];
    setForm((current) => ({
      ...current,
      pos: sense.pos || current.pos,
      definition: sense.definition,
      example: current.example || sense.example,
      phonetic: current.phonetic || found.phonetic,
      audio: current.audio || found.audio,
      origin: current.origin || found.origin,
      synonyms: current.synonyms.length ? current.synonyms : found.synonyms,
    }));
    setLookupQuery("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.word.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(entry.id, form);
      onClose();
    } catch (err) {
      setError(err.message || "Couldn't save changes.");
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_11rem]">
        <label className="block">
          <span className="mb-1.5 block text-sm text-text-secondary">Word</span>
          <input className="input" value={form.word} onChange={set("word")} required autoCapitalize="none" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-text-secondary">Part of speech</span>
          <input className="input" value={form.pos} onChange={set("pos")} list="pos-options" />
          <datalist id="pos-options">
            {PARTS_OF_SPEECH.map((pos) => (
              <option key={pos} value={pos} />
            ))}
          </datalist>
        </label>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-sm text-text-secondary" id="definition-label">
            Definition
          </span>
          <button
            type="button"
            className="flex min-h-8 items-center gap-1 text-xs font-medium text-text-secondary hover:text-text-primary"
            onClick={() => setLookupQuery(form.word.trim())}
            disabled={!form.word.trim()}
          >
            <Icon name="search" size={13} /> Look up in dictionary
          </button>
        </div>
        <textarea
          aria-labelledby="definition-label"
          className="input min-h-20 resize-y"
          value={form.definition}
          onChange={set("definition")}
          rows={3}
          placeholder="No definition yet"
        />
      </div>

      {lookupQuery && (
        <div className="rounded-xl border border-border bg-background p-3" aria-live="polite">
          {status === "loading" && <p className="m-0 text-sm text-text-secondary">Looking up “{lookupQuery}”…</p>}
          {status === "failed" && (
            <p className="m-0 text-sm text-text-secondary">
              {lookup?.message}{" "}
              {lookup?.reason !== "not_found" && (
                <button type="button" className="font-medium text-text-primary underline" onClick={retry}>
                  Try again
                </button>
              )}
            </p>
          )}
          {status === "found" && (
            <>
              <SenseList senses={lookup.entry.senses} selectedIndex={senseIndex} onSelect={setSenseIndex} />
              <div className="mt-3 flex justify-end gap-2">
                <button type="button" className="btn btn-ghost min-h-9" onClick={() => setLookupQuery("")}>
                  Cancel
                </button>
                <button type="button" className="btn btn-secondary min-h-9" onClick={applySense}>
                  Use this meaning
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <label className="block">
        <span className="mb-1.5 block text-sm text-text-secondary">Example</span>
        <textarea className="input min-h-16 resize-y" value={form.example} onChange={set("example")} rows={2} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm text-text-secondary">Note</span>
        <textarea className="input min-h-16 resize-y" value={form.note} onChange={set("note")} rows={2} />
      </label>

      {error && (
        <p role="alert" className="m-0 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving || !form.word.trim()}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
