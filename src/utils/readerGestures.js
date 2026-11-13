// Pure helpers for reader gestures (taps, swipes, pinch). React- and DOM-free.

export const TAP_MAX_MOVE = 10; // px
export const TAP_MAX_MS = 350;
export const EDGE_ZONE = 0.22; // left/right 22 % of the width turn pages in Pages mode
export const SWIPE_MIN_DISTANCE = 50; // px
export const SWIPE_MAX_MS = 700;
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 4;

/** A pointer interaction counts as a tap when it is short and barely moves. */
export function isTap({ dx, dy, duration }) {
  return Math.hypot(dx, dy) <= TAP_MAX_MOVE && duration <= TAP_MAX_MS;
}

/** Which zone of the reading area a tap landed in: "previous" | "menu" | "next". */
export function tapZone(x, width, edge = EDGE_ZONE) {
  if (width <= 0) return "menu";
  const ratio = x / width;
  if (ratio < edge) return "previous";
  if (ratio > 1 - edge) return "next";
  return "menu";
}

/**
 * Horizontal swipe → "next" | "previous" | null.
 * Must be mostly horizontal, long enough and quick enough. When the page itself can scroll
 * sideways (zoomed in), the swipe only turns the page once that scroll is at its edge.
 */
export function swipeDirection({ dx, dy, duration }, { atLeftEdge = true, atRightEdge = true } = {}) {
  if (duration > SWIPE_MAX_MS) return null;
  if (Math.abs(dx) < SWIPE_MIN_DISTANCE) return null;
  if (Math.abs(dx) < Math.abs(dy) * 1.5) return null;
  if (dx < 0) return atRightEdge ? "next" : null;
  return atLeftEdge ? "previous" : null;
}

export function clampZoom(scale, min = MIN_ZOOM, max = MAX_ZOOM) {
  return Math.min(max, Math.max(min, scale));
}

/** New zoom after a pinch from `startDistance` to `distance` fingers apart. */
export function pinchScale(startScale, startDistance, distance) {
  if (!startDistance || !distance) return startScale;
  return clampZoom(startScale * (distance / startDistance));
}

/**
 * Scroll offset that keeps the content point under the fingers (`focal`, relative to the
 * scroll container) in place after zooming by `ratio`.
 */
export function focalScroll(scroll, focal, ratio) {
  return Math.max(0, (scroll + focal) * ratio - focal);
}

export const ZOOM_STEPS = [0.5, 0.67, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4];

/** Next zoom level up (direction 1) or down (-1) from the current scale. */
export function zoomStep(scale, direction) {
  if (direction > 0) return ZOOM_STEPS.find((step) => step > scale + 0.01) ?? ZOOM_STEPS[ZOOM_STEPS.length - 1];
  return [...ZOOM_STEPS].reverse().find((step) => step < scale - 0.01) ?? ZOOM_STEPS[0];
}
