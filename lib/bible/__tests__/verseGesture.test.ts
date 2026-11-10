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

// Build 90 note 10, his word: "when you double tap, it automatically
// highlights the last color you picked ... when you hold it down, then that
// window pops up." From 1.9's pick B a lone tap opened the window, which lay
// over the verse, so the second tap of a double tap landed on the window and
// never highlighted (on build 90's export a double tap on Matthew 1:4 opened
// its window and marked nothing).
describe("the verse's gestures (build 90 note 10)", () => {
  const src = fs.readFileSync(path.resolve(__dirname, "../../../components/bible/VerseRow.tsx"), "utf8");
  const between = (from: string, to: string) => src.slice(src.indexOf(from), src.indexOf(to, src.indexOf(from)));
  const touchEnd = between("function onWordsTouchEnd(", "function onWordsDoubleClick(");
  const touchStart = between("function onWordsTouchStart(", "function onWordsTouchMove(");

  it("opens nothing on a lone tap, and waits for nothing", () => {
    const lone = touchEnd.slice(touchEnd.indexOf("lastTapRef.current = here;"));
    expect(lone).toMatch(/lastTapRef\.current = here;\s*\/\/ A lone tap: nothing, at once\.\s*if \(!showTools\) return;/);
    expect(touchEnd).not.toContain("setShowTools(true)");
    expect(touchEnd).not.toMatch(/setTimeout/);
  });

  it("highlights in the colour picked last on the second tap", () => {
    expect(touchEnd).toMatch(/if \(isSecondTap\(lastTapRef\.current, here\)\) \{\s*lastTapRef\.current = null;[\s\S]*?quickHighlight\(\);\s*return;/);
    const quick = between("function quickHighlight(", "const bookmarks = useBookmarks();");
    expect(quick).toContain("const id = marked ? hl.id : lastHighlightColor();");
    expect(quick).toContain("softTick();");
    expect(quick).toContain("onQuickHighlight?.(");
  });

  it("opens the window on a hold", () => {
    expect(touchStart).toMatch(/pressTimerRef\.current = window\.setTimeout\(\(\) => \{\s*pressTimerRef\.current = null;\s*setShowTools\(true\);/);
    expect(touchStart).toContain("}, LONG_PRESS_MS);");
  });

  it("gives a screen reader and a keyboard one action to the window, out of sight until a keyboard lands on it", () => {
    expect(src).toMatch(/<button\s+type="button"\s+data-verse-door=""\s+className="verse-door md:hidden native-md-inline-flex"\s+onClick=\{\(\) => setShowTools\(true\)\}\s+data-mock-allow="target"\s+data-mock-why="[^"]+"\s*>\s*\{t\("bible\.verseActionsFor", \{ reference: reference\(\) \}\)\}/);
    const css = fs.readFileSync(path.resolve(__dirname, "../../../app/globals.css"), "utf8");
    const door = css.slice(css.indexOf(".verse-door {"), css.indexOf("}", css.indexOf(".verse-door:focus-visible {")) + 1);
    // Always out of the page's flow, so landing on it moves nothing.
    expect(door).toMatch(/\.verse-door \{\s*position: absolute;/);
    expect(door).toMatch(/\.verse-door:focus-visible \{[\s\S]*min-height: 44px;[\s\S]*clip-path: none;/);
    expect(door).not.toMatch(/position: (static|relative)/);
    for (const lang of fs.readdirSync(path.resolve(__dirname, "../../i18n/messages")).filter((f) => f.endsWith(".json"))) {
      const m = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../i18n/messages", lang), "utf8"));
      expect(m["bible.verseActionsFor"], lang).toContain("{reference}");
    }
  });

  it("is told the same way wherever a reader is told how a verse opens", () => {
    const en = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../i18n/messages/en.json"), "utf8"));
    expect(en["tour.story.verse"]).toMatch(/^Double tap a verse to highlight it; hold it/);
    const entries = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../data/changelog/entries.json"), "utf8"));
    const nine = entries.find((e: { version: string }) => e.version === "1.9");
    const said = JSON.stringify(nine);
    expect(said).toContain("Hold a verse to open it");
    expect(said).not.toMatch(/\b[Tt]ap (a|any) verse\b|tap it to see its Greek/);
  });
});
