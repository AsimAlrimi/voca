import { useEffect, useRef } from "react";
import { clampZoom, focalScroll, isTap, swipeDirection, tapZone } from "../utils/readerGestures.js";

const PAGE_SCROLLER = ".rpv-core__inner-page-container--single";
const SCROLLER = ".rpv-core__inner-pages";
const DOUBLE_TAP_MS = 300;
// Mouse: wait to tell a click from a double-click (double-click selects a word on desktop).
// Touch selects words by long-press, so touch taps act immediately.
const MOUSE_TAP_DELAY_MS = 260;

function distance(a, b) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

/**
 * Reader gestures on `rootRef`:
 *  - tap → options.onTap("previous" | "menu" | "next")  (zone from the tap position)
 *  - horizontal swipe in Pages mode → options.onSwipe("previous" | "next")
 *  - two-finger pinch (when options.pinchEnabled) → live CSS preview, then
 *    options.onZoom(newScale) and a scroll correction that keeps the pinch point in place
 *  - Ctrl/⌘ + wheel (trackpad pinch on desktop) → options.onZoom(newScale)
 *
 * Text selection is protected: long-presses and drags are never taps, taps while text is
 * selected only clear the selection, and swipes never turn the page if text is selected.
 * `options` may change every render; the latest values are always used.
 */
export default function useReaderGestures(rootRef, options) {
  const latest = useRef(options);
  useEffect(() => {
    latest.current = options;
  });

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    let start = null;
    let pinch = null;
    let tapTimer = null;
    let lastTapAt = 0;
    let wheelTimer = null;
    let wheelScale = null;

    const selectionEmpty = () => {
      const s = window.getSelection();
      return !s || s.isCollapsed || !root.contains(s.anchorNode);
    };
    const scroller = () => root.querySelector(PAGE_SCROLLER) || root.querySelector(SCROLLER);
    const interactive = (target) => target?.closest?.("a, button, input, textarea, select, [role=dialog]");

    const handleTap = (x, target, delay) => {
      if (interactive(target)) return;
      const now = Date.now();
      if (delay > 0 && now - lastTapAt < DOUBLE_TAP_MS) {
        // Double-tap / double-click (word selection on desktop): not a tap.
        clearTimeout(tapTimer);
        lastTapAt = 0;
        return;
      }
      lastTapAt = now;
      clearTimeout(tapTimer);
      tapTimer = setTimeout(() => {
        if (!selectionEmpty()) return;
        const rect = root.getBoundingClientRect();
        latest.current.onTap?.(tapZone(x - rect.left, rect.width));
      }, delay);
    };

    // ── Touch ──────────────────────────────────────────────────────────────
    const beginPinch = (touches) => {
      const sc = scroller();
      const content = sc?.firstElementChild;
      if (!sc || !content) return;
      const rect = sc.getBoundingClientRect();
      const midX = (touches[0].clientX + touches[1].clientX) / 2 - rect.left;
      const midY = (touches[0].clientY + touches[1].clientY) / 2 - rect.top;
      pinch = {
        startDistance: distance(touches[0], touches[1]),
        startScale: latest.current.getScale(),
        ratio: 1,
        focal: { x: midX, y: midY },
        scroll: { left: sc.scrollLeft, top: sc.scrollTop },
        content,
      };
      content.style.transformOrigin = `${sc.scrollLeft + midX}px ${sc.scrollTop + midY}px`;
      content.style.willChange = "transform";
    };

    const endPinch = () => {
      const { content, startScale, ratio, focal, scroll } = pinch;
      pinch = null;
      content.style.transform = "";
      content.style.willChange = "";
      const target = clampZoom(startScale * ratio);
      if (Math.abs(target - startScale) < 0.02) return;
      const actualRatio = target / startScale;
      latest.current.onZoom?.(target);
      // After the viewer re-renders at the new scale, keep the pinch point under the fingers.
      setTimeout(() => {
        requestAnimationFrame(() => {
          const sc = scroller();
          if (!sc) return;
          sc.scrollLeft = focalScroll(scroll.left, focal.x, actualRatio);
          sc.scrollTop = focalScroll(scroll.top, focal.y, actualRatio);
        });
      }, 80);
    };

    const onTouchStart = (event) => {
      if (event.touches.length === 2 && latest.current.pinchEnabled) {
        start = null;
        clearTimeout(tapTimer);
        beginPinch(event.touches);
        return;
      }
      if (event.touches.length === 1) {
        const t = event.touches[0];
        start = { x: t.clientX, y: t.clientY, time: Date.now(), selectionEmpty: selectionEmpty(), target: event.target };
      } else {
        start = null;
      }
    };

    const onTouchMove = (event) => {
      // One finger moving sideways where the page can't scroll any further that way would
      // become the browser's "swipe to go back/forward" and close the book. Keep that gesture
      // for page turning instead. Never interferes while text is selected.
      if (!pinch && start && event.touches.length === 1 && event.cancelable) {
        const t = event.touches[0];
        const dx = t.clientX - start.x;
        const dy = t.clientY - start.y;
        if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) && start.selectionEmpty && selectionEmpty()) {
          const sc = scroller();
          const canScrollLeft = sc && sc.scrollLeft > 1;
          const canScrollRight = sc && sc.scrollLeft + sc.clientWidth < sc.scrollWidth - 1;
          if ((dx > 0 && !canScrollLeft) || (dx < 0 && !canScrollRight)) event.preventDefault();
        }
        return;
      }
      if (!pinch || event.touches.length < 2) return;
      event.preventDefault(); // we handle the pinch; stop the browser from zooming the page
      const d = distance(event.touches[0], event.touches[1]);
      const scale = clampZoom(pinch.startScale * (d / pinch.startDistance));
      pinch.ratio = scale / pinch.startScale;
      pinch.content.style.transform = `scale(${pinch.ratio})`;
    };

    const onTouchEnd = (event) => {
      if (pinch && event.touches.length < 2) {
        endPinch();
        return;
      }
      if (!start || event.touches.length > 0) return;
      const t = event.changedTouches[0];
      const gesture = { dx: t.clientX - start.x, dy: t.clientY - start.y, duration: Date.now() - start.time };
      const began = start;
      start = null;

      if (isTap(gesture)) {
        if (began.selectionEmpty) handleTap(t.clientX, began.target, 0);
        return;
      }
      if (latest.current.mode !== "pages" || !began.selectionEmpty || !selectionEmpty()) return;
      const sc = scroller();
      const edges = sc
        ? { atLeftEdge: sc.scrollLeft <= 1, atRightEdge: sc.scrollLeft + sc.clientWidth >= sc.scrollWidth - 1 }
        : undefined;
      const direction = swipeDirection(gesture, edges);
      if (direction) latest.current.onSwipe?.(direction);
    };

    const onTouchCancel = () => {
      if (pinch) {
        pinch.content.style.transform = "";
        pinch.content.style.willChange = "";
        pinch = null;
      }
      start = null;
    };

    // ── Mouse / pen ────────────────────────────────────────────────────────
    const onPointerDown = (event) => {
      if (event.pointerType === "touch" || event.button !== 0) return;
      start = { x: event.clientX, y: event.clientY, time: Date.now(), selectionEmpty: selectionEmpty(), target: event.target };
    };
    const onPointerUp = (event) => {
      if (event.pointerType === "touch" || !start) return;
      const gesture = { dx: event.clientX - start.x, dy: event.clientY - start.y, duration: Date.now() - start.time };
      const began = start;
      start = null;
      if (isTap(gesture) && began.selectionEmpty) handleTap(event.clientX, began.target, MOUSE_TAP_DELAY_MS);
    };

    // ── Ctrl/⌘ + wheel = trackpad pinch on desktop ─────────────────────────
    const onWheel = (event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault(); // keep the browser from zooming the whole app
      wheelScale = clampZoom((wheelScale ?? latest.current.getScale()) * Math.exp(-event.deltaY / 300));
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => {
        latest.current.onZoom?.(wheelScale);
        wheelScale = null;
      }, 120);
    };

    // iOS Safari: block its own page zoom while we handle pinch.
    const onGestureStart = (event) => {
      if (latest.current.pinchEnabled) event.preventDefault();
    };

    root.addEventListener("touchstart", onTouchStart, { passive: true });
    root.addEventListener("touchmove", onTouchMove, { passive: false });
    root.addEventListener("touchend", onTouchEnd, { passive: true });
    root.addEventListener("touchcancel", onTouchCancel, { passive: true });
    root.addEventListener("pointerdown", onPointerDown);
    root.addEventListener("pointerup", onPointerUp);
    root.addEventListener("wheel", onWheel, { passive: false });
    root.addEventListener("gesturestart", onGestureStart);

    return () => {
      clearTimeout(tapTimer);
      clearTimeout(wheelTimer);
      root.removeEventListener("touchstart", onTouchStart);
      root.removeEventListener("touchmove", onTouchMove);
      root.removeEventListener("touchend", onTouchEnd);
      root.removeEventListener("touchcancel", onTouchCancel);
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("pointerup", onPointerUp);
      root.removeEventListener("wheel", onWheel);
      root.removeEventListener("gesturestart", onGestureStart);
    };
  }, [rootRef]);
}
