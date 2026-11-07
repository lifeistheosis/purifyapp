// The KJV's numbering to the app's Septuagint (1.9, item 22): made from the
// two texts' words (scripts/bibles/verse-map.mjs). These hold it to places
// any reader of both Bibles knows, to the app's own verses, and to what it
// says of a verse the Septuagint does not have.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { fromKjv, mappedBooks } from "@/lib/bible/verseMap";

const ROOT = path.resolve(__dirname, "../../..");
const verseExists = (book: string, chapter: number, verse: number) => {
  const file = path.join(ROOT, "data/bible", book, `${chapter}.json`);
  if (!fs.existsSync(file)) return false;
  return (JSON.parse(fs.readFileSync(file, "utf8")) as { verses: { n: number }[] }).verses.some((v) => v.n === verse);
};
const words = (book: string, chapter: number, verse: number) =>
  (JSON.parse(fs.readFileSync(path.join(ROOT, "data/bible", book, `${chapter}.json`), "utf8")) as { verses: { n: number; text: string }[] }).verses.find(
    (v) => v.n === verse,
  )?.text ?? "";

describe("the KJV's numbering in the app's Septuagint", () => {
  it("places the verses everyone knows where the Septuagint has them", () => {
    const at = (book: string, c: number, v: number) => {
      const p = fromKjv(book, c, v);
      return p ? `${p.chapter}:${p.verse}` : null;
    };
    // The new covenant: Jeremiah's chapters stand in another order.
    expect(at("jeremiah", 31, 31)).toBe("38:31");
    // The Psalms one behind from 10 to 147, Psalm 9 holding the KJV's 10.
    expect(at("psalms", 23, 1)).toBe("22:1");
    expect(at("psalms", 51, 1)).toBe("50:1");
    expect(at("psalms", 110, 1)).toBe("109:1");
    expect(at("psalms", 10, 1)).toBe("9:21");
    expect(at("psalms", 1, 1)).toBe("1:1");
    // The Song of the Three before Daniel 3:24.
    expect(at("daniel", 3, 24)).toBe("3:91");
    // The commandments in the Septuagint's order: adultery, theft, murder.
    expect(at("exodus", 20, 13)).toBe("20:15");
    expect(at("exodus", 20, 14)).toBe("20:13");
    expect(at("exodus", 20, 15)).toBe("20:14");
    // Naboth's vineyard and the Syrian war, chapters 20 and 21 the other way round.
    expect(at("1-kings", 21, 1)).toBe("20:1");
    expect(at("1-kings", 20, 1)).toBe("21:1");
    // A chapter's first verse where the Hebrew begins it.
    expect(at("jonah", 1, 17)).toBe("2:1");
    // Malachi's "Remember the law of Moses" at the book's end.
    expect(at("malachi", 4, 4)).toBe("4:6");
    // Two KJV verses in one of Brenton's.
    expect(at("genesis", 2, 25)).toBe("3:1");
    expect(at("genesis", 3, 1)).toBe("3:1");
    // The same number where the two agree.
    for (const [book, c, v] of [["genesis", 1, 1], ["isaiah", 7, 14], ["isaiah", 53, 5], ["proverbs", 8, 22], ["micah", 5, 2], ["zechariah", 9, 9]] as const) {
      expect(at(book, c, v), `${book} ${c}:${v}`).toBe(`${c}:${v}`);
    }
    // The New Testament is numbered alike.
    expect(at("john", 1, 1)).toBe("1:1");
  });

  it("says a verse the Septuagint does not have is not there, never a neighbour", () => {
    // "The grass withereth... because the spirit of the LORD bloweth upon it" is not in the Septuagint.
    expect(fromKjv("isaiah", 40, 7)).toBeNull();
    expect(fromKjv("isaiah", 40, 8)).toEqual({ chapter: 40, verse: 8 });
  });

  it("lands every placed verse on a verse the app has, with the same matter", async () => {
    const map = JSON.parse(fs.readFileSync(path.join(ROOT, "data/bible/kjv-to-lxx.json"), "utf8")).books as Record<string, { moved: Record<string, string>; missing: string[] }>;
    expect(mappedBooks()).toHaveLength(39);
    for (const [book, m] of Object.entries(map)) {
      for (const to of Object.values(m.moved)) {
        const [c, v] = to.split(":").map(Number);
        expect(verseExists(book, c, v), `${book} ${to}`).toBe(true);
      }
    }
    // Spot words: the place says what the KJV verse says.
    expect(words("jeremiah", 38, 31)).toMatch(/new covenant/);
    expect(words("psalms", 22, 1)).toMatch(/shepherd/);
    expect(words("exodus", 20, 15)).toMatch(/kill/);
    expect(words("1-kings", 20, 1)).toMatch(/vineyard/);
  });

  it("places at least nineteen verses in twenty, and leaves the rest out rather than guess", () => {
    const map = JSON.parse(fs.readFileSync(path.join(ROOT, "data/bible/kjv-to-lxx.json"), "utf8")).books as Record<string, { missing: string[] }>;
    const missing = Object.values(map).reduce((n, m) => n + m.missing.length, 0);
    // 23,145 verses in the KJV's Old Testament.
    expect(missing / 23145).toBeLessThan(0.05);
  });
});
