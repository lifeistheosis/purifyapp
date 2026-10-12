// The calendar's long date, in the reader's language.
//
// The heading over the calendar's feast panel read "Friday · November 13,
// 2026" on every phone until 1.6, whatever the phone was set to: the screen
// asked for the date without saying whose language to write it in.

import { describe, expect, it } from "vitest";

import { formatLongDate, formatLongDateDual } from "../orthodox";

const at = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d, 12));

describe("formatLongDateDual", () => {
  const days = [at(2026, 11, 13), at(2027, 1, 1), at(2027, 5, 2), at(2028, 2, 29), at(2026, 12, 31)];

  it("writes English exactly as it did, with or without being told the language", () => {
    for (const d of days) {
      expect(formatLongDateDual(d, "new", "en")).toBe(formatLongDateDual(d, "new"));
      expect(formatLongDateDual(d, "old", "en")).toBe(formatLongDateDual(d, "old"));
    }
    expect(formatLongDateDual(at(2026, 11, 13), "new", "en")).toBe("Friday · November 13, 2026");
    expect(formatLongDateDual(at(2026, 11, 13), "old", "en")).toBe("Friday · November 13 / October 31, 2026");
  });

  it("writes the reader's language when told it", () => {
    const greek = formatLongDateDual(at(2026, 11, 13), "new", "el");
    expect(greek).toBe(formatLongDate(at(2026, 11, 13), "el"));
    expect(greek).toContain("2026");
    expect(greek).toMatch(/\p{Script=Greek}/u);
    expect(greek).not.toMatch(/Friday|November/);
    const russian = formatLongDateDual(at(2026, 11, 13), "new", "ru");
    expect(russian).toMatch(/\p{Script=Cyrillic}/u);
    expect(russian).not.toMatch(/Friday|November/);
  });

  it("keeps both reckonings on the Old Calendar, thirteen days apart, in that language", () => {
    const greek = formatLongDateDual(at(2026, 11, 13), "old", "el");
    // November 13 by the civil date, October 31 by the Church's.
    expect(greek).toMatch(/13/);
    expect(greek).toMatch(/31/);
    expect(greek).toContain(" / ");
    expect(greek).toContain("2026");
    expect(greek).not.toMatch(/November|October|Friday/);
    // Across a year's end the two dates fall in different months and years
    // of the civil calendar; the year printed is the civil one, as before.
    const english = formatLongDateDual(at(2027, 1, 5), "old", "en");
    expect(english).toBe(formatLongDateDual(at(2027, 1, 5), "old"));
    expect(english).toContain("January 5 / December 23, 2027");
  });
});
