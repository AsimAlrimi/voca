import Icon from "./Icon";

/** Shared loading / empty / error block. */
export default function StatusMessage({ type = "empty", icon, title, message, action }) {
  if (type === "loading") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-text-secondary" role="status">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-border-strong border-t-text-primary" />
        <p className="m-0 text-sm">{title || "Loading…"}</p>
      </div>
    );
  }

  const isError = type === "error";

  return (
    <div className="flex flex-col items-center justify-center px-4 py-14 text-center" role={isError ? "alert" : undefined}>
      <span
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface"
        style={{ color: isError ? "var(--color-danger)" : "var(--color-text-secondary)" }}
      >
        <Icon name={icon || (isError ? "alert" : "info")} size={22} />
      </span>
      {title && <p className="m-0 text-base font-medium text-text-primary">{title}</p>}
      {message && <p className="m-0 mt-1.5 max-w-sm text-sm leading-relaxed text-text-secondary">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
