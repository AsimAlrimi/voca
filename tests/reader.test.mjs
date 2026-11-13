import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_PREFERENCES,
  PREFERENCES_KEY,
  loadPreferences,
  sanitizePreferences,
  savePreferences,
  scrollModeFor,
} from "../src/utils/readerPreferences.js";
import { clampZoom, focalScroll, isTap, pinchScale, swipeDirection, tapZone, zoomStep } from "../src/utils/readerGestures.js";
import { currentOutlineIndex, flattenOutline, resolveOutline } from "../src/utils/outline.js";
import { createId } from "../src/utils/id.js";

const memoryStorage = (initial = {}) => {
  const data = { ...initial };
  return { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => (data[k] = String(v)), data };
};

// ── Preferences ────────────────────────────────────────────────────────────
test("preferences: defaults, invalid values replaced, round trip", () => {
  assert.deepEqual(loadPreferences(memoryStorage()), DEFAULT_PREFERENCES);
  assert.deepEqual(sanitizePreferences({ theme: "neon", mode: "pages", zoom: "3" }), {
    ...DEFAULT_PREFERENCES,
    mode: "pages",
  });
  const storage = memoryStorage();
  savePreferences(storage, { theme: "night", mode: "pages", direction: "horizontal", zoom: "1.5", pinch: "browser" });
  assert.deepEqual(loadPreferences(storage), {
    theme: "night",
    mode: "pages",
    direction: "horizontal",
    zoom: "1.5",
    pinch: "browser",
  });
});

test("preferences: corrupt JSON → defaults; old scroll-direction key migrated", () => {
  assert.deepEqual(loadPreferences(memoryStorage({ [PREFERENCES_KEY]: "{oops" })), DEFAULT_PREFERENCES);
  assert.equal(loadPreferences(memoryStorage({ "voca.reader.scrollMode": "Horizontal" })).direction, "horizontal");
  assert.equal(loadPreferences({ getItem: () => { throw new Error("blocked"); } }).theme, "paper");
});

test("preferences → viewer scroll mode", () => {
  assert.equal(scrollModeFor({ mode: "continuous", direction: "vertical" }), "Vertical");
  assert.equal(scrollModeFor({ mode: "continuous", direction: "horizontal" }), "Horizontal");
  assert.equal(scrollModeFor({ mode: "pages", direction: "horizontal" }), "Page");
});

// ── Gestures ───────────────────────────────────────────────────────────────
test("taps vs. drags/long-presses", () => {
  assert.equal(isTap({ dx: 3, dy: 2, duration: 120 }), true);
  assert.equal(isTap({ dx: 30, dy: 0, duration: 120 }), false, "drag");
  assert.equal(isTap({ dx: 0, dy: 0, duration: 800 }), false, "long-press (text selection)");
});

test("tap zones: edges turn pages, middle opens the menu", () => {
  assert.equal(tapZone(20, 390), "previous");
  assert.equal(tapZone(195, 390), "menu");
  assert.equal(tapZone(370, 390), "next");
  assert.equal(tapZone(10, 0), "menu");
});

test("swipes: direction, thresholds, and zoomed pages scroll before turning", () => {
  assert.equal(swipeDirection({ dx: -120, dy: 10, duration: 250 }), "next");
  assert.equal(swipeDirection({ dx: 120, dy: 10, duration: 250 }), "previous");
  assert.equal(swipeDirection({ dx: -30, dy: 0, duration: 200 }), null, "too short");
  assert.equal(swipeDirection({ dx: -120, dy: 140, duration: 200 }), null, "mostly vertical");
  assert.equal(swipeDirection({ dx: -200, dy: 0, duration: 1500 }), null, "too slow (selection drag)");
  assert.equal(swipeDirection({ dx: -120, dy: 0, duration: 200 }, { atRightEdge: false }), null, "zoomed page still scrolling");
  assert.equal(swipeDirection({ dx: 120, dy: 0, duration: 200 }, { atLeftEdge: false }), null);
});

test("pinch zoom math", () => {
  assert.equal(pinchScale(1, 100, 200), 2);
  assert.equal(pinchScale(1, 100, 10), 0.5, "clamped to minimum");
  assert.equal(pinchScale(2, 100, 400), 4, "clamped to maximum");
  assert.equal(clampZoom(9), 4);
  // Content point under the fingers stays put: scroll 100, finger at 50 → point 150 → 300 after 2×
  assert.equal(focalScroll(100, 50, 2), 250);
  assert.equal(focalScroll(0, 10, 0.5), 0, "never negative");
});

test("zoom steps from any scale (incl. fit-width values like 1.37)", () => {
  assert.equal(zoomStep(1, 1), 1.1);
  assert.equal(zoomStep(1.37, 1), 1.5);
  assert.equal(zoomStep(1.37, -1), 1.25);
  assert.equal(zoomStep(4, 1), 4);
  assert.equal(zoomStep(0.5, -1), 0.5);
});

// ── Outline ────────────────────────────────────────────────────────────────
const OUTLINE = [
  { title: "Chapter 1", dest: [{ num: 1 }], items: [{ title: "  Section 1.1 ", dest: "sec11", items: [] }] },
  { title: "", dest: [0], items: [] },
  { title: "Chapter 2", dest: [{ num: 5 }], items: [] },
  { title: "Web link", dest: null, items: [] },
];

test("flattenOutline: levels, trimmed titles, empty titles skipped", () => {
  assert.deepEqual(
    flattenOutline(OUTLINE).map((i) => `${i.level}:${i.title}`),
    ["0:Chapter 1", "1:Section 1.1", "0:Chapter 2", "0:Web link"]
  );
});

test("resolveOutline: named and explicit destinations → page indexes; unresolvable dropped", async () => {
  const doc = {
    getDestination: async (name) => (name === "sec11" ? [{ num: 3 }] : null),
    getPageIndex: async (ref) => ({ 1: 0, 3: 2, 5: 6 })[ref.num],
  };
  const items = await resolveOutline(doc, flattenOutline(OUTLINE));
  assert.deepEqual(items.map((i) => [i.title, i.pageIndex]), [["Chapter 1", 0], ["Section 1.1", 2], ["Chapter 2", 6]]);
  assert.equal(currentOutlineIndex(items, 4), 1, "page 5 is inside Section 1.1");
  assert.equal(currentOutlineIndex(items, 6), 2);
  assert.equal(currentOutlineIndex([{ pageIndex: 3 }], 1), -1, "before the first chapter");
});

test("createId: uses randomUUID when available, valid v4 UUIDs on plain-HTTP pages", () => {
  assert.equal(createId({ randomUUID: () => "native" }), "native");
  const insecure = { getRandomValues: (a) => globalThis.crypto.getRandomValues(a) }; // no randomUUID
  const ids = new Set(Array.from({ length: 500 }, () => createId(insecure)));
  assert.equal(ids.size, 500, "unique");
  for (const id of ids) assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});
