import { useState } from "react";
import Modal from "../common/Modal";
import Icon from "../common/Icon";
import SenseList from "./SenseList";
import useWordLookup from "../../hooks/useWordLookup";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import { validateWord } from "../../utils/words";

/** Manually add a word: dictionary lookup as you type, with a manual definition fallback. */
export default function AddWordDialog({ open, onClose, onSave }) {
  return (
    <Modal open={open} onClose={onClose} title="Add a word">
      {open && <AddWordForm onClose={onClose} onSave={onSave} />}
    </Modal>
  );
}

function AddWordForm({ onClose, onSave }) {
  const [input, setInput] = useState("");
  const [senseIndex, setSenseIndex] = useState(0);
  const [ownDefinition, setOwnDefinition] = useState("");
  const [writeOwn, setWriteOwn] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const validation = validateWord(input);
  const debounced = useDebouncedValue(validation.ok ? validation.word : "", 550);
  const query = validation.ok && debounced === validation.word ? debounced : "";
  const { status, lookup, existing, retry } = useWordLookup(query);

  const entry = lookup?.ok ? lookup.entry : null;
  const sense = entry?.senses[senseIndex] ?? null;
  const useOwn = writeOwn || status === "failed";
  const typing = validation.ok && query !== validation.word;

  const handleInput = (event) => {
    setInput(event.target.value);
    setSenseIndex(0);
    setError(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validation.ok || existing || typing || status === "loading") return;
    setSaving(true);
    setError(null);
    try {
      await onSave({
        word: entry?.word ?? validation.word,
        phonetic: entry?.phonetic,
        audio: entry?.audio,
        origin: entry?.origin,
        synonyms: entry?.synonyms,
        pos: useOwn ? "" : sense?.pos,
        definition: useOwn ? ownDefinition : sense?.definition,
        example: useOwn ? "" : sense?.example,
        note,
      });
      onClose();
    } catch (err) {
      setError(err.message || "Couldn't save this word.");
      setSaving(false);
    }
  };

  const showInvalid = input.trim() && !validation.ok;

  return (
    <form onSubmit={handleSubmit}>
      <label className="block">
        <span className="mb-1.5 block text-sm text-text-secondary">Word</span>
        <input
          className="input"
          value={input}
          onChange={handleInput}
          placeholder="e.g. ephemeral"
          autoFocus
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={Boolean(showInvalid)}
        />
      </label>
      {showInvalid && (
        <p className="m-0 mt-1.5 text-xs text-danger">
          {validation.reason === "multiple" ? "Enter a single word." : "Enter a word using letters only."}
        </p>
      )}

      <div className="mt-4 min-h-12" aria-live="polite">
        {(typing || status === "loading") && (
          <p className="m-0 flex items-center gap-2 text-sm text-text-secondary">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-border-strong border-t-text-primary" />
            Looking up…
          </p>
        )}

        {!typing && existing && (
          <p className="m-0 flex items-center gap-2 text-sm text-text-secondary" role="status">
            <Icon name="check" size={16} className="text-success" />“{existing.word}” is already in your vocabulary.
          </p>
        )}

        {!typing && !existing && status === "found" && entry && (
          <>
            <div className="mb-2 flex items-baseline gap-2">
              <span className="text-base font-semibold">{entry.word}</span>
              {entry.phonetic && <span className="text-sm text-text-secondary">{entry.phonetic}</span>}
            </div>
            {!writeOwn && <SenseList senses={entry.senses} selectedIndex={senseIndex} onSelect={setSenseIndex} />}
            <button
              type="button"
              className="mt-2 min-h-9 text-xs font-medium text-text-secondary hover:text-text-primary"
              onClick={() => setWriteOwn((v) => !v)}
            >
              {writeOwn ? "Use a dictionary meaning" : "Write my own definition instead"}
            </button>
          </>
        )}

        {!typing && !existing && status === "failed" && (
          <div className="flex items-start gap-2 text-sm text-text-secondary">
            <Icon name={lookup?.reason === "offline" ? "wifiOff" : "alert"} size={16} className="mt-0.5 text-warning" />
            <p className="m-0 flex-1">
              {lookup?.message} You can still save it with your own definition, or leave it empty for now.
              {lookup?.reason !== "not_found" && (
                <button type="button" className="ml-1 font-medium text-text-primary underline" onClick={retry}>
                  Try again
                </button>
              )}
            </p>
          </div>
        )}
      </div>

      {!existing && validation.ok && !typing && status !== "loading" && (
        <div className="mt-3 space-y-3">
          {useOwn && (
            <label className="block">
              <span className="mb-1.5 block text-sm text-text-secondary">Definition (optional)</span>
              <textarea
                className="input min-h-20 resize-y"
                value={ownDefinition}
                onChange={(e) => setOwnDefinition(e.target.value)}
                rows={3}
              />
            </label>
          )}
          <label className="block">
            <span className="mb-1.5 block text-sm text-text-secondary">Note (optional)</span>
            <textarea className="input min-h-16 resize-y" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </label>
        </div>
      )}

      {error && (
        <p role="alert" className="m-0 mt-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!validation.ok || Boolean(existing) || typing || status === "loading" || saving}
        >
          {saving ? "Saving…" : "Save word"}
        </button>
      </div>
    </form>
  );
}
