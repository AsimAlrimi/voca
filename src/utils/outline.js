// PDF outline (table of contents) helpers. React-free.

export const MAX_OUTLINE_ITEMS = 400;
export const MAX_OUTLINE_DEPTH = 4;

/**
 * Flattens pdf.js outline nodes ({ title, dest, items }) into a list with nesting levels.
 * Empty titles are skipped; depth and size are capped so huge outlines stay usable.
 */
export function flattenOutline(nodes, level = 0, out = []) {
  for (const node of nodes ?? []) {
    if (out.length >= MAX_OUTLINE_ITEMS) break;
    const title = String(node?.title ?? "").replace(/\s+/g, " ").trim();
    if (title) out.push({ title, level, dest: node.dest ?? null });
    if (level + 1 < MAX_OUTLINE_DEPTH && node?.items?.length) flattenOutline(node.items, level + 1, out);
  }
  return out;
}

/**
 * Resolves outline destinations to 0-based page indexes using a pdf.js document.
 * Entries whose destination can't be resolved (external links, broken refs) are dropped.
 */
export async function resolveOutline(doc, items) {
  const resolved = await Promise.all(
    items.map(async (item) => {
      try {
        let dest = item.dest;
        if (typeof dest === "string") dest = await doc.getDestination(dest);
        if (!Array.isArray(dest) || dest.length === 0) return null;
        const target = dest[0];
        const pageIndex = typeof target === "number" ? target : await doc.getPageIndex(target);
        return Number.isInteger(pageIndex) && pageIndex >= 0 ? { ...item, pageIndex } : null;
      } catch {
        return null;
      }
    })
  );
  return resolved.filter(Boolean);
}

/** Index of the outline entry the reader is currently in (last entry starting at or before the page). */
export function currentOutlineIndex(items, pageIndex) {
  let current = -1;
  items.forEach((item, index) => {
    if (item.pageIndex <= pageIndex && (current === -1 || item.pageIndex >= items[current].pageIndex)) current = index;
  });
  return current;
}
