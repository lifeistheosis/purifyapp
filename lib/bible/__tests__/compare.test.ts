// Compare (1.9, the sheet's 14): a verse of the app in each Bible the reader
// may show, at the place that Bible numbers it (lib/bible/compare.ts), from
// the verse's Study as a Plus tool (components/bible/CompareSheet.tsx).

import fs from "node:fs";

import { describe, expect, it } from "vitest";

import { placeIn, placeLabel, sameNumber, wordsAt, type CompareMap } from "../compare";
import { DOWNLOADABLE_BIBLES } from "../downloads/catalog";
import type { BibleBookFile } from "../downloads/store";

const map: CompareMap = {
  bible: "ru-synodal",
  license: "CC BY-SA 4.0",
  credit: "",
  books: {
    psalms: { "50": [[1, 19, 50, 3]] },
    "3-john": { "1": [[1, 13, 1, 1], [14, 14, 1, 14, 15]] },
  },
};

const file: BibleBookFile = {
  bible: "ru-synodal",
  book: "3-john",
  hash: "x",
  chapters: [[[13, "Многое имел я писать;"], [14, "а надеюсь скоро увидеть тебя"], [15, "Мир тебе."]]],
} as unknown as BibleBookFile;

describe("a verse's place in a Bible", () => {
  it("is found in its run, one for one, or in two of the Bible's verses", () => {
    expect(placeIn(map, "psalms", 50, 1)).toEqual({ chapter: 50, first: 3, last: 3 });
    expect(placeIn(map, "psalms", 50, 19)).toEqual({ chapter: 50, first: 21, last: 21 });
    expect(placeIn(map, "3-john", 1, 14)).toEqual({ chapter: 1, first: 14, last: 15 });
  });

  it("is nothing where it was not placed surely, never a guess", () => {
    expect(placeIn(map, "psalms", 50, 20)).toBeNull();
    expect(placeIn(map, "psalms", 51, 1)).toBeNull();
    expect(placeIn(map, "daniel", 6, 1)).toBeNull();
  });

  it("is said as the Bible numbers it, and only where it differs", () => {
    expect(placeLabel({ chapter: 50, first: 3, last: 3 })).toBe("50:3");
    expect(placeLabel({ chapter: 1, first: 14, last: 15 })).toBe("1:14-15");
    expect(sameNumber({ chapter: 50, first: 3, last: 3 }, 50, 1)).toBe(false);
    expect(sameNumber({ chapter: 2, first: 4, last: 4 }, 2, 4)).toBe(true);
  });

  it("gives the Bible's words there, its verses joined, or nothing if one is missing", () => {
    expect(wordsAt(file, { chapter: 1, first: 14, last: 15 })).toBe("а надеюсь скоро увидеть тебя Мир тебе.");
    expect(wordsAt(file, { chapter: 1, first: 15, last: 16 })).toBeNull();
    expect(wordsAt(file, { chapter: 2, first: 1, last: 1 })).toBeNull();
  });
});

describe("Compare in a verse's Study", () => {
  const row = fs.readFileSync("components/bible/VerseRow.tsx", "utf8");
  const sheet = fs.readFileSync("components/bible/CompareSheet.tsx", "utf8");
  const lib = fs.readFileSync("lib/bible/compare.ts", "utf8");

  it("is a Plus tool: it wears the mark and opens the upgrade sheet without Plus", () => {
    const at = row.slice(row.indexOf('key: "compare"'), row.indexOf("if (hasCommentary)"));
    expect(at).toContain('label: t("bible.compare")');
    expect(at).toContain("locked: plusAllowed === false");
    // Rec 85: the sheet opens on Compare's own row, lit, not on the general list.
    expect(at).toMatch(/if \(plusAllowed === false\) upgrade\.open\("compare"\);\s*else setCompareOpen\(true\);/);
  });

  it("is mounted only once asked for, so no verse loads anything before", () => {
    expect(row).toContain("{compareOpen ? (");
    expect(row).toContain("<CompareSheet open onClose={() => setCompareOpen(false)}");
  });

  it("has a map for every Bible a reader can download, each loaded on its own", () => {
    for (const b of DOWNLOADABLE_BIBLES) expect(lib).toContain(`"${b.id}": () => import("@/data/bibles/maps/${b.id}.json")`);
  });

  it("credits the Copenhagen Alliance under the verses, and compares no licensed translation", () => {
    expect(sheet).toContain('t("bible.compareCredit")');
    const en = JSON.parse(fs.readFileSync("lib/i18n/messages/en.json", "utf8")) as Record<string, string>;
    expect(en["bible.compareCredit"]).toContain("Copenhagen Alliance");
    expect(en["bible.compareCredit"]).toContain("CC BY-SA 4.0");
    // The English row is the app's own public-domain text; no licensed row is read.
    expect(sheet).not.toMatch(/\.licensed\b/);
    expect(sheet).toContain("DOWNLOADABLE_BIBLES.filter((b) => hasBook(b, book))");
  });
});
