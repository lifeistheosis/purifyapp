import { describe, expect, it } from "vitest";

import { commemorationsOn, formatReposeNote } from "@/lib/calendar/orthodox";

// The daily-saints corpus writes a repose with a plus ("+400", "+ca. 290").
// A screen shows the cross before it instead. Until 1.7.1 that happened only
// before a digit, so 84 notes still showed a plus: Virgin-martyr Pelagia of
// Tarsus read "+ca. 290" on the calendar for May 4.
describe("the mark before a repose", () => {
  it("is a dagger set close before a year, as it always was", () => {
    expect(formatReposeNote("+400")).toBe("†400");
    expect(formatReposeNote("bishop, +304, in Rome")).toBe("bishop, †304, in Rome");
    expect(formatReposeNote("(+1563)")).toBe("(†1563)");
  });

  it("is a dagger and a space before a word", () => {
    expect(formatReposeNote("+ca. 290")).toBe("† ca. 290");
    expect(formatReposeNote("abbess, +early 4th c.")).toBe("abbess, † early 4th c.");
  });

  it("leaves a plus inside a word alone, and an empty note empty", () => {
    expect(formatReposeNote("2+2")).toBe("2+2");
    expect(formatReposeNote(undefined)).toBeUndefined();
  });

  it("gives Pelagia of Tarsus her dagger on May 4", () => {
    const pelagia = commemorationsOn(new Date(Date.UTC(2027, 4, 4, 12))).find((c) => /Pelagia of Tarsus/.test(c.name));
    expect(pelagia?.note).toBe("† ca. 290");
  });

  it("leaves no repose plus on any day of the year", () => {
    // 2028 is a leap year, so February 29 is read too.
    for (let t = Date.UTC(2028, 0, 1, 12); t < Date.UTC(2029, 0, 1, 12); t += 86_400_000) {
      for (const c of commemorationsOn(new Date(t))) {
        expect(c.note ?? "", c.name).not.toMatch(/(^|\s|\()\+/);
      }
    }
  });
});
