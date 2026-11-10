// Easy Scroll, each prayer counted as it is passed, and saving one prayer
// from a long hold (1.9, build 89 note 7, his "ok to all" of 2026-11-10).
//
// His words: "a new scroll system implemented ... it's called Easy Scroll ...
// It pretty much helps you scroll to the next section easily, and it with
// like an easy swipe ... and also add a haptic feedback when they scroll to
// each section", and "I don't like the bookmark button just being there in
// every single individual prayer". By the verse since build 90 note 6: "I
// noticed myself scrolling to another section when I just realistically want
// to scroll to the next verse or next bar within the same section". The sums
// are lib/prayers/easyScroll.ts;
// the gesture is the phone's own scroll snapping (app/globals.css, "Easy
// Scroll"), switched on by components/prayers/service/useEasyScroll.ts.
//
// vitest runs in node with no DOM: the sums are tested as sums, and the
// wiring as it is written.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { ON_PLACE_PX, clicksFor, holdsAFling, passedNow, restsInside, stepAtPlace, stopsOf, type PassState } from "@/lib/prayers/easyScroll";

const root = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8").replace(/\r\n/g, "\n");
/** The code without its comments, so a note is not read as the page. */
const code = (p: string) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
const css = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");

const fresh = (): PassState => ({ seen: new Set(), told: new Set() });

// Build 90 note 6, measured on the export (Android's engine, 390 by 844, The
// First Hour): a prayer rested only at its first line and, when taller than
// the screen, at its end at the foot. At that end the verse lit was 12, 14 or
// 15 of Psalm 89's 17, and from it 40 of 52 flicks carried the last verses
// off the screen into the next prayer. Now every verse rests.
describe("where a prayer rests (build 90 note 6)", () => {
  // 426px of room under the reading place, lines of 42px: the phone the export walk holds.
  const ROOM = 426;
  const LINE = 42;

  it("rests at every verse's start, a fling held at the first and the last", () => {
    const verses = [0, 120, 260, 380].map((top) => ({ top, height: 100, line: LINE }));
    const stops = stopsOf(verses, ROOM);
    expect(stops.filter((s) => s.kind !== "after").map((s) => s.at)).toEqual([0, 120, 260, 380]);
    expect(stops.map((s) => s.kind)).toEqual(["edge", "verse", "verse", "edge", "after"]);
    expect(stops.filter((s) => holdsAFling(s.kind)).map((s) => s.at)).toEqual([0, 380, 380 + LINE]);
  });

  it("keeps a last rest a line into the last verse, so a swipe carried over it lands there, not in the next prayer", () => {
    // From a one-line verse just before the last ("Lord, have mercy. (3x)" in the Trisagion,
    // which a gentle swipe carried into the Lord's Prayer when tried by hand).
    const stops = stopsOf([{ top: 0, height: 29, line: 29 }, { top: 36, height: 86, line: 29 }], ROOM);
    expect(stops).toEqual([
      { at: 0, kind: "edge" },
      { at: 36, kind: "edge" },
      { at: 36 + 29, kind: "after" },
    ]);
  });

  it("rests inside a verse taller than the room, a room less a line apart, the last with its end at the foot", () => {
    expect(restsInside(ROOM, ROOM, LINE)).toEqual([]);
    // The Lord's Prayer at the largest size, one unbroken verse of 546px.
    expect(restsInside(546, ROOM, LINE)).toEqual([120]);
    const rests = restsInside(1400, ROOM, LINE);
    expect(rests.at(-1)).toBe(1400 - ROOM);
    for (const [i, at] of rests.entries()) {
      const before = i === 0 ? 0 : rests[i - 1];
      // Never further apart than the room less a line: no words pass unseen at rest.
      expect(at - before).toBeLessThanOrEqual(ROOM - LINE);
      expect(at - before).toBeGreaterThan(0);
    }
  });

  it("holds the parts of a tall last verse, and makes its end the prayer's last rest", () => {
    const stops = stopsOf([{ top: 0, height: 100, line: LINE }, { top: 130, height: 1400, line: LINE }], ROOM);
    const kinds = stops.map((s) => s.kind);
    expect(kinds[0]).toBe("edge");
    expect(kinds[1]).toBe("edge");
    expect(kinds.at(-1)).toBe("after");
    expect(stops.at(-1)!.at).toBe(130 + 1400 - ROOM);
    expect(kinds.slice(2, -1).every((k) => k === "inside")).toBe(true);
  });

  it("gives a step with one verse its start and a rest a line in", () => {
    expect(stopsOf([{ top: 40, height: 33, line: 33 }], ROOM)).toEqual([
      { at: 40, kind: "edge" },
      { at: 73, kind: "after" },
    ]);
  });

  it("clicks once as each new prayer comes to rest, never for another verse of the same prayer", () => {
    expect(clicksFor(null, "psalm-89")).toBe(true);
    expect(clicksFor("psalm-89", "psalm-89")).toBe(false);
    expect(clicksFor("psalm-89", "psalm-100")).toBe(true);
    expect(clicksFor("psalm-89", null)).toBe(false);
  });
});

describe("each prayer counted as prayed as it is passed", () => {
  it("counts a prayer the reader moved down through, once", () => {
    const state = fresh();
    expect(passedNow([{ id: "a", bottom: 900 }, { id: "b", bottom: 1500 }], 300, state)).toEqual([]);
    // Scrolled on: the place is now below the first prayer's end.
    expect(passedNow([{ id: "a", bottom: 900 }, { id: "b", bottom: 1500 }], 1000, state)).toEqual(["a"]);
    expect(passedNow([{ id: "a", bottom: 900 }, { id: "b", bottom: 1500 }], 1100, state)).toEqual([]);
  });

  it("counts every prayer a fling passes, in order", () => {
    const state = fresh();
    const steps = [{ id: "a", bottom: 900 }, { id: "b", bottom: 1500 }, { id: "c", bottom: 2200 }];
    passedNow(steps, 300, state);
    expect(passedNow(steps, 2000, state)).toEqual(["a", "b"]);
  });

  it("does not count a prayer the page opened past (Your rule beginning further on)", () => {
    const state = fresh();
    const steps = [{ id: "a", bottom: 900 }, { id: "b", bottom: 1500 }, { id: "c", bottom: 2200 }];
    // The first look is already below the first two.
    expect(passedNow(steps, 1600, state)).toEqual([]);
    expect(passedNow(steps, 2300, state)).toEqual(["c"]);
  });

  it("takes nothing back, and counts nothing, on the way up", () => {
    const state = fresh();
    const steps = [{ id: "a", bottom: 900 }, { id: "b", bottom: 1500 }];
    passedNow(steps, 300, state);
    passedNow(steps, 1000, state);
    expect(passedNow(steps, 200, state)).toEqual([]);
    expect(state.told).toEqual(new Set(["a"]));
  });
});

describe("the prayer standing at the reading place", () => {
  it("is the one whose first line is within a few pixels of it", () => {
    const starts = [{ id: "a", top: -400 }, { id: "b", top: 302 }, { id: "c", top: 900 }];
    expect(stepAtPlace(starts, 300)).toBe("b");
    expect(stepAtPlace(starts, 302 + ON_PLACE_PX + 1)).toBeNull();
  });
});

describe("the page, as it is written", () => {
  it("switches the phone's own snapping on for a prayer page only, on a touch screen with motion on", () => {
    const hook = code("components/prayers/service/useEasyScroll.ts");
    expect(hook).toMatch(/if \(!root \|\| reduced \|\| !enabled \|\| typeof window === "undefined"\) return;/);
    expect(hook).toContain('window.matchMedia?.("(pointer: coarse)").matches');
    expect(hook).toContain('html.setAttribute(ATTR, "")');
    expect(hook).toContain("html.removeAttribute(ATTR)");
    // The click is the app's own scrolling click (lib/ui/scrollTicks.ts), once per prayer.
    expect(hook).toContain("handTicks()");
    expect(hook).toContain('document.addEventListener("scrollsnapchange", onSnap)');
    expect(hook).toContain('"onscrollsnapchange" in window');
    // A snap is measured inside the page's own scroll padding (72px at the
    // top): the export walk found every prayer settling 72px low without this.
    expect(hook).toContain("parseFloat(getComputedStyle(html).scrollPaddingTop)");
    expect(hook).toContain("`${Math.round(place - padTop)}px`");
    // Each prayer's rests, placed from one measure, written only when they moved.
    expect(hook).toContain("const stops = stopsOf(verses, room);");
    expect(hook).toContain("if (holder.dataset.sig === sig) continue;");
    expect(hook).toContain('mark.setAttribute("data-verse-stop", s.kind);');
    // Its own writes are not news to it.
    expect(hook).toContain("if (records.every((r) => (r.target as Element).closest?.(HOLDER))) return;");
    // The click: once per prayer.
    expect(hook).toContain("if (!clicksFor(arrived, id)) return;");
    // No prayer is a stop as a whole any more.
    expect(hook).not.toMatch(/--easy-start|data-tall|isTall/);
  });

  it("can be turned off in Settings, Reading, in every language's own words", () => {
    const reader = code("components/prayers/PrayerRuleReader.tsx");
    expect(reader).toContain("const easyOn = useEasyScrollOn();");
    expect(reader).toContain("useEasyScroll(article, { enabled: easyOn });");
    const settings = code("components/settings/SettingsClient.tsx");
    const reading = settings.slice(settings.indexOf('id="reading"'), settings.indexOf('id="calendar"'));
    expect(reading).toContain("<EasyScrollRow />");
    const row = code("components/settings/EasyScrollRow.tsx");
    expect(row).toContain('label={t("settings.easyScroll")}');
    expect(row).toContain('description={t("settings.easyScrollHint")}');
    expect(row).toContain("onChange={setEasyScroll}");
    const setting = code("lib/prayers/easyScrollSetting.ts");
    expect(setting).toContain('window.localStorage.getItem(EASY_SCROLL_KEY) !== "off"');
    for (const code of ["en", "ar", "bg", "de", "el", "es", "fil", "fr", "hu", "id", "it", "ka", "ne", "pl", "pt", "ro", "ru", "sr", "tr", "uk", "ur"]) {
      const m = JSON.parse(read(`lib/i18n/messages/${code}.json`)) as Record<string, string>;
      expect(m["settings.easyScroll"], code).toBeTruthy();
      expect(m["settings.easyScrollHint"], code).toBeTruthy();
      expect(m["settings.easyScrollHint"], code).not.toContain("\u2014");
      if (code !== "en") expect(m["settings.easyScrollHint"], code).not.toBe("On a prayer page, a short swipe settles on the next prayer.");
    }
  });

  it("rests at the marks, each verse's start at the reading place, a fling held at a prayer's edges", () => {
    const easy = css.slice(css.indexOf("@media (pointer: coarse) {\n html[data-easy-scroll]"));
    expect(easy).toMatch(/html\[data-easy-scroll\] \{\s*scroll-snap-type: y mandatory;/);
    expect(easy).toMatch(/\[data-prayer-reader\] \[data-verse-stop\] \{\s*scroll-snap-align: start;\s*scroll-margin-top: var\(--easy-place, 40vh\);/);
    expect(easy).toMatch(/:is\(\[data-verse-stop="edge"\], \[data-verse-stop="after"\]\) \{\s*scroll-snap-stop: always;/);
    // No prayer is a stop as a whole: a stop taller than the screen let the
    // page run free inside it, and that freedom ended short of its end.
    expect(css).not.toMatch(/\[data-step\][^{]*\{\s*scroll-snap-align/);
    expect(css).not.toMatch(/data-snap-end|data-tall/);
    expect(easy).toMatch(/\[data-snap-edge="top"\] \{\s*scroll-snap-align: start;\s*scroll-margin-top: 200vh;/);
    expect(easy).toMatch(/\[data-snap-edge="bottom"\] \{\s*scroll-snap-align: end;\s*scroll-margin-bottom: 200vh;/);
    // The marks stand out of the flow, so placing them moves nothing.
    expect(css).toMatch(/\[data-prayer-reader\] \[data-verse-rests\] \{\s*position: absolute;/);
    expect(css).toMatch(/\[data-prayer-reader\] \[data-verse-stop\] \{\s*position: absolute;/);
    // With Purify's motion off the page scrolls as any page.
    expect(css).toMatch(/html:where\(\[data-motion="reduce"\]\) \{[^}]*scroll-snap-type: none;/);
  });

  it("gives each prayer, and the names, a holder for its rests, and marks where each begins", () => {
    const step = code("components/prayers/service/PrayerStep.tsx");
    expect(step).toContain("{...(s === 0 && l === 0 ? snap : {})}");
    expect(step).toContain('<span aria-hidden data-verse-rests="" />');
    expect(step).toMatch(/className="relative scroll-mt-16/);
    expect(step).not.toContain("data-snap-end");
    // A step of words without lines (the examination) begins at its refrain
    // or its name: the export walk found it passed over before (2026-11-10).
    expect(step).toContain('const settlesOn: "line" | "refrain" | "title" = stanzas.length ? "line" : refrain ? "refrain" : "title";');
    expect(step).toContain('{...(settlesOn === "title" ? snap : {})}');
    expect(step).toContain('{...(settlesOn === "refrain" ? snap : {})}');
    const names = code("components/prayers/service/CommemorationStep.tsx");
    expect(names).toContain('data-snap-start=""');
    expect(names).toContain('<span aria-hidden data-verse-rests="" />');
    expect(names).not.toContain("data-snap-end");
    const reader = code("components/prayers/PrayerRuleReader.tsx");
    expect(reader).toContain('<span aria-hidden data-snap-edge="top" />');
    expect(reader).toContain('<span aria-hidden data-snap-edge="bottom" />');
    expect(reader).toContain("useEasyScroll(article, { enabled: easyOn });");
  });

  it("counts a passed prayer as prayed, read from the store at the moment, the names with the wall's", () => {
    const reader = code("components/prayers/PrayerRuleReader.tsx");
    expect(reader).toContain("usePassedSteps(article, passed, { ready: hydrated });");
    const fn = reader.slice(reader.indexOf("function passed(id: string)"), reader.indexOf("usePassedSteps(article"));
    expect(fn).toContain("const now = new Set(readSnap(rule.id).done);");
    expect(fn).toContain("persist(now);");
    expect(fn).toContain("markWallPrayed(list, wallIds)");
    expect(fn).toContain("rule.prayers.some((p) => p.id === id)");
  });

  it("saves one prayer from a long hold on its words, in the hold's own pill", () => {
    const step = code("components/prayers/service/PrayerStep.tsx");
    expect(step).toContain('{ "data-save-rule": where.ruleId, "data-save-prayer": where.prayerId, "data-save-title": title }');
    // Nothing to save on a step that is no prayer of the prayer book.
    expect(step).toContain("const save = bookmarkable ?");
    const pill = code("components/native/PressToCopy.tsx");
    expect(pill).toContain('block.closest<HTMLElement>("[data-save-prayer]")');
    expect(pill).toContain("togglePrayerBookmark(savable.ruleId, savable.prayerId, savable.title)");
    expect(pill).toContain("aria-pressed={saved}");
    expect(pill).toContain('t("prayers.reader.bookmarkPrayer")');
    expect(pill).toContain('t("study.saved.removeBookmark")');
    expect(pill).toContain("<Bookmark size={18} filled={saved} />");
  });
});
