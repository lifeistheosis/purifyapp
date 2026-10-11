import { describe, expect, it } from "vitest";

import { officialDates, officialDay } from "@/lib/calendar/officialReadings";
import {
  dayReadings,
  orthodoxPascha,
  readingsOn,
  readingsOptionsFor,
  readingsSourceOn,
} from "@/lib/calendar/orthodox";

/**
 * Which readings a day is given, and from which table.
 *
 * Three tables can answer: the app's own Paschal one, an official calendar's
 * list, and the app's own date table of saints and feasts. The owner's
 * rulings of 2026-10-10 are what these hold: the day's readings follow the
 * official list, and the saint's reading stays under them, said to be whose
 * it is.
 */

/** A civil date in the frame every lookup here expects: UTC noon. */
const at = (iso: string) => new Date(`${iso}T12:00:00Z`);

describe("an ordinary day inside the official list", () => {
  const day = dayReadings(at("2026-10-10"));

  it("is answered by the official calendar: the day's Epistle, then its Gospel", () => {
    expect(day.source).toBe("official");
    expect(day.readings.map((r) => [r.kind, r.label])).toEqual([
      ["epistle", "1 Corinthians 15:58-16:3"],
      ["gospel", "Luke 5:27-32"],
    ]);
  });

  it("opens the Bible at the first verse of each", () => {
    expect(day.readings[0]).toMatchObject({ book: "1-corinthians", chapter: 15, from: 58 });
    expect(day.readings[1]).toMatchObject({ book: "luke", chapter: 5, from: 27, to: 32 });
  });

  it("keeps the saint's reading, under the day's own", () => {
    // The date's own table gives Luke 21:12-19 for October 10, which until
    // 1.6 was shown as the reading of the day.
    expect(day.commemoration.map((r) => r.label)).toEqual(["Luke 21:12-19"]);
  });

  it("readingsOn and readingsSourceOn are the same answer, in two pieces", () => {
    expect(readingsOn(at("2026-10-10"))).toEqual(day.readings);
    expect(readingsSourceOn(at("2026-10-10"))).toBe("official");
  });
});

describe("a reader the official list is not for", () => {
  it("an Old Calendar reader is not handed the New Calendar list", () => {
    expect(readingsOptionsFor("old")).toEqual({ official: false });
    expect(readingsOptionsFor("new")).toEqual({ official: true });
  });

  it("and sees what the app showed before: the date's own table, with nothing under it", () => {
    const day = dayReadings(at("2026-10-10"), readingsOptionsFor("old"));
    expect(day.source).toBe("fixed");
    expect(day.readings.map((r) => r.label)).toEqual(["Luke 21:12-19"]);
    expect(day.commemoration).toEqual([]);
  });
});

describe("the days the other two tables answer", () => {
  it("the Paschal table wins on the days it names, inside the official list or not", () => {
    for (const year of [2027, 2029]) {
      const pascha = orthodoxPascha(year);
      const day = dayReadings(pascha);
      expect(day.source, String(year)).toBe("paschal");
      expect(day.commemoration, String(year)).toEqual([]);
      expect(day.readings.some((r) => r.kind === "gospel" && r.book === "john" && r.chapter === 1), String(year)).toBe(true);
    }
  });

  it("past the list's last day the date's own table answers, as it always did", () => {
    const day = dayReadings(at("2028-10-10"));
    expect(day.source).toBe("fixed");
    expect(day.readings.map((r) => r.label)).toEqual(["Luke 21:12-19"]);
    expect(day.commemoration).toEqual([]);
  });

  it("and before its first", () => {
    expect(dayReadings(at("2026-09-30")).source).not.toBe("official");
  });
});

describe("every day of the official list", () => {
  it("is used whole or left to the old tables, and never gives a reading twice", () => {
    for (const iso of officialDates()) {
      const day = dayReadings(at(iso));
      if (day.source !== "official") {
        expect(day.commemoration, iso).toEqual([]);
        continue;
      }
      expect(officialDay(iso), iso).not.toBeNull();
      expect(day.readings.length, iso).toBeGreaterThan(0);
      for (const r of day.readings) {
        expect(r.label.length, iso).toBeGreaterThan(3);
        expect(r.from, iso).toBeGreaterThan(0);
        expect(r.to, iso).toBeGreaterThanOrEqual(r.from);
      }
      for (const c of day.commemoration) {
        expect(
          day.readings.some((r) => r.book === c.book && r.chapter === c.chapter && r.from === c.from),
          `${iso} ${c.label}`,
        ).toBe(false);
      }
    }
  });

  it("on a day with an Epistle and a Gospel, gives the Epistle first and one of each", () => {
    for (const iso of officialDates()) {
      const day = dayReadings(at(iso));
      if (day.source !== "official") continue;
      const kinds = day.readings.map((r) => r.kind);
      if (kinds.includes("gospel") || kinds.includes("epistle")) {
        expect(kinds.filter((k) => k === "gospel").length, iso).toBeLessThanOrEqual(1);
        expect(kinds.filter((k) => k === "epistle").length, iso).toBeLessThanOrEqual(1);
        expect(kinds.includes("ot"), iso).toBe(false);
        if (kinds.length === 2) expect(kinds, iso).toEqual(["epistle", "gospel"]);
      } else {
        // A weekday of Great Lent: Old Testament lessons and no Liturgy.
        expect(kinds.every((k) => k === "ot"), iso).toBe(true);
      }
    }
  });
});
