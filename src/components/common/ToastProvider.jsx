import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ToastContext } from "../../context/ToastContext";
import Icon from "./Icon";

const ICONS = { success: "check", error: "alert", info: "info" };
const COLORS = {
  success: "var(--color-success)",
  error: "var(--color-danger)",
  info: "var(--color-text-secondary)",
};

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
  }, []);

  const show = useCallback(
    (message, { type = "info", duration = 3500, action } = {}) => {
      const id = crypto.randomUUID();
      setToasts((list) => [...list.slice(-2), { id, message, type, action }]);
      timers.current.set(id, setTimeout(() => dismiss(id), duration));
      return id;
    },
    [dismiss]
  );

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => clearTimeout(timer));
  }, []);

  const value = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="toast-region pointer-events-none fixed inset-x-0 z-[100] flex flex-col items-center gap-2 px-4 md:inset-x-auto md:right-6 md:w-[26rem] md:items-end md:px-0"
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex w-full max-w-sm animate-slide-up items-center gap-3 rounded-xl border border-border-strong bg-surface-raised px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.5)] md:max-w-md"
          >
            <span style={{ color: COLORS[toast.type] }}>
              <Icon name={ICONS[toast.type]} size={18} />
            </span>
            <p className="m-0 flex-1 text-sm text-text-primary">{toast.message}</p>
            {toast.action && (
              <button
                type="button"
                className="btn btn-ghost min-h-8 px-2 text-text-primary"
                onClick={() => {
                  toast.action.onClick();
                  dismiss(toast.id);
                }}
              >
                {toast.action.label}
              </button>
            )}
            <button
              type="button"
              className="icon-btn h-8 w-8"
              aria-label="Dismiss notification"
              onClick={() => dismiss(toast.id)}
            >
              <Icon name="x" size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
