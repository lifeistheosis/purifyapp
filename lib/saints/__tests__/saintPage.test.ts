// A saint's page on a phone (1.7). The owner's note 19 of 2026-10-16: "Clean,
// but it reads like the desktop page shrunk: the name's layout, 'Sign in to
// request' with a triangle, the 0 count, the 'What does requesting do?' line.
// The sheet that opens from that line is good (keep it). 'Read his works'
// should be the book rows of note 18." And the build decisions of the same
// day: the pill says "Ask for more writings".
//
// What a reader would notice if this broke: a triangle or a bare 0 back on
// the request, an arrow or a check drawn as a character, a second bar or a
// second name heading, the works as a grid of boxes again, or the saint's
// whole life written into the page twice for the works list.
//
// This reads the source. How the page is drawn in a built app is the "A
// saint on a phone" section of scripts/export-walk.mjs.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { LOCALES } from "@/lib/i18n/locales";

const root = join(__dirname, "..", "..", "..");
const read = (path: string) => readFileSync(join(root, path), "utf8").replace(/\r\n/g, "\n");
/** A file's code without its notes, so a note about the old page is not read as the page. */
const code = (path: string) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "");

const PAGE = "app/(app)/saints/[slug]/page.tsx";
const FILES = [
  PAGE,
  "components/saints/SaintHero.tsx",
  "components/saints/SaintHeroPicture.tsx",
  "components/saints/BumpButton.tsx",
  "components/saints/BookmarkSaintButton.tsx",
  "components/saints/SaintWritings.tsx",
  "components/saints/LicensedWorksSection.tsx",
  "components/saints/SaintLife.tsx",
  "components/saints/SaintFacts.tsx",
  "components/saints/LifeSection.tsx",
  "components/saints/TitlesSection.tsx",
  "components/saints/GreatFeastsSection.tsx",
  "components/saints/QuotesSection.tsx",
  "components/saints/DisciplesSection.tsx",
  "components/saints/MiraclesSection.tsx",
  "components/saints/SaintIntercession.tsx",
  "components/history/ViewInHistory.tsx",
  "components/covers/WorkCover.tsx",
  "components/covers/CoverListRow.tsx",
  "components/layout/SectionTabs.tsx",
  "components/ui/SegmentedSwitch.tsx",
];

describe("a saint's page", () => {
  it("wears its own bar: clear over the picture, the name arriving as his own scrolls away, back with a floor", () => {
    const page = code(PAGE);
    const bar = /<MobileTopBar\b[^>]*\/>/.exec(page)?.[0] ?? "";
    expect(bar).toContain('revealTitleOn="saint-name"');
    expect(bar).toContain('backFallback="/saints"');
    expect(bar).toMatch(/\bback\b/);
    expect(bar).toContain("overlay={Boolean(hero)}");
    // The bar's name is a copy for the eye; the page's h1 is the one heading.
    const topBar = code("components/nav/MobileTopBar.tsx");
    expect(topBar).toMatch(/revealTitleOn \? \(\s*<p\s+aria-hidden/);
    const hero = code("components/saints/SaintHero.tsx");
    expect(hero).toContain('<h1 id="saint-name"');
    for (const file of FILES.filter((f) => f !== "components/saints/SaintHero.tsx")) {
      expect(code(file), file).not.toMatch(/<h1\b/);
    }
  });

  it("is in parts, offering only those the saint has, and keeps every part in the page", () => {
    const page = code(PAGE);
    expect(page).toContain("saintTabs({");
    expect(page).toMatch(/<SectionTabs idBase="saint" labelKey="saints\.sectionSwitcher" tabs=\{tabs\} \/>/);
    const tabs = code("components/layout/SectionTabs.tsx");
    // Every part in the page, the others hidden, so a search engine reads them.
    expect(tabs).toContain("hidden={tab.id !== current}");
    // The part is kept in the address without a new entry in the history.
    expect(tabs).toContain("window.history.replaceState(");
    expect(tabs).not.toContain("pushState(");
  });

  it("asks with one clear pill: no triangle, no bare count, and the sheet he liked behind a drawn i", () => {
    const bump = code("components/saints/BumpButton.tsx");
    expect(bump).not.toMatch(/RequestMark|<path d="M6\.5 1\.4/);
    expect(bump).toContain('t("saints.ask.label")');
    expect(bump).toContain("askLine(total)");
    // The count is words, never the number on its own.
    expect(bump).not.toMatch(/>\s*\{total\}\s*</);
    expect(bump).not.toContain("saints.bump.signInToRequest");
    // The explainer: a drawn icon opening the same shared sheet, same words.
    expect(bump).toContain("data-saint-explainer");
    expect(bump).toContain("<Info ");
    expect(bump).toMatch(/<Sheet\b/);
    for (const key of ["saints.bump.requesting", "saints.bump.requestExplainer1", "saints.bump.requestQuote", "saints.bump.requestExplainer2"]) {
      expect(bump, key).toContain(`t("${key}")`);
    }
  });

  it("shows his works as cover rows, handed only what they draw", () => {
    const page = code(PAGE);
    expect(page).toMatch(/<SaintWritings\b/);
    expect(page).not.toMatch(/<SaintWritings[^>]*\bsaint=\{/);
    const writings = code("components/saints/SaintWritings.tsx");
    expect(writings).toContain("<CoverListRow");
    expect(writings).toContain("<WorkCover");
    expect(writings).toContain("workHref(");
    // A type is not a value: the registry stays out of the page's script.
    expect(writings).toMatch(/import type \{ Work \} from "@\/lib\/saints\/saints";/);
    for (const gone of ["SaintWorksBrowser", "WritingsList", "LicensedWorkCover"]) {
      expect(existsSync(join(root, "components", "saints", `${gone}.tsx`)), gone).toBe(false);
    }
  });

  it("draws its marks and never sets a character in their place", () => {
    // → ✓ † △ ▲ and the decorative curly quote, written as their codes so this
    // file holds none of them.
    const glyphs = [0x2192, 0x2713, 0x2020, 0x25b3, 0x25b2, 0x201c].map((c) => String.fromCharCode(c));
    for (const file of FILES) {
      const source = code(file);
      for (const g of glyphs) expect(source.includes(g), `${file} draws ${g}`).toBe(false);
    }
  });

  it("carries none of the generic look the owner named", () => {
    for (const file of FILES) {
      const source = code(file);
      expect(source, `${file}: the retired display face`).not.toMatch(/font-display-serif/);
      expect(source, `${file}: a side stripe`).not.toMatch(/\bborder-[lr]-(?:2|4)\b/);
      expect(source, `${file}: gradient words`).not.toMatch(/bg-clip-text/);
      expect(source, `${file}: capitals by CSS`).not.toMatch(/\buppercase\b/);
    }
  });

  it("names no element after a part, so a # never scrolls the page", () => {
    for (const file of FILES) {
      const source = code(file);
      for (const part of ["life", "writings", "miracles"]) {
        expect(source, `${file} id="${part}"`).not.toContain(`id="${part}"`);
      }
    }
  });

  it("has its new words in every language", () => {
    const keys = [
      "saints.tab.life",
      "saints.ask.label",
      "saints.ask.asked",
      "saints.ask.first",
      "saints.ask.signInAria",
      "saints.ask.count.other",
      "saints.iconAlt",
      "study.history.exploreTimeline",
    ];
    for (const { code: locale } of LOCALES) {
      // The catalog itself, not the merged one, which would lend English.
      const m = JSON.parse(read(`lib/i18n/messages/${locale}.json`)) as Record<string, string>;
      for (const key of keys) {
        expect(m[key]?.trim(), `${locale} ${key}`).toBeTruthy();
        expect(m[key]?.includes(String.fromCharCode(0x2014)), `${locale} ${key}`).toBe(false);
      }
      // The timeline's line is words alone now: its arrow went with the glyph.
      expect(m["study.history.exploreTimeline"], locale).not.toMatch(/[←→]/);
    }
  });
});
