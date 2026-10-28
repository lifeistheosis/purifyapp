import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { sectionMedia } from "@/lib/media/sections";

/**
 * Prayers on a phone (1.8), held to the owner's merged pick of round 4
 * (2026-10-27, locked): "the Pantocrator and the verse fading in at the top,
 * then your rule as a checklist" (Homebase/boards/purify-master/variants/
 * m04-prayers.png, Merged).
 *
 * This reads the source. The rule's own logic is ruleToday.test.ts.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
/** The code without its comments, so a note about the old page is not read as the page. */
const code = (rel: string) =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const PAGE = "components/mobile/PrayersMobile.tsx";
const HERO = "components/mobile/PrayersHero.tsx";
const RULE = "components/prayers/RuleToday.tsx";
const CSS = "app/globals.css";

describe("the head of Prayers", () => {
  it("is the section's own Pantocrator with the verse on it, the rule at its foot", () => {
    const page = code(PAGE);
    expect(page).toMatch(/hero=\{\s*<PrayersHero>\s*<RuleToday hourPart=\{hourPart\} \/>\s*<\/PrayersHero>\s*\}/);
    const hero = code(HERO);
    expect(hero).toContain('sectionMedia("prayers")');
    expect(sectionMedia("prayers")?.src).toBe("/sections/prayers.v2.jpg");
    expect(hero).toContain('t("ui.prayWithoutCeasing")');
    expect(hero).toContain('t("ui.1Thessalonians517")');
    // No second h1: the tab bar names the tab.
    expect(hero).not.toMatch(/<h1\b/);
  });

  it("fades the picture and the verse in, and with motion off they are simply there", () => {
    const css = read(CSS);
    expect(css).toMatch(/\.prayers-hero-img \{\s*animation: prayers-picture-in [^;]*var\(--ease-house\) backwards;/);
    expect(css).toMatch(/\.prayers-hero-verse\.prayers-hero-in \{\s*animation: prayers-hero-in [^;]*backwards;/);
    expect(css).toMatch(/:where\(\[data-motion="reduce"\]\) \.prayers-hero-img,\s*:where\(\[data-motion="reduce"\]\) \.prayers-hero-in \{\s*animation: none;/);
    expect(code(HERO)).toMatch(/className="prayers-hero-img /);
    expect(code(HERO)).toMatch(/className="prayers-hero-verse prayers-hero-in /);
  });

  it("runs the picture under the one tab bar, which goes clear over it on a phone and solid once it has gone", () => {
    // The bar is the one every tab wears, with no prop of its own for this.
    expect(code(PAGE)).toContain('header={<MobileHeader titleKey="nav.prayers" />}');
    const hero = code(HERO);
    expect(hero).toContain("new IntersectionObserver(");
    expect(hero).toContain('BAR_SOLID = "data-bar-solid"');
    // Taken back when the page goes, so no other tab is left marked.
    expect(hero).toMatch(/return \(\) => \{\s*io\.disconnect\(\);\s*solid\(false\);/);
    // Without an observer the bar is never left clear over the words.
    expect(hero).toMatch(/typeof IntersectionObserver === "undefined"\) \{\s*solid\(true\);/);
    const css = read(CSS);
    const phones = css.slice(css.indexOf("/* The bar over the picture"), css.indexOf("/* The picture and the verse fade in"));
    expect(phones).toContain("@media (max-width: 767.98px)");
    // Clear from the first paint while the picture is on the page, solid once it has gone.
    expect(phones).toContain("html:has(.prayers-hero):not([data-bar-solid]) [data-tab-topbar] {");
    expect(phones).toContain("background-color: transparent;");
    expect(phones).toContain("html:not(.is-native):has(.prayers-hero) [data-tab-topbar] {");
    // Pulled up by the bar's own height, the inset with it in the apps.
    expect(css).toMatch(/\.prayers-hero \{\s*--hero-top: calc\(3\.75rem \+ 1px\);/);
    expect(css).toMatch(/html\.is-native \.prayers-hero \{\s*--hero-top: calc\(3\.75rem \+ 1px \+ var\(--inset-top\)\);/);
    // Which is the bar's row, its padding and its hairline.
    const bar = code("components/mobile/MobileHeader.tsx");
    expect(bar).toContain('"z-30 border-b border-paper/8 bg-night py-2"');
    expect(bar).toContain("flex h-11 items-center");
    expect(bar).toContain("data-tab-actions");
  });
});

describe("your rule today", () => {
  const rule = code(RULE);

  it("is the reader's own rule and the marks they make in the prayer reader", () => {
    expect(rule).toContain("useMyRule()");
    expect(rule).toContain("useTodayDone(MY_RULE_IDS.morning)");
    expect(rule).toContain("useTodayDone(MY_RULE_IDS.evening)");
    expect(rule).toContain("ruleToday(rule, hourPart,");
    // It shows the marks; it makes none.
    expect(rule).not.toMatch(/writeTodayDone|markRuleCompletedToday|markKept/);
  });

  it("offers the way to make one to a reader who has none, never an empty list", () => {
    expect(rule).toMatch(/if \(!today\) \{[\s\S]*href="\/prayers\/personal"[\s\S]*t\("prayers\.mine\.build"\)/);
  });

  it("names the prayers from the prayer book only once the page knows there is a rule, and never in its own code", () => {
    expect(rule).toContain('import("@/lib/prayers/library")');
    expect(rule).not.toMatch(/from "@\/lib\/prayers\/library"/);
  });

  it("leads on to what is next, and opens a prayer where it is read", () => {
    expect(rule).toContain('t("prayers.ruleToday.continue", { title: titleOf(today.next) })');
    expect(code("components/prayers/mine/MyRuleReader.tsx")).toMatch(/window\.location\.hash[\s\S]*scrollIntoView\(\{ block: "start" \}\)/);
  });

  it("lights a checked step and the ring in white, never yellow, and plainly on Parchment", () => {
    const css = read(CSS);
    expect(css).toMatch(/\.rule-check-lit \{\s*box-shadow: 0 0 12px -1px rgba\(255, 255, 255, 0\.35\);/);
    expect(css).toMatch(/html\[data-reading-mode="parchment"\] \.rule-check-lit \{\s*box-shadow: none;/);
    for (const file of [RULE, HERO, PAGE]) {
      expect(code(file), file).not.toMatch(/\b(?:text|bg|ring|border|from|via|to)-(?:gold|amber|yellow)\b/);
    }
  });
});

describe("the rest of the page", () => {
  it("keeps every door the 1.7 page had", () => {
    const page = code(PAGE);
    for (const href of [
      "/prayers/morning",
      "/prayers/evening",
      "/prayers/hours",
      "/prayers/akathists",
      "/prayers/learning",
      "/prayers/learning/jesus-prayer",
      "/prayers/today",
      "/prayers/personal",
      "/chants",
    ]) {
      expect(page, href).toContain(`"${href}"`);
    }
    for (const part of ["<PrayNow variant=\"mobile\" />", "<DiptychPreview />", "<PrayerSearch>", "<PrayerBookIndex variant=\"mobile\" />", "<FeatureBand"]) {
      expect(page, part).toContain(part);
    }
  });

  it("names its sections as the design names All prayers, with no small labels", () => {
    const page = code(PAGE);
    expect(page).toContain('<T k="prayers.allPrayers" />');
    expect(page).not.toContain("<Eyebrow");
    expect(page.match(/<h2 /g)?.length).toBeGreaterThanOrEqual(5);
  });

  it("draws nothing new with the banned lamp", () => {
    for (const file of [HERO, RULE]) expect(read(file), file).not.toContain("Lampada");
  });
});
