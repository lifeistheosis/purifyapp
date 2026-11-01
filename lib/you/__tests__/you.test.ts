// The You tab's reckoning (1.8): what a reader has kept, listed by what it
// is with counts that are what Saved's chips show, one of their own verses a
// day, and the week counted the way the streak's row counts it.

import { describe, expect, it } from "vitest";

import type { Bookmark } from "@/lib/bookmarks";
import { countFor, savedFeed, type SavedHighlight, type SavedPassage } from "@/lib/saved/feed";

import { KEPT_GROUPS, countSince, dayNumber, howFar, keptRows, latestFirst, verseForDay, weekStart } from "../you";

const day = (d: number) => Date.parse(`2026-10-${String(d).padStart(2, "0")}T12:00:00Z`);

const verse = (book: string, chapter: number, v: number, at: number): Bookmark => ({
  id: `v-${book}-${chapter}-${v}`,
  kind: "bible-verse",
  book,
  bookName: book,
  chapter,
  verse: v,
  label: `${book} ${chapter}:${v}`,
  addedAt: at,
});

const hl = (book: string, chapter: number, v: number, at: string | null): SavedHighlight => ({
  book,
  chapter,
  verse: v,
  color: "green",
  whole: true,
  words: [],
  at,
});

const paragraph = (sectionN: number, paragraphIdx: number, at: string | null): SavedPassage => ({
  saintSlug: "athanasius-the-great",
  workSlug: "on-the-incarnation",
  sectionN,
  paragraphIdx,
  color: "green",
  at,
});

const others: Bookmark[] = [
  { id: "r", kind: "prayer-rule", ruleId: "evening", href: "/prayers/evening", label: "Evening prayers", addedAt: day(4) },
  { id: "s", kind: "saint", saintSlug: "john-chrysostom", label: "John Chrysostom", addedAt: day(5) },
  { id: "w", kind: "writing-section", saintSlug: "athanasius-the-great", saintName: "Athanasius the Great", workSlug: "on-the-incarnation", workTitle: "On the Incarnation", sectionN: 1, sectionTitle: "On the Incarnation of the Word", label: "On the Incarnation", addedAt: day(6) },
  { id: "c", kind: "bible-chapter", book: "romans", bookName: "Romans", chapter: 8, label: "Romans 8", addedAt: day(7) },
];

describe("what a reader has kept, by what it is", () => {
  const feed = savedFeed(
    [verse("john", 3, 16, day(2)), verse("psalms", 51, 10, day(9)), ...others],
    [hl("john", 1, 5, "2026-10-10T12:00:00Z"), hl("john", 3, 16, null)],
    [paragraph(1, 3, "2026-10-08T12:00:00Z")],
  );
  const rows = keptRows(feed);

  it("lists only the groups with something in them, in the tab's order", () => {
    expect(rows.map((r) => r.group)).toEqual(["verses", "writings", "saints", "prayers", "readings"]);
    expect(rows.every((r) => (KEPT_GROUPS as readonly string[]).includes(r.group))).toBe(true);
  });

  it("counts each group as its chip on Saved does, so a tap lands on that many", () => {
    for (const r of rows) expect(r.count, r.group).toBe(countFor(feed, r.group, 0));
    // A verse highlighted and never starred is a verse kept: three verses,
    // one of them starred and highlighted both.
    expect(rows.find((r) => r.group === "verses")?.count).toBe(3);
    // A starred section and a highlighted paragraph are both writings.
    expect(rows.find((r) => r.group === "writings")?.count).toBe(2);
    // Saints are the saints themselves now, not their writings.
    expect(rows.find((r) => r.group === "saints")?.count).toBe(1);
  });

  it("names each group by its newest thing", () => {
    expect(rows.find((r) => r.group === "verses")?.newest.key).toBe("verse:john:1:5");
    expect(rows.find((r) => r.group === "writings")?.newest.passage?.paragraphIdx).toBe(3);
    expect(rows.find((r) => r.group === "readings")?.newest.bookmark?.id).toBe("c");
  });

  it("is empty when nothing is kept", () => {
    expect(keptRows([])).toEqual([]);
  });
});

describe("one of the reader's own verses a day", () => {
  const verses = [{ key: "verse:john:3:16" }, { key: "verse:psalms:51:10" }, { key: "verse:matthew:5:8" }];

  it("is the same all day, and the next one the next day, each in turn", () => {
    const today = verseForDay(verses, "2026-10-18");
    expect(verseForDay([...verses].reverse(), "2026-10-18")).toEqual(today);
    const week = ["2026-10-18", "2026-10-19", "2026-10-20"].map((d) => verseForDay(verses, d)?.key);
    expect(new Set(week).size).toBe(3);
    expect(verseForDay(verses, "2026-10-21")?.key).toBe(week[0]);
  });

  it("is nothing when no verse is kept, and the one verse when there is one", () => {
    expect(verseForDay([], "2026-10-18")).toBeNull();
    expect(verseForDay([{ key: "verse:john:1:1" }], "2027-01-01")?.key).toBe("verse:john:1:1");
  });

  it("counts days across months and years", () => {
    expect(dayNumber("2026-10-19") - dayNumber("2026-10-18")).toBe(1);
    expect(dayNumber("2027-01-01") - dayNumber("2026-12-31")).toBe(1);
    expect(dayNumber("1970-01-01")).toBe(0);
  });
});

describe("this week", () => {
  it("begins on its Monday, from the start of the day, as the prayer rope's knots do", () => {
    // Wednesday 21 October: the week began on Monday the 19th.
    expect(new Date(weekStart(new Date(2026, 9, 21, 15, 30)))).toEqual(new Date(2026, 9, 19, 0, 0, 0, 0));
    // A Monday is its own week's first day.
    expect(new Date(weekStart(new Date(2026, 9, 19, 0, 0, 1)))).toEqual(new Date(2026, 9, 19, 0, 0, 0, 0));
    // A Sunday is the last day of the week that began six days before.
    expect(new Date(weekStart(new Date(2026, 9, 25, 23, 59)))).toEqual(new Date(2026, 9, 19, 0, 0, 0, 0));
    // Across a month's end.
    expect(new Date(weekStart(new Date(2026, 10, 1, 9)))).toEqual(new Date(2026, 9, 26, 0, 0, 0, 0));
  });

  it("counts what was kept or written in it, and nothing undated", () => {
    const from = new Date(2026, 9, 12).getTime();
    expect(
      countSince([new Date(2026, 9, 12, 0, 0, 1).getTime(), new Date(2026, 9, 11, 23, 59).getTime(), "2026-10-17T09:00:00", null, undefined, "not a date"], from),
    ).toBe(2);
  });
});

describe("where to pick up", () => {
  it("says how far in a place is, and nothing when its whole is not known", () => {
    // The sheet's own figures (r3-25 A): v16 of 36, section 4 of 11, day 3 of 89.
    expect(Math.round((howFar(16, 36) ?? 0) * 100)).toBe(44);
    expect(Math.round((howFar(4, 11) ?? 0) * 100)).toBe(36);
    expect(Math.round((howFar(3, 89) ?? 0) * 100)).toBe(3);
    expect(howFar(40, 36)).toBe(1);
    expect(howFar(3, 0)).toBeNull();
    expect(howFar(3, null)).toBeNull();
    expect(howFar(Number.NaN, 10)).toBeNull();
  });

  it("is the most recent first, as many as asked, the undated last", () => {
    const places = [
      { key: "work", at: 300 },
      { key: "bible", at: 500 },
      { key: "old", at: Number.NaN },
      { key: "prayer", at: 400 },
    ];
    expect(latestFirst(places, 3).map((p) => p.key)).toEqual(["bible", "prayer", "work"]);
    expect(latestFirst(places, 9).map((p) => p.key).at(-1)).toBe("old");
    expect(latestFirst(places, 0)).toEqual([]);
  });
});
