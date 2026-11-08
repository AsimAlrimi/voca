import { useSyncExternalStore } from "react";

/**
 * The part of the page that is actually visible, in layout-viewport CSS px.
 * Differs from the layout viewport when the user pinch-zooms (scale > 1) or when
 * the on-screen keyboard is open (smaller height).
 *
 * { left, top, width, height, scale, layoutHeight }
 */
let cached = null;
let cachedKey = "";

function read() {
  const vv = window.visualViewport;
  const layoutHeight = document.documentElement.clientHeight || window.innerHeight;
  const next = vv
    ? { left: vv.offsetLeft, top: vv.offsetTop, width: vv.width, height: vv.height, scale: vv.scale || 1, layoutHeight }
    : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight, scale: 1, layoutHeight };
  const key = [next.left, next.top, next.width, next.height, next.scale, next.layoutHeight]
    .map((n) => Math.round(n * 100))
    .join(",");
  if (key !== cachedKey) {
    cachedKey = key;
    cached = next;
  }
  return cached;
}

function subscribe(onChange) {
  const vv = window.visualViewport;
  vv?.addEventListener("resize", onChange);
  vv?.addEventListener("scroll", onChange);
  window.addEventListener("resize", onChange);
  return () => {
    vv?.removeEventListener("resize", onChange);
    vv?.removeEventListener("scroll", onChange);
    window.removeEventListener("resize", onChange);
  };
}

const SERVER = { left: 0, top: 0, width: 0, height: 0, scale: 1, layoutHeight: 0 };

export default function useVisualViewport() {
  return useSyncExternalStore(subscribe, read, () => SERVER);
}

/** True when the page is pinch-zoomed noticeably. */
export function isPinchZoomed(viewport) {
  return viewport.scale > 1.05;
}
