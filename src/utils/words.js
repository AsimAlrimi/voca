// Word helpers. React-free.

const LETTER = /[\p{L}\p{M}]/u;
const VALID_WORD = /^[\p{L}\p{M}]+(?:['-][\p{L}\p{M}]+)*$/u;
export const MAX_WORD_LENGTH = 45;

/** Canonical key used for duplicate detection: "Ephemeral" / "ephemeral " → "ephemeral". */
export function normalizeWord(word) {
  return String(word ?? "")
    .normalize("NFC")
    .replace(/[’‘]/g, "'")
    .replace(/[‐‑–]/g, "-")
    .trim()
    .toLowerCase();
}

export function isLetter(char) {
  return LETTER.test(char);
}

/** Letters, apostrophes and hyphens can be part of a word. */
export function isWordChar(char) {
  return char !== undefined && (LETTER.test(char) || char === "'" || char === "’" || char === "-" || char === "‐");
}

/**
 * Cleans a candidate word and checks it is a single word.
 * Returns { ok: true, word } or { ok: false, reason: "empty" | "multiple" | "not-a-word" | "too-long" }.
 */
export function validateWord(raw) {
  let text = String(raw ?? "")
    .normalize("NFC")
    .replace(/[’‘]/g, "'")
    .replace(/[‐‑]/g, "-")
    // Re-join words hyphenated across a line break: "unfa-\nmiliar" → "unfamiliar"
    .replace(/(\p{L})-\s*\n\s*(\p{L})/gu, "$1$2")
    .trim();

  // Strip surrounding punctuation/quotes/brackets/digits footnote markers.
  text = text.replace(/^[^\p{L}\p{M}]+/u, "").replace(/[^\p{L}\p{M}]+$/u, "");

  if (!text) return { ok: false, reason: "empty" };
  if (/\s/.test(text)) return { ok: false, reason: "multiple" };
  if (text.length > MAX_WORD_LENGTH) return { ok: false, reason: "too-long" };

  // Possessive: "author's" → "author" (only for longer words, so "it's"/"let's" stay intact)
  if (/'s$/i.test(text) && text.length > 5) text = text.slice(0, -2);

  if (!VALID_WORD.test(text)) return { ok: false, reason: "not-a-word" };
  return { ok: true, word: text };
}

export const SELECTION_MESSAGES = {
  empty: "Select a word to look it up.",
  multiple: "Select a single word — phrases aren't supported yet.",
  "not-a-word": "That selection isn't a word Voca can look up.",
  "too-long": "That selection is too long to be a single word.",
  "no-text": "This part of the PDF has no selectable text (it may be a scanned image).",
};

/** Likely base forms for an inflected word, tried when the exact word isn't in the dictionary. */
export function candidateBaseForms(word) {
  const w = word.toLowerCase();
  const forms = [];
  const push = (f) => {
    if (f.length >= 3 && f !== w && !forms.includes(f)) forms.push(f);
  };
  if (w.endsWith("ies")) push(w.slice(0, -3) + "y");
  if (w.endsWith("ied")) push(w.slice(0, -3) + "y");
  if (w.endsWith("es")) push(w.slice(0, -2));
  if (w.endsWith("s") && !w.endsWith("ss")) push(w.slice(0, -1));
  if (w.endsWith("ed")) {
    push(w.slice(0, -1)); // "used" → "use"
    push(w.slice(0, -2)); // "walked" → "walk"
    if (/(.)\1ed$/.test(w)) push(w.slice(0, -3)); // "stopped" → "stop"
  }
  if (w.endsWith("ing")) {
    push(w.slice(0, -3) + "e"); // "making" → "make"
    push(w.slice(0, -3)); // "reading" → "read"
    if (/(.)\1ing$/.test(w)) push(w.slice(0, -4)); // "running" → "run"
  }
  if (w.endsWith("ly")) push(w.slice(0, -2));
  return forms.slice(0, 3);
}
