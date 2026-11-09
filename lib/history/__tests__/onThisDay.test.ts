import { describe, expect, it } from "vitest";

import { publishedEvents } from "@/lib/history/events";
import { TODAY_FOR_HIS_WORD, historyEventsOnDay, todaysHistoryEvent } from "@/lib/history/onThisDay";

/** The reader's day in the UTC-noon frame useToday hands over. */
const day = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d, 12));
const slugs = (list: { slug: string }[]) => list.map((e) => e.slug);

describe("this day in Church history (U9)", () => {
  it("keeps a Church date on the New Calendar's civil day", () => {
    // The fall of Constantinople, May 29 (julian).
    expect(slugs(historyEventsOnDay(day(2027, 5, 29), "new"))).toContain("fall-of-constantinople");
    expect(slugs(historyEventsOnDay(day(2027, 6, 11), "new"))).not.toContain("fall-of-constantinople");
  });

  it("keeps the same Church date thirteen days later on the Old Calendar", () => {
    expect(slugs(historyEventsOnDay(day(2027, 6, 11), "old"))).toContain("fall-of-constantinople");
    expect(slugs(historyEventsOnDay(day(2027, 5, 29), "old"))).not.toContain("fall-of-constantinople");
  });

  it("keeps a civil date on the civil day, whatever the calendar", () => {
    for (const style of ["new", "old"] as const) {
      expect(slugs(historyEventsOnDay(day(2027, 4, 10), style))).toContain("oca-autocephaly");
    }
  });

  it("finds every dated event on its day, and nothing on an ordinary one", () => {
    const dated = publishedEvents().filter((e) => e.calendar);
    expect(dated.length).toBeGreaterThan(0);
    for (const e of dated) {
      const on = day(2027, e.calendar!.month, e.calendar!.day);
      expect(slugs(historyEventsOnDay(on, "new"))).toContain(e.slug);
    }
    expect(historyEventsOnDay(day(2027, 1, 2), "new")).toEqual([]);
  });

  it("puts on Today only an event that has its picture", () => {
    expect(todaysHistoryEvent(day(2027, 5, 29), "new")?.slug).toBe("fall-of-constantinople");
    // OCA autocephaly has no picture on record: Today shows nothing that day.
    expect(todaysHistoryEvent(day(2027, 4, 10), "new")).toBeNull();
    expect(todaysHistoryEvent(day(2027, 1, 2), "new")).toBeNull();
  });

  it("holds the three most disputed events off Today until his word", () => {
    // The 2018 break has its picture, and falls on October 15.
    expect(slugs(historyEventsOnDay(day(2027, 10, 15), "new"))).toContain("moscow-constantinople-schism-2018");
    expect(todaysHistoryEvent(day(2027, 10, 15), "new")).toBeNull();
    // Every other dated event with its picture still shows on its day.
    for (const e of publishedEvents().filter((x) => x.calendar && x.media && !TODAY_FOR_HIS_WORD.has(x.slug))) {
      expect(todaysHistoryEvent(day(2027, e.calendar!.month, e.calendar!.day), "new")?.slug).toBe(e.slug);
    }
  });
});
