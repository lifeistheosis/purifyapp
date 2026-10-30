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
// 1.8, the top the owner locked on 2026-10-27 (round 3b D, "Fade and doors"):
// the icon fades in, the row, then four doors, Life, Writings, Web, Hymns,
// that switch what is below, the Web door opening the saint web, which is one
// screen with a Web / Timeline switch in its bar (round 1, A and B). What a
// reader would notice if that broke: a door with nothing behind it, the
// Miracles gone with nowhere to find them, a fade that ignores the motion
// setting, or the web reading the server where the apps have none.
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
  "components/saints/SaintDoors.tsx",
  "components/saints/HymnsSection.tsx",
];

/** The saint web: its own screen, with its own heading. */
const WEB = "app/(app)/saints/[slug]/web/page.tsx";
const WEB_FILES = [
  WEB,
  "components/saints/web/SaintWebScreen.tsx",
  "components/saints/web/WebViewSwitch.tsx",
  "components/saints/web/WebConstellation.tsx",
  "components/saints/web/WebKey.tsx",
  "components/saints/web/WebCard.tsx",
  "components/saints/web/WebLineMark.tsx",
  "components/saints/web/WebTimeline.tsx",
  "components/saints/web/WebAvatar.tsx",
  "components/saints/web/webWords.ts",
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

  it("has the design's doors, only those the saint has, and keeps every part in the page", () => {
    const page = code(PAGE);
    expect(page).toContain("saintDoors({");
    expect(page).toMatch(/<SaintDoors\b/);
    // The Web door opens the saint web on his name.
    expect(page).toContain("`/saints/${saint.slug}/web`");
    const doors = code("components/saints/SaintDoors.tsx");
    // Every part in the page, the others hidden, so a search engine reads them.
    expect(doors).toContain("hidden={id !== current}");
    // The part is kept in the address without a new entry in the history.
    expect(doors).toContain("window.history.replaceState(");
    expect(doors).not.toContain("pushState(");
    // The doors say which is open; the pinned copy is for the eye alone.
    expect(doors).toContain("aria-pressed={door === current}");
    expect(doors).toMatch(/ref=\{stripRef\}\s+aria-hidden/);
    // The 1.7 switch is gone from this page, not from the app.
    expect(page).not.toMatch(/<SectionTabs\b/);
  });

  it("keeps the Miracles, at the end of his Life, where the old address still lands", () => {
    const page = code(PAGE);
    expect(page).toContain("miracles={saint.hasMiracles ? <MiraclesSection slug={saint.slug} /> : undefined}");
    const life = code("components/saints/SaintLife.tsx");
    expect(life).toContain('id="miracles"');
    expect(life).toContain('<T k="saints.miracles" />');
  });

  it("fades the icon in and brings the rest in after it, on the motion switch", () => {
    expect(code("components/saints/SaintHeroPicture.tsx")).toContain("saint-icon-in");
    expect(code("components/saints/SaintHero.tsx")).toContain("saint-head-in");
    expect(code("components/saints/SaintDoors.tsx")).toContain("saint-head-in");
    const css = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const cls of ["saint-icon-in", "saint-head-in", "saint-doors-pin"]) {
      expect(css, cls).toContain(`:where([data-motion="reduce"]) .${cls}`);
    }
    // Opacity only: a transform would hold the pinned door row.
    const keyframes = /@keyframes saint-icon-in \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? "";
    expect(keyframes).toContain("opacity");
    expect(keyframes).not.toContain("transform");
  });

  it("puts Save in the bar on a phone and Share at the end of the row, as the design does", () => {
    const page = code(PAGE);
    expect(page).toMatch(/<BookmarkSaintButton[^>]*variant="bar"/);
    expect(page).toMatch(/trailing=\{save\}/);
    const hero = code("components/saints/SaintHero.tsx");
    expect(hero).toContain("<ShareButton title={saint.name} round />");
    // A computer has no such bar: Save stays in its row there.
    expect(hero).toContain('className="hidden md:inline-flex native-md-hidden"');
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

  it("names no element after a door, so a # never scrolls the page", () => {
    for (const file of FILES) {
      const source = code(file);
      for (const part of ["life", "writings", "hymns", "web"]) {
        expect(source, `${file} id="${part}"`).not.toContain(`id="${part}"`);
      }
    }
  });

  it("has its new words in every language", () => {
    const keys = [
      "saints.door.web",
      "saints.door.webAria",
      "saints.door.hymns",
      "saints.hymns.readInWork",
      "saints.web.title",
      "saints.web.viewLabel",
      "saints.web.timeline",
      "saints.web.kind.disciples",
      "saints.web.kind.lives",
      "saints.web.disciple",
      "saints.web.teacher",
      "saints.web.fromLifeOf",
      "saints.web.openHisPage",
      "saints.web.openHerPage",
      "saints.web.center",
      "saints.web.putBack",
      "saints.web.openCouncil",
      "saints.web.yearByYearHis",
      "saints.web.yearByYearHer",
      "saints.web.undatedHis",
      "saints.web.undatedHer",
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

describe("the saint web", () => {
  it("is one screen, the switch in its bar, the same web two ways", () => {
    // The page mounts its own bar, as every page does, the switch in it.
    expect(code(WEB)).toMatch(/<MobileTopBar[\s\S]*?center=\{<WebViewSwitch idBase="saint-web-bar" \/>\}/);
    const screen = code("components/saints/web/SaintWebScreen.tsx");
    expect(screen).toMatch(/<WebConstellation\b[^>]*\bdata=\{data\}/);
    expect(screen).toContain("<WebTimeline data={data} />");
    expect(screen).not.toMatch(/<MobileTopBar/);
    // The view is kept in the address, and back still leaves the screen.
    const view = code("components/saints/web/WebViewSwitch.tsx");
    expect(view).toContain("window.history.replaceState(");
    expect(view).not.toContain("pushState(");
    // One heading: the bar's control stands in the title's place.
    expect(WEB_FILES.map((f) => (code(f).match(/<h1\b/g) ?? []).length).reduce((a, b) => a + b, 0)).toBe(1);
  });

  it("is built for the apps: no cookies, no session, nothing read on the server per reader", () => {
    const page = code(WEB);
    expect(page).toContain("generateStaticParams");
    expect(page).toContain("webSlugs()");
    for (const banned of ["cookies(", "force-dynamic", "getServerLocale", "createClient", "headers("]) {
      expect(page, banned).not.toContain(banned);
    }
    // The registry stays on the server: the screen reads the shapes alone.
    for (const file of WEB_FILES.filter((f) => f !== WEB)) {
      expect(code(file), file).not.toMatch(/from "@\/lib\/saints\/(?:saints|web)"/);
    }
  });

  it("carries none of the generic look and draws its marks", () => {
    const glyphs = [0x2192, 0x2713, 0x2020, 0x25b3, 0x25b2, 0x201c].map((c) => String.fromCharCode(c));
    for (const file of WEB_FILES) {
      const source = code(file);
      expect(source, `${file}: a side stripe`).not.toMatch(/\bborder-[lr]-(?:2|4)\b/);
      expect(source, `${file}: capitals by CSS`).not.toMatch(/\buppercase\b/);
      expect(source, `${file}: blur over a moving page`).not.toMatch(/backdrop-blur/);
      for (const g of glyphs) expect(source.includes(g), `${file} draws ${g}`).toBe(false);
    }
  });
});
