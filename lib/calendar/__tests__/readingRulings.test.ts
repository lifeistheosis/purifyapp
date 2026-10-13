// Three rulings on the day's readings, 2026-10-12.
//
// Each was a question about the services that the owner answered, for his
// priest to confirm before it ships. What a reader would notice if one broke:
// on the Entry of the Theotokos, the ordinary Saturday's Gospel shown as the
// day's reading and the feast's under it; a saint's reading that is not the
// one the Church's calendar gives; or the Annunciation in Lent with its
// Gospel and none of the day's lessons.

import { describe, expect, it } from "vitest";

import fixedTable from "@/data/calendar/daily-readings.json";

import { officialDates, officialDay } from "../officialReadings";
import { dayReadings, type ReadingRef } from "../orthodox";

const on = (iso: string) => dayReadings(new Date(`${iso}T12:00:00Z`));
const labels = (refs: ReadingRef[]) => refs.map((r) => r.label);
const FIXED = fixedTable as Record<string, ReadingRef[]>;

describe("a great feast's readings lead", () => {
  it("on the Entry of the Theotokos, a Saturday: the feast's pair, then the day's", () => {
    const day = on("2026-11-21");
    expect(labels(day.readings)).toEqual(["Hebrews 9:1-7", "Luke 10:38-42; 11:27-28"]);
    expect(labels(day.ordinary)).toEqual(["Galatians 1:3-10", "Luke 9:57-62"]);
    expect(day.source).toBe("official");
  });

  it("on the Circumcision, with Saint Basil's pair still under both", () => {
    const day = on("2027-01-01");
    expect(labels(day.readings)).toEqual(["Colossians 2:8-12", "Luke 2:20-21,40-52"]);
    expect(labels(day.ordinary)).toEqual(["James 2:1-13", "Mark 12:1-12"]);
    expect(labels(day.commemoration)).toEqual(["Hebrews 7:26-8:2", "Luke 6:17-23"]);
  });

  it("on the Meeting, the Transfiguration and the Nativity of the Theotokos", () => {
    expect(labels(on("2027-02-02").readings)).toEqual(["Hebrews 7:7-17", "Luke 2:22-40"]);
    expect(labels(on("2027-02-02").ordinary)).toEqual(["Hebrews 12:25-26, 13:22-25", "Mark 10:2-12"]);
    expect(labels(on("2027-08-06").readings)).toEqual(["2 Peter 1:10-19", "Matthew 17:1-9"]);
    expect(labels(on("2027-08-06").ordinary)).toEqual(["1 Corinthians 7:35-8:7", "Matthew 15:29-31"]);
    expect(labels(on("2027-09-08").readings)).toEqual(["Philippians 2:5-11", "Luke 10:38-42; 11:27-28"]);
    expect(labels(on("2027-09-08").ordinary)).toEqual(["2 Corinthians 6:11-16", "Mark 1:23-28"]);
  });

  it("but a feast of the Theotokos on a Sunday leaves the Sunday's pair first", () => {
    // The Dormition and the Entry both fall on a Sunday in 2027.
    const dormition = on("2027-08-15");
    expect(labels(dormition.readings)).toEqual(["1 Corinthians 1:10-18", "Matthew 14:14-22"]);
    expect(dormition.ordinary).toEqual([]);
    expect(labels(dormition.commemoration)).toEqual(["Philippians 2:5-11", "Luke 10:38-42; 11:27-28"]);
    const entry = on("2027-11-21");
    expect(labels(entry.readings)).toEqual(["Galatians 6:11-18", "Luke 12:16-21"]);
    expect(entry.ordinary).toEqual([]);
    expect(labels(entry.commemoration)).toEqual(["Hebrews 9:1-7", "Luke 10:38-42; 11:27-28"]);
  });

  it("on five days of the list and no others", () => {
    const leading = officialDates().filter((d) => on(d).ordinary.length > 0);
    expect(leading).toEqual(["2026-11-21", "2027-01-01", "2027-02-02", "2027-08-06", "2027-09-08"]);
  });

  it("and never repeats a reading between the three groups", () => {
    for (const d of officialDates()) {
      const day = on(d);
      const all = [...day.readings, ...day.ordinary, ...day.commemoration].map((r) => `${r.book} ${r.chapter}:${r.from}`);
      expect(new Set(all).size, d).toBe(all.length);
    }
  });

  it("leaves a feast with the day to itself as it was", () => {
    const nativity = on("2026-12-25");
    expect(nativity.ordinary).toEqual([]);
    expect(nativity.readings.length).toBeGreaterThan(0);
  });
});

describe("the reading for the day's saint or feast", () => {
  it("is the Church's own where its list names one", () => {
    // The list gives Saint John Kochurov, with two Gospels to choose between;
    // the app's own table has Luke 10:1-15.
    const day = on("2026-10-31");
    expect(labels(day.commemoration)).toEqual(["Hebrews 13:7-16", "Luke 12:32-40", "John 10:9-16"]);
    expect(labels(FIXED["10-31"] ?? [])).toContain("Luke 10:1-15");
  });

  it("names a book in full where the list shortens it", () => {
    // "Gal 1:11-19" on the feast of Saint James. Shortened, a screen could
    // not name the book in the reader's language.
    expect(officialDay("2026-10-23")!.all.map((r) => r.raw)).toContain("Gal 1:11-19");
    expect(labels(on("2026-10-23").commemoration)).toContain("Galatians 1:11-19");
  });

  it("is every pair the list names that day, in its order", () => {
    // The Earthquake and Saint Demetrius.
    expect(labels(on("2026-10-26").commemoration)).toEqual([
      "Hebrews 12:6-13, 25-27",
      "Matthew 8:23-27",
      "2 Timothy 2:1-10",
      "John 15:17-16:2",
    ]);
  });

  it("is the app's own where the list names none", () => {
    let checked = 0;
    for (const d of officialDates()) {
      const listed = officialDay(d);
      const day = on(d);
      if (!listed || day.source !== "official" || listed.proper.length > 0) continue;
      const shown = new Set(day.readings.map((r) => `${r.book} ${r.chapter}:${r.from}`));
      const ours = (FIXED[d.slice(5)] ?? []).filter((r) => !shown.has(`${r.book} ${r.chapter}:${r.from}`));
      expect(labels(day.commemoration), d).toEqual(labels(ours));
      checked += 1;
    }
    expect(checked).toBeGreaterThan(200);
  });

  it("is not a pair read at another service", () => {
    // Mid-Pentecost: the list's second pair is for the blessing of waters.
    const day = on("2027-05-26");
    expect(labels(day.readings)).toEqual(["Acts 14:6-18", "John 7:14-30"]);
    expect(labels(day.commemoration)).not.toContain("John 5:1-4");
    // The first of August has three named pairs; the one for the blessing of
    // waters is left out and the Cross's and the Martyrs' are kept.
    const august = labels(on("2027-08-01").commemoration);
    expect(august).toEqual(["1 Corinthians 1:18-24", "John 19:6-11, 13-20, 25-28, 30-35", "Hebrews 11:33-12:2", "Matthew 10:32-36; 11:1"]);
  });

  it("comes from the list on more than a hundred days", () => {
    const fromTheList = officialDates().filter((d) => {
      const listed = officialDay(d);
      return on(d).source === "official" && listed !== null && listed.proper.length > 0 && on(d).commemoration.length > 0;
    });
    expect(fromTheList.length).toBeGreaterThan(100);
  });
});

describe("a saint's or feast's day inside Great Lent", () => {
  it("keeps its Epistle and Gospel first and shows the day's lessons after them", () => {
    const annunciation = on("2027-03-25");
    expect(labels(annunciation.readings)).toEqual(["Hebrews 2:11-18", "Luke 1:24-38", "Isaiah 6:1-12", "Genesis 5:1-24", "Proverbs 6:3-20"]);
    expect(annunciation.readings.map((r) => r.kind)).toEqual(["epistle", "gospel", "ot", "ot", "ot"]);
  });

  it("shows the day's own three lessons, not the saint's Vespers readings", () => {
    // Saint Tikhon: the list also gives three readings from Wisdom at Vespers.
    const day = on("2027-04-07");
    expect(labels(day.readings)).toEqual(["Hebrews 7:26-8:2", "John 10:9-16", "Isaiah 26:21-27:9", "Genesis 9:18-10:1", "Proverbs 12:23-13:9"]);
  });

  it("on five days of Lent 2027 and no others", () => {
    const both = officialDates().filter((d) => {
      const kinds = on(d).readings.map((r) => r.kind);
      return on(d).source === "official" && kinds.includes("ot") && (kinds.includes("epistle") || kinds.includes("gospel"));
    });
    expect(both).toEqual(["2027-03-25", "2027-03-26", "2027-03-31", "2027-04-07", "2027-04-23"]);
  });

  it("leaves an ordinary Lenten weekday as it was: every lesson the list gives", () => {
    const day = on("2027-03-24");
    expect(day.readings.every((r) => r.kind === "ot")).toBe(true);
    expect(day.readings.length).toBe(officialDay("2027-03-24")!.all.length);
  });

  it("adds no Vespers reading to a feast outside Lent", () => {
    expect(on("2026-11-21").readings.every((r) => r.kind !== "ot")).toBe(true);
    expect(on("2027-08-06").readings.every((r) => r.kind !== "ot")).toBe(true);
  });
});

describe("a reader the list is not for", () => {
  it("sees what the app showed before: no ordinary pair and nothing under", () => {
    for (const d of ["2026-11-21", "2026-10-31", "2027-03-25"]) {
      const day = dayReadings(new Date(`${d}T12:00:00Z`), { official: false });
      expect(day.ordinary, d).toEqual([]);
      expect(day.commemoration, d).toEqual([]);
      expect(day.source === "official", d).toBe(false);
    }
  });
});
