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
// that the click, the lit verse and the counting stay (useLitLine.ts).
//
// Build 97 note 1, his words: "it should glow the quite in the middle of the
// users screen. and also the haptic feedback should move you and glow to the
// next section (rather than haptic feedback on a arbitrary feeling line with
// no visual hook)". The line lit is the one over the band's middle, and the
// click is decided in the same frame, from the same line: as the glow lands
// in a new prayer, which moving down is its first line. It had come from a
// measure of its own, as a prayer's box (its name and the room above it)
// reached two fifths down, while the glow was still on the prayer before.
//
// vitest runs in node with no DOM: the sums are tested as sums, and the
// wiring as it is written.

import fs, { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { LIT_FOOT, ON_PLACE_PX, clicksFor, lineAt, litShare, passedNow, type PassState } from "@/lib/prayers/easyScroll";
import { KEPT_AT, LIT_AT, READING_PLACE, placeIn } from "@/lib/ui/readingPlace";

const root = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8").replace(/\r\n/g, "\n");
/** The code without its comments, so a note is not read as the page. */
const code = (p: string) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
const css = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");

const fresh = (): PassState => ({ seen: new Set(), told: new Set() });

describe("the line lit over the band's middle, and the click in the same frame (build 97 note 1)", () => {
  // A phone's band, between the page's bar and the tab bar (as
  // lib/ui/__tests__/readingPlace.test.ts has it), and two prayers as the
  // page lays them out: each a name, then its lines.
  const BAND = { top: 76, bottom: 681 };
  const MIDDLE = placeIn(BAND, LIT_AT);
  const lines = [
    // Psalm 89: its name from 400 to 450, its lines below.
    { top: 460, step: "psalm-89" },
    { top: 500, step: "psalm-89" },
    { top: 540, step: "psalm-89" },
    // Psalm 100: its name from 600 to 660, its lines below.
    { top: 670, step: "psalm-100" },
    { top: 710, step: "psalm-100" },
  ];
  const tops = lines.map((l) => l.top);
  /** The page's top at each pixel of scroll, as the hook reads it each frame: the line lit and the click. */
  const walk = (ys: number[]) => {
    const frames: { y: number; at: number; click: boolean }[] = [];
    let reached: string | null = null;
    ys.forEach((y, i) => {
      const at = lineAt(tops, y + MIDDLE + ON_PLACE_PX);
      const now = at < 0 ? null : lines[at].step;
      const click = i > 0 && clicksFor(reached, now);
      if (now) reached = now;
      frames.push({ y, at, click });
    });
    return frames;
  };
  const down = Array.from({ length: 400 }, (_, y) => y);

  it("reads the line over the band's middle, his middle of the screen, not two fifths down", () => {
    expect(LIT_AT).toBe(KEPT_AT);
    expect(LIT_AT).not.toBe(READING_PLACE);
    // Mid-page the place is the middle, wherever the bars stand.
    expect(litShare(605, 5000)).toBe(LIT_AT);
    expect(placeIn(BAND, litShare(605, 5000))).toBeCloseTo((BAND.top + BAND.bottom) / 2);
  });

  it("slides the place down with the last lines near the foot, which could otherwise never rise to it", () => {
    expect(litShare(605, 605)).toBe(LIT_AT);
    expect(litShare(605, 302.5)).toBeCloseTo((LIT_AT + LIT_FOOT) / 2);
    expect(litShare(605, 0)).toBe(LIT_FOOT);
    expect(litShare(605, -20)).toBe(LIT_FOOT);
    expect(litShare(0, 0)).toBe(LIT_AT);
  });

  it("lights nothing above the first line, then the last line whose top is at or above the place", () => {
    expect(lineAt(tops, 459)).toBe(-1);
    expect(lineAt(tops, 460)).toBe(0);
    expect(lineAt(tops, 539)).toBe(1);
    // Psalm 100's name over the middle: the glow stays on Psalm 89's last line.
    expect(lineAt(tops, 630)).toBe(2);
    expect(lineAt(tops, 670)).toBe(3);
    expect(lineAt(tops, 9999)).toBe(4);
    expect(lineAt([], 10)).toBe(-1);
  });

  it("clicks in the frame the glow lands on each new prayer's first line, scrolling down a pixel at a time", () => {
    const frames = walk(down);
    const clicks = frames.filter((f) => f.click);
    expect(clicks.map((f) => lines[f.at].step)).toEqual(["psalm-89", "psalm-100"]);
    for (const f of clicks) {
      // The line lit in that frame is its prayer's first, its top just reached the middle.
      expect(lines.findIndex((l) => l.step === lines[f.at].step)).toBe(f.at);
      expect(lines[f.at].top - f.y).toBeLessThanOrEqual(MIDDLE + ON_PLACE_PX);
      expect(lines[f.at].top - f.y).toBeGreaterThan(MIDDLE + ON_PLACE_PX - 1);
    }
    // Where the old measure clicked, a prayer's box (its name) reaching two
    // fifths down, the glow had not moved: no click comes there now.
    const oldPlace = placeIn(BAND, READING_PLACE);
    const oldAt = Math.ceil(600 - oldPlace);
    expect(frames[oldAt].click).toBe(false);
    expect(lines[frames[oldAt].at].step).toBe("psalm-89");
  });

  it("clicks once back up, as the glow comes into the prayer before, and never twice in a row for one prayer", () => {
    const frames = walk([...down, ...down.slice().reverse(), ...down]);
    const clicks = frames.filter((f) => f.click).map((f) => lines[f.at].step);
    expect(clicks).toEqual(["psalm-89", "psalm-100", "psalm-89", "psalm-100"]);
    expect(clicksFor("psalm-89", "psalm-89")).toBe(false);
    expect(clicksFor("psalm-89", null)).toBe(false);
  });

  it("does not click for the prayer lit as the page opens", () => {
    const frames = walk([300, 301, 302]);
    expect(frames.some((f) => f.click)).toBe(false);
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
    const hook = code("components/prayers/service/useLitLine.ts");
    expect(hook).not.toMatch(/data-easy-scroll|scrollsnapchange|scroll-snap|stopsOf|data-verse-stop/);
    for (const file of ["components/prayers/service/PrayerStep.tsx", "components/prayers/service/CommemorationStep.tsx", "components/prayers/PrayerRuleReader.tsx"]) {
      expect(code(file), file).not.toMatch(/data-verse-rests|data-snap-edge|data-snap-start/);
    }
    expect(code("lib/prayers/easyScroll.ts")).not.toMatch(/stopsOf|restsInside|holdsAFling|stepAtPlace/);
  });

  it("clicks in the frame the line is lit, from the line lit, never for the one the page opened on (build 97 note 1)", () => {
    const hook = code("components/prayers/service/useLitLine.ts");
    expect(hook).toContain('window.addEventListener("scroll", schedule, { passive: true });');
    expect(hook).toContain("if (!frame) frame = requestAnimationFrame(update);");
    // One frame: the line over the middle is found, lit, and asked about the click, in that order.
    const update = hook.slice(hook.indexOf("const update = () => {"), hook.indexOf("const schedule = () => {"));
    expect(update).toContain("const at = lineAt(tops, place);");
    expect(update).toContain("light(at < 0 ? null : (lines[at] ?? null));");
    const light = hook.slice(hook.indexOf("const light = (line: HTMLElement | null) => {"), hook.indexOf("const update = () => {"));
    expect(light).toContain('line.dataset.lit = "";');
    expect(light).toContain("const now = step?.id || null;");
    expect(light).toContain("if (opened && clicksFor(reached, now)) {");
    expect(light.indexOf('line.dataset.lit = "";')).toBeLessThan(light.indexOf("clicksFor(reached, now)"));
    // The app's own scrolling click (lib/ui/scrollTicks.ts): inert in a browser, its plugin ready before the first.
    expect(light).toContain("const click = handTicks();");
    expect(hook).toContain("readyTicks();");
    // No measure of its own: the click hook that read the prayers' boxes is gone.
    expect(fs.existsSync(join(root, "components/prayers/service/useEasyScroll.ts"))).toBe(false);
    expect(code("components/prayers/PrayerRuleReader.tsx")).not.toContain("useEasyScroll");
    // Not motion: the click is felt with Purify's motion off too. Only the marks wait on it.
    expect(hook).not.toMatch(/if \(!root \|\| reduced\) return;|pointer: coarse/);
    expect(hook).toContain("const mark = !reduced;");
    expect(light).not.toMatch(/if \(opened && mark|mark && clicksFor/);
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
