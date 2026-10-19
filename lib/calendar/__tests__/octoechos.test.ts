import { describe, expect, it } from "vitest";

import { toneOfWeek } from "@/lib/calendar/octoechos";
import { orthodoxPascha } from "@/lib/calendar/pascha";

// A day in the calendar's frame: noon UTC, its UTC date the reader's own.
const day = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d, 12));
const fromPascha = (year: number, days: number) => {
  const p = orthodoxPascha(year);
  return new Date(Date.UTC(p.getUTCFullYear(), p.getUTCMonth(), p.getUTCDate() + days, 12));
};

describe("the tone of the week", () => {
  it("starts the cycle on the Sunday of Thomas, in the first tone", () => {
    for (const year of [2025, 2026, 2027]) {
      expect(toneOfWeek(fromPascha(year, 7)), `${year}`).toEqual({ tone: 1 });
      // And holds it for the week after it.
      expect(toneOfWeek(fromPascha(year, 13))).toEqual({ tone: 1 });
    }
  });

  it("moves one tone a Sunday: the Myrrhbearers in the second, All Saints in the eighth", () => {
    expect(toneOfWeek(fromPascha(2026, 14))).toEqual({ tone: 2 });
    expect(toneOfWeek(fromPascha(2026, 21))).toEqual({ tone: 3 });
    expect(toneOfWeek(fromPascha(2026, 56))).toEqual({ tone: 8 });
    // Then round again: the second Sunday after Pentecost is in the first.
    expect(toneOfWeek(fromPascha(2026, 63))).toEqual({ tone: 1 });
  });

  it("knows a week by its Sunday: the week of 11 October 2026 is in the second tone", () => {
    // The nineteenth Sunday after Pentecost in 2026.
    expect(toneOfWeek(day(2026, 10, 11))).toEqual({ tone: 2 });
    expect(toneOfWeek(day(2026, 10, 16))).toEqual({ tone: 2 });
    expect(toneOfWeek(day(2026, 10, 17))).toEqual({ tone: 2 });
    expect(toneOfWeek(day(2026, 10, 18))).toEqual({ tone: 3 });
    // 12 October 2025, the eighteenth Sunday after Pentecost, in the first.
    expect(toneOfWeek(day(2025, 10, 12))).toEqual({ tone: 1 });
  });

  it("gives Bright Week a tone a day, the grave tone left out", () => {
    const week = [0, 1, 2, 3, 4, 5, 6].map((d) => toneOfWeek(fromPascha(2026, d)));
    expect(week).toEqual([1, 2, 3, 4, 5, 6, 8].map((tone) => ({ tone, bright: true })));
  });

  it("has no tone from Palm Sunday through Holy Saturday", () => {
    for (let d = -7; d <= -1; d++) expect(toneOfWeek(fromPascha(2026, d)), `Pascha ${d}`).toBeNull();
    // The Sundays of Lent keep theirs.
    expect(toneOfWeek(fromPascha(2026, -14))).not.toBeNull();
  });

  it("reaches back to last year's cycle before this year's Thomas Sunday", () => {
    // 1 January 2027 is in the cycle that began on Thomas Sunday 2026.
    const start = fromPascha(2026, 7).getTime();
    const sunday = day(2026, 12, 27).getTime();
    const weeks = Math.round((sunday - start) / (7 * 86_400_000));
    expect(toneOfWeek(day(2027, 1, 1))).toEqual({ tone: (weeks % 8) + 1 });
  });

  it("always names one of the eight, every day of three years", () => {
    for (let t = day(2025, 1, 1).getTime(); t < day(2028, 1, 1).getTime(); t += 86_400_000) {
      const tone = toneOfWeek(new Date(t));
      if (tone) expect(tone.tone >= 1 && tone.tone <= 8).toBe(true);
    }
  });
});
