/**
 * Turns a DOM selection inside the react-pdf-viewer text layer into a single word.
 * React-free (DOM only).
 *
 * PDF.js renders each text run as an absolutely positioned <span>. A single word can be split
 * across several spans (kerning, styling, per-glyph positioning), and line breaks have no
 * whitespace between spans. So we rebuild the page's text in reading order, inserting spaces
 * only where the geometry shows a real gap, then expand the selection to word boundaries.
 */
import { isWordChar, validateWord } from "./words.js";

const TEXT_LAYER = ".rpv-core__text-layer";
const PAGE_LAYER = '[data-testid^="core__page-layer-"]';

function closestElement(node, selector) {
  const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
  return element?.closest(selector) ?? null;
}

/** Resolve a (container, offset) boundary to a text node + offset within `layer`. */
function resolveBoundary(container, offset, textNodes, isEnd) {
  if (container.nodeType === Node.TEXT_NODE) {
    const index = textNodes.indexOf(container);
    return index === -1 ? null : { index, offset };
  }
  // Element boundary (e.g. after a double/triple click): a point between children.
  // comparePoint(node, 0) < 0 → the text node starts before the boundary.
  const point = document.createRange();
  point.setStart(container, offset);
  point.collapse(true);

  if (isEnd) {
    for (let i = textNodes.length - 1; i >= 0; i -= 1) {
      if (point.comparePoint(textNodes[i], 0) < 0) return { index: i, offset: textNodes[i].length };
    }
    return null;
  }
  for (let i = 0; i < textNodes.length; i += 1) {
    if (point.comparePoint(textNodes[i], 0) >= 0) return { index: i, offset: 0 };
  }
  return null;
}

/**
 * Rebuild the text of a page's text layer. Returns { text, starts } where starts[i] is the
 * offset of textNodes[i] in `text`.
 */
function buildLayerText(textNodes) {
  let text = "";
  const starts = [];
  let previousRect = null;

  textNodes.forEach((node) => {
    const rect = node.parentElement?.getBoundingClientRect();
    const content = node.data;

    if (previousRect && rect && text.length > 0) {
      const lineHeight = Math.max(4, Math.min(previousRect.height, rect.height));
      const sameLine = Math.abs(rect.top - previousRect.top) < lineHeight * 0.5;
      const gap = rect.left - previousRect.right;
      const prevChar = text[text.length - 1];
      const nextChar = content[0];
      const alreadySpaced = /\s/.test(prevChar ?? "") || /\s/.test(nextChar ?? "");

      if (!alreadySpaced) {
        if (sameLine) {
          // Small or negative gap → same word continued in another span.
          if (gap > lineHeight * 0.18) text += " ";
        } else if (prevChar === "-" && isWordChar(nextChar)) {
          // Hyphenated line break: drop the hyphen, join the halves.
          text = text.slice(0, -1);
        } else {
          // Big vertical gap or a change in font size (e.g. heading → body) = new paragraph.
          const verticalGap = rect.top - previousRect.bottom;
          const sizeRatio = Math.max(rect.height, previousRect.height) / Math.max(1, Math.min(rect.height, previousRect.height));
          text += verticalGap > lineHeight * 0.9 || sizeRatio > 1.25 ? "\n\n" : "\n";
        }
      }
    }

    starts.push(text.length);
    text += content;
    if (rect && rect.width > 0) previousRect = rect;
  });

  return { text, starts };
}

function sentenceAround(text, start, end) {
  const MAX = 220;
  // Sentences end at . ! ? and never cross a paragraph break.
  const PARAGRAPH = "\n\n";
  let from = start;
  while (
    from > 0 &&
    start - from < MAX &&
    !/[.!?]\s/.test(text.slice(from - 2, from)) &&
    text.slice(from - 2, from) !== PARAGRAPH
  ) {
    from -= 1;
  }
  let to = end;
  while (to < text.length && to - end < MAX && !/[.!?]/.test(text[to - 1] ?? "") && text.slice(to, to + 2) !== PARAGRAPH) {
    to += 1;
  }
  return text.slice(from, to).replace(/\s+/g, " ").trim();
}

/**
 * Analyse the current selection.
 * Returns null when there is no (non-collapsed) selection inside `root`, otherwise:
 *  { ok: true, word, page, sentence, rect }  or  { ok: false, reason, rect }
 */
export function readWordSelection(selection, root) {
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;

  const range = selection.getRangeAt(0);
  if (!root?.contains(range.commonAncestorContainer)) return null;

  const rect = range.getBoundingClientRect();
  const raw = selection.toString();
  if (!raw.trim()) return null;

  const startLayer = closestElement(range.startContainer, TEXT_LAYER);
  const endLayer = closestElement(range.endContainer, TEXT_LAYER);
  const layer = startLayer ?? endLayer;

  if (!layer) return { ok: false, reason: "no-text", rect };
  if (startLayer && endLayer && startLayer !== endLayer) return { ok: false, reason: "multiple", rect };

  const pageElement = layer.closest(PAGE_LAYER);
  const pageIndex = Number(pageElement?.getAttribute("data-testid")?.split("-").pop());
  const page = Number.isFinite(pageIndex) ? pageIndex + 1 : null;

  // Collect text nodes of this page's text layer in DOM (= reading) order.
  const walker = document.createTreeWalker(layer, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  if (!textNodes.length) return { ok: false, reason: "no-text", rect };

  const start = resolveBoundary(range.startContainer, range.startOffset, textNodes, false);
  const end = resolveBoundary(range.endContainer, range.endOffset, textNodes, true);

  // Fallback: geometry could not be resolved; validate the plain selection text.
  if (!start || !end) {
    const result = validateWord(raw);
    return result.ok ? { ok: true, word: result.word, page, sentence: "", rect } : { ok: false, reason: result.reason, rect };
  }

  const { text, starts } = buildLayerText(textNodes);
  let from = starts[start.index] + start.offset;
  let to = starts[end.index] + end.offset;
  if (to < from) [from, to] = [to, from];

  // Trim punctuation/whitespace the user included at the edges.
  while (from < to && !isWordChar(text[from])) from += 1;
  while (to > from && !isWordChar(text[to - 1])) to -= 1;
  if (from === to) return { ok: false, reason: "not-a-word", rect };

  const selected = text.slice(from, to);
  if (/\s/.test(selected)) return { ok: false, reason: "multiple", rect };

  // Expand a partial selection ("famil" in "unfamiliar") to the whole word.
  while (from > 0 && isWordChar(text[from - 1])) from -= 1;
  while (to < text.length && isWordChar(text[to])) to += 1;

  const result = validateWord(text.slice(from, to));
  if (!result.ok) return { ok: false, reason: result.reason, rect };

  return { ok: true, word: result.word, page, sentence: sentenceAround(text, from, to), rect };
}
