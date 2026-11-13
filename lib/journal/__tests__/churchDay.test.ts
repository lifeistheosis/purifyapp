// The journal by the Church's day (1.9, docs/1.9-build/JOURNAL.md): each day
// of the journal is headed by what the Church keeps on it, by the reader's
// calendar, and today's page offers the day's readings to write from.
//
// The values below were read from the app's own calendar
// (lib/calendar/orthodox.ts) and checked against the menologion: on the New
// Calendar 8 November is the Synaxis of the Archangel Michael, which the Old
// Calendar keeps thirteen days later, so its 8 November is St Demetrius
// (26 October).

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import en from "@/lib/i18n/messages/en.json";

import { churchDayLine, dayFromKey, READING_KIND_KEY, verseSpan } from "../churchDay";

const noon = (key: string) => dayFromKey(key)!;
const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("what the Church keeps on a day", () => {
  it("names the feast first, on the day the reader's calendar keeps", () => {
    expect(churchDayLine(noon("2026-11-08"), "new")).toEqual({
      headline: "Synaxis of the Holy Archangel Michael and All the Bodiless Powers",
      fast: null,
    });
    expect(churchDayLine(noon("2026-11-08"), "old").headline).toBe("Great-martyr Demetrius the Myrrh-Streaming");
    expect(churchDayLine(noon("2026-12-25"), "new").headline).toBe(
      "Nativity According to the Flesh of Our Lord, God, and Savior Jesus Christ",
    );
  });

  it("names the first saint on a day without a feast", () => {
    expect(churchDayLine(noon("2026-11-07"), "new").headline).toBe("33 Martyrs of Melitene");
    expect(churchDayLine(noon("2026-11-06"), "new").headline).toBe("St. Paul the Confessor, Archbishop of Constantinople");
  });

  it("names the fast only on a day that keeps one", () => {
    // A Friday: the year's Wednesday and Friday fast.
    expect(churchDayLine(noon("2026-11-06"), "new").fast).toMatchObject({ kind: "wine-oil", ruleId: "fridayFast" });
    // A Saturday, and the Nativity, which is fast-free: no fast named.
    expect(churchDayLine(noon("2026-11-07"), "new").fast).toBeNull();
    expect(churchDayLine(noon("2026-12-25"), "new").fast).toBeNull();
    // The Nativity Fast on a Tuesday: fish allowed, still a fast.
    expect(churchDayLine(noon("2026-11-17"), "new").fast).toMatchObject({ kind: "fish", ruleId: "nativityWeekday" });
    // The same civil day on the Old Calendar is before its Nativity Fast.
    expect(churchDayLine(noon("2026-11-17"), "old").fast).toBeNull();
    // The first Wednesday of Great Lent, 2027.
    expect(churchDayLine(noon("2027-03-17"), "new").fast).toMatchObject({ kind: "strict", ruleId: "lentStrict" });
  });

  it("every fast it can name has a label in English", () => {
    const keys = Object.keys(en).filter((k) => /^calendar\.fast\.[^.]+\.label$/.test(k));
    expect(keys.length).toBeGreaterThan(5);
    for (const day of ["2026-11-06", "2026-11-17", "2027-03-17"]) {
      const fast = churchDayLine(noon(day), "new").fast!;
      expect(en).toHaveProperty([`calendar.fast.${fast.ruleId}.label`]);
    }
  });
});

describe("a day's key and a passage's verses", () => {
  it("reads a day's key as its local date at noon, and refuses anything else", () => {
    const d = dayFromKey("2026-11-08")!;
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 10, 8, 12]);
    expect(dayFromKey("undated")).toBeNull();
    expect(dayFromKey("2026-11-8")).toBeNull();
  });

  it("names a passage's verses as a reference does", () => {
    expect(verseSpan(41, 56)).toBe("41-56");
    expect(verseSpan(47, 47)).toBe("47");
    expect(verseSpan(47, 0)).toBe("47");
  });

  it("names every kind of reading by a key that exists", () => {
    for (const key of Object.values(READING_KIND_KEY)) expect(en).toHaveProperty([key]);
  });
});

describe("the journal is headed by the Church's day", () => {
  const today = read("components/journal/TodayPage.tsx");
  const feed = read("components/journal/JournalFeed.tsx");
  const client = read("components/journal/JournalClient.tsx");
  const composer = read("components/journal/JournalComposer.tsx");

  it("today's page: the weekday in Lora, the day's line, the readings and today's highlights", () => {
    expect(today).toContain("useChurchDayAtOnce()");
    // The weekday in the house's heading face, as a chapter's name is (build 95, the approved look).
    expect(today).toMatch(/font-heading text-\[34px\][^"]*text-paper"/);
    // Write is the journal's one button, always in reach: not drawn here twice.
    expect(today).not.toContain('t("journal.write")');
    expect(today).toContain("day.readings.map");
    expect(today).toContain('type: "reading"');
    expect(today).toContain("highlightedToday(");
    // Each thing of the day is a whole row to tap, at least 44px tall.
    expect(today).toMatch(/min-h-\[54px\] w-full/);
    // The house's own icons, never a typed character.
    expect(today).toMatch(/from "@\/components\/ui\/icons\/Pen"/);
    // Nothing physical: the row reads from the start in Arabic and Urdu.
    expect(today).not.toMatch(/\btext-left\b|\bml-|\bmr-|\bpl-|\bpr-/);
    expect(client).toContain("<TodayPage onWriteFrom=");
  });

  it("each past day: its weekday in Lora, then its date, feast and fast", () => {
    expect(feed).toContain("churchDayLine(date, style)");
    expect(feed).toContain("useCalendarStyleDefault()");
    expect(feed).toMatch(/data-journal-day="" className="font-serif/);
    expect(feed).toContain("data-journal-day-line");
    // Today's line is on today's page; the list does not say it twice.
    expect(feed).toContain("g.day === today ? null : dayFromKey(g.day)");
  });

  it("a page begun from a reading names it, and opens it in the Bible", () => {
    expect(client).toContain('s.type === "reading"');
    expect(client).toContain("READING_KIND_KEY[s.kind]");
    expect(composer).toContain('source?.type === "reading"');
    expect(composer).toContain("`/bible/${source.book}/${source.chapter}#v${source.from}`");
  });
});
