import { useState } from "react";
import Modal from "./Modal";

/**
 * Confirmation dialog. `onConfirm` may be async; the dialog shows a busy state
 * and stays open (with the error) if it throws.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  danger = false,
  onConfirm,
  onCancel,
  children,
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const handleConfirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const handleClose = () => {
    if (busy) return;
    setError(null);
    onCancel();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      description={message}
      size="sm"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={`btn ${danger ? "btn-danger" : "btn-primary"}`}
            onClick={handleConfirm}
            disabled={busy}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </>
      }
    >
      {children}
      {error && (
        <p role="alert" className="m-0 mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </Modal>
  );
}
