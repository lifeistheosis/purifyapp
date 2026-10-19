// The season of the Church's year a day falls in (lib/reading/seasons.ts),
// for the reading room's season row and the book at its top.

import { describe, expect, it } from "vitest";

import { orthodoxPascha } from "@/lib/calendar/pascha";
import { readingSeason } from "@/lib/reading/seasons";

const day = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d, 12));
const plus = (base: Date, days: number) => new Date(base.getTime() + days * 86_400_000);

describe("the reading room's season", () => {
  const pascha = orthodoxPascha(2026);

  it("follows Pascha: Lent, Holy Week, and the forty days", () => {
    expect(readingSeason(plus(pascha, -48), "new").current).toBe("lent");
    expect(readingSeason(plus(pascha, -8), "new").current).toBe("lent");
    expect(readingSeason(plus(pascha, -7), "new").current).toBe("holyWeek");
    expect(readingSeason(plus(pascha, -1), "new").current).toBe("holyWeek");
    expect(readingSeason(pascha, "new").current).toBe("pascha");
    expect(readingSeason(plus(pascha, 38), "new").current).toBe("pascha");
    expect(readingSeason(plus(pascha, 39), "old").current).toBeNull();
    // The same on both calendars: both keep the Orthodox Pascha.
    expect(readingSeason(pascha, "old").current).toBe("pascha");
  });

  it("keeps the fixed feasts on the reader's calendar", () => {
    expect(readingSeason(day(2026, 11, 20), "new").current).toBe("nativityFast");
    expect(readingSeason(day(2026, 12, 25), "new").current).toBe("nativity");
    expect(readingSeason(day(2026, 12, 25), "old").current).toBe("nativityFast");
    expect(readingSeason(day(2027, 1, 7), "old").current).toBe("nativity");
    expect(readingSeason(day(2027, 1, 6), "new").current).toBe("theophany");
    expect(readingSeason(day(2027, 1, 19), "old").current).toBe("theophany");
    expect(readingSeason(day(2026, 8, 2), "new").current).toBe("dormition");
    expect(readingSeason(day(2026, 8, 6), "new").current).toBe("transfiguration");
    expect(readingSeason(day(2026, 8, 19), "old").current).toBe("transfiguration");
  });

  it("names the season coming when it is none", () => {
    const october = readingSeason(day(2026, 10, 16), "new");
    expect(october.current).toBeNull();
    expect(october.next).toBe("nativityFast");
    expect(readingSeason(day(2026, 6, 1), "new").next).toBe("dormition");
  });
});
