import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { LOCALES } from "@/lib/i18n/locales";
import { streamedUrl } from "@/lib/media/streamed";
import { shouldShowBack } from "@/lib/nav/backBar";
import { BOOK_COVERS, FIGURES } from "@/lib/readAloud/covers";
import { WALKTHROUGHS } from "@/lib/walkthroughs";
import { walkCoverSrc } from "@/lib/walkthroughs/cover";

// The walkthroughs' screens since 1.7 (the owner's note 24 of 2026-10-16, in
// Homebase/boards/purify-master/r17/BRAINSTORM.md): "good concept, but the
// execution feels vibe coded: the star, the animations, the custom drawings,
// the line. Impeccable would flag it all over." The content stayed and the
// screens were built again on the app's own pieces: the Scripture is the page,
// a note opens in the movable sheet, the walk is a guided flow, and the only
// picture is the book's own icon. What can drift back in is held here; how
// the built app draws it is section 38 of scripts/export-walk.mjs.

const ROOT = process.cwd();
const read = (...parts: string[]) => fs.readFileSync(path.join(ROOT, ...parts), "utf8");
const exists = (...parts: string[]) => fs.existsSync(path.join(ROOT, ...parts));
const catalog = (code: string) => JSON.parse(read("lib", "i18n", "messages", `${code}.json`)) as Record<string, string>;

/** A file's code without its notes, so the prose about the old design cannot read as the design. */
const code = (file: string) =>
  read(file)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const COMPONENTS = fs
  .readdirSync(path.join(ROOT, "components", "walkthrough"))
  .filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"))
  .map((f) => `components/walkthrough/${f}`);
const PAGES = [
  "app/(app)/walkthroughs/page.tsx",
  "app/(app)/walkthroughs/[book]/page.tsx",
  "app/(app)/walkthroughs/[book]/[chapter]/page.tsx",
];
const SCREENS = [...COMPONENTS, ...PAGES];

const EM_DASH = String.fromCharCode(0x2014);
/** Arrows, checks, crosses, sparkles, stars and triangles set as characters in place of drawn icons. */
const GLYPHS = new RegExp(
  "[" +
    [[0x2190, 0x21ff], [0x2713, 0x2715], [0x2726, 0x2726], [0x2605, 0x2606], [0x25b2, 0x25bf]]
      .map(([a, b]) => `${String.fromCharCode(a)}-${String.fromCharCode(b)}`)
      .join("") +
    "]",
);

describe("the walkthroughs' screens", () => {
  it("are the files this reads", () => {
    // A rename would leave every check below passing on nothing.
    for (const f of [
      "components/walkthrough/WalkthroughsHub.tsx",
      "components/walkthrough/BookWalkClient.tsx",
      "components/walkthrough/ChapterWalkClient.tsx",
      "components/walkthrough/ChapterList.tsx",
      "components/walkthrough/WalkProgress.tsx",
      "components/walkthrough/WalkSheets.tsx",
      "components/walkthrough/Synthesis.tsx",
    ]) {
      expect(COMPONENTS, f).toContain(f);
    }
  });

  it("keep the house rules", () => {
    for (const file of SCREENS) {
      const src = code(file);
      // No yellow or gold, no all-caps letter-spaced labels, no gradient
      // words or grounds, no side stripes, no glyphs set as icons, no em dash.
      expect(src, file).not.toMatch(/gold|amber|yellow|premium/i);
      expect(src, file).not.toMatch(/\buppercase\b|tracking-wide|tracking-widest|tracking-\[0\.[1-9]/);
      expect(src, file).not.toMatch(/bg-clip-text|text-transparent|bg-gradient|linear-gradient|radial-gradient/);
      expect(src, file).not.toMatch(/border-l-\d|border-s-\d|border-l-\[|border-s-\[|border-r-\d|border-e-\d/);
      expect(src, file).not.toMatch(GLYPHS);
      expect(src.includes(EM_DASH), file).toBe(false);
      // Motion only through the motion switch.
      expect(src, file).not.toMatch(/(^|[\s"'`])(transition-(all|colors|opacity|transform)|animate-)/m);
    }
  });

  it("draw nothing of their own: no drawing, star, road, tilt or rising peek", () => {
    for (const gone of ["art.tsx", "Tapestry.tsx", "useTilt.ts", "ContextSheet.tsx"]) {
      expect(exists("components", "walkthrough", gone), gone).toBe(false);
    }
    for (const file of SCREENS) {
      const src = code(file);
      // Icons come from components/ui/icons; a screen draws no SVG itself.
      expect(src, file).not.toMatch(/<svg\b|<path\b|<circle\b/);
      expect(src, file).not.toMatch(/deviceorientation|requestPermission|walk-art|walk-peek|Tapestry|Glyph\b/);
    }
    // Nothing is left in the stylesheet for them.
    expect(read("app", "globals.css")).not.toMatch(/\.walk-[a-z]/);
    // The notes carry no drawing to show.
    for (const w of Object.values(WALKTHROUGHS)) {
      for (const c of w.chapters) for (const card of c.cards) expect(Object.keys(card), card.id).not.toContain("art");
    }
  });

  it("open a note, and the chapters, in the shared movable sheet", () => {
    const sheets = code("components/walkthrough/WalkSheets.tsx");
    expect((sheets.match(/<Sheet\b/g) ?? []).length).toBe(2);
    for (const file of COMPONENTS) {
      const src = code(file);
      expect(src, file).not.toMatch(/fixed inset-0|createPortal/);
    }
    // A note opens when it is asked for, and never rises by itself while the
    // reader reads: the chapter page listens to no scroll of its own.
    const chapter = code("components/walkthrough/ChapterWalkClient.tsx");
    expect(chapter).toMatch(/<NoteSheet\b/);
    expect(chapter).toMatch(/<ChaptersSheet\b/);
    expect(chapter).not.toMatch(/addEventListener\(\s*"scroll"/);
    expect(chapter).not.toMatch(/\bpeek\b/i);
  });

  it("show where the reader is with a line the scroll moves", () => {
    const progress = code("components/walkthrough/WalkProgress.tsx");
    expect(progress).toMatch(/useScrollFill\(fill\)/);
    expect(progress).toMatch(/t\("walk\.chapterOf"/);
    expect(code("components/walkthrough/ChapterWalkClient.tsx")).toMatch(/<WalkProgress\b/);
  });

  it("give every page its own bar, named by its own heading, and no second bar in the apps", () => {
    const named: [string, string, string][] = [
      ["app/(app)/walkthroughs/page.tsx", "walk-hub-title", "components/walkthrough/WalkthroughsHub.tsx"],
      ["app/(app)/walkthroughs/[book]/page.tsx", "walk-book-title", "components/walkthrough/BookWalkClient.tsx"],
      ["app/(app)/walkthroughs/[book]/[chapter]/page.tsx", "walk-chapter-title", "components/walkthrough/ChapterWalkClient.tsx"],
    ];
    for (const [page, id, component] of named) {
      expect(code(page), page).toMatch(/<MobileTopBar\b[^>]*\bback\b/);
      expect(code(page), page).toContain(`revealTitleOn="${id}"`);
      expect(code(component), component).toMatch(new RegExp(`<h1\\s[^>]*id="${id}"`));
    }
    for (const route of ["/walkthroughs", "/walkthroughs/job", "/walkthroughs/job/3"]) {
      expect(shouldShowBack(route), route).toBe(false);
    }
  });

  it("wear the book's own icon on the cover, the one the read-aloud covers carry", () => {
    for (const w of Object.values(WALKTHROUGHS)) {
      const figure = BOOK_COVERS[w.book];
      const file = figure && figure !== "plate" ? (FIGURES[figure]?.file ?? null) : null;
      expect(w.cover, w.book).toBe(file);
      if (w.cover) {
        expect(exists("public", w.cover), w.cover).toBe(true);
        // The address the build writes is the one the apps' streamed media use.
        expect(walkCoverSrc(w.cover, true)).toBe(streamedUrl(w.cover, true));
        expect(walkCoverSrc(w.cover, false)).toBe(w.cover);
      }
    }
    expect(walkCoverSrc(null, true)).toBeNull();
    // Through the one cover system, which shows the plate with the title
    // when the picture cannot load.
    for (const file of ["components/walkthrough/WalkthroughsHub.tsx", "components/walkthrough/BookWalkClient.tsx"]) {
      expect(code(file), file).toMatch(/<WorkCover\b[^>]*imageUrl=/);
    }
  });

  it("have every word in every language, and none of the old design's", () => {
    const en = catalog("en");
    const walk = Object.keys(en).filter((k) => k.startsWith("walk."));
    const retired = [
      "walk.eyebrow",
      "walk.statChapters",
      "walk.tapestryLabel",
      "walk.station",
      "walk.stationDone",
      "walk.chapterEyebrow",
      "walk.glyphHint",
      "walk.glyphLabel",
      "walk.open",
      "walk.close",
      "walk.backToText",
      "walk.synthesisEyebrow",
    ];
    const fresh = ["walk.chapterOf", "walk.noteLabel", "walk.walked", "walk.upNext", "walk.englishForNow", "walk.savedGroup"];
    expect(en["walk.chapterOf"]).toBe("Chapter {n} of {total}");
    expect(en["walk.upNext"]).toBe("Up next");
    expect(en["walk.walked"]).toBe("Walked");
    expect(en["walk.englishForNow"]).toBe("This walk is in English for now.");
    expect(en["walk.savedGroup"]).toBe("Walkthrough notes");
    expect(LOCALES.length).toBe(21);
    for (const { code: lang } of LOCALES) {
      const words = catalog(lang);
      for (const key of walk) {
        const has = key in words || Object.keys(words).some((k) => k.startsWith(`${key.replace(/\.(one|other)$/, "")}.`));
        expect(has, `${lang} ${key}`).toBe(true);
      }
      for (const key of Object.keys(words)) {
        expect(retired.includes(key) || /^walk\.stat(Cards|Reflections|Streak)\./.test(key), `${lang} still has ${key}`).toBe(false);
      }
      if (lang === "en") continue;
      // Real translations: a new line that is English in Georgian is not one.
      for (const key of fresh) expect(words[key], `${lang} ${key}`).not.toBe(en[key]);
    }
  });
});
