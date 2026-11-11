// The prayers' scroll: the phone's own, a click as each new prayer arrives,
// each prayer counted as it is passed, and saving one prayer from a long hold
// (1.9, build 89 note 7, his "ok to all" of 2026-11-10).
//
// His words then: "a new scroll system implemented ... it's called Easy Scroll
// ... It pretty much helps you scroll to the next section easily, and it with
// like an easy swipe ... and also add a haptic feedback when they scroll to
// each section", and "I don't like the bookmark button just being there in
// every single individual prayer". Easy Scroll snapped the page with the
// browser's own scroll snapping, by the verse from build 90 note 6. Build 93
// note 2: "When I try and scroll down, it scrolls back up. When I try and
// scroll down, it just keeps on scrolling." Measured on the export with real
// touch at 360, 390 and 820, the snapping moved the page after the finger let
// go: a fling pulled back up 65 to 66px, a flick run on 29 to 273px where the
// phone's own momentum ends at 24 to 30px, a slow drag held still moved on 30
// to 73px. So the snapping is gone, and these hold that it stays gone and
// that the click, the lit verse and the counting stay (useEasyScroll.ts).
//
// vitest runs in node with no DOM: the sums are tested as sums, and the
// wiring as it is written.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { clicksFor, passedNow, prayerAt, type PassState } from "@/lib/prayers/easyScroll";

const root = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8").replace(/\r\n/g, "\n");
/** The code without its comments, so a note is not read as the page. */
const code = (p: string) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
const css = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");

const fresh = (): PassState => ({ seen: new Set(), told: new Set() });

describe("the click as each new prayer arrives at the reading place", () => {
  const steps = [
    { id: "psalm-89", top: 0, bottom: 900 },
    { id: "psalm-100", top: 920, bottom: 1400 },
  ];

  it("finds the prayer whose box holds the reading place, and none in a gap or past the end", () => {
    expect(prayerAt(steps, 10)).toBe("psalm-89");
    expect(prayerAt(steps, 899)).toBe("psalm-89");
    expect(prayerAt(steps, 910)).toBeNull();
    expect(prayerAt(steps, 920)).toBe("psalm-100");
    expect(prayerAt(steps, 1400)).toBeNull();
  });

  it("clicks once for each new prayer, never for another verse of the same one, and not for none", () => {
    expect(clicksFor(null, "psalm-89")).toBe(true);
    expect(clicksFor("psalm-89", "psalm-89")).toBe(false);
    expect(clicksFor("psalm-89", "psalm-100")).toBe(true);
    // Back up into the one before: a new arrival too.
    expect(clicksFor("psalm-100", "psalm-89")).toBe(true);
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

describe("the page, as it is written", () => {
  it("snaps nothing: the page scrolls as the phone does", () => {
    // No scroll snapping on the prayers, by any path: no switch on the root,
    // no rests, no edges, no rule in the stylesheet.
    expect(css).not.toMatch(/data-easy-scroll|data-verse-stop|data-verse-rests|data-snap-edge|--easy-place/);
    expect(css).not.toMatch(/\[data-prayer-reader\][^{]*\{[^}]*scroll-snap/);
    const hook = code("components/prayers/service/useEasyScroll.ts");
    expect(hook).not.toMatch(/data-easy-scroll|scrollsnapchange|scroll-snap|stopsOf|data-verse-stop/);
    for (const file of ["components/prayers/service/PrayerStep.tsx", "components/prayers/service/CommemorationStep.tsx", "components/prayers/PrayerRuleReader.tsx"]) {
      expect(code(file), file).not.toMatch(/data-verse-rests|data-snap-edge|data-snap-start/);
    }
    expect(code("lib/prayers/easyScroll.ts")).not.toMatch(/stopsOf|restsInside|holdsAFling|stepAtPlace/);
  });

  it("clicks as each new prayer reaches the reading place, read once a frame, never for the one the page opened on", () => {
    const hook = code("components/prayers/service/useEasyScroll.ts");
    expect(hook).toContain('window.addEventListener("scroll", onScroll, { passive: true });');
    expect(hook).toContain("if (!frame) frame = requestAnimationFrame(look);");
    expect(hook).toContain("const here = () => prayerAt(steps, window.scrollY + place);");
    expect(hook).toContain("if (!clicksFor(arrived, now)) return;");
    // The app's own scrolling click (lib/ui/scrollTicks.ts): inert in a browser.
    expect(hook).toContain("const click = handTicks();");
    expect(hook).toContain("arrived = here();");
    // Not motion: the click is felt with Purify's motion off too, and on any screen the apps run on.
    expect(hook).not.toMatch(/useReducedMotion|pointer: coarse/);
    expect(code("components/prayers/PrayerRuleReader.tsx")).toContain("useEasyScroll(article);");
  });

  it("asks nothing in Settings any more: the switch named a swipe that settles, which the page no longer does", () => {
    expect(code("components/settings/SettingsClient.tsx")).not.toContain("EasyScrollRow");
    for (const lang of ["en", "ar", "bg", "de", "el", "es", "fil", "fr", "hu", "id", "it", "ka", "ne", "pl", "pt", "ro", "ru", "sr", "tr", "uk", "ur"]) {
      const m = JSON.parse(read(`lib/i18n/messages/${lang}.json`)) as Record<string, string>;
      expect(m["settings.easyScroll"], lang).toBeUndefined();
      expect(m["settings.easyScrollHint"], lang).toBeUndefined();
    }
  });

  it("keeps the verse at the reading place lit, with or without motion's say", () => {
    const reader = code("components/prayers/PrayerRuleReader.tsx");
    expect(reader).toContain("useLitLine(article);");
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
