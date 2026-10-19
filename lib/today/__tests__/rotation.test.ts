import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import versesJson from "@/data/today/verses.json";
import { getBook } from "@/lib/bible/books";

/**
 * The Verse of the Day's last resort: the rotation in data/today/verses.json,
 * shown on a day with nothing appointed.
 *
 * Its Old Testament references were once in the Hebrew and KJV numbering
 * while the app's Old Testament is Brenton's Septuagint, which numbers the
 * Psalms one lower for most of the Psalter and puts Jeremiah 29 at 36. So
 * "Psalm 23:1" loaded Brenton's Psalm 23, "The earth is the Lord's", and
 * Psalms 46:10, 51:10 and 119:105 loaded nothing at all. Each entry is now
 * in Brenton's numbering, keeps the familiar reference it was chosen by as
 * `kjv`, and is held here to the words it was chosen for.
 */

type Entry = { book: string; chapter: number; from: number; to: number; label: string; kjv?: string };

const ROTATION = (versesJson as { rotation: Entry[] }).rotation;
const ROOT = process.cwd();

function verseText(book: string, chapter: number, n: number): string | null {
  const file = path.join(ROOT, "data/bible", book, `${chapter}.json`);
  if (!fs.existsSync(file)) return null;
  const json = JSON.parse(fs.readFileSync(file, "utf8")) as { verses: { n: number; text: string }[] };
  return json.verses.find((v) => v.n === n)?.text.replace(/\s+/g, " ").trim() || null;
}

/** "Psalm 91:1–2" to its first verse, "Psalm 91:1". */
const firstVerse = (ref: string) => ref.replace(/[–-]\d+$/, "");

/**
 * The words each Old Testament entry was chosen for, by the familiar
 * reference it was chosen by, as Brenton's English has them. A new Old
 * Testament entry needs its line here.
 */
const INTENDED: Record<string, string> = {
  "Psalm 23:1": "The Lord tends me as a shepherd",
  "Psalm 27:1": "The Lord is my light",
  "Psalm 34:8": "Taste and see that the Lord is good",
  "Psalm 46:10": "Be still, and know that I am God",
  "Psalm 51:10": "Create in me a clean heart, O God",
  "Psalm 91:1": "He that dwells in the help of the Highest",
  "Psalm 103:8": "The Lord is compassionate and pitiful, long-suffering",
  "Psalm 119:105": "Thy law is a lamp to my feet",
  "Proverbs 3:5": "Trust in God with all thine heart",
  "Isaiah 40:31": "they that wait on God shall renew their strength",
  "Isaiah 53:5": "he was wounded on account of our sins",
  "Jeremiah 29:11": "a device of peace, and not evil",
  "Lamentations 3:22": "It is the mercies of the Lord",
  "Nahum 1:7": "The Lord is good to them that wait on him",
};

describe("the rotation", () => {
  it("has entries, so nothing below passes for want of any", () => {
    expect(ROTATION.length).toBeGreaterThan(20);
  });

  it("loads words for every entry", () => {
    const empty = ROTATION.filter((e) => !verseText(e.book, e.chapter, e.from)).map((e) => e.label);
    expect(empty).toEqual([]);
  });

  it("names the verse it loads, so the card's reference and the chapter it opens agree", () => {
    for (const e of ROTATION) {
      const m = /^(.*?)\s+(\d+):(\d+)(?:[–-](\d+))?$/.exec(e.label);
      expect(m, e.label).not.toBeNull();
      expect(Number(m![2]), e.label).toBe(e.chapter);
      expect(Number(m![3]), e.label).toBe(e.from);
      expect(Number(m![4] ?? m![3]), e.label).toBe(e.to);
      expect(getBook(e.book), e.label).toBeDefined();
    }
  });

  it("loads the verse each Old Testament entry was chosen for", () => {
    const wrong: string[] = [];
    for (const e of ROTATION.filter((x) => getBook(x.book)?.testament === "OT")) {
      const chosen = firstVerse(e.kjv ?? e.label);
      const words = INTENDED[chosen];
      const text = verseText(e.book, e.chapter, e.from) ?? "";
      if (!words) wrong.push(`${e.label}: no words to check it by (add ${chosen} to INTENDED)`);
      else if (!text.includes(words)) wrong.push(`${e.label} (chosen as ${chosen}) loads "${text.slice(0, 60)}"`);
    }
    expect(wrong).toEqual([]);
  });

  it("keeps the familiar reference only where Brenton numbers the verse otherwise", () => {
    for (const e of ROTATION) {
      if (!e.kjv) continue;
      expect(getBook(e.book)?.testament, e.label).toBe("OT");
      expect(e.kjv, e.label).not.toBe(e.label);
      // The same book, by its English name.
      expect(e.kjv.split(" ")[0], e.label).toBe(e.label.split(" ")[0]);
    }
  });

  it("reads the New Testament in the KJV's own numbering, which is the app's", () => {
    for (const e of ROTATION.filter((x) => getBook(x.book)?.testament === "NT")) {
      expect(e.kjv, e.label).toBeUndefined();
      expect(getBook(e.book)?.source, e.label).toBe("kjv-pd");
    }
  });
});
