// The phone's /bible is its picture and then an index: rows, one look.
//
// What a reader would notice if this broke: the page opening on a stack of
// different cards again (a card saying a card will appear, tinted pills, a
// band with a button, a lone tile) with the first book a whole screen down.
// The owner said of that screen on 2026-10-13: "this design has way too much
// stuff going on here", and chose the picture and then plain rows. Or the Old
// and New Testament switch back over the books, which his pick A of r3-20 took
// away (his note 65: "cut out the whole entire Old Testament and New
// Testament selectors"). The Bible tab opens the chapter itself since then
// (lib/bible/__tests__/lastRead.test.ts); this page is the whole list.
//
// This reads the source. How the screen is drawn in a built app is section 27
// of scripts/export-walk.mjs.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { BOOKS, bibleCanon } from "@/lib/bible/books";
import { getMessages } from "@/lib/i18n";

const root = join(__dirname, "..", "..", "..");
const read = (path: string) => readFileSync(join(root, path), "utf8").replace(/\r\n/g, "\n");
/** A file's code without its notes, so a note about the old look is not read as the look. */
const code = (path: string) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const SHELL = "components/mobile/BibleMobile.tsx";
const CONTINUE = "components/mobile/BibleMobileContinue.tsx";
const READINGS = "components/mobile/BibleAppointedToday.tsx";
const STUDY = "components/mobile/BibleStudyRow.tsx";
const BOOKS_LIST = "components/mobile/BibleBooks.tsx";
const UNDER_THE_PICTURE = [CONTINUE, READINGS, STUDY, BOOKS_LIST];

describe("the phone's /bible", () => {
  it("is the picture, then four pieces, in this order, and nothing else", () => {
    const shell = code(SHELL);
    const body = shell.slice(shell.indexOf("<MobileShell"), shell.indexOf("</MobileShell>"));
    const drawn = [...body.matchAll(/<([A-Z][A-Za-z]*)[\s/>]/g)].map((m) => m[1]);
    expect(drawn).toEqual([
      "MobileShell",
      "MobileHeader",
      "T",
      "SectionMasthead",
      "BibleMobileContinue",
      "BibleAppointedToday",
      "BibleStudyRow",
      "BibleBooks",
    ]);
  });

  it("draws every piece under the picture with the one row language", () => {
    for (const piece of UNDER_THE_PICTURE) {
      expect(code(piece), piece).toMatch(/from "\.\/IndexRows"/);
    }
    // The three lists are that file's list and rows; the study row, which is
    // two halves and not a list of links, wears the same list's look.
    for (const piece of [CONTINUE, READINGS, BOOKS_LIST]) {
      expect(code(piece), piece).toMatch(/<IndexList[\s>]/);
      expect(code(piece), piece).toMatch(/<IndexRow\s/);
    }
    expect(code(STUDY)).toContain("INDEX_LIST_LOOK");
  });

  it("has no card, band, tile or pill of another look, and no gold", () => {
    for (const piece of [SHELL, ...UNDER_THE_PICTURE, "components/mobile/IndexRows.tsx"]) {
      const source = code(piece);
      for (const other of ["MobileCard", "SoftTile", "FeatureBand", "BibleStudyLinks", "rounded-pill", "premium", "gold"]) {
        expect(source.includes(other), `${piece} has ${other}`).toBe(false);
      }
    }
  });

  it("lists both Testaments as one list, with no switch between them", () => {
    const books = code(BOOKS_LIST);
    expect(books).toContain("bibleCanon().map(");
    expect(books).toContain('t(testament === "OT" ? "bible.theOldTestament" : "bible.theNewTestament")');
    for (const gone of ['role="tablist"', 'role="tab"', "lastTestament", "useState", "footer.oldTestament", "footer.newTestament"]) {
      expect(books.includes(gone), gone).toBe(false);
    }
    // Every book once, the Old Testament's first, each opening at its first chapter.
    expect(books).toContain("href={`/bible/${b.slug}/1`}");
    const listed = bibleCanon().flatMap(({ categories }) => categories.flatMap((c) => c.books.map((b) => b.slug)));
    expect(listed).toHaveLength(BOOKS.length);
    expect(new Set(listed).size).toBe(BOOKS.length);
    expect(bibleCanon().map((t) => t.testament)).toEqual(["OT", "NT"]);
  });

  it("draws nothing for Continue reading when there is nothing to continue", () => {
    const source = code(CONTINUE);
    expect(source).toMatch(/if \(!last\) return null;/);
    // The empty card's line, "Open any chapter and this card will remember
    // where you left off.", is not drawn anywhere on the page.
    for (const piece of [SHELL, ...UNDER_THE_PICTURE]) {
      expect(code(piece).includes("ui.openAnyChapterAndThis"), piece).toBe(false);
    }
  });

  it("uses only words the catalog already had", () => {
    // No new wording went in with the new look: every line is one a reader
    // has already been shown, in every language the app has.
    const keys = [
      "bible.continueReading",
      "bible.continueAtVerse",
      "bible.continueAtVerseOf",
      "bible.appointedToday",
      "bible.readForCommemoration",
      "bible.kindGospelLong",
      "bible.kindEpistleLong",
      "bible.kindOtLong",
      "plans.title",
      "journal.title",
      "plans.studyTools",
      "bible.theOldTestament",
      "bible.theNewTestament",
      "bible.chAbbrev",
    ];
    const en = getMessages("en");
    for (const key of keys) expect(en[key], key).toBeTruthy();
    const used = UNDER_THE_PICTURE.map(code).join("\n");
    for (const key of keys) expect(used.includes(`"${key}"`), key).toBe(true);
    // And each reading's kind is one of the three the rows can name.
    expect(code(READINGS)).toMatch(/gospel: "bible\.kindGospelLong",\s+epistle: "bible\.kindEpistleLong",\s+ot: "bible\.kindOtLong",/);
  });
});
