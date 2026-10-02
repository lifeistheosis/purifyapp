import { describe, expect, it } from "vitest";

import { getSaint, SAINTS } from "@/lib/saints/saints";

import { feastDate, nameDay, parseFeast } from "../nameDay";

describe("parseFeast", () => {
  it("reads the calendar's own spelling", () => {
    expect(parseFeast("January 30")).toEqual({ month: 0, day: 30 });
    expect(parseFeast("November 13")).toEqual({ month: 10, day: 13 });
    expect(parseFeast("Sunday after Pentecost")).toBeNull();
    expect(parseFeast(null)).toBeNull();
  });

  it("can read every patron saint's first feast", () => {
    for (const s of SAINTS) expect(parseFeast(s.feastDays[0]), s.slug).not.toBeNull();
  });
});

describe("nameDay", () => {
  const chrysostom = ["November 13", "January 27", "January 30"];

  it("is today all through the day, anywhere on earth", () => {
    // Midnight UTC on the feast, and late on the feast in the far west.
    expect(nameDay(chrysostom, "new", new Date("2026-11-13T00:30:00Z"))?.today).toBe(true);
    expect(nameDay(chrysostom, "new", new Date("2026-11-14T10:00:00Z"))?.today).toBe(true);
    // Already the 13th in Kiribati before it is in London.
    expect(nameDay(chrysostom, "new", new Date("2026-11-12T11:00:00Z"))?.today).toBe(true);
    expect(nameDay(chrysostom, "new", new Date("2026-11-15T13:00:00Z"))?.today).toBe(false);
  });

  it("keeps the Old Calendar thirteen days later", () => {
    expect(feastDate({ month: 10, day: 13 }, 2026, "old").toISOString().slice(0, 10)).toBe("2026-11-26");
    expect(nameDay(chrysostom, "old", new Date("2026-11-26T12:00:00Z"))?.today).toBe(true);
    expect(nameDay(chrysostom, "old", new Date("2026-11-13T12:00:00Z"))?.today).toBe(false);
  });

  it("names the next one when it is not today", () => {
    expect(nameDay(chrysostom, "new", new Date("2026-12-01T12:00:00Z"))).toEqual({
      date: "2027-11-13",
      year: 2027,
      today: false,
    });
    expect(nameDay(["January 1"], "new", new Date("2026-12-31T23:00:00Z"))?.today).toBe(true);
  });

  it("works from a real saint", () => {
    const saint = getSaint("john-chrysostom") ?? SAINTS[0];
    expect(nameDay(saint.feastDays, "new")).not.toBeNull();
  });
});
