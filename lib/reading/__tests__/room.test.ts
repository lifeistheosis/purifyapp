// The reading room and a book's page (1.7), read as source. The owner's note
// 18 of 2026-10-16 ("a Netflix for books") and the patterns he named across
// his notes: the generic AI look (a striped box, a sparkle, an arrow or a
// triangle set as a character, gradient words, capitals by CSS, the retired
// display face), a desktop page shrunk onto a phone, and a list where he
// wants covers.
//
// What a reader would notice if this broke: an arrow character back on a row,
// the room in English in the apps, a filter that opens a box instead of the
// sheet every picker opens, a cover with a wash over its icon, or a book's
// page whose title is not its one heading.
//
// How the built app draws it is section 41 of scripts/export-walk.mjs.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8").replace(/\r\n/g, "\n");
/** A file's code without its notes, so a note about the old room is not read as the room. */
const code = (p: string) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "");

const ROOM = "app/(app)/reading/page.tsx";
const WORK = "app/(app)/saints/[slug]/[work]/page.tsx";
const FILES = [
  ROOM,
  "components/reading/ReadingRoom.tsx",
  "components/reading/ReadingSearch.tsx",
  "components/reading/FilterSheet.tsx",
  "components/reading/FeaturedWork.tsx",
  "components/reading/CoverRow.tsx",
  "components/reading/BookHeader.tsx",
  "components/reading/ChaptersList.tsx",
  "components/reading/MoreLikeThis.tsx",
  "components/covers/WorkCover.tsx",
  "components/saints/WritingReader.tsx",
  "components/saints/MobileWorkPill.tsx",
  // 1.8: the row by feeling and the Purify collections.
  "components/reading/FeelingsRow.tsx",
  "components/reading/CollectionView.tsx",
  "app/(app)/reading/collections/[slug]/page.tsx",
];

describe("the reading room", () => {
  it("is one screen at every width, built from the room's cards, with no word looked up on the server", () => {
    const page = code(ROOM);
    expect(page).toContain("<ReadingRoom room={buildRoom(IS_STATIC_EXPORT)}");
    expect(page).not.toMatch(/\bgetMessages\b|\bt\(\s*m\s*,|native-md-hidden/);
    for (const gone of ["components/mobile/ReadingMobile.tsx", "components/reading/ContinueReading.tsx", "components/reading/NextRead.tsx"]) {
      expect(existsSync(join(root, gone)), gone).toBe(false);
    }
    // Reading sits under the apps' back bar, which is pinned already.
    expect(code("components/reading/ReadingRoom.tsx")).toContain('<MobileHeader titleKey="nav.reading" sticky={false} />');
  });

  it("keeps its search in the address without asking the server for the page again", () => {
    const room = code("components/reading/ReadingRoom.tsx");
    expect(room).toContain("useSearchParams()");
    expect(room).toMatch(/<Suspense fallback=\{null\}>\s*<AddressSync/);
    expect(room).toContain("window.history.replaceState(");
    expect(room).not.toMatch(/router\.(push|replace)\(/);
  });

  it("puts Short reads first, and New to Orthodoxy above it for a reader who said they are new (1.8)", () => {
    // The owner, 2026-10-17: "I want short reads at the top. If they're new
    // to Orthodoxy, you put new to Orthodoxy at the top also."
    const room = code("components/reading/ReadingRoom.tsx");
    expect(room).toContain("useSpace()");
    expect(room).toContain('level === "inquirer" || level === "learning"');
    const home = room.slice(room.indexOf("<FeaturedWork"));
    const order = ["{beginner ? firstReads : null}", 'id="short"', "<FeelingsRow", 'id="life"', "{beginner ? null : firstReads}", 'id="passions"'];
    const at = order.map((s) => home.indexOf(s));
    for (const [i, s] of order.entries()) expect(at[i], s).toBeGreaterThan(-1);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    // The row by feeling opens the collections, and the room carries none of their passages.
    expect(code("components/reading/FeelingsRow.tsx")).toContain("collectionHref(door.slug)");
    expect(room).not.toMatch(/from "@\/lib\/reading\/collections"/);
  });

  it("opens every filter in the shared movable sheet", () => {
    expect(code("components/reading/FilterSheet.tsx")).toMatch(/<Sheet\b[^>]*\bdesktop\b/);
    expect(code("components/reading/ReadingSearch.tsx")).toContain("<FilterSheet");
  });

  it("draws covers as posters: the picture full bleed with no card around it, the words on it over a fade, dark on every palette, the words on the link", () => {
    const cover = code("components/covers/WorkCover.tsx");
    expect(cover).toContain("dark-island");
    // No card (the owner's note of 2026-10-17): no frame, no ring, no border,
    // no inset window; the picture fills the poster.
    expect(cover).not.toMatch(/\bring-|\bborder\b|\bborder-|mix-blend|bg-clip-text/);
    expect(cover).toMatch(/"absolute inset-0 h-full w-full object-cover/);
    // The words sit on a fade at the foot, and the picture arrives by fading in.
    expect(cover).toMatch(/data-cover-words=""[^>]*absolute inset-x-0 bottom-0/);
    expect(cover).toContain("motion-safe:transition-opacity");
    expect(cover).toMatch(/<div\s+aria-hidden\s+data-cover=""\s+className=\{/);
    for (const file of ["components/reading/CoverRow.tsx", "components/reading/ReadingSearch.tsx"]) {
      expect(code(file), file).toContain('className="sr-only"');
    }
  });
});

describe("the room's pictures (1.8, the owner's note 13 of build 80)", () => {
  // "Opening the reading room while its pictures load breaks the immersion":
  // grey boxes stood where the covers would be and the pictures landed on
  // them one by one, and the day's book appeared at once with its backdrop
  // popping in behind it. Each now waits in the page's own colour and arrives
  // whole, on the app's motion switch, and the first are asked for early.
  const cover = code("components/covers/WorkCover.tsx");
  const stage = code("components/reading/FeaturedWork.tsx");
  const css = read("components/reading/room.module.css").replace(/\/\*[\s\S]*?\*\//g, "");

  it("hold a cover's place in the page's colour and fade the whole poster in once its picture is in", () => {
    expect(cover).toContain('hold?: "self" | "parent"');
    expect(cover).toMatch(/const arrived = src === null \|\| shown \|\| bare === src \|\| gone === src;/);
    expect(cover).toMatch(/const held = hold === "self" && !arrived;/);
    // The whole poster, shadow and words with it, is see-through while held,
    // and its fade answers to the motion switch, on the house's curve.
    expect(cover).toMatch(/hold === "self" && "motion-safe:transition-opacity motion-safe:duration-500 motion-safe:ease-\[var\(--ease-house\)\]"/);
    expect(cover).toMatch(/held && "opacity-0"/);
    expect(cover).toContain('data-cover-held={held ? "" : undefined}');
    // The picture fades on its own only over a plate that came first, so the
    // poster and its picture never fade at once.
    expect(cover).toMatch(/const fades = !hold \|\| bare === src;/);
    expect(cover).toMatch(/fades && "motion-safe:transition-opacity/);
    // A picture that fails ends the wait at once; a slow one after HOLD_MS.
    expect(cover).toMatch(/const fail = \(failed: string\) => \{\s*setBare\(failed\);/);
    expect(cover).toMatch(/setTimeout\(\(\) => setBare\(src\), HOLD_MS\)/);
  });

  it("hold every cover the room draws: the rows, the search's grid, the day's book", () => {
    expect(code("components/reading/CoverRow.tsx")).toMatch(/<WorkCover\b[^>]*\beager=\{near\}\s+hold="self"/);
    // The grid's first screen is asked for at once, so it waits HOLD_MS at most.
    expect(code("components/reading/ReadingSearch.tsx")).toMatch(/<WorkCover\b[^>]*size="grid" eager=\{i < FIRST_SCREEN\} hold="self"/);
    expect(stage).toMatch(/<WorkCover\b[^>]*\bpriority\s+hold="parent"\s+onArrive=\{\(\) => setReady\(card\.key\)\}/);
  });

  it("keep the day's stage unseen at its full size until its poster can be seen, then bring it in whole", () => {
    expect(stage).toContain('data-held={held ? "" : undefined}');
    expect(stage).toContain("const held = !card || ready !== card.key;");
    expect(stage).not.toMatch(/"invisible"/);
    expect(css).toMatch(/\.hero\[data-held\] \{\s*visibility: hidden;\s*opacity: 0;\s*\}/);
    // The size it keeps is the size of what arrives, so the rows never move.
    // A phone: 20 above, the 200 by 300 poster, 20, a line of facts (12px at
    // the page's 1.55), two lines of blurb (13px at 1.55) 8 under it, Read (20
    // and 48), 8 below: 482.9. From a tablet's width: the 220 by 330 poster
    // and 48 above and below it, 426.
    const phone = 20 + 300 + 20 + 12 * 1.55 + 8 + 2 * 13 * 1.55 + 20 + 48 + 8;
    const held = Number(/"flex min-h-\[(\d+)px\]/.exec(stage)?.[1]);
    const wide = Number(/md:min-h-\[(\d+)px\]/.exec(stage)?.[1]);
    expect(held).toBeGreaterThanOrEqual(Math.ceil(phone));
    expect(held - phone).toBeLessThan(4);
    expect(wide).toBe(330 + 48 * 2);
  });

  it("draw the stage's backdrop from the poster's own file and dim it in once it has loaded", () => {
    expect(stage).toMatch(/<picture className="contents">\s*\{artAvif \? <source type="image\/avif" srcSet=\{artAvif\} \/> : null\}/);
    expect(stage).toContain('data-shown={lit === art.src ? "" : undefined}');
    expect(css).toMatch(/\.heroArt \{[^}]*opacity: 0;/);
    expect(css).toMatch(/\.heroArt\[data-shown\] \{\s*opacity: 0\.32;/);
    expect(css).toMatch(/html\[data-reading-mode="parchment"\] \.heroArt\[data-shown\] \{\s*opacity: 0\.13;/);
  });

  it("fade the stage and its backdrop only on the app's motion switch", () => {
    expect(css).toMatch(/:where\(\[data-motion="full"\]\) \.hero,\s*:where\(\[data-motion="full"\]\) \.heroArt \{\s*transition: opacity var\(--duration-slow\) var\(--ease-house\);/);
    expect(css).toMatch(/:where\(\[data-motion="reduce"\]\) \.hero,\s*:where\(\[data-motion="reduce"\]\) \.heroArt \{\s*transition: none;/);
    // No transition on the stage outside the switch.
    for (const m of css.matchAll(/([^{}]+)\{[^{}]*\btransition\s*:\s*opacity[^;{}]*;/g)) {
      expect(m[1], m[1].trim()).toContain(':where([data-motion="full"])');
    }
  });

  it("ask for the first pictures as the room is drawn: the day's book first, then the first covers of the row under it", () => {
    const room = code("components/reading/ReadingRoom.tsx");
    expect(room).toContain('import { preload } from "react-dom";');
    expect(room).toMatch(/preload\(avif \?\? cover\.src, \{ as: "image"/);
    expect(room).toMatch(/if \(!open\) \{\s*warm\(featuredCard\?\.cover, true\);\s*for \(const c of \(beginner \? begin : short\)\.slice\(0, FIRST_SEEN\)\) warm\(c\.cover\);/);
  });
});

describe("a book's page", () => {
  it("is the work's own page, with the book's header above its text and more like it below", () => {
    const page = code(WORK);
    expect(page).toContain("bookPage(found.saint, found.work.slug, IS_STATIC_EXPORT)");
    expect(page).toContain("<BookHeader {...book.header} />");
    expect(page).toContain("<MoreLikeThis workKey={book.key} cards={book.like} />");
    // The slim bar names the book once the header has scrolled away.
    expect(page).toContain('revealTitleOn="work-title"');
  });

  it("has the title as its one heading, in the header, and the chapters on every screen", () => {
    expect(code("components/reading/BookHeader.tsx")).toContain('<h1 id="work-title"');
    const reader = code("components/saints/WritingReader.tsx");
    expect(reader).not.toMatch(/<h1\b/);
    expect(reader).toContain("<ChaptersList");
    expect(reader).not.toContain("<details");
    // Every chapter title of a long work stays in the page (the walk's section 5).
    expect(reader).toMatch(/\{sec\.title\}/);
  });

  it("records how far the reader is, beside the resume place", () => {
    const reader = code("components/saints/WritingReader.tsx");
    expect(reader).toContain("recordProgress(");
    expect(reader).toContain("savePosition(saint.slug, content.slug, bestN)");
  });
});

describe("the room and the book's page", () => {
  it("draw their marks and never set a character in their place", () => {
    // → ← › ‹ ✓ † △ ▲ ★ ✦ and the decorative curly quote, written as their codes so this file holds none of them.
    const glyphs = [0x2192, 0x2190, 0x203a, 0x2039, 0x2713, 0x2020, 0x25b3, 0x25b2, 0x2605, 0x2726, 0x201c].map((c) => String.fromCharCode(c));
    for (const file of FILES) {
      const source = code(file);
      for (const g of glyphs) expect(source.includes(g), `${file} draws ${g}`).toBe(false);
    }
  });

  it("carry none of the generic look the owner named", () => {
    for (const file of FILES) {
      const source = code(file);
      expect(source, `${file}: the retired display face`).not.toMatch(/font-display-serif/);
      expect(source, `${file}: a side stripe`).not.toMatch(/\bborder-[lrse]-(?:2|4)\b/);
      expect(source, `${file}: gradient words`).not.toMatch(/bg-clip-text/);
      expect(source, `${file}: capitals by CSS`).not.toMatch(/\buppercase\b/);
      expect(source, `${file}: letter-spaced labels`).not.toMatch(/tracking-(?:wide|wider|widest)\b/);
      expect(source, `${file}: yellow`).not.toMatch(/\b(?:text|bg|border)-(?:gold|yellow|amber|premium)\b/);
      expect(source, `${file}: a sparkle`).not.toMatch(/\bSparkle\b/);
    }
  });

  it("move only behind the app's motion switch", () => {
    for (const file of FILES) {
      const source = code(file);
      // A transition that is not a press utility answers to motion-safe:.
      for (const m of source.matchAll(/(?<![\w:-])(transition(?:-[a-z]+)?|animate-[a-z-]+|duration-\d+)(?![\w-])/g)) {
        expect(m[1], `${file}: ${m[1]} outside motion-safe:`).toBe("");
      }
    }
  });
});
