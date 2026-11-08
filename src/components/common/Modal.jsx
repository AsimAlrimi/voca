import { useEffect, useRef } from "react";
import Icon from "./Icon";

/**
 * Accessible modal built on the native <dialog> element (focus trap, Esc, inert background).
 * Bottom sheet on mobile, centered card on desktop.
 */
export default function Modal({ open, onClose, title, description, children, footer, size = "md" }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Native "cancel" (Esc) → route through onClose so parent state stays in sync.
  const handleCancel = (event) => {
    event.preventDefault();
    onClose?.();
  };

  const handleBackdropClick = (event) => {
    if (event.target === dialogRef.current) onClose?.();
  };

  const width = size === "sm" ? "md:max-w-sm" : size === "lg" ? "md:max-w-xl" : "md:max-w-md";

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      aria-labelledby="modal-title"
      className={`m-0 mt-auto w-full max-w-none bg-transparent p-0 text-text-primary backdrop:bg-black/70 backdrop:backdrop-blur-[2px] md:m-auto ${width}`}
    >
      {open && (
        <div className="max-h-[85dvh] animate-slide-up overflow-y-auto rounded-t-2xl border border-border bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:rounded-2xl md:pb-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id="modal-title" className="m-0 text-base font-semibold">
                {title}
              </h2>
              {description && <p className="mt-1 text-sm text-text-secondary">{description}</p>}
            </div>
            <button type="button" className="icon-btn -mr-2 -mt-2" onClick={onClose} aria-label="Close">
              <Icon name="x" size={18} />
            </button>
          </div>
          {children}
          {footer && <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
