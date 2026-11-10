// Easy Scroll, each prayer counted as it is passed, and saving one prayer
// from a long hold (1.9, build 89 note 7, his "ok to all" of 2026-11-10).
//
// His words: "a new scroll system implemented ... it's called Easy Scroll ...
// It pretty much helps you scroll to the next section easily, and it with
// like an easy swipe ... and also add a haptic feedback when they scroll to
// each section", and "I don't like the bookmark button just being there in
// every single individual prayer". The sums are lib/prayers/easyScroll.ts;
// the gesture is the phone's own scroll snapping (app/globals.css, "Easy
// Scroll"), switched on by components/prayers/service/useEasyScroll.ts.
//
// vitest runs in node with no DOM: the sums are tested as sums, and the
// wiring as it is written.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { ON_PLACE_PX, isTall, passedNow, stepAtPlace, type PassState } from "@/lib/prayers/easyScroll";

const root = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8").replace(/\r\n/g, "\n");
/** The code without its comments, so a note is not read as the page. */
const code = (p: string) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
const css = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");

const fresh = (): PassState => ({ seen: new Set(), told: new Set() });

describe("a prayer that stops at its end too", () => {
  // The reading place at 300px, the foot of what can be seen at 760px: 460px of room under it.
  it("is one whose end lies below the foot when its first line stands at the reading place", () => {
    expect(isTall(300, 300 + 400, 300, 760)).toBe(false);
    expect(isTall(300, 300 + 461 + 1, 300, 760)).toBe(true);
    // Measured wherever the prayer is now: only the length below its first line counts.
    expect(isTall(1200, 1200 + 900, 300, 760)).toBe(true);
    expect(isTall(-500, -500 + 200, 300, 760)).toBe(false);
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
    expect(hook).toContain("parseFloat(style.scrollPaddingTop)");
    expect(hook).toContain("`${Math.round(place - padTop)}px`");
    expect(hook).toContain("`${Math.max(0, Math.round(foot - padBottom))}px`");
    expect(hook).toContain('step.style.setProperty("--easy-start", `${Math.round(place - padTop - into)}px`);');
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

  it("settles each prayer on its first line at the reading place, a long one at its end too", () => {
    const easy = css.slice(css.indexOf("@media (pointer: coarse) {\n html[data-easy-scroll]"));
    expect(easy).toMatch(/html\[data-easy-scroll\] \{\s*scroll-snap-type: y mandatory;/);
    // The whole prayer settles, so one taller than the screen moves freely inside
    // (the export walk found the Creed's middle skipped when only its first line
    // and its end could settle); its margin puts the first line at the place.
    expect(easy).toMatch(/\[data-prayer-reader\] \[data-step\] \{\s*scroll-snap-align: start;\s*scroll-snap-stop: always;\s*scroll-margin-top: var\(--easy-start, var\(--easy-place, 40vh\)\);/);
    expect(easy).toMatch(/\[data-step\]\[data-tall\] > \[data-snap-end\] \{\s*scroll-snap-align: end;\s*scroll-snap-stop: always;\s*scroll-margin-bottom: var\(--easy-foot, 0px\);/);
    expect(easy).toMatch(/\[data-snap-edge="top"\] \{\s*scroll-snap-align: start;\s*scroll-margin-top: 200vh;/);
    expect(easy).toMatch(/\[data-snap-edge="bottom"\] \{\s*scroll-snap-align: end;\s*scroll-margin-bottom: 200vh;/);
  });

  it("marks where each prayer settles, and where it ends", () => {
    const step = code("components/prayers/service/PrayerStep.tsx");
    expect(step).toContain("{...(s === 0 && l === 0 ? snap : {})}");
    expect(step).toContain('<span aria-hidden data-snap-end="" />');
    // A step of words without lines (the examination) settles on its refrain
    // or its name: the export walk found it passed over before (2026-11-10).
    expect(step).toContain('const settlesOn: "line" | "refrain" | "title" = stanzas.length ? "line" : refrain ? "refrain" : "title";');
    expect(step).toContain('{...(settlesOn === "title" ? snap : {})}');
    expect(step).toContain('{...(settlesOn === "refrain" ? snap : {})}');
    const names = code("components/prayers/service/CommemorationStep.tsx");
    expect(names).toContain('data-snap-start=""');
    expect(names).toContain('<span aria-hidden data-snap-end="" />');
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
