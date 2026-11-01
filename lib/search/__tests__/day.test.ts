// The day in the one search (1.8, r3-31 B, the owner's pick of 2026-10-31):
// with nothing typed, each place shows its own day under the doors, no more
// than the room it holds from the first frame (lib/search/day.ts).
//
// What a reader would notice if this broke: a place showing another place's
// day, a saint with no profile opening nothing, an Old Calendar reader shown
// the New Calendar's saints, more rows than the room held so the screen
// moves as the day arrives, or the calendar loaded on every page. The built
// screen is walked in scripts/export-walk.mjs, section 44.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { commemorationsOn, dayReadings, readingsOptionsFor, shiftForStyle, type CalStyle, type Commemoration, type ReadingRef } from "@/lib/calendar/orthodox";

import { DAY_EYEBROW, DAY_ROW_PX, DAY_SLOTS, READING_KIND_LABEL, calendarDayHref, dayRows, feastsFirst, saintHref, type DayHour, type TheDay } from "../day";
import { DOORS, type DoorId } from "../places";

const ROOT = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8").replace(/\r\n/g, "\n");
const code = (file: string) =>
  read(file)
    .replace(/\{\s*\/\*(?:(?!\*\/)[\s\S])*\*\/\s*\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
const LANGS = ["ar", "bg", "de", "el", "en", "es", "fil", "fr", "hu", "id", "it", "ka", "ne", "pl", "pt", "ro", "ru", "sr", "tr", "uk", "ur"];

const reading = (kind: ReadingRef["kind"], label: string, book: string, chapter: number): ReadingRef => ({ kind, label, book, chapter, from: 1, to: 9 });
const saint = (name: string, extra: Partial<Commemoration> = {}): Commemoration => ({ name, ...extra });
const THIRD: DayHour = { id: "third-hour", href: "/prayers/hours/third-hour", titleKey: "prayers.rule.third-hour.title", minutes: 5 };
const OCT31 = new Date(Date.UTC(2026, 9, 31, 12));

function dayOf(over: Partial<TheDay> = {}): TheDay {
  return {
    today: OCT31,
    readings: [reading("epistle", "2 Corinthians 5:1-10", "2-corinthians", 5), reading("gospel", "Luke 8:16-21", "luke", 8)],
    commemorations: [
      saint("Apostles Stachys, Amplias, Urban, Narcissus, Apelles, and Aristobulus", { note: "of the Seventy" }),
      saint("Martyr Epimachus of Egypt", { note: "†250" }),
    ],
    hour: THIRD,
    events: [],
    ...over,
  };
}

describe("the room each place holds", () => {
  it("is held by the places that have a day, under a line the app already says in all 21 languages", () => {
    expect(Object.keys(DAY_SLOTS).sort()).toEqual(Object.keys(DAY_EYEBROW).sort());
    expect(Object.keys(DAY_SLOTS).sort()).toEqual(["all", "bible", "history", "prayers", "saints"]);
    for (const n of Object.values(DAY_SLOTS)) expect(n).toBeGreaterThan(0);
    const keys = [...Object.values(DAY_EYEBROW), ...Object.values(READING_KIND_LABEL), "calendar.todaysReadings", "prayers.today.commemoratedToday", "today.minRead"];
    for (const lang of LANGS) {
      const catalog = JSON.parse(read(`lib/i18n/messages/${lang}.json`)) as Record<string, string>;
      for (const key of keys) expect(catalog[key], `${lang}: ${key}`).toBeTruthy();
    }
  });

  it("is the room the rows take: one height per row, the block as tall as its slots", () => {
    const rows = code("components/search/SearchRows.tsx");
    const line = rows.slice(rows.indexOf("export function DayLine"), rows.indexOf("export function DayBlock"));
    expect(line).toContain("style={{ height: DAY_ROW_PX }}");
    // One line of name and one of what it is, never wrapping into a taller row.
    expect(line.match(/block truncate/g)).toHaveLength(2);
    const block = rows.slice(rows.indexOf("export function DayBlock"), rows.indexOf("export function EmptyLine"));
    expect(block).toContain("style={{ height: slots * DAY_ROW_PX }}");
    // Before the day is here the block keeps its size, unseen.
    expect(block).toContain('className={shown ? "search-in" : "invisible"}');
    expect(DAY_ROW_PX).toBe(58);
  });
});

describe("what each place shows of the day", () => {
  it("in Everything: the readings in one row, the leading commemoration, the Hour", () => {
    const rows = dayRows("all", dayOf({ commemorations: [saint("Martyr Epimachus of Egypt"), saint("The Dormition", { kind: "feast" })] }));
    expect(rows.map((r) => r.kind)).toEqual(["readings", "saint", "hour"]);
    expect(rows[0].kind === "readings" && rows[0].readings.map((r) => r.label)).toEqual(["2 Corinthians 5:1-10", "Luke 8:16-21"]);
    // The feast leads, as on Today.
    expect(rows[1].kind === "saint" && rows[1].saint.name).toBe("The Dormition");
  });

  it("in the Bible: the day's own readings in their order, each at its place in the day's walk", () => {
    const rows = dayRows("bible", dayOf());
    expect(rows.map((r) => (r.kind === "reading" ? `${r.at} ${r.reading.kind} ${r.reading.label}` : r.kind))).toEqual([
      "0 epistle 2 Corinthians 5:1-10",
      "1 gospel Luke 8:16-21",
    ]);
    // A Lenten weekday's three lessons: the room holds two.
    const lent = dayRows("bible", dayOf({ readings: [reading("ot", "Isaiah 1:1-20", "isaiah", 1), reading("ot", "Genesis 1:1-13", "genesis", 1), reading("ot", "Proverbs 1:1-20", "proverbs", 1)] }));
    expect(lent).toHaveLength(DAY_SLOTS.bible!);
  });

  it("in Saints: the feasts first, then the saints, as many as the room holds", () => {
    const list = [saint("A"), saint("B"), saint("The Feast", { kind: "feast" }), saint("C"), saint("D")];
    expect(feastsFirst(list).map((c) => c.name)).toEqual(["The Feast", "A", "B", "C", "D"]);
    const rows = dayRows("saints", dayOf({ commemorations: list }));
    expect(rows.map((r) => (r.kind === "saint" ? r.saint.name : r.kind))).toEqual(["The Feast", "A", "B"]);
  });

  it("opens a saint's profile where he has one, and the day in the calendar where he has none", () => {
    const profiled = saint("St. Nicholas", {
      slug: "nicholas-of-myra",
      saint: { slug: "nicholas-of-myra", name: "St. Nicholas", epithet: "Wonderworker", feastDays: ["December 6"], readMinutes: 4 },
    });
    expect(saintHref(profiled, OCT31)).toBe("/saints/nicholas-of-myra");
    // A slug the registry does not hold is no profile to open.
    expect(saintHref(saint("St. Someone", { slug: "unknown" }), OCT31)).toBe("/calendar?m=2026-10&d=2026-10-31");
    expect(saintHref(saint("Martyr Epimachus of Egypt"), OCT31)).toBe("/calendar?m=2026-10&d=2026-10-31");
    expect(calendarDayHref(new Date(Date.UTC(2027, 0, 7, 12)))).toBe("/calendar?m=2027-01&d=2027-01-07");
    // The calendar's own grid links a day the same way.
    expect(code("components/calendar/CalendarGrid.tsx")).toContain("href={`/calendar?m=${year}-${mm}&d=${cell.iso}${styleQS}`}");
  });

  it("in Prayers the Hour, in History its event, and nothing where a place has no day", () => {
    expect(dayRows("prayers", dayOf()).map((r) => r.kind === "hour" && r.hour.id)).toEqual(["third-hour"]);
    expect(dayRows("prayers", dayOf({ hour: null }))).toEqual([]);
    const history = dayRows("history", dayOf({ events: [{ slug: "the-great-schism", title: "The Great Schism", displayDate: "16 July 1054" }] }));
    expect(history.map((r) => r.kind === "event" && r.href)).toEqual(["/history/the-great-schism"]);
    expect(dayRows("history", dayOf())).toEqual([]);
    const none: DoorId[] = DOORS.map((d) => d.id).filter((id) => DAY_SLOTS[id] === undefined);
    expect(none.sort()).toEqual(["councils", "reading", "shop", "theology"]);
    for (const door of none) expect(dayRows(door, dayOf()), door).toEqual([]);
  });
});

describe("every day of two years, in both reckonings", () => {
  // The calls lib/calendar/useChurchDay.ts makes: the readings on the civil
  // day, the commemorations on the day the reader's calendar keeps.
  const churchDay = (today: Date, style: CalStyle): TheDay => ({
    today,
    readings: dayReadings(today, readingsOptionsFor(style)).readings,
    commemorations: commemorationsOn(shiftForStyle(today, style)),
    hour: THIRD,
    events: [],
  });

  it("gives the Bible, Saints, Prayers and Everything their day, never more than their room", () => {
    for (const style of ["new", "old"] as const) {
      for (let d = new Date(Date.UTC(2026, 0, 1, 12)); d < new Date(Date.UTC(2028, 0, 1, 12)); d.setUTCDate(d.getUTCDate() + 1)) {
        const day = churchDay(new Date(d), style);
        const iso = d.toISOString().slice(0, 10);
        for (const door of ["all", "bible", "saints", "prayers"] as const) {
          const rows = dayRows(door, day);
          expect(rows.length, `${style} ${iso} ${door}`).toBeGreaterThan(0);
          expect(rows.length, `${style} ${iso} ${door}`).toBeLessThanOrEqual(DAY_SLOTS[door]!);
        }
      }
    }
  });

  it("shows an Old Calendar reader the saints his calendar keeps: thirteen days on", () => {
    // On civil 19 December an Old Calendar reader keeps 6 December, St. Nicholas.
    const civil = new Date(Date.UTC(2026, 11, 19, 12));
    const old = dayRows("saints", churchDay(civil, "old")).map((r) => (r.kind === "saint" ? r.saint.name : ""));
    const kept = dayRows("saints", churchDay(new Date(Date.UTC(2026, 11, 6, 12)), "new")).map((r) => (r.kind === "saint" ? r.saint.name : ""));
    expect(old).toEqual(kept);
    expect(old.join(" ")).toMatch(/Nicholas/);
  });
});

describe("the screen", () => {
  it("fetches the day on its first opening, never with every page, and reads it through the app's one reading of the day", () => {
    const screen = code("components/search/CommandPalette.tsx");
    expect(screen).toContain('return import("./SearchDay")');
    expect(screen).not.toMatch(/from "\.\/SearchDay"|from "@\/lib\/calendar\//);
    const day = code("components/search/SearchDay.tsx");
    expect(day).toContain("const church = useChurchDay();");
    expect(day).not.toMatch(/\bcommemorationsOn\s*\(|\bdayReadings\s*\(/);
    // History's register comes only when the search is turned to History.
    expect(day).toContain('import("@/lib/history/events")');
    expect(day).not.toMatch(/from "@\/lib\/history\/events"/);
    // The hook hands every commemoration of the day, not the headline alone.
    expect(code("lib/calendar/useChurchDay.ts")).toMatch(/commemorations: Commemoration\[\];[\s\S]*headlineSaint: headline\?\.saint \?\? null,\s*commemorations,/);
  });

  it("holds the day's room from the first frame, under the recent words, until the day is here", () => {
    const screen = code("components/search/CommandPalette.tsx");
    const empty = screen.slice(screen.indexOf("if (!typing) {"), screen.indexOf("} else if (compose) {"));
    expect(empty).toContain("day ? <day.SearchDay door={turn.door} onGo={goTo} /> : <DayBlock eyebrow={t(dayEyebrow)} slots={daySlots} />");
    expect(empty.indexOf("data-search-recent")).toBeLessThan(empty.indexOf("{dayBlock}"));
    // Both are the one block, at the one size.
    expect(code("components/search/SearchDay.tsx")).toContain("<DayBlock eyebrow={t(eyebrow)} slots={slots}>");
  });

  it("opens a reading in the day's walk, as Today does", () => {
    const day = code("components/search/SearchDay.tsx");
    expect(day).toMatch(/const walk = dayWalk\(church\);[\s\S]*startReadingsFlow\(walk\);\s*if \(at > 0\) goToReading\(at\);\s*onGo\(hrefOf\(walk\[at\]\)\);/);
  });
});
