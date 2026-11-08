import { useState } from "react";
import Modal from "../common/Modal";

export default function GoToPageDialog({ open, currentPage, pageCount, onGo, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Go to page" size="sm">
      {/* Keyed so the field resets to the current page each time it opens. */}
      {open && <GoToPageForm key={currentPage} currentPage={currentPage} pageCount={pageCount} onGo={onGo} onClose={onClose} />}
    </Modal>
  );
}

function GoToPageForm({ currentPage, pageCount, onGo, onClose }) {
  const [value, setValue] = useState(String(currentPage));
  const page = Number(value);
  const valid = Number.isInteger(page) && page >= 1 && page <= pageCount;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!valid) return;
    onGo(page);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit}>
      <label className="block">
        <span className="mb-1.5 block text-sm text-text-secondary">Page number (1–{pageCount})</span>
        <input
          className="input"
          type="number"
          inputMode="numeric"
          min={1}
          max={pageCount}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          aria-invalid={!valid}
        />
      </label>
      {!valid && value !== "" && (
        <p className="m-0 mt-1.5 text-xs text-danger">Enter a page between 1 and {pageCount}.</p>
      )}
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={!valid}>
          Go
        </button>
      </div>
    </form>
  );
}
