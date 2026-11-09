// Where each verse of the app stands in a downloaded Bible, for Compare (1.9,
// the sheet's 14; his yes of 2026-11-09: "the Copenhagen maps, credited, the
// map file shared alike"). scripts/bibles/compare-map.mjs places them; this
// holds the files to what it makes, and the well-known places to where they
// are, each read in both texts when it was set here.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { BIBLES, placeBible } from "../../../scripts/bibles/compare-map.mjs";

type Run = [number, number, number, number] | [number, number, number, number, number];
type MapFile = { bible: string; license: string; credit: string; books: Record<string, Record<string, Run[]>> };

const read = (id: string) => JSON.parse(fs.readFileSync(path.join("data/bibles/maps", `${id}.json`), "utf8")) as MapFile;

/** Where the app's verse stands in the Bible, as "c:v" or "c:v-w", or null where it is not placed. */
function place(map: MapFile, book: string, chapter: number, verse: number): string | null {
  for (const r of map.books[book]?.[String(chapter)] ?? []) {
    if (verse < r[0] || verse > r[1]) continue;
    return r.length === 5 ? `${r[2]}:${r[3]}-${r[4]}` : `${r[2]}:${r[3] + (verse - r[0])}`;
  }
  return null;
}

describe("the verse maps for Compare", () => {
  it("are what the script makes from the texts and the Copenhagen mappings, and nothing else", () => {
    for (const { id, target, sameEdition } of BIBLES as { id: string; target: string; sameEdition: boolean }[]) {
      const { books } = placeBible(id, target, sameEdition) as unknown as { books: MapFile["books"] };
      expect(read(id).books, id).toEqual(books);
    }
  });

  it("are credited and shared under the Copenhagen Alliance's licence", () => {
    for (const { id } of BIBLES as { id: string }[]) {
      const map = read(id);
      expect(map.bible).toBe(id);
      expect(map.license).toBe("CC BY-SA 4.0");
      expect(map.credit).toContain("Copenhagen Alliance");
      expect(map.credit).toContain("CC BY-SA 4.0");
    }
    // Their files are kept as they came, at the commit the README names.
    const readme = fs.readFileSync("data/bibles/copenhagen/README.md", "utf8");
    expect(readme).toContain("519af776ab65d89a51e37f750779250f940459ef");
    for (const f of ["eng.json", "lxx.json", "rso.json", "LICENSE.md"]) {
      const hash = crypto.createHash("sha256").update(fs.readFileSync(path.join("data/bibles/copenhagen", f))).digest("hex");
      expect(readme, f).toContain(`\`${f}\` sha256 \`${hash}\``);
    }
  });

  it("point only at verses the Bible has", () => {
    for (const { id } of BIBLES as { id: string }[]) {
      const map = read(id);
      for (const [book, chapters] of Object.entries(map.books)) {
        const file = JSON.parse(fs.readFileSync(path.join("public/bibles", id, `${book}.json`), "utf8")) as { chapters: [number, string][][] };
        const has = new Set(file.chapters.flatMap((c, i) => (c ?? []).map(([v]) => `${i + 1}:${v}`)));
        for (const runs of Object.values(chapters))
          for (const r of runs) {
            const last = r.length === 5 ? r[4] : r[3] + (r[1] - r[0]);
            for (let v = r[3]; v <= last; v++) expect(has.has(`${r[2]}:${v}`), `${id} ${book} ${r[2]}:${v}`).toBe(true);
          }
      }
    }
  });

  it("place the well-known verses in the Synodal where it prints them", () => {
    const ru = read("ru-synodal");
    // The psalms one ahead of the English, their titles counted as verses.
    expect(place(ru, "psalms", 50, 1)).toBe("50:3");
    expect(place(ru, "psalms", 3, 1)).toBe("3:2");
    expect(place(ru, "psalms", 22, 1)).toBe("22:1");
    // The Septuagint's Jeremiah in the Hebrew's order.
    expect(place(ru, "jeremiah", 38, 31)).toBe("31:31");
    expect(place(ru, "jeremiah", 26, 18)).toBe("46:18");
    expect(place(ru, "daniel", 4, 7)).toBe("4:4");
    expect(place(ru, "numbers", 26, 16)).toBe("26:20");
    // One verse of the app in two of the Synodal's.
    expect(place(ru, "3-john", 1, 14)).toBe("1:14-15");
    expect(place(ru, "1-samuel", 20, 42)).toBe("20:42-43");
    // The doxology where the Synodal sets it.
    expect(place(ru, "romans", 16, 25)).toBe("14:24");
    // Left out where the texts say the standard is wrong: Daniel 6, which the
    // Copenhagen "rso" numbers as the Hebrew and this file as the English, and
    // 3 Maccabees, which it numbers as the Greek and this file does not.
    expect(ru.books.daniel?.["6"]).toBeUndefined();
    expect(ru.books["3-maccabees"]).toBeUndefined();
  });

  it("place the well-known verses in the Greek, Brenton's own edition in the app's order", () => {
    const grc = read("grc-lxx-patriarchal");
    // Malachi's last chapter is the Greek's 3:19-24, its last three verses in the Septuagint's order.
    expect(place(grc, "malachi", 4, 1)).toBe("3:19");
    expect(place(grc, "malachi", 4, 4)).toBe("3:22");
    expect(place(grc, "malachi", 4, 6)).toBe("3:24");
    // Joel in four chapters.
    expect(place(grc, "joel", 2, 28)).toBe("3:1");
    expect(place(grc, "joel", 3, 1)).toBe("4:1");
    expect(place(grc, "psalms", 50, 1)).toBe("50:3");
    expect(place(grc, "zechariah", 2, 5)).toBe("2:9");
    expect(place(grc, "isaiah", 64, 2)).toBe("64:1");
    expect(place(grc, "numbers", 16, 41)).toBe("17:6");
    expect(place(grc, "romans", 16, 25)).toBe("14:24");
    expect(place(grc, "3-john", 1, 14)).toBe("1:14-15");
  });

  it("place nearly all of the New Testament, numbered alike in all three", () => {
    for (const { id } of BIBLES as { id: string }[]) {
      const map = read(id);
      for (const book of ["matthew", "mark", "luke", "john", "acts", "romans", "hebrews", "revelation"]) {
        const dir = path.join("data/bible", book);
        const total = fs.readdirSync(dir).filter((f) => /^\d+\.json$/.test(f)).length;
        let verses = 0;
        let placed = 0;
        for (let c = 1; c <= total; c++) {
          const n = (JSON.parse(fs.readFileSync(path.join(dir, `${c}.json`), "utf8")) as { verses: unknown[] }).verses.length;
          verses += n;
          for (const r of map.books[book]?.[String(c)] ?? []) placed += r[1] - r[0] + 1;
        }
        expect(placed / verses, `${id} ${book}`).toBeGreaterThan(0.97);
      }
    }
  });
});
