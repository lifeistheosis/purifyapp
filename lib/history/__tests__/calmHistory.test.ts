// Orthodox History, held to the owner's note 20 of 2026-10-16: "The
// interactive timeline's colored era backgrounds need redoing; it still uses
// the red dot ... every section is barely written; it needs better structure
// and photos." And to his patterns of the same day: one top bar, movable
// sheets, no generic AI look (the striped box, the sparkle, the red dot,
// gradient words, all-caps labels, arrows set as characters, coloured bands).
//
// What a reader would notice if this broke: a colour wash behind an era, a
// red dot on the line, a second line at the screen's edge, an arrow or a star
// drawn as a character, a gold toggle, the timeline under two bars in the
// apps, a picture the apps try to find in their own bundle, or a word in
// English on a Greek screen.
//
// This reads the source. How the built app draws it is section 42 of
// scripts/export-walk.mjs.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { CERTAINTY_LEVELS, EVENT_CATEGORIES, HISTORY_ERAS } from "@/lib/history/events";
import { LOCALES } from "@/lib/i18n/locales";
import { STREAMED_ROOTS } from "@/lib/media/streamed";

const root = join(__dirname, "..", "..", "..");
const read = (path: string) => readFileSync(join(root, path), "utf8").replace(/\r\n/g, "\n");
/** A file's code without its notes, so a note about the old timeline is not read as the timeline. */
const code = (path: string) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "");

const COMPONENTS = readdirSync(join(root, "components", "history"))
  .filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"))
  .map((f) => `components/history/${f}`);
const PAGES = ["app/(app)/history/page.tsx", "app/(app)/history/[slug]/page.tsx", "app/(app)/history/loading.tsx"];
const FILES = [...COMPONENTS, ...PAGES, "components/ui/icons/TimelineNode.tsx"];

describe("Orthodox History's look", () => {
  it("has no colour per era, no red dot and no retired face", () => {
    expect(existsSync(join(root, "components", "history", "eraHue.ts")), "eraHue.ts").toBe(false);
    for (const file of FILES) {
      const source = code(file);
      expect(source, `${file}: crimson`).not.toMatch(/\b(?:bg|border|text|ring)-crimson\b/);
      expect(source, `${file}: an era's hue`).not.toMatch(/era-hue|ERA_HUE|cinema-|account-(?:atmosphere|dropcap|ornament|reveal|parallax|slide)/);
      expect(source, `${file}: the retired display face`).not.toMatch(/font-display-serif/);
      expect(source, `${file}: gold`).not.toMatch(/\b(?:text|bg|border|ring)-(?:gold|yellow|amber|premium)\b/);
      expect(source, `${file}: a side stripe`).not.toMatch(/\bborder-[lrse]-(?:2|4)\b/);
      expect(source, `${file}: gradient words`).not.toMatch(/bg-clip-text/);
      expect(source, `${file}: capitals by CSS`).not.toMatch(/\buppercase\b/);
      expect(source, `${file}: letter-spaced labels`).not.toMatch(/tracking-(?:wide|wider|widest)\b/);
      expect(source, `${file}: a sparkle`).not.toMatch(/\bSparkle\b/);
    }
    const css = read("app/globals.css");
    expect(css).not.toMatch(/\.cinema-era|\.account-atmosphere|\.account-ornament|\.history-marker-in/);
    const history = css.slice(css.indexOf("/* ============================== History"), css.indexOf("/* ── Gift box"));
    expect(history, "the History rules name no crimson").not.toMatch(/crimson/);
  });

  it("draws its marks and never sets a character in their place", () => {
    // Arrows, chevrons, checks, daggers, triangles, stars and the era
    // ornaments of 1.6, and the decorative curly quote, written as their
    // codes so this file holds none of them.
    const glyphs = [
      0x2192, 0x2190, 0x203a, 0x2039, 0x2713, 0x2020, 0x25b3, 0x25b2, 0x2605, 0x2726, 0x2629, 0x2720, 0x2756,
      0x2736, 0x25c6, 0x2727, 0x2724, 0x273a, 0x271a, 0x25c8, 0x201c,
    ].map((c) => String.fromCharCode(c));
    for (const file of FILES) {
      const source = code(file);
      for (const g of glyphs) expect(source.includes(g), `${file} draws ${g}`).toBe(false);
    }
  });

  it("moves only behind the app's motion switch", () => {
    for (const file of FILES) {
      const source = code(file);
      for (const m of source.matchAll(/(?<![\w:-])(transition(?:-[a-z]+)?|animate-[a-z-]+|duration-\d+)(?![\w-])/g)) {
        expect(m[1], `${file}: ${m[1]} outside motion-safe:`).toBe("");
      }
    }
    const css = read("app/globals.css");
    // The picture's slow pan exists only under the switch.
    expect(css).toMatch(/:where\(\[data-motion="full"\]\) \.history-pan \{/);
    expect(css).not.toMatch(/^\.history-pan\s*\{/m);
  });
});

describe("the timeline", () => {
  it("is one quiet line with a drawn mark, its eras' names pinned, and no second line", () => {
    const core = code("components/history/TimelineCore.tsx");
    expect(core).toMatch(/<span aria-hidden className="absolute inset-y-0 start-\[6px\] w-px bg-paper\/12" \/>/);
    const row = code("components/history/EventRow.tsx");
    expect(row).toContain("<TimelineNode");
    expect(row).toContain('className="history-node');
    // A real link to the event, for a search engine and a reader without script.
    expect(row).toMatch(/<Link\s+href=\{`\/history\/\$\{event\.slug\}`\}/);
    const head = code("components/history/EraHeader.tsx");
    expect(head).toContain("history-era-head");
    expect(head).toContain("<ChevronDown");
    const css = read("app/globals.css");
    expect(css).toMatch(/\.history-era-head \{\n position: sticky;\n top: var\(--history-sticky-top\);/);
    expect(existsSync(join(root, "components", "history", "TimelineFastScroll.tsx")), "the second line").toBe(false);
    const page = code("components/history/HistoryTimelinePage.tsx");
    expect(page).not.toMatch(/TimelineFastScroll|history-controls|backdrop-blur/);
    // The century slider lives in the Eras sheet (and the computer's column), not in the page's flow.
    const eras = page.slice(page.indexOf("<Sheet open={erasOpen}"));
    expect(eras).toContain("<CenturyScrubber");
  });

  it("opens a row in a movable sheet on a phone, and every pop-up is the shared sheet", () => {
    const page = code("components/history/HistoryTimelinePage.tsx");
    expect(page).toContain("<EventPeekSheet");
    expect(page).toContain("<HistorySearchSheet");
    const peek = code("components/history/EventPeekSheet.tsx");
    expect(peek).toMatch(/<Sheet\b/);
    const search = code("components/history/HistorySearch.tsx");
    expect(search).toMatch(/<Sheet\b/);
    expect(search).not.toMatch(/fixed inset-0/);
  });

  it("wears its own bar, in the apps too, and not the back bar as well", () => {
    const timeline = code("app/(app)/history/page.tsx");
    expect(timeline).toMatch(/<MobileTopBar titleKey="nav\.discoverMenu\.history" back backFallback="\/discover" revealTitleOn="history-title" \/>/);
    expect(timeline).toContain('id="history-title"');
    const event = code("app/(app)/history/[slug]/page.tsx");
    expect(event).toMatch(/<MobileTopBar title=\{meta\.shortTitle \?\? meta\.title\} back backFallback="\/history" revealTitleOn="event-title" \/>/);
    const backBar = read("lib/nav/backBar.ts");
    expect(backBar).toContain("/^\\/history$/,");
    expect(backBar).toContain("/^\\/history\\/[^/]+$/,");
  });
});

describe("an event's page", () => {
  it("is in four parts, our words in DM Sans and the Church's own in Lora italic", () => {
    const article = code("components/history/EventArticle.tsx");
    for (const key of ["study.history.whatHappened", "study.history.part.matters", "study.history.part.people", "study.history.sources"]) {
      expect(article, key).toContain(`"${key}"`);
    }
    expect(article).toContain("<EventPartsNav");
    expect(article).toContain("<EventPeople");
    expect(article).toMatch(/<blockquote className="font-serif text-body italic/);
    expect(article).toMatch(/return <p className="font-sans text-body/);
    // One h1, the event's title.
    expect((article.match(/<h1\b/g) ?? []).length).toBe(1);
    for (const file of FILES.filter((f) => f !== "components/history/EventArticle.tsx" && f !== "app/(app)/history/page.tsx")) {
      expect(code(file), file).not.toMatch(/<h1\b/);
    }
  });

  it("shows its picture to every reader, and Immersive History with the Plus mark", () => {
    const page = code("app/(app)/history/[slug]/page.tsx");
    expect(page).toContain("<EventPictures");
    const pictures = code("components/history/EventPictures.tsx");
    expect(pictures).toContain("<PlusMark");
    expect(pictures).toContain('upgrade.open("history")');
    expect(pictures).toContain("usePlusFeatures()");
    expect(existsSync(join(root, "components", "history", "ImmersivePreviewCard.tsx"))).toBe(false);
    expect(existsSync(join(root, "components", "history", "EventHero.tsx"))).toBe(false);
  });
});

describe("History's pictures", () => {
  it("are the website's, asked for by the apps, and never named in a component", () => {
    expect(STREAMED_ROOTS).toContain("/history/media/");
    for (const file of FILES) {
      expect(code(file), `${file} names a picture's path`).not.toContain("/history/media/");
    }
  });
});

describe("History's words", () => {
  const en = JSON.parse(read("lib/i18n/messages/en.json")) as Record<string, string>;
  const registry: [string, string][] = [
    ...HISTORY_ERAS.flatMap((e) => [
      [`study.history.era.${e.id}.label`, e.label],
      [`study.history.era.${e.id}.short`, e.shortLabel],
      [`study.history.era.${e.id}.blurb`, e.blurb],
    ] as [string, string][]),
    ...EVENT_CATEGORIES.flatMap((c) => [
      [`study.history.category.${c.id}.label`, c.label],
      [`study.history.category.${c.id}.description`, c.description],
    ] as [string, string][]),
    ...CERTAINTY_LEVELS.flatMap((c) => [
      [`study.history.certainty.${c.id}.label`, c.label],
      [`study.history.certainty.${c.id}.gloss`, c.gloss],
    ] as [string, string][]),
  ];

  it("in English are the registry's English, letter for letter", () => {
    for (const [key, english] of registry) expect(en[key], key).toBe(english);
  });

  it("are in every language, with no arrow and no em dash", () => {
    const keys = [
      ...registry.map(([k]) => k),
      "study.history.countLine.other",
      "study.history.continueAt",
      "study.history.chooseEra",
      "study.history.eraCount.other",
      "study.history.timelineLabel",
      "study.history.filterWithCount",
      "study.history.shownCount",
      "study.history.noMatch",
      "study.history.part.matters",
      "study.history.part.people",
      "study.history.pill.story",
      "study.history.pill.meaning",
      "study.history.pill.people",
      "study.history.pill.sources",
      "study.history.partsNav",
      "study.history.howSure",
      "study.history.inScripture",
      "study.history.rel.councils",
      "study.history.rel.theology",
      "study.history.rel.heresies",
      "study.history.earlier",
      "study.history.later",
      "study.history.inEnglish",
      "study.history.morePictures.other",
      "study.history.morePicturesTitle",
      "study.history.viewInHistory",
    ];
    for (const { code: locale } of LOCALES) {
      // The catalog itself, not the merged one, which would lend English.
      const m = JSON.parse(read(`lib/i18n/messages/${locale}.json`)) as Record<string, string>;
      for (const key of keys) {
        expect(m[key]?.trim(), `${locale} ${key}`).toBeTruthy();
        expect(m[key]?.includes(String.fromCharCode(0x2014)), `${locale} ${key}: em dash`).toBe(false);
      }
      for (const [key, value] of Object.entries(m)) {
        if (!key.startsWith("study.history.")) continue;
        expect(value, `${locale} ${key}: an arrow`).not.toMatch(/[←→]/);
      }
      // The words retired with the 1.6 timeline are gone.
      for (const gone of ["study.eventsAcross", "study.erasCouncilsAndSchismsSaints", "study.continueExploring", "study.history.openFullAccountArrow", "study.history.viewInHistoryArrow", "study.exploreTheInteractiveTimeline"]) {
        expect(m[gone], `${locale} still has ${gone}`).toBeUndefined();
      }
    }
  });
});
