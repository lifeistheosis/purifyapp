import { describe, expect, it } from "vitest";

import { publishedEvents } from "@/lib/history/events";
import { historyEventsOnDay, todaysHistoryEvent } from "@/lib/history/onThisDay";

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
});
