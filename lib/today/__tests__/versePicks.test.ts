import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { END_OF_CHAPTER, officialDay, type OfficialReading } from "@/lib/calendar/officialReadings";
import { VERSE_PICKS, shownVerse, versePickFor, type VersePick } from "@/lib/today/versePicks";

/**
 * The chosen Verse of the Day, held to the owner's rule of 2026-10-10.
 *
 * `faults` is the whole rule as a function: give it a set of picks and it
 * says what is wrong with them. It is run on the approved list in
 * data/today/verse-picks.json, and on small made-up lists that prove it can
 * tell a good pick from a bad one, so an empty list cannot make it look
 * stricter than it is.
 */

const ROOT = process.cwd();
const EM_DASH = String.fromCharCode(0x2014);

function verseText(book: string, chapter: number, verse: number): string | null {
  const file = path.join(ROOT, "data/bible", book, `${chapter}.json`);
  if (!fs.existsSync(file)) return null;
  const json = JSON.parse(fs.readFileSync(file, "utf8")) as { verses: { n: number; text: string }[] };
  const found = json.verses.find((v) => v.n === verse);
  return found ? found.text.replace(/\s+/g, " ").trim() : null;
}

const within = (r: OfficialReading | null, p: VersePick) =>
  !!r && r.segments.some((s) => s.book === p.book && s.chapter === p.chapter && p.verse >= s.from && (s.to === END_OF_CHAPTER || p.verse <= s.to));

function faults(picks: Record<string, VersePick>): string[] {
  const out: string[] = [];
  const lastUsed = new Map<string, string>();
  for (const date of Object.keys(picks).sort()) {
    const p = picks[date];
    const name = `${date} ${p.book} ${p.chapter}:${p.verse}`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T12:00:00Z`))) out.push(`${name}: not a date`);
    if (p.from !== "reading" && p.from !== "related") out.push(`${name}: from must be reading or related`);
    const whole = verseText(p.book, p.chapter, p.verse);
    if (whole === null) {
      out.push(`${name}: not a verse of our Bible`);
      continue;
    }
    if (p.part !== undefined && (!p.part.trim() || !whole.includes(p.part))) out.push(`${name}: the part is not an exact piece of the verse`);
    const shown = shownVerse(whole, p);
    if (/ [,.;:!?]/.test(shown)) out.push(`${name}: a stray space before punctuation in what is shown`);
    if (shown.includes(EM_DASH)) out.push(`${name}: an em dash in what is shown`);
    if (p.from === "reading") {
      const day = officialDay(date);
      if (!day) out.push(`${name}: the official list does not answer for that day`);
      else if (!within(day.epistle, p) && !within(day.gospel, p)) out.push(`${name}: not in that day's own Epistle or Gospel`);
    }
    const key = `${p.book} ${p.chapter}:${p.verse}`;
    const before = lastUsed.get(key);
    if (before && (Date.parse(`${date}T12:00:00Z`) - Date.parse(`${before}T12:00:00Z`)) / 86_400_000 < 31) {
      out.push(`${name}: the same verse as ${before}, inside a month`);
    }
    lastUsed.set(key, date);
  }
  return out;
}

describe("the approved list", () => {
  it("breaks none of the rule", () => {
    expect(faults({ ...VERSE_PICKS })).toEqual([]);
  });

  it("answers by date, and says nothing for a day with no pick", () => {
    for (const [date, pick] of Object.entries(VERSE_PICKS)) expect(versePickFor(date)).toEqual(pick);
    expect(versePickFor("1900-01-01")).toBeNull();
  });
});

describe("the rule, tried on picks made up for the purpose", () => {
  const good: Record<string, VersePick> = {
    // A whole verse of the day's Gospel (Luke 7:36-50).
    "2026-10-12": { book: "luke", chapter: 7, verse: 50, from: "reading" },
    // Part of a long verse of the day's Gospel (Luke 8:22-25).
    "2026-10-14": { book: "luke", chapter: 8, verse: 25, from: "reading", part: "And he said unto them, Where is your faith?" },
    // From the day's Epistle (Philippians 3:1-8), the Gospel being narrative.
    "2026-10-15": { book: "philippians", chapter: 3, verse: 7, from: "reading" },
    // From outside the reading altogether, and said to be.
    "2026-10-16": { book: "john", chapter: 14, verse: 27, from: "related" },
  };

  it("passes picks that keep it", () => {
    expect(faults(good)).toEqual([]);
  });

  const bad = (pick: VersePick, date = "2026-10-12") => faults({ [date]: pick });

  it("refuses a verse that is not in the day's own reading, unless it says so", () => {
    expect(bad({ book: "john", chapter: 3, verse: 16, from: "reading" })).toHaveLength(1);
    expect(bad({ book: "john", chapter: 3, verse: 16, from: "related" })).toEqual([]);
  });

  it("refuses the saint's reading as the day's: Luke 21:12 on October 12", () => {
    expect(bad({ book: "luke", chapter: 21, verse: 12, from: "reading" })[0]).toContain("not in that day's own");
  });

  it("refuses a part that is reworded by a single letter", () => {
    expect(bad({ book: "luke", chapter: 7, verse: 50, from: "reading", part: "Thy faith has saved thee; go in peace." })[0]).toContain("exact piece");
    expect(bad({ book: "luke", chapter: 7, verse: 50, from: "reading", part: "Thy faith hath saved thee; go in peace." })).toEqual([]);
    expect(bad({ book: "luke", chapter: 7, verse: 50, from: "reading", part: "  " })[0]).toContain("exact piece");
  });

  it("refuses a verse our Bible does not hold", () => {
    expect(bad({ book: "luke", chapter: 7, verse: 99, from: "related" })[0]).toContain("not a verse");
    expect(bad({ book: "enoch", chapter: 1, verse: 1, from: "related" })[0]).toContain("not a verse");
  });

  it("refuses the same verse twice inside a month, and allows it after", () => {
    const pick: VersePick = { book: "john", chapter: 14, verse: 27, from: "related" };
    expect(faults({ "2026-10-12": pick, "2026-11-05": pick })).toHaveLength(1);
    expect(faults({ "2026-10-12": pick, "2026-11-12": pick })).toEqual([]);
  });

  it("refuses words with a stray space before their punctuation", () => {
    // Luke 9:23 as our Bible has it reads "take up his cross daily , and".
    const whole = verseText("luke", 9, 23) ?? "";
    if (/ [,.;:!?]/.test(whole)) {
      expect(bad({ book: "luke", chapter: 9, verse: 23, from: "related" })[0]).toContain("stray space");
    }
  });

  it("refuses a date that is not one, and a from that is neither", () => {
    expect(faults({ "October 12": good["2026-10-12"] }).some((f) => f.includes("not a date"))).toBe(true);
    expect(bad({ book: "luke", chapter: 7, verse: 50, from: "gospel" as VersePick["from"] }).some((f) => f.includes("from must be"))).toBe(true);
  });
});

describe("what a pick shows", () => {
  it("the whole verse, tidied of doubled spaces", () => {
    expect(shownVerse("  And he said   to the woman,  go in peace. ", {})).toBe("And he said to the woman, go in peace.");
  });

  it("its part, when the part is really in the verse", () => {
    expect(shownVerse("And he said unto them, Where is your faith? And they being afraid wondered.", { part: "Where is your faith?" })).toBe(
      "Where is your faith?",
    );
  });

  it("the whole verse when the part is not in it: more of Scripture, never other words", () => {
    expect(shownVerse("And he said unto them, Where is your faith?", { part: "Where is thy faith?" })).toBe("And he said unto them, Where is your faith?");
  });
});

describe("where it is used", () => {
  const loader = fs.readFileSync(path.join(ROOT, "lib/today/verseOfDay.ts"), "utf8");
  const view = fs.readFileSync(path.join(ROOT, "components/today/VerseOfDayView.tsx"), "utf8");

  it("the loader asks for the day's pick before it turns to the day's reading", () => {
    const pick = loader.indexOf("versePickFor(verseDayKey(day))");
    const reading = loader.indexOf("readingsOn(day)");
    expect(pick).toBeGreaterThan(-1);
    expect(reading).toBeGreaterThan(pick);
  });

  it("a verse from outside the reading is not marked as the Gospel or the Epistle", () => {
    expect(loader).toContain('pick.from === "related" ? "related" : kindOfBook(pick.book)');
    expect(view).toContain('vod.source !== "related"');
  });
});
