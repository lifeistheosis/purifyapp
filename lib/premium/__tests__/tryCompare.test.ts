// Compare on the Plus screen (1.9, rec 85): its row, the lock that leads with
// it, and its Try it preview, whose words are each Bible's own.
//
// What it holds: the preview's lines are copied from the Bibles' files at the
// places the maps give (lib/premium/tryCompare.ts), the English is the app's,
// and a rebuilt Bible or map that moves a word fails here before a reader
// sees a verse its Bible does not say there; the row is a Plus row with its
// own words in every language; Compare's lock in a verse's Study opens the
// sheet on that row.
//
// What a reader would notice if this broke: a preview showing words a Bible
// does not have at that place, or the Plus sheet opening on the general list
// from Compare.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { placeIn, placeLabel, sameNumber, wordsAt, type CompareMap } from "@/lib/bible/compare";
import { DOWNLOADABLE_BIBLES, hasBook } from "@/lib/bible/downloads/catalog";
import type { BibleBookFile } from "@/lib/bible/downloads/store";
import { LOCKS } from "@/lib/analytics/lockCounting";
import { PLUS_ROWS, plusRowsLedBy } from "@/lib/premium/plusRows";
import { TRY_COMPARE, TRY_COMPARE_BIBLES, TRY_COMPARE_ENGLISH } from "@/lib/premium/tryCompare";

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");

const CATALOGS = Object.fromEntries(
  fs
    .readdirSync("lib/i18n/messages")
    .filter((f) => f.endsWith(".json"))
    .map((f) => [f.slice(0, -5), JSON.parse(read(`lib/i18n/messages/${f}`)) as Record<string, string>]),
);

describe("the Compare preview's verse", () => {
  const { book, chapter, verse } = TRY_COMPARE;

  it("is the app's own English", () => {
    const file = JSON.parse(read(`data/bible/${book}/${chapter}.json`)) as { verses: { n: number; text: string }[] };
    expect(TRY_COMPARE_ENGLISH).toBe(file.verses.find((v) => v.n === verse)?.text);
  });

  it("is each downloadable Bible's own words, at the place its map gives, in the catalog's order", () => {
    const bibles = DOWNLOADABLE_BIBLES.filter((b) => hasBook(b, book));
    expect(TRY_COMPARE_BIBLES.map((r) => r.bible)).toEqual(bibles.map((b) => b.id));
    for (const row of TRY_COMPARE_BIBLES) {
      const map = JSON.parse(read(`data/bibles/maps/${row.bible}.json`)) as CompareMap;
      const file = JSON.parse(read(`public/bibles/${row.bible}/${book}.json`)) as BibleBookFile;
      const place = placeIn(map, book, chapter, verse);
      expect(place, row.bible).not.toBeNull();
      expect(row.words, row.bible).toBe(wordsAt(file, place!));
      expect(row.at, row.bible).toBe(placeLabel(place!));
    }
  });

  it("shows what Compare is for: the Bibles number it otherwise than the app", () => {
    for (const row of TRY_COMPARE_BIBLES) {
      const map = JSON.parse(read(`data/bibles/maps/${row.bible}.json`)) as CompareMap;
      expect(sameNumber(placeIn(map, book, chapter, verse)!, chapter, verse), row.bible).toBe(false);
    }
    expect(new Set(TRY_COMPARE_BIBLES.map((r) => r.at))).toEqual(new Set(["50:3", "51:1"]));
  });

  it("is drawn by the Study sheet's own rows", () => {
    const preview = read("components/billing/plusTry/TryCompare.tsx");
    expect(preview).toContain('import { CompareBibleRow, CompareEnglishRow } from "@/components/bible/CompareSheet";');
    expect(preview).toContain('t("bible.compareCredit")');
    const sheet = read("components/bible/CompareSheet.tsx");
    expect(sheet).toContain("<CompareEnglishRow label=");
    expect(sheet).toContain("<CompareBibleRow key={b.id} bible={b} row={rowOf(b)} />");
  });
});

describe("Compare on the Plus screen", () => {
  it("is a Plus row of its own, after Ambience, and its lock leads with it", () => {
    const at = PLUS_ROWS.findIndex((r) => r.id === "compare");
    expect(PLUS_ROWS[at - 1]?.id).toBe("ambience");
    expect(PLUS_ROWS[at]).toMatchObject({ feature: "compare", name: "bible.compare", title: "plus.compare.title", body: "plus.compare.body", keep: "plus.compare.keep" });
    expect(plusRowsLedBy("compare")[0].id).toBe("compare");
    expect(LOCKS).toContain("compare");
  });

  it("opens from a verse's Study on Compare's own row", () => {
    const row = read("components/bible/VerseRow.tsx");
    expect(row).toMatch(/if \(plusAllowed === false\) upgrade\.open\("compare"\);/);
  });

  it("says it in every language, translated, never the English copied, and with no dash", () => {
    const en = CATALOGS.en;
    expect(Object.keys(CATALOGS)).toHaveLength(21);
    for (const key of ["plus.compare.title", "plus.compare.body", "plus.compare.keep"]) {
      expect(en[key], key).toBeTruthy();
      for (const [code, m] of Object.entries(CATALOGS)) {
        expect(m[key]?.trim(), `${code} ${key}`).toBeTruthy();
        expect(m[key], `${code} ${key}`).not.toMatch(/[—–]/);
        if (code !== "en") expect(m[key], `${code} ${key} is the English`).not.toBe(en[key]);
      }
      expect(CATALOGS.en[key]).not.toMatch(/\d/);
    }
    // The line the arbiter carried to him as 85.
    expect(en["plus.compare.body"]).toBe("See a verse in the Greek and in every Bible you can download, each at the place its own numbering puts it.");
  });
});
