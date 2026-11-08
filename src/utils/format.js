// Display helpers. React-free.

export function formatBytes(bytes) {
  if (!bytes) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 && unit > 0 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

export function formatRelativeDate(timestamp) {
  if (!timestamp) return "";
  const diff = Date.now() - timestamp;
  const day = 24 * 60 * 60 * 1000;
  if (diff < 60 * 1000) return "just now";
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)} min ago`;
  if (diff < day) return `${Math.floor(diff / 3600000)} h ago`;
  if (diff < 2 * day) return "yesterday";
  if (diff < 7 * day) return `${Math.floor(diff / day)} days ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** Stable small hash for picking a cover color from an id. */
export function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** 0–100, or null when unknown. */
export function readingPercent(progress) {
  if (!progress?.pageCount) return null;
  return Math.min(100, Math.round((progress.lastPage / progress.pageCount) * 100));
}
