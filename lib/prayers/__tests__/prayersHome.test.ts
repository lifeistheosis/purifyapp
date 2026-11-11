import fs from "node:fs";
import path from "node:path";

import { createElement as h, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MessagesProvider } from "@/components/i18n/MessagesProvider";
import { PictureTile } from "@/components/mobile/SoftTiles";
import { PrayerBookContents } from "@/components/prayers/PrayerBookContents";
import { getMessages } from "@/lib/i18n";
import { LOCALES } from "@/lib/i18n/locales";
import { sectionMedia } from "@/lib/media/sections";
import { FIRST_OPEN, prayerBook } from "@/lib/prayers/book";
import { listHours } from "@/lib/prayers/hours";
import { HOUR_STARTS, currentHourSlug } from "@/lib/prayers/hourNow";
import { cropTables, plateCrop, tileCrop } from "@/lib/prayers/iconCrops";
import { PRAYER_ICONS } from "@/lib/prayers/icons";
import { RULE_CATEGORY_ORDER } from "@/lib/prayers/rules";
import { WIDE_CUTS, ruleCarry, ruleHeadArt, ruleTileArt, serviceArt } from "@/lib/prayers/serviceArt";
import { placeForPath, turnFor } from "@/lib/search/places";

/**
 * Prayers on a phone (1.8), held to the owner's merged pick of round 4
 * (2026-10-27, locked): "the Pantocrator and the verse fading in at the top,
 * then your rule as a checklist" (Homebase/boards/purify-master/variants/
 * m04-prayers.png, Merged); and, for Practices and the prayer book under it,
 * to his pick of r3-26 (note 72, 2026-10-31): "A, the icon tiles. C, one
 * prayer book." (variants/r3-26-prayers-practices).
 *
 * This reads the source, and the book's chapters as lib/prayers/book.ts
 * decides them. The rule's own logic is ruleToday.test.ts. How the built app
 * draws the tiles, folds the chapters and opens the one search is walked in
 * scripts/export-walk.mjs, section 48.
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
const BOOK = "components/prayers/PrayerBookContents.tsx";
const TILES = "components/mobile/SoftTiles.tsx";
const DESKTOP = "app/(app)/prayers/page.tsx";
const CSS = "app/globals.css";

describe("the head of Prayers", () => {
  it("is the section's own Pantocrator with the verse on it, the rule at its foot", () => {
    const page = code(PAGE);
    expect(page).toMatch(/hero=\{\s*<PrayersHero>\s*<RuleToday hourPart=\{hourPart\} \/>\s*<\/PrayersHero>\s*\}/);
    const hero = code(HERO);
    expect(hero).toContain('sectionMedia("prayers")');
    expect(sectionMedia("prayers")?.src).toBe("/sections/prayers.v4.jpg");
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
    // The observer is shared with the Ladder at the top of You since note 71
    // (components/mobile/barOverPicture.ts), and watches this picture.
    expect(code(HERO)).toMatch(/const picture = useRef<HTMLDivElement>\(null\);\s*useBarOverPicture\(picture\);/);
    expect(code(HERO)).toMatch(/<div\s+ref=\{picture\}\s+className="prayers-hero-picture /);
    const hero = code("components/mobile/barOverPicture.ts");
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
    // At the reading place, as Begin goes, and no longer at the very top
    // under the bar (the owner's build 81 note; lib/ui/readingPlace.ts).
    expect(code("components/prayers/mine/MyRuleReader.tsx")).toMatch(/window\.location\.hash[\s\S]*goToPrayer\(id, \{ smooth: false \}\)/);
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
  it("draws All prayers as small pieces, not a row of pills, with a tick as each passes (build 89 note 10)", () => {
    // His words on build 89: "I'm kind of getting sick of the like floating
    // pills". Each way in is a piece: its own picture, its name, and its length
    // or its one line, in a row that gives a small click in the hand as each
    // piece passes its middle (lib/ui/scrollTicks.ts, in the apps only).
    const pieces = code("components/prayers/PrayerPieces.tsx");
    expect(pieces).toMatch(/<ScrollRail[^>]*\bticks\b/);
    expect(pieces).toContain("data-prayer-piece={p.href}");
    expect(pieces).toContain("<ArrivingImage");
    expect(pieces).toContain("{p.name}");
    expect(pieces).toContain("{p.line ?");
    expect(pieces).not.toContain("PILL");
    expect(code("components/ui/ScrollRail.tsx")).toContain("useScrollTicks(track, { enabled: ticks })");
    const page = code(PAGE);
    expect(page).toContain("<PrayerPieces hourNow={hourNow} />");
    // The pill row is gone from All prayers.
    const all = page.slice(page.indexOf('aria-labelledby="prayers-all"'), page.indexOf("</section>", page.indexOf('aria-labelledby="prayers-all"')));
    expect(all).not.toContain("PILL");
  });

  it("keeps every door the 1.7 page had", () => {
    // Today's prayer went from a tile to a row of the daily rule (note 72),
    // which the book's own file holds.
    // All prayers' pieces (1.9, build 89 note 10) are their own file.
    const page = [code(PAGE), code(BOOK), code("lib/prayers/book.ts"), code("components/prayers/PrayerPieces.tsx")].join("\n");
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
    for (const part of ['<PrayNow variant="mobile" />', "<PrayerBookContents hourNow={hourNow} />", "<FeatureBand"]) {
      expect(code(PAGE), part).toContain(part);
    }
  });

  it("names its sections as the design names All prayers, with no small labels", () => {
    const page = code(PAGE);
    expect(page).toContain('<T k="prayers.allPrayers" />');
    expect(page).not.toContain("<Eyebrow");
    expect(page.match(/<h2 /g)?.length).toBeGreaterThanOrEqual(5);
  });

  it("draws nothing new with the banned lamp", () => {
    for (const file of [HERO, RULE, PAGE, BOOK]) expect(read(file), file).not.toContain("Lampada");
  });
});

/** Every prayer icon's own width and height, read from its file. */
function jpegSize(file: string): { w: number; h: number } {
  const b = fs.readFileSync(file);
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = b[i + 1];
    // A start-of-frame marker carries the size; the others are skipped by their length.
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
    i += 2 + b.readUInt16BE(i + 2);
  }
  throw new Error(`${file}: no size`);
}

describe("Practices (note 72, r3-26 A: the icon tiles)", () => {
  const page = code(PAGE);
  const practices = page.slice(page.indexOf("data-practices"), page.indexOf('aria-labelledby="prayers-book"'));

  it("is four tiles in their icons, two across, Today's tile gone and Personal named Your rule", () => {
    expect(practices.match(/<PictureTile\b/g)).toHaveLength(4);
    expect(page).not.toMatch(/<SoftTile\b/);
    expect([...practices.matchAll(/href="([^"]+)"/g)].map((m) => m[1])).toEqual(["/prayers/hours", "/prayers/akathists", "/prayers/learning", "/prayers/personal"]);
    for (const k of ["ui.theHours", "prayers.akathists", "ui.hymnsOfPraise", "ui.learnToPray", "ui.aBeginnersPath", "prayers.mine.title", "prayers.mine.youHint"]) {
      expect(practices, k).toContain(`<T k="${k}" />`);
    }
    // Today's tile, and Personal's old name and line, are gone from the phone.
    for (const gone of ['"/prayers/today"', "prayers.tabs.personal", "ui.yourOwnRule", "prayers.openToday"]) expect(page, gone).not.toContain(gone);
    // Two across, as Discover's tiles were; four across on a tablet in the apps.
    expect(practices).toContain('<SoftTileGrid className="mt-3 md:grid-cols-4">');
    expect(code(TILES)).toContain('className={`grid grid-cols-2 gap-3 ${className}`}');
    // Under the section's own heading, each tile's name is a level below it.
    expect(practices.match(/heading="h3"/g)).toHaveLength(4);
  });

  it("wears the icon the app pairs with each, the Hours the icon of the Hour the clock is in, once the page knows it", () => {
    expect(page).toContain('serviceArt("akathist-theotokos")');
    expect(page).toContain('serviceArt("learning")');
    // The clock is read on the device, after the page wakes: until then no Hour is lit.
    expect(page).toContain("const hour = mounted ? new Date().getHours() : null;");
    expect(page).toContain("const hourNow = hour === null ? null : currentHourSlug(hour);");
    expect(page).toContain("const hourArt = hourNow ? serviceArt(hourNow) : null;");
    expect(practices).toContain("picture={hourArt?.src ?? null}");
    expect(practices).toContain("lit={hourNow !== null}");
    // Lit, it says so: "Now · The Third Hour"; before, the Hours' own line.
    expect(practices).toMatch(/<span aria-hidden className="tile-dot" \/>\s*<T k="prayers\.timeline\.now" \/> · <T k=\{`prayers\.rule\.\$\{hourNow\}\.title`\} \/>/);
    expect(practices).toContain('<T k="ui.sanctifyTheDay" />');
    // At 9:41 in the morning, the hour the sheet was drawn at, the Third Hour and its Pentecost.
    expect(currentHourSlug(9)).toBe("third-hour");
    expect(serviceArt(currentHourSlug(9)).slug).toBe("pentecost");
    // The icons are the app's own: nothing is added to the download.
    for (const id of ["akathist-theotokos", "learning", "mine", ...HOUR_STARTS.map((h) => h.slug)]) {
      expect(serviceArt(id).src.startsWith("/icons/prayer/"), id).toBe(true);
    }
  });

  // 1.9, the arbiter's call of 2026-11-11: "let Your rule's tile wear the half
  // the page will open on (morning or evening), so one picture travels." Until
  // then the tile wore Christ Pantocrator at every hour, the page opened on the
  // Anastasis in the morning, and nothing travelled: a picture travels only
  // where the page shows the same picture (lib/ui/routeMotion.ts).
  it("gives Your rule's tile the icon of the half its page will open on, chosen by the page's own rule", () => {
    // One rule for both: the tile and the page read openingPart.
    expect(page).toContain("const rulePart = hour === null ? null : openingPart(myRule, hourPart);");
    expect(code("components/prayers/mine/MyRuleBuilder.tsx")).toContain("once(() => openingPart(readMyRule(), ruleIdForHour(new Date().getHours()), partInAddress(window.location.hash)))");
    // The device's knowledge: no icon until the page wakes, as the Hours' tile, and never one that is then swapped.
    expect(page).toContain("const ruleArt = rulePart ? ruleTileArt(rulePart) : null;");
    expect(practices).toContain("picture={ruleArt?.src ?? null}");
    expect(practices).toContain("crop={ruleArt ? tileCrop(ruleArt.slug) : undefined}");
    expect(page).not.toContain('serviceArt("mine")');
    // The tile's icon is the icon at that half's head, in the head's wide cut there.
    for (const part of ["morning", "evening"] as const) {
      const tile = ruleTileArt(part);
      expect(tile.src.startsWith("/icons/prayer/"), part).toBe(true);
      expect(WIDE_CUTS[tile.slug]?.src, part).toBe(ruleHeadArt(part).src);
      expect(cropTables().tile[tile.slug], `${part}'s tile cut`).toBeDefined();
    }
    expect(ruleTileArt("morning").slug).toBe("anastasis");
    expect(ruleTileArt("evening").slug).toBe("christ-pantocrator");
    // In the evening half the tile is as his sheet drew it.
    expect(tileCrop(ruleTileArt("evening").slug)).toEqual({ zoom: 1.04, focus: "50% 21%" });
  });

  it("and the tile's picture and the head's wear one name, so the one travels into the other and back", () => {
    expect(practices).toContain("carry={rulePart ? ruleCarry(rulePart) : undefined}");
    expect(code(TILES)).toContain("<span data-carry={carry ?? picture}");
    const head = code("components/prayers/mine/RuleHead.tsx");
    // One box takes the name, the head's whole picture with its shade, as the half shown: two things under one name
    // stop the whole page switch.
    expect(head).toContain("data-carry-into={part ? ruleCarry(part) : undefined}");
    expect(head.match(/data-carry-into/g)).toHaveLength(1);
    // The head's words stand on the picture, and a picture in flight is drawn over the page: they are pictured
    // apart while the box wears the name, so the name is never covered and then shown, nor seen twice.
    const css = code(CSS);
    expect(css).toContain('.rule-head:has(> .rule-head-picture[style*="view-transition-name"]) > .rule-head-words {\n view-transition-name: rule-words;');
    expect(css).toContain("::view-transition-new(rule-words):only-child {\n animation: route-arrive 180ms var(--ease-house) 150ms both;");
    expect(css).toContain("::view-transition-old(rule-words):only-child {\n animation: route-leave var(--duration-route-exit) var(--ease-house) both;");
    // And the icon under an arriving picture is there at once, and does not fade in again once the name is given back.
    expect(css).toContain(".rule-head-picture:is([data-carried-in], [data-landed]) .rule-head-img[data-on] {\n animation: none;");
    expect(ruleCarry("morning")).toBe("rule:morning");
    expect(ruleCarry("evening")).toBe("rule:evening");
    expect(ruleCarry("morning")).not.toBe(ruleCarry("evening"));
  });

  it("cuts each icon where its meaning is, for every Hour the tile and the book's row can wear", () => {
    const { tile, plate } = cropTables();
    for (const [slug, crop] of [...Object.entries(tile), ...Object.entries(plate)]) {
      expect(PRAYER_ICONS[slug], slug).toBeDefined();
      // Never smaller than its box, so the tile's ground never shows beside it.
      expect(crop.zoom, slug).toBeGreaterThanOrEqual(1);
      expect(crop.zoom, slug).toBeLessThanOrEqual(2.5);
      expect(crop.focus, slug).toMatch(/^\d{1,3}% \d{1,3}%$/);
    }
    // The sheet's own cuts for the four it drew.
    expect(tileCrop("pentecost")).toEqual({ zoom: 1.22, focus: "50% 30%" });
    expect(tileCrop("theotokos-of-vladimir")).toEqual({ zoom: 1.12, focus: "42% 40%" });
    expect(tileCrop("three-hierarchs")).toEqual({ zoom: 1.18, focus: "50% 9%" });
    expect(tileCrop("christ-pantocrator")).toEqual({ zoom: 1.04, focus: "50% 21%" });
    for (const { slug } of HOUR_STARTS) {
      const icon = serviceArt(slug).slug;
      expect(tile[icon], `${slug}'s tile`).toBeDefined();
      expect(plate[icon], `${slug}'s plate`).toBeDefined();
    }
    expect(plateCrop("theotokos-of-vladimir")).toEqual({ zoom: 1.6, focus: "22% 32%" });
  });

  it("never draws a tile's icon far past its own pixels on a phone", () => {
    // The owner's rule on picture crops: sharp or not at all. On a 390px
    // phone the tile is 169 wide, and a phone of three pixels to the point
    // (his is about 3.1) draws it 507 wide. These icons are 392 to 599
    // pixels wide, so the four on the sheet and the afternoon Hours stand at
    // most a third past their own: the Pantocrator, the narrowest, at 1.35.
    const { tile } = cropTables();
    for (const [slug, crop] of Object.entries(tile)) {
      const { w, h } = jpegSize(path.join(ROOT, "public", PRAYER_ICONS[slug].src));
      // Covering a box 169 by 146: as wide as the box, or as tall, whichever is more.
      const drawn = Math.max(169, (146 * w) / h) * crop.zoom * 3;
      expect(drawn / w, slug).toBeLessThanOrEqual(1.4);
    }
  });

  it("lights the tile that is now in white, the ink on Parchment, its words over the picture on the page's own ground", () => {
    const css = read(CSS);
    expect(css).toMatch(/\.tile-shade \{\s*background: linear-gradient\(180deg, transparent 26%, rgb\(16 16 19 \/ 0\.82\) 100%\);\s*background: linear-gradient\(180deg, transparent 26%, color-mix\(in srgb, var\(--color-night\) 82%, transparent\) 100%\);/);
    // On Parchment the shade is paper, laid deeper under the ink, and the words' shadow is a halo of it.
    expect(css).toMatch(/html\[data-reading-mode="parchment"\] \.tile-shade \{\s*background: linear-gradient\(180deg, transparent 30%, color-mix\(in srgb, var\(--color-night\) 70%, transparent\) 62%, color-mix\(in srgb, var\(--color-night\) 92%, transparent\) 100%\);/);
    expect(css).toMatch(/html\[data-reading-mode="parchment"\] \.tile-name,\s*html\[data-reading-mode="parchment"\] \.tile-line \{\s*text-shadow: 0 0 8px color-mix\(in srgb, var\(--color-night\) 90%, transparent\);/);
    expect(css).toMatch(/\.tile-lit \{[^}]*0 0 26px rgb\(255 255 255 \/ 0\.2\)/);
    const parchmentLit = /html\[data-reading-mode="parchment"\] \.tile-lit \{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(parchmentLit).toContain("var(--color-paper) 70%");
    expect(parchmentLit).not.toMatch(/rgb\(255 255 255/);
    expect(css).toMatch(/html\[data-reading-mode="parchment"\] \.tile-dot \{\s*box-shadow: none;/);
    const tiles = code(TILES);
    expect(tiles).toContain('lit && "tile-lit"');
    expect(tiles).toContain('<span aria-hidden className="tile-shade absolute inset-0" />');
    // The picture arrives whole, over the tile's own ground.
    expect(tiles).toMatch(/<ArrivingImage\s+src=\{picture\}/);
  });
});

describe("the prayer book (note 72, r3-26 C: one prayer book)", () => {
  const book = prayerBook();
  const kinds = (i: number) => book[i].lines.map((l) => (l.kind === "prayer" ? l.rule.id : l.kind));

  it("is four chapters, I to IV, in the registry's order, the daily rule open at first", () => {
    expect(book.map((c) => c.category)).toEqual(RULE_CATEGORY_ORDER);
    expect(book.map((c) => c.numeral)).toEqual(["I", "II", "III", "IV"]);
    expect(book.map((c) => c.nameKey)).toEqual(["prayers.category.daily", "prayers.category.dailyLife", "saints.theChurchYear", "prayers.category.devotional"]);
    expect(FIRST_OPEN).toBe(0);
    expect(code(BOOK)).toContain("useState<Open>({ at: FIRST_OPEN, snap: null })");
  });

  it("holds the daily rule's prayers to their length, then Today's prayer, then the Hours as one row", () => {
    expect(kinds(0)).toEqual(["morning", "midday", "evening", "creed", "today", "hours"]);
    // No Hour is a row of its own: the Hours' page is the day's five.
    const hours = new Set(listHours().map((h) => h.slug));
    for (const c of book) for (const l of c.lines) if (l.kind === "prayer") expect(hours.has(l.rule.id), l.rule.id).toBe(false);
  });

  it("closes Devotional on the akathists, names what is planned at each page's foot, and leaves Your rule's names to its tile", () => {
    expect(kinds(1)).toEqual(["upon-waking", "before-meals", "after-meals", "before-sleep"]);
    expect(kinds(2)).toEqual(["lent-ephrem", "pascha"]);
    expect(kinds(3)).toEqual(["jesus-prayer", "repentance", "protection", "pre-communion", "akathists"]);
    expect(book.map((c) => c.planned.map((r) => r.id))).toEqual([[], ["before-work", "after-work", "before-travel"], ["nativity", "fasting"], ["psalms-needs", "thanksgiving"]]);
    for (const c of book) {
      for (const l of c.lines) if (l.kind === "prayer") expect(l.rule.planned, l.rule.id).toBeFalsy();
      expect([...kinds(book.indexOf(c)), ...c.planned.map((r) => r.id)]).not.toContain("intercessory");
    }
  });

  it("reads like a book's contents: a shut chapter names what is in it, a prayer runs to its length", () => {
    const src = code(BOOK);
    expect(src).toContain('preview={chapter.lines.map(name).join(", ")}');
    expect(src).toMatch(/\{isOpen \? null : \(\s*<span className="mt-\[3px\] line-clamp-2/);
    expect(src).toContain('tn("prayers.approxMin", line.rule.estimatedMinutes)');
    expect(src).toContain('<span aria-hidden className="book-leader h-1 min-w-3.5 flex-1" />');
    // Today's prayer by the page's own name, the Hours lit and named once the page knows the hour.
    expect(src).toContain('t("notFound.todaysPrayer")');
    expect(src).toContain('line={hourNow ? `${t(`prayers.rule.${hourNow}.title`)} · ${t("prayers.hoursIndex.nowMark")}` : t("ui.sanctifyTheDay")}');
    expect(src).toContain("lit={hourNow !== null}");
    expect(src).toContain('t("study.planned")');
    const css = read(CSS);
    expect(css).toMatch(/\.book-leader \{\s*background: radial-gradient\(circle at 1\.5px 2px, rgb\(255 255 255 \/ 0\.3\) 1px, transparent 1\.25px\) 0 0 \/ 6px 4px repeat-x;/);
  });

  it("opens one chapter at a time, each shut page out of reach, the tapped chapter kept under the finger", () => {
    const src = code(BOOK);
    expect(src).toContain("aria-expanded={isOpen}");
    expect(src).toContain("aria-controls={pageId}");
    expect(src).toContain('inert={!isOpen} data-open={isOpen || undefined} data-snap={snap || undefined} className="book-fold"');
    // A page open above the one tapped shuts at once; the one tapped shuts as it folds.
    expect(src).toContain("const next: Open = open.at === at ? { at: null, snap: null } : { at, snap: open.at !== null && open.at < at ? open.at : null };");
    expect(src).toContain('window.scrollBy({ top: off, left: 0, behavior: "instant" as ScrollBehavior });');
    const css = read(CSS);
    expect(css).toMatch(/\.prayer-book \{\s*overflow-anchor: none;/);
  });

  it("holds the card's length while a page above shuts, so the page never shortens under the finger (build 87's walk)", () => {
    // At the foot of the tab the daily rule shutting made the page 321px
    // shorter at once: the scroll was pulled up to the new foot, the chapter
    // could not be put back, and as Devotional's page grew the scroll went
    // down with it, carrying the tapped chapter 278px up the screen.
    const src = code(BOOK);
    expect(src).toContain("if (next.snap !== null && card) card.style.minHeight = `${card.offsetHeight}px`;");
    // Let go once the new page has opened into the room, and at once with Purify's motion off.
    expect(src).toMatch(/if \(card\?\.style\.minHeight\) \{\s*window\.clearTimeout\(letGo\.current\);[\s\S]*?card\.style\.minHeight = "";[\s\S]*?if \(prefersReducedMotion\(\)\) release\(\);\s*else letGo\.current = window\.setTimeout\(release, FOLD_HOLD_MS\);/);
    // Let go when the book goes. (What follows a page as it opens is no longer the book's own:
    // lib/ui/showOpened.ts, build 93 note 15; lib/prayers/__tests__/bookFollow.test.ts.)
    expect(src).toMatch(/useEffect\(\s*\(\) => \(\) => \{\s*window\.clearTimeout\(letGo\.current\);\s*\},\s*\[\],\s*\);/);
    // The hold outlasts the fold it waits for, and the two are the same 240 ms.
    expect(read(BOOK)).toContain("const FOLD_MS = 240;");
    const hold = /const FOLD_HOLD_MS = FOLD_MS \+ (\d+);/.exec(read(BOOK));
    expect(Number(hold?.[1])).toBeGreaterThan(0);
    expect(read(CSS)).toMatch(/\.book-fold \{[^}]*transition: grid-template-rows 240ms var\(--ease-house\);/);
  });

  it("folds on the house curve, and with Purify's motion off simply opens and shuts", () => {
    const css = read(CSS);
    expect(css).toMatch(/\.book-fold \{\s*display: grid;\s*grid-template-rows: 0fr;\s*transition: grid-template-rows 240ms var\(--ease-house\);/);
    expect(css).toMatch(/\.book-fold\[data-open\] \{\s*grid-template-rows: 1fr;/);
    expect(css).toMatch(/\.book-page \{\s*opacity: 0;\s*translate: 0 4px;\s*transition: opacity 240ms var\(--ease-house\), translate 240ms var\(--ease-house\);/);
    expect(css).toMatch(/\.book-fold\[data-open\] \.book-page \{\s*opacity: 1;\s*translate: none;/);
    expect(css).toMatch(/\.book-fold\[data-snap\],\s*\.book-fold\[data-snap\] \.book-page \{\s*transition: none;/);
    expect(css).toMatch(/:where\(\[data-motion="reduce"\]\) \.book-fold,\s*:where\(\[data-motion="reduce"\]\) \.book-page,\s*:where\(\[data-motion="reduce"\]\) \.book-turn \{\s*transition: none;/);
    expect(code(BOOK)).toContain('<ChevronDown size={17} className="book-turn mt-[3px] shrink-0 text-paper/50" />');
  });

  it("lights the Hours' row white with its plate ringed, ink grey on Parchment, and holds no gold", () => {
    const css = read(CSS);
    expect(css).toMatch(/\.book-lit \{[^}]*0 0 24px rgb\(255 255 255 \/ 0\.1\)/);
    const parchment = /html\[data-reading-mode="parchment"\] \.book-lit \{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(parchment).toContain("var(--color-paper) 30%");
    expect(parchment).not.toContain("0 0 24px");
    expect(css).toMatch(/html\[data-reading-mode="parchment"\] \.book-leaf \{\s*background: rgb\(43 35 23 \/ 0\.05\);/);
    // The picture tile, not the glyph tile beside it in the same file, whose
    // plate is text-gold-pale, a token kept under its old name and a near
    // white on every dark palette (app/globals.css).
    const tiles = code(TILES);
    const pictureTile = tiles.slice(tiles.indexOf("export function PictureTile"), tiles.indexOf("export function FeatureBand"));
    expect(pictureTile.length).toBeGreaterThan(500);
    for (const [file, src] of [[PAGE, code(PAGE)], [BOOK, code(BOOK)], [TILES, pictureTile]]) {
      expect(src, file).not.toMatch(/\b(?:text|bg|ring|border|from|via|to|shadow)-(?:gold|amber|yellow)/);
    }
    const block = css.slice(css.indexOf("/* ── Prayers: Practices and the prayer book"), css.indexOf(":where([data-motion=\"reduce\"]) .book-turn"));
    expect(block.length).toBeGreaterThan(1000);
    expect(block).not.toMatch(/gold|amber|yellow/i);
  });
});

/** A part as it is first drawn, in English: the server's page, and the apps' before they wake. */
type ProviderProps = Parameters<typeof MessagesProvider>[0];
const draw = (node: ReactNode) => renderToStaticMarkup(h(MessagesProvider, { locale: "en", messages: getMessages("en") } as ProviderProps, node));

describe("Practices and the book as they are drawn", () => {
  const en = getMessages("en");

  it("before the page knows the hour: the Hours wear no icon and nothing is lit, and the words stand as they will", () => {
    const tile = draw(h(PictureTile, { href: "/prayers/hours", heading: "h3", label: en["ui.theHours"], sub: en["ui.sanctifyTheDay"], picture: null }));
    expect(tile).not.toContain("<img");
    expect(tile).not.toContain("data-lit");
    expect(tile).not.toContain("tile-lit");
    expect(tile).toMatch(/<h3 class="tile-name [^"]*">The Hours<\/h3><p class="tile-line [^"]*text-paper\/80">Sanctify the day<\/p>/);
    const book = draw(h(PrayerBookContents, { hourNow: null }));
    expect(book.match(/data-chapter="/g)).toHaveLength(4);
    expect(book.match(/aria-expanded="true"/g)).toHaveLength(1);
    expect(book.match(/aria-expanded="false"/g)).toHaveLength(3);
    // The three shut pages are out of reach from the first frame.
    expect(book.match(/ inert=""/g)).toHaveLength(3);
    expect(book).not.toContain("data-lit");
    expect(book).toContain(`<span class="mt-0.5 block font-sans text-caption leading-[1.35] text-paper/55">${en["ui.sanctifyTheDay"]}</span>`);
  });

  it("once it knows: the tile lit with its Hour's icon, cut and arriving whole, the daily rule's row lit on the same icon", () => {
    const tile = draw(
      h(PictureTile, { href: "/prayers/hours", heading: "h3", label: en["ui.theHours"], sub: "Now · The Third Hour", picture: serviceArt("third-hour").src, crop: tileCrop("pentecost"), lit: true }),
    );
    expect(tile).toContain('data-lit="true"');
    expect(tile).toContain("tile-lit");
    const img = /<img [^>]*\/>/.exec(tile)?.[0] ?? "";
    for (const part of ['src="/icons/prayer/pentecost.jpg"', 'loading="lazy"', 'class="img-arrive absolute inset-0 h-full w-full object-cover"', 'style="object-position:50% 30%;transform:scale(1.22);transform-origin:50% 30%"']) {
      expect(img, part).toContain(part);
    }
    expect(tile).toContain('<p class="tile-line relative mt-1 font-sans text-caption leading-[1.35] text-paper">');
    const book = draw(h(PrayerBookContents, { hourNow: "third-hour" }));
    /** A row of the book by its address: its opening tag and what it holds, up to the next row. */
    const row = (href: string) => {
      const at = book.indexOf(`href="${href}"`);
      return at < 0 ? "" : book.slice(book.lastIndexOf("<a ", at), book.indexOf("</a>", at));
    };
    expect(book.match(/data-lit="true"/g)).toHaveLength(1);
    const hours = row("/prayers/hours");
    expect(hours).toMatch(/^<a [^>]*data-lit="true"/);
    expect(hours).toMatch(/^<a [^>]*class="[^"]*\bbook-lit\b/);
    expect(hours).toContain(`${en["prayers.rule.third-hour.title"]} · ${en["prayers.hoursIndex.nowMark"]}`);
    expect(hours).toContain('src="/icons/prayer/pentecost.jpg"');
    expect(hours).toContain('style="object-position:52% 30%;transform:scale(1.9);transform-origin:52% 30%"');
    // The akathists' row wears the Vladimir Theotokos, never lit.
    const akathists = row("/prayers/akathists");
    expect(akathists).toContain('src="/icons/prayer/theotokos-of-vladimir.jpg"');
    expect(akathists).not.toContain("data-lit");
    // Today's prayer, a row of the daily rule, to its page.
    expect(row("/prayers/today")).toContain("Today&#x27;s prayer");
    // Each prayer to its length.
    expect(book).toContain(en["prayers.approxMin.other"].replace("{count}", "8"));
  });
});

describe("one search on the phone's Prayers (note 72)", () => {
  it("is the bar's magnifier, turned to Prayers; the computer's /prayers keeps its own field", () => {
    const page = code(PAGE);
    expect(page).not.toMatch(/PrayerSearch|SearchDoor|openSearch/);
    expect(code("components/mobile/MobileHeader.tsx")).toContain("<SearchTrigger");
    expect(turnFor(placeForPath("/prayers/")).door).toBe("prayers");
    const desktop = code(DESKTOP);
    expect(desktop).toContain("<PrayerSearch>");
    expect(desktop).toContain('<PrayerBookIndex variant="desktop" />');
  });

  it("drops the names strip: Your rule's tile names them", () => {
    expect(code(PAGE)).not.toContain("DiptychPreview");
    expect(fs.existsSync(path.join(ROOT, "components/mobile/DiptychPreview.tsx"))).toBe(false);
  });
});

describe("every word on Practices and in the book", () => {
  it("is already in all 21 languages", () => {
    const keys = [
      "ui.practices",
      "prayers.bookTitle",
      "ui.theHours",
      "ui.sanctifyTheDay",
      "prayers.timeline.now",
      "prayers.hoursIndex.nowMark",
      "prayers.akathists",
      "ui.hymnsOfPraise",
      "ui.learnToPray",
      "ui.aBeginnersPath",
      "prayers.mine.title",
      "prayers.mine.youHint",
      "notFound.todaysPrayer",
      "study.planned",
      "prayers.akathist.theotokos.title",
      "prayers.approxMin.other",
      ...prayerBook().map((c) => c.nameKey),
      ...HOUR_STARTS.map((h) => `prayers.rule.${h.slug}.title`),
      ...prayerBook().flatMap((c) => [...c.lines, ...c.planned.map((rule) => ({ kind: "prayer" as const, rule }))]).flatMap((l) => (l.kind === "prayer" ? [`prayers.rule.${l.rule.id}.title`] : [])),
    ];
    expect(LOCALES).toHaveLength(21);
    for (const { code: lang } of LOCALES) {
      const m = JSON.parse(read(`lib/i18n/messages/${lang}.json`)) as Record<string, string>;
      for (const k of keys) expect(m[k]?.trim(), `${lang} ${k}`).toBeTruthy();
    }
  });
});
