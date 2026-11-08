// Popover placement next to a text selection. Pure function, React- and DOM-free.
//
// All coordinates are in *layout viewport* CSS pixels — the space used by
// getBoundingClientRect() and position: fixed. When the page is pinch-zoomed
// (mobile Safari/Chrome, trackpad pinch), only part of the layout viewport is
// visible: that part is the *visual viewport*, given here as `viewport`.

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/**
 * @param {{left:number, top:number, right:number, bottom:number, width:number, height:number}} anchor
 *   Selection rectangle (layout px).
 * @param {{left:number, top:number, width:number, height:number}} viewport
 *   Visible area (layout px), e.g. from window.visualViewport (offsetLeft/offsetTop/width/height).
 * @param {{width:number, height:number}} panel  Panel size in layout px.
 * @param {object} [options]
 * @param {number} [options.gap]       Space between word and panel (layout px).
 * @param {number} [options.margin]    Minimum distance from the visible edges (layout px).
 * @param {number} [options.topInset]  Layout y the panel must stay below (e.g. bottom of a toolbar).
 * @param {number} [options.minUsable] Minimum height worth showing above/below before trying the sides.
 * @returns {{left:number, top:number, maxHeight:number, placement:"below"|"above"|"right"|"left"}}
 */
export function placePopover(anchor, viewport, panel, options = {}) {
  const { gap = 10, margin = 12, topInset = viewport.top, minUsable = 200 } = options;

  const minX = viewport.left + margin;
  const maxX = viewport.left + viewport.width - margin;
  const minY = Math.max(viewport.top, topInset) + margin;
  const maxY = viewport.top + viewport.height - margin;

  // If the word has been panned partly out of view, keep the panel inside the visible area.
  const a = {
    left: clamp(anchor.left, minX, maxX),
    right: clamp(anchor.right, minX, maxX),
    top: clamp(anchor.top, minY, maxY),
    bottom: clamp(anchor.bottom, minY, maxY),
  };
  const centerX = (a.left + a.right) / 2;
  const centeredLeft = clamp(centerX - panel.width / 2, minX, maxX - panel.width);

  const spaceBelow = maxY - (a.bottom + gap);
  const spaceAbove = a.top - gap - minY;
  const needed = Math.min(panel.height, minUsable);

  if (spaceBelow >= needed && (spaceBelow >= panel.height || spaceBelow >= spaceAbove)) {
    return { left: centeredLeft, top: a.bottom + gap, maxHeight: spaceBelow, placement: "below" };
  }
  if (spaceAbove >= needed) {
    const height = Math.min(panel.height, spaceAbove);
    return { left: centeredLeft, top: a.top - gap - height, maxHeight: spaceAbove, placement: "above" };
  }

  // Not enough room above or below: try beside the word.
  const fullHeight = maxY - minY;
  const height = Math.min(panel.height, fullHeight);
  const sideTop = clamp((a.top + a.bottom) / 2 - height / 2, minY, maxY - height);
  if (maxX - (a.right + gap) >= panel.width) {
    return { left: a.right + gap, top: sideTop, maxHeight: fullHeight, placement: "right" };
  }
  if (a.left - gap - minX >= panel.width) {
    return { left: a.left - gap - panel.width, top: sideTop, maxHeight: fullHeight, placement: "left" };
  }

  // Tiny visible area: use the larger vertical space, scrolling inside the panel.
  if (spaceBelow >= spaceAbove) {
    return { left: centeredLeft, top: a.bottom + gap, maxHeight: Math.max(spaceBelow, 0), placement: "below" };
  }
  const aboveHeight = Math.min(panel.height, Math.max(spaceAbove, 0));
  return { left: centeredLeft, top: a.top - gap - aboveHeight, maxHeight: Math.max(spaceAbove, 0), placement: "above" };
}
