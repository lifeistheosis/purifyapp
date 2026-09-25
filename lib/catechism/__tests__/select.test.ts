import { describe, expect, it, vi } from "vitest";

import { addDaysIso } from "../dates";
import {
  churchCalendar,
  pickDaily,
  pickWithHistory,
  seedFor,
  xorshift32,
} from "../select";
import { ANCHOR_MIN_BANK, NO_REPEAT_DAYS, QUESTIONS_PER_DAY } from "../types";
import { calendarWithSaint, fixtureId, makeBank, quietCalendar } from "./fixture";

describe("seed", () => {
  it("is a function of the date and the reckoning", () => {
    expect(seedFor("2026-09-05", "new")).toBe(seedFor("2026-09-05", "new"));
    expect(seedFor("2026-09-05", "new")).not.toBe(seedFor("2026-09-05", "old"));
    expect(seedFor("2026-09-05", "new")).not.toBe(seedFor("2026-09-06", "new"));
  });

  it("drives a generator that never returns the same stream for two seeds", () => {
    const a = xorshift32(seedFor("2026-09-05", "new"));
    const b = xorshift32(seedFor("2026-09-05", "old"));
    const sa = Array.from({ length: 5 }, () => a());
    const sb = Array.from({ length: 5 }, () => b());
    expect(sa).not.toEqual(sb);
    for (const v of [...sa, ...sb]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("pickDaily", () => {
  it("answers the same five ids on two runs, memoised or not", () => {
    const bank = makeBank(40);
    const first = pickDaily(bank, "2026-09-05", "new", quietCalendar);
    const second = pickDaily(bank, "2026-09-05", "new", quietCalendar);
    expect(first).toHaveLength(QUESTIONS_PER_DAY);
    expect(second).toEqual(first);
    // A fresh array is a fresh memo: the chain is rebuilt from the epoch and
    // must land on the same answer.
    const rebuilt = pickDaily(makeBank(40), "2026-09-05", "new", quietCalendar);
    expect(rebuilt).toEqual(first);
    expect(new Set(first).size).toBe(QUESTIONS_PER_DAY);
  });

  it("differs between reckonings and between days", () => {
    const bank = makeBank(40);
    const newStyle = pickDaily(bank, "2026-09-05", "new", quietCalendar);
    const oldStyle = pickDaily(bank, "2026-09-05", "old", quietCalendar);
    const tomorrow = pickDaily(bank, "2026-09-06", "new", quietCalendar);
    expect(newStyle).not.toEqual(oldStyle);
    expect(newStyle).not.toEqual(tomorrow);
  });

  it("puts the anchor first when the calendar matches a question", () => {
    const bank = makeBank(40, (i) => (i === 7 ? { calendar_anchor: { saint: "fixture-saint" } } : {}));
    const set = pickDaily(bank, "2026-09-05", "new", calendarWithSaint("fixture-saint"));
    expect(set[0]).toBe(fixtureId(7));
    expect(set).toHaveLength(QUESTIONS_PER_DAY);
  });

  it("never repeats a question within seven days on a 40-question bank", () => {
    const bank = makeBank(40);
    const days: string[][] = [];
    let day = "2026-01-01";
    for (let i = 0; i < 60; i++) {
      days.push(pickDaily(bank, day, "new", quietCalendar));
      day = addDaysIso(day, 1);
    }
    for (let i = 0; i < days.length; i++) {
      expect(new Set(days[i]).size).toBe(QUESTIONS_PER_DAY);
      for (let back = 1; back < NO_REPEAT_DAYS && i - back >= 0; back++) {
        const earlier = new Set(days[i - back]);
        for (const id of days[i]) expect(earlier.has(id)).toBe(false);
      }
    }
  });

  it("skips the anchor when the bank is under the minimum", () => {
    const calendar = vi.fn(calendarWithSaint("fixture-saint"));
    const small = makeBank(ANCHOR_MIN_BANK - 1, (i) =>
      i === 0 ? { calendar_anchor: { saint: "fixture-saint" } } : {},
    );
    const set = pickWithHistory(small, "2026-09-05", "new", [], calendar);
    expect(calendar).not.toHaveBeenCalled();
    expect(set).toHaveLength(QUESTIONS_PER_DAY);

    const enough = makeBank(ANCHOR_MIN_BANK, (i) =>
      i === 0 ? { calendar_anchor: { saint: "fixture-saint" } } : {},
    );
    const anchored = pickWithHistory(enough, "2026-09-05", "new", [], calendar);
    expect(calendar).toHaveBeenCalled();
    expect(anchored[0]).toBe(fixtureId(0));
  });

  it("prefers a fresh anchor over one shown this week", () => {
    const bank = makeBank(40, (i) =>
      i === 1 || i === 2 ? { calendar_anchor: { saint: "fixture-saint" } } : {},
    );
    const prior = [[fixtureId(1)]];
    const set = pickWithHistory(bank, "2026-09-05", "new", prior, calendarWithSaint("fixture-saint"));
    expect(set[0]).toBe(fixtureId(2));
  });

  it("leaves retired and unpublished questions out", () => {
    const bank = makeBank(40, (i) =>
      i < 5 ? { retired_at: "2026-01-01" } : i < 10 ? { published_at: "2030-01-01" } : {},
    );
    let day = "2026-02-01";
    for (let i = 0; i < 20; i++) {
      for (const id of pickDaily(bank, day, "new", quietCalendar)) {
        const n = Number(id.slice(-12));
        expect(n).toBeGreaterThanOrEqual(10);
      }
      day = addDaysIso(day, 1);
    }
  });

  it("answers with a smaller set when the bank is smaller than five", () => {
    expect(pickDaily(makeBank(3), "2026-09-05", "new", quietCalendar)).toHaveLength(3);
    expect(pickDaily([], "2026-09-05", "new", quietCalendar)).toEqual([]);
  });

  it("refuses a date that is not YYYY-MM-DD", () => {
    expect(() => pickDaily(makeBank(5), "5 Sept 2026", "new", quietCalendar)).toThrow();
  });
});

describe("churchCalendar", () => {
  it("shifts the menologion with the reckoning and leaves the readings on the civil day", () => {
    // 2026-12-19 on the Old Calendar is 2026-12-06 in the menologion.
    const oldStyle = churchCalendar("2026-12-19", "old");
    const newStyle = churchCalendar("2026-12-06", "new");
    expect(oldStyle.feast).toBe("12-06");
    expect([...oldStyle.saints].sort()).toEqual([...newStyle.saints].sort());
    expect(oldStyle.saints.size).toBeGreaterThan(0);

    const civilNew = churchCalendar("2026-12-19", "new");
    expect([...oldStyle.readings].sort()).toEqual([...civilNew.readings].sort());
  });
});
