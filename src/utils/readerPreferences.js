// Reader display preferences: validation, defaults and (de)serialisation. React-free.

export const THEMES = ["paper", "sepia", "night"];
export const READING_MODES = ["continuous", "pages"];
export const DIRECTIONS = ["vertical", "horizontal"];
export const ZOOM_PRESETS = ["page-width", "page-fit", "1", "1.5"];
export const PINCH_MODES = ["sharp", "browser"];

export const PREFERENCES_KEY = "voca.reader.prefs";
const LEGACY_SCROLL_MODE_KEY = "voca.reader.scrollMode";

export const DEFAULT_PREFERENCES = {
  theme: "paper",
  mode: "pages", // page by page by default
  direction: "vertical",
  zoom: null, // null = device default (fit width on small screens, 125 % on desktop)
  pinch: "sharp",
};

const pick = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback);

/** Coerces anything (old versions, hand-edited storage) into valid preferences. */
export function sanitizePreferences(raw) {
  const p = raw && typeof raw === "object" ? raw : {};
  return {
    theme: pick(p.theme, THEMES, DEFAULT_PREFERENCES.theme),
    mode: pick(p.mode, READING_MODES, DEFAULT_PREFERENCES.mode),
    direction: pick(p.direction, DIRECTIONS, DEFAULT_PREFERENCES.direction),
    zoom: pick(p.zoom, ZOOM_PRESETS, DEFAULT_PREFERENCES.zoom),
    pinch: pick(p.pinch, PINCH_MODES, DEFAULT_PREFERENCES.pinch),
  };
}

/** Reads preferences from a Storage-like object; migrates the old scroll-direction key. */
export function loadPreferences(storage) {
  try {
    const stored = storage?.getItem(PREFERENCES_KEY);
    if (stored) return sanitizePreferences(JSON.parse(stored));
    const legacy = storage?.getItem(LEGACY_SCROLL_MODE_KEY);
    // Someone who chose a scroll direction in the old reader keeps scrolling that way.
    if (legacy) return sanitizePreferences({ mode: "continuous", direction: legacy === "Horizontal" ? "horizontal" : "vertical" });
  } catch {
    // Corrupt JSON or storage blocked: fall back to defaults.
  }
  return { ...DEFAULT_PREFERENCES };
}

export function savePreferences(storage, preferences) {
  try {
    storage?.setItem(PREFERENCES_KEY, JSON.stringify(sanitizePreferences(preferences)));
    return true;
  } catch {
    return false;
  }
}

/**
 * Maps preferences to the viewer's ScrollMode name ("Vertical" | "Horizontal" | "Page").
 * Kept as plain strings so this module doesn't import the viewer.
 */
export function scrollModeFor(preferences) {
  if (preferences.mode === "pages") return "Page";
  return preferences.direction === "horizontal" ? "Horizontal" : "Vertical";
}
