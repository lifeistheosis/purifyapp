import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

import {
  END_OF_CHAPTER,
  OFFICIAL_FROM,
  OFFICIAL_TO,
  bookSlug,
  kindOfBook,
  officialDates,
  officialDay,
  parseOfficialRef,
  type PassageSegment,
} from "@/lib/calendar/officialReadings";
import { movableLabelOn } from "@/lib/calendar/orthodox";

/**
 * The official readings: that every reference the calendar prints is read,
 * and that every verse it names is a verse our own Bible holds.
 *
 * The second half is the point. The table is another body's list, numbered
 * against another Bible. Where its numbers and ours part ways, a reader would
 * tap "Romans 14:19-26" and land on a chapter that ends at verse 23. This
 * test opens every chapter the table names and fails on the first verse that
 * is not there.
 */

const ROOT = process.cwd();
type Listed = [string, string | null];
const table = JSON.parse(fs.readFileSync(path.join(ROOT, "data/calendar/official-readings.json"), "utf8")) as {
  _from: string;
  _to: string;
  days: Record<string, Listed[]>;
};

const seg = (book: string, chapter: number, from: number, to: number): PassageSegment => ({ book, chapter, from, to });

describe("reading a reference as the calendar prints it", () => {
  it("one run in one chapter", () => {
    const r = parseOfficialRef("Luke 5:27-32", "Gospel");
    expect(r).toMatchObject({ raw: "Luke 5:27-32", label: "Gospel", kind: "gospel", composite: false, unread: false });
    expect(r.segments).toEqual([seg("luke", 5, 27, 32)]);
  });

  it("a run across chapters ends the first chapter and starts the next", () => {
    expect(parseOfficialRef("1 Corinthians 15:58-16:3").segments).toEqual([
      seg("1-corinthians", 15, 58, END_OF_CHAPTER),
      seg("1-corinthians", 16, 1, 3),
    ]);
    expect(parseOfficialRef("Ezekiel 43:27-44:4").kind).toBe("ot");
  });

  it("more verses of the same chapter, after a comma", () => {
    expect(parseOfficialRef("Luke 1:39-49, 56").segments).toEqual([seg("luke", 1, 39, 49), seg("luke", 1, 56, 56)]);
    expect(parseOfficialRef("Genesis 49:1-2,8-12").segments).toEqual([seg("genesis", 49, 1, 2), seg("genesis", 49, 8, 12)]);
    expect(parseOfficialRef("Judges 6:2, 7, 11-24").segments).toEqual([
      seg("judges", 6, 2, 2),
      seg("judges", 6, 7, 7),
      seg("judges", 6, 11, 24),
    ]);
    // "11-16" after "11:8" is verses, not a chapter.
    expect(parseOfficialRef("Hebrews 11:8, 11-16").segments).toEqual([seg("hebrews", 11, 8, 8), seg("hebrews", 11, 11, 16)]);
  });

  it("another chapter, after a semicolon or a comma", () => {
    expect(parseOfficialRef("Luke 10:38-42; 11:27-28").segments).toEqual([seg("luke", 10, 38, 42), seg("luke", 11, 27, 28)]);
    expect(parseOfficialRef("Luke 16:15-18, 17:1-4").segments).toEqual([seg("luke", 16, 15, 18), seg("luke", 17, 1, 4)]);
    expect(parseOfficialRef("John 7:37-52, 8:12").segments).toEqual([seg("john", 7, 37, 52), seg("john", 8, 12, 12)]);
  });

  it("a run that ends in the next chapter", () => {
    expect(parseOfficialRef("Luke 22:39-42, 45-23:1").segments).toEqual([
      seg("luke", 22, 39, 42),
      seg("luke", 22, 45, END_OF_CHAPTER),
      seg("luke", 23, 1, 1),
    ]);
  });

  it("a book of one chapter gives verses with no chapter", () => {
    expect(parseOfficialRef("Jude 1-10").segments).toEqual([seg("jude", 1, 1, 10)]);
  });

  it("two books in one reading", () => {
    const r = parseOfficialRef("1 Corinthians 5:6-8; Galatians 3:13-14");
    expect(r.kind).toBe("epistle");
    expect(r.segments).toEqual([seg("1-corinthians", 5, 6, 8), seg("galatians", 3, 13, 14)]);
    const passion = parseOfficialRef("Matt. 26:2-20; John 13:3-17; Matt. 26:21-39; Luke 22:43-45; Matt. 26:40-27:2");
    expect(passion.unread).toBe(false);
    expect(passion.segments.map((s) => s.book)).toEqual(["matthew", "john", "matthew", "luke", "matthew", "matthew"]);
  });

  it("the books of Kingdoms, which the calendar names both ways at once", () => {
    expect(bookSlug("3[1] Kings")).toBe("1-kings");
    expect(bookSlug("4 [2] Kings")).toBe("2-kings");
    expect(parseOfficialRef("4[2] Kings 2:6-14").segments).toEqual([seg("2-kings", 2, 6, 14)]);
    expect(parseOfficialRef("3[1] Kings 8:22-23, 27-30").segments).toEqual([seg("1-kings", 8, 22, 23), seg("1-kings", 8, 27, 30)]);
  });

  it("takes the Septuagint's numbers where the calendar gives them, since they are ours", () => {
    expect(parseOfficialRef("Ezekiel 1:21-28 (1:1-28,2:1 LXX)").segments).toEqual([seg("ezekiel", 1, 1, 28), seg("ezekiel", 2, 1, 1)]);
    expect(parseOfficialRef("Job 42:12-17 LXX").segments).toEqual([seg("job", 42, 12, 17)]);
  });

  it("finds a reading under the name our Bible files it by", () => {
    expect(parseOfficialRef("Jeremiah (Baruch 3:35-4:4)").segments).toEqual([seg("baruch", 3, 35, END_OF_CHAPTER), seg("baruch", 4, 1, 4)]);
    expect(parseOfficialRef("Wisdom of Solomon 3:1-9").segments).toEqual([seg("wisdom", 3, 1, 9)]);
    // The Song of the Three stands in Daniel 3 after verse 23.
    expect(parseOfficialRef("Daniel 3:1-23; Song of the Three: 1-66 with verses").segments).toEqual([
      seg("daniel", 3, 1, 23),
      seg("daniel", 3, 24, 89),
    ]);
  });

  it("puts the doxology of Romans where our Bible has it", () => {
    expect(parseOfficialRef("Romans 14:19-26").segments).toEqual([seg("romans", 14, 19, 23), seg("romans", 16, 25, 27)]);
  });

  it("follows our Bible's numbers in the three other places they differ", () => {
    expect(parseOfficialRef("3 John 1:1-15").segments).toEqual([seg("3-john", 1, 1, 14)]);
    expect(parseOfficialRef("Genesis 5:32-6:8").segments).toEqual([seg("genesis", 6, 1, 8)]);
    expect(parseOfficialRef("Proverbs 15:20-16:9").segments).toEqual([
      seg("proverbs", 15, 20, END_OF_CHAPTER),
      seg("proverbs", 16, 2, 5),
    ]);
  });

  it("a composite named by chapter is an Old Testament lesson with no verses to give", () => {
    for (const raw of [
      "Composite 2",
      "Composite 2 - Proverbs 10, 3, 8",
      "Composite 4 - Proverbs 10; Wisdom of Solomon 6, 7, 8, 9",
      "Composite 6 - Exodus 12, 13; Numbers 8; Leviticus 12",
      "Composite 18 - 3 [1] Kings 7, 8",
    ]) {
      const r = parseOfficialRef(raw);
      expect(r, raw).toMatchObject({ kind: "ot", composite: true, unread: false, segments: [] });
    }
  });

  it("a composite that gives its verses is read like any other", () => {
    const r = parseOfficialRef("Composite 16 - Isaiah 63:15-64:5, 8-9");
    expect(r.composite).toBe(true);
    expect(r.segments).toEqual([seg("isaiah", 63, 15, END_OF_CHAPTER), seg("isaiah", 64, 1, 5), seg("isaiah", 64, 8, 9)]);
    expect(parseOfficialRef("Composite 14 - 3 [1] Kings 19:19, 20, 21; 4 [2] Kings 2:1,6-14").segments).toEqual([
      seg("1-kings", 19, 19, 19),
      seg("1-kings", 19, 20, 20),
      seg("1-kings", 19, 21, 21),
      seg("2-kings", 2, 1, 1),
      seg("2-kings", 2, 6, 14),
    ]);
  });

  it("says so when it cannot read one, and never guesses", () => {
    for (const raw of ["", "Vespers", "Luke", "Luke five", "12:3-4"]) {
      expect(parseOfficialRef(raw).unread, JSON.stringify(raw)).toBe(true);
    }
  });

  it("knows a Gospel from an Epistle from the Old Testament by the book", () => {
    expect(kindOfBook("john")).toBe("gospel");
    expect(kindOfBook("acts")).toBe("epistle");
    expect(kindOfBook("hebrews")).toBe("epistle");
    expect(kindOfBook("wisdom")).toBe("ot");
    expect(kindOfBook("1-kings")).toBe("ot");
  });
});

describe("the table", () => {
  it("runs day by day from its first date to its last, with no day empty", () => {
    const dates = officialDates();
    expect(dates[0]).toBe(table._from);
    expect(dates[dates.length - 1]).toBe(table._to);
    expect(OFFICIAL_FROM).toBe(table._from);
    expect(OFFICIAL_TO).toBe(table._to);
    const days = Math.round((Date.parse(`${table._to}T12:00:00Z`) - Date.parse(`${table._from}T12:00:00Z`)) / 86_400_000) + 1;
    expect(dates).toHaveLength(days);
    for (const d of dates) expect(table.days[d].length, d).toBeGreaterThan(0);
  });

  it("holds references and labels, and nothing that reads like a verse", () => {
    for (const [date, listed] of Object.entries(table.days)) {
      for (const [ref, label] of listed) {
        expect(ref.length, `${date} ${ref}`).toBeLessThan(120);
        if (label !== null) expect(label.length, `${date} ${ref}`).toBeLessThan(60);
      }
    }
  });

  it("is read whole: every reference it holds is understood", () => {
    const unread: string[] = [];
    for (const [date, listed] of Object.entries(table.days)) {
      for (const [ref] of listed) if (parseOfficialRef(ref).unread) unread.push(`${date}: ${ref}`);
    }
    expect(unread).toEqual([]);
  });
});

describe("every verse the table names is in our Bible", () => {
  const books = new Map<string, number>();
  const chapters = new Map<string, Set<number>>();
  const versesOf = (book: string, chapter: number): Set<number> | null => {
    const key = `${book}/${chapter}`;
    if (!chapters.has(key)) {
      const file = path.join(ROOT, "data/bible", book, `${chapter}.json`);
      if (!fs.existsSync(file)) return null;
      const json = JSON.parse(fs.readFileSync(file, "utf8")) as { verses: { n: number }[] };
      chapters.set(key, new Set(json.verses.map((v) => v.n)));
    }
    return chapters.get(key) ?? null;
  };

  beforeAll(() => {
    const list = JSON.parse(fs.readFileSync(path.join(ROOT, "data/bible/books.json"), "utf8")) as { slug: string; chapters: number }[];
    for (const b of list) books.set(b.slug, b.chapters);
  });

  it("book, chapter, first verse and last verse, for every run of every reading", () => {
    const missing: string[] = [];
    for (const [date, listed] of Object.entries(table.days)) {
      for (const [ref] of listed) {
        for (const s of parseOfficialRef(ref).segments) {
          const where = `${date}: ${ref} -> ${s.book} ${s.chapter}:${s.from}-${s.to === END_OF_CHAPTER ? "end" : s.to}`;
          if (!books.has(s.book)) {
            missing.push(`${where} (no such book)`);
            continue;
          }
          const verses = versesOf(s.book, s.chapter);
          if (!verses) {
            missing.push(`${where} (no such chapter)`);
            continue;
          }
          if (!verses.has(s.from)) missing.push(`${where} (no verse ${s.from})`);
          else if (s.to !== END_OF_CHAPTER && !verses.has(s.to)) missing.push(`${where} (no verse ${s.to})`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});

describe("which of a day's readings are the day's own", () => {
  it("an ordinary day: the Epistle and the Gospel, and nothing proper", () => {
    const day = officialDay("2026-10-10");
    expect(day?.epistle?.raw).toBe("1 Corinthians 15:58-16:3");
    expect(day?.gospel?.raw).toBe("Luke 5:27-32");
    expect(day?.proper).toEqual([]);
    expect(day?.all).toHaveLength(2);
  });

  it("a feast: the day's own pair is the one labelled plainly, and the feast's is named", () => {
    const day = officialDay("2026-10-01");
    expect(day?.all).toHaveLength(8);
    expect(day?.epistle?.raw).toBe("Ephesians 5:33-6:9");
    expect(day?.gospel?.raw).toBe("Luke 6:12-19");
    expect(day?.proper).toHaveLength(1);
    expect(day?.proper[0].whose).toBe("Theotokos");
    expect(day?.proper[0].epistle?.raw).toBe("Hebrews 9:1-7");
    expect(day?.proper[0].gospel?.raw).toBe("Luke 10:38-42; 11:27-28");
  });

  it("is null outside the table", () => {
    expect(officialDay("2026-09-30")).toBeNull();
    expect(officialDay("2028-01-01")).toBeNull();
    expect(officialDay("not a date")).toBeNull();
  });

  it("uses a day whole or not at all: one unknown label and the day is left alone", () => {
    for (const [date, listed] of Object.entries(table.days)) {
      const known = listed.every(([, label]) => label !== null);
      expect(officialDay(date) !== null, date).toBe(known);
    }
  });

  it("the day's own pair is the one labelled plainly, wherever the calendar has one", () => {
    for (const date of officialDates()) {
      const day = officialDay(date);
      if (!day) continue;
      for (const r of [day.epistle, day.gospel]) {
        if (!r) continue;
        const whose = r.label.split(",").slice(1).join(",").trim();
        expect(whose, `${date} ${r.raw} (${r.label})`).toBe(day.ownedBy);
      }
      // A pair with a name on it is the day's own only when no plain one is listed.
      if (day.ownedBy) expect(day.all.some((r) => /^(epistle|gospel)$/i.test(r.label)), date).toBe(false);
      if (day.epistle) expect(day.epistle.kind, date).toBe("epistle");
      if (day.gospel) expect(day.gospel.kind, date).toBe("gospel");
    }
  });

  it("around Nativity the day's pair carries the day's name, and a saint's stays proper", () => {
    // Nativity itself: the feast's pair is all the calendar lists for the Liturgy.
    const nativity = officialDay("2026-12-25");
    expect(nativity?.ownedBy).toBe("Nativity");
    expect(nativity?.epistle?.raw).toBe("Galatians 4:4-7");
    expect(nativity?.gospel?.raw).toBe("Matthew 2:1-12");
    expect(nativity?.proper).toEqual([]);
    // The Sunday after it, which is also St Stephen's day.
    const sundayAfter = officialDay("2026-12-27");
    expect(sundayAfter?.ownedBy).toBe("Sunday After");
    expect(sundayAfter?.epistle?.raw).toBe("Galatians 1:11-19");
    expect(sundayAfter?.gospel?.raw).toBe("Matthew 2:13-23");
    expect(sundayAfter?.proper.map((p) => p.whose)).toEqual(["Saint"]);
    // The Saturday after it, which is also the Synaxis of the Theotokos.
    const saturdayAfter = officialDay("2026-12-26");
    expect(saturdayAfter?.ownedBy).toBe("Saturday After");
    expect(saturdayAfter?.gospel?.raw).toBe("Matthew 12:15-21");
    expect(saturdayAfter?.proper.map((p) => p.whose)).toEqual(["Theotokos"]);
  });

  it("leaves no day that has Liturgy readings without a pair of its own, outside the days the Paschal table names", () => {
    // Holy Week is listed service by service: a Gospel for Matins and one for
    // the Presanctified, and on Friday twelve at Matins. There is no plain
    // pair to find there, and none is wanted from this table: the app's own
    // Paschal table answers every day it names (dayReadings), Holy Week
    // among them. The test in dayReadings.test.ts holds the two together.
    const unanswered: string[] = [];
    for (const date of officialDates()) {
      if (movableLabelOn(new Date(`${date}T12:00:00Z`))) continue;
      const day = officialDay(date);
      if (!day) continue;
      const liturgy = day.all.some((r) => /^(epistle|gospel)\b/i.test(r.label));
      if (liturgy && !day.epistle && !day.gospel) unanswered.push(`${date}: ${day.all.map((r) => `${r.raw} (${r.label})`).join(" | ")}`);
    }
    expect(unanswered).toEqual([]);
  });
});
