// What a finger on a verse means (lib/bible/verseGesture.ts, 1.9, build 88
// notes 1 and 2): the touch that stops a glide, and a finger the page moved
// under, are the scroll's, never a tap; neither counts towards a double tap;
// and a contextmenu that comes from a finger is the hold's.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  DOUBLE_TAP_MS,
  SCROLL_SETTLE_MS,
  isSecondTap,
  isTap,
  isTouchContextMenu,
  type TapAt,
  type TouchFacts,
} from "@/lib/bible/verseGesture";

const touch = (over: Partial<TouchFacts> = {}): TouchFacts => ({
  quick: true,
  startedAt: 10_000,
  lastScrollAt: 9_000,
  startScrollY: 1200,
  endScrollY: 1200,
  onControl: false,
  ...over,
});

describe("a tap on a verse", () => {
  it("is a quick touch on a still page, well after the last scroll", () => {
    expect(isTap(touch())).toBe(true);
  });

  it("is not the touch that stops a glide (it begins while the page is still scrolling)", () => {
    expect(isTap(touch({ lastScrollAt: 10_000 - 30 }))).toBe(false);
    expect(isTap(touch({ lastScrollAt: 10_000 - (SCROLL_SETTLE_MS - 1) }))).toBe(false);
    expect(isTap(touch({ lastScrollAt: 10_000 - (SCROLL_SETTLE_MS + 50) }))).toBe(true);
  });

  it("is not a finger held still while the page moved under it", () => {
    expect(isTap(touch({ endScrollY: 1240 }))).toBe(false);
    expect(isTap(touch({ endScrollY: 1201 }))).toBe(true);
  });

  it("is not a hold, a drag, or a touch on the verse's own buttons", () => {
    expect(isTap(touch({ quick: false }))).toBe(false);
    expect(isTap(touch({ onControl: true }))).toBe(false);
  });
});

describe("a double tap", () => {
  const first: TapAt = { t: 10_000, x: 120, y: 300 };

  it("is a second tap close in time and place", () => {
    expect(isSecondTap(first, { t: 10_000 + DOUBLE_TAP_MS - 1, x: 130, y: 305 })).toBe(true);
    expect(isSecondTap(first, { t: 10_000 + DOUBLE_TAP_MS + 1, x: 120, y: 300 })).toBe(false);
    expect(isSecondTap(first, { t: 10_100, x: 200, y: 300 })).toBe(false);
    expect(isSecondTap(null, first)).toBe(false);
  });

  it("never begins with the touch that stopped a glide: the tap after it selects, it does not highlight", () => {
    // As VerseRow keeps it: the last tap is remembered only when it was one.
    const stop = touch({ startedAt: 10_000, lastScrollAt: 9_980 });
    const last = isTap(stop) ? first : null;
    expect(last).toBeNull();
    expect(isSecondTap(last, { t: 10_200, x: 122, y: 301 })).toBe(false);
  });
});

describe("a contextmenu on a verse", () => {
  it("from a finger is the hold's; from a mouse it is the right-click menu's", () => {
    expect(isTouchContextMenu("touch", 99_999)).toBe(true);
    expect(isTouchContextMenu("pen", 99_999)).toBe(true);
    expect(isTouchContextMenu("mouse", 0)).toBe(false);
  });

  it("with no pointer type, is the hold's when it follows a touch", () => {
    expect(isTouchContextMenu(undefined, 450)).toBe(true);
    expect(isTouchContextMenu(undefined, 5_000)).toBe(false);
  });
});

describe("the verse row", () => {
  const src = fs.readFileSync(path.resolve(__dirname, "../../../components/bible/VerseRow.tsx"), "utf8");

  it("decides a tap, a double tap and a contextmenu by these rules, with the page's scroll watched", () => {
    expect(src).toContain('from "@/lib/bible/verseGesture"');
    expect(src).toMatch(/isTap\(\{\s*quick,/);
    expect(src).toContain("isSecondTap(lastTapRef.current, here)");
    expect(src).toMatch(/if \(isTouchContextMenu\(.*\)\) \{\s*e\.preventDefault\(\);\s*return;/);
    expect(src).toContain("useEffect(() => watchPageScroll(), [])");
    // The numbers live in one place.
    expect(src).not.toMatch(/const (DOUBLE_TAP_MS|DOUBLE_TAP_SLOP_PX|LONG_PRESS_MS|SCROLL_SLOP_PX) =/);
  });

  it("asks the contextmenu rule before anything else in the right-click menu", () => {
    const open = src.slice(src.indexOf("function openContextMenu("), src.indexOf("function closeContextMenu("));
    expect(open.indexOf("isTouchContextMenu(")).toBeGreaterThan(0);
    expect(open.indexOf("isTouchContextMenu(")).toBeLessThan(open.indexOf("window.getSelection()"));
  });
});
