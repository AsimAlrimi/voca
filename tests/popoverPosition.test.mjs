import test from "node:test";
import assert from "node:assert/strict";
import { placePopover } from "../src/utils/popoverPosition.js";

const rect = (left, top, width = 60, height = 16) => ({ left, top, width, height, right: left + width, bottom: top + height });
const overlaps = (pos, panel, a) =>
  !(pos.left + panel.width <= a.left || pos.left >= a.right || pos.top + Math.min(panel.height, pos.maxHeight) <= a.top || pos.top >= a.bottom);
const inside = (pos, panel, vp) =>
  pos.left >= vp.left - 0.01 &&
  pos.left + panel.width <= vp.left + vp.width + 0.01 &&
  pos.top >= vp.top - 0.01 &&
  pos.top + Math.min(panel.height, pos.maxHeight) <= vp.top + vp.height + 0.01;

const DESKTOP = { left: 0, top: 0, width: 1280, height: 860 };
const PANEL = { width: 360, height: 400 };

test("below the word when there is room, horizontally centred on it", () => {
  const a = rect(500, 150);
  const pos = placePopover(a, DESKTOP, PANEL, { topInset: 56 });
  assert.equal(pos.placement, "below");
  assert.equal(pos.top, a.bottom + 10);
  assert.equal(pos.left, 530 - 180);
  assert.ok(!overlaps(pos, PANEL, a) && inside(pos, PANEL, DESKTOP));
});

test("above the word near the bottom of the screen", () => {
  const a = rect(500, 760);
  const pos = placePopover(a, DESKTOP, PANEL, { topInset: 56 });
  assert.equal(pos.placement, "above");
  assert.ok(!overlaps(pos, PANEL, a) && inside(pos, PANEL, DESKTOP));
});

test("beside the word when neither above nor below fits", () => {
  const short = { left: 0, top: 0, width: 1280, height: 420 };
  const a = rect(200, 200);
  const pos = placePopover(a, short, PANEL, { topInset: 56, minUsable: 300 });
  assert.equal(pos.placement, "right");
  assert.ok(!overlaps(pos, PANEL, a));
});

test("clamped inside the screen for words at the left/right edges", () => {
  for (const x of [2, 1240]) {
    const a = rect(x, 300, 30);
    const pos = placePopover(a, DESKTOP, PANEL, { topInset: 56 });
    assert.ok(inside(pos, PANEL, DESKTOP), `x=${x}`);
    assert.ok(!overlaps(pos, PANEL, a), `x=${x}`);
  }
});

test("never under the reader toolbar", () => {
  const a = rect(500, 500);
  const pos = placePopover(a, { left: 0, top: 0, width: 1280, height: 560 }, PANEL, { topInset: 56 });
  assert.ok(pos.top >= 56 + 12);
});

test("pinch-zoomed: placed inside the visible (visual) viewport, close to the word", () => {
  // Phone 390x844 zoomed 2.5x and panned to the middle of the page.
  const scale = 2.5;
  const vp = { left: 120, top: 300, width: 390 / scale, height: 844 / scale };
  const panel = { width: 360 / scale, height: 380 / scale }; // counter-scaled panel in layout px
  const a = rect(160, 340, 20, 6); // word near the top of the visible area
  const pos = placePopover(a, vp, panel, { gap: 10 / scale, margin: 12 / scale, topInset: 56, minUsable: 200 / scale });
  assert.ok(inside(pos, panel, vp), JSON.stringify(pos));
  assert.ok(!overlaps(pos, panel, a));
  assert.ok(Math.abs(pos.top - (a.bottom + 10 / scale)) < 1, "directly below the word");
});

test("pinch-zoomed with the word near the bottom of the visible area → above it", () => {
  const scale = 2;
  const vp = { left: 50, top: 400, width: 195, height: 422 };
  const panel = { width: 180, height: 170 };
  const a = rect(100, 780, 30, 8);
  const pos = placePopover(a, vp, panel, { gap: 5, margin: 6, topInset: 56, minUsable: 100 });
  assert.equal(pos.placement, "above");
  assert.ok(inside(pos, panel, vp) && !overlaps(pos, panel, a));
});

test("word panned out of view: panel still stays on screen", () => {
  const vp = { left: 0, top: 0, width: 390, height: 844 };
  const a = rect(500, 1200); // off-screen
  const pos = placePopover(a, vp, { width: 340, height: 300 }, { topInset: 56 });
  assert.ok(inside(pos, { width: 340, height: 300 }, vp));
});
