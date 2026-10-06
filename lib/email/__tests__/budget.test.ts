import { describe, expect, it } from "vitest";

import {
  budgetFrom,
  cycleEnd,
  cycleStart,
  daysLeftInCycle,
  daysToFinish,
  emailCycleDay,
  emailMonthlyLimit,
  emailReservePerDay,
  nextUtcMidnight,
  utcDayStart,
} from "../budget";

// The day the daily brake was lifted: the 1.5 release email had stopped at
// 1,571 of 2,339 accounts with most of the month unspent.
const now = new Date("2026-10-06T16:40:00Z");

describe("the plan", () => {
  it("defaults to Resend Pro: 50,000 a month, renewing on the 27th, with 15 a day held back", () => {
    expect(emailMonthlyLimit({})).toBe(50_000);
    expect(emailCycleDay({})).toBe(27);
    expect(emailReservePerDay({})).toBe(15);
  });

  it("is taken from the environment", () => {
    expect(emailMonthlyLimit({ EMAIL_MONTHLY_LIMIT: "100000" })).toBe(100_000);
    expect(emailCycleDay({ EMAIL_CYCLE_DAY: "3" })).toBe(3);
    expect(emailReservePerDay({ EMAIL_RESERVE: "200" })).toBe(200);
    expect(emailReservePerDay({ EMAIL_RESERVE: "0" })).toBe(0);
  });

  it("ignores nonsense, and a renewal day that not every month has", () => {
    expect(emailMonthlyLimit({ EMAIL_MONTHLY_LIMIT: "none" })).toBe(50_000);
    expect(emailMonthlyLimit({ EMAIL_MONTHLY_LIMIT: "-5" })).toBe(50_000);
    expect(emailCycleDay({ EMAIL_CYCLE_DAY: "31" })).toBe(27);
    expect(emailCycleDay({ EMAIL_CYCLE_DAY: "soon" })).toBe(27);
    expect(emailReservePerDay({ EMAIL_RESERVE: "-1" })).toBe(15);
  });

  it("no longer has a day's limit to read", () => {
    // The owner, 2026-10-06: "there is no daily limit for my recent subscription".
    expect(emailMonthlyLimit({ EMAIL_DAILY_LIMIT: "100" })).toBe(50_000);
  });
});

describe("the month Resend counts", () => {
  it("runs from one renewal day to the next, not from the 1st", () => {
    expect(cycleStart(now).toISOString()).toBe("2026-09-27T00:00:00.000Z");
    expect(cycleEnd(now).toISOString()).toBe("2026-10-27T00:00:00.000Z");
    expect(daysLeftInCycle(now)).toBe(21);
  });

  it("begins on the renewal day itself", () => {
    const renewal = new Date("2026-10-27T00:00:00Z");
    expect(cycleStart(renewal).toISOString()).toBe("2026-10-27T00:00:00.000Z");
    expect(cycleEnd(renewal).toISOString()).toBe("2026-11-27T00:00:00.000Z");
    expect(daysLeftInCycle(renewal)).toBe(31);
  });

  it("is still the old month a second before", () => {
    const eve = new Date("2026-10-26T23:59:59Z");
    expect(cycleStart(eve).toISOString()).toBe("2026-09-27T00:00:00.000Z");
    expect(cycleEnd(eve).toISOString()).toBe("2026-10-27T00:00:00.000Z");
    expect(daysLeftInCycle(eve)).toBe(1);
  });

  it("crosses a year", () => {
    const january = new Date("2027-01-03T10:00:00Z");
    expect(cycleStart(january).toISOString()).toBe("2026-12-27T00:00:00.000Z");
    expect(cycleEnd(january).toISOString()).toBe("2027-01-27T00:00:00.000Z");
  });

  it("follows another renewal day when the plan has one", () => {
    expect(cycleStart(now, 3).toISOString()).toBe("2026-10-03T00:00:00.000Z");
    expect(cycleEnd(now, 3).toISOString()).toBe("2026-11-03T00:00:00.000Z");
  });
});

describe("budgetFrom", () => {
  it("counts the month, and holds a reserve for every day it has left", () => {
    // Resend's own Usage page that afternoon: 4,272 of 50,000, renews Oct 27.
    const b = budgetFrom({ limit: 50_000, reservePerDay: 15, used: 4_272, today: 1_585, now });
    expect(b.left).toBe(45_728);
    expect(b.reserve).toBe(21 * 15);
    expect(b.bulkLeft).toBe(45_728 - 315);
    expect(b.today).toBe(1_585);
    expect(b.since).toBe("2026-09-27T00:00:00.000Z");
    expect(b.resetsAt).toBe("2026-10-27T00:00:00.000Z");
  });

  it("lets a release reach every account on the day it goes", () => {
    // The fault this replaced: a day's budget of 1,600 held 768 readers back.
    const b = budgetFrom({ limit: 50_000, reservePerDay: 15, used: 2_701, today: 14, now });
    expect(b.bulkLeft).toBeGreaterThanOrEqual(2_339);
  });

  it("gives bulk nothing once the month is down to the reserve", () => {
    expect(budgetFrom({ limit: 50_000, reservePerDay: 15, used: 49_700, now }).bulkLeft).toBe(0);
    expect(budgetFrom({ limit: 50_000, reservePerDay: 15, used: 60_000, now }).left).toBe(0);
  });

  it("never lets the reserve take more than half the month", () => {
    const b = budgetFrom({ limit: 100, reservePerDay: 15, used: 0, now });
    expect(b.reserve).toBe(50);
    expect(b.bulkLeft).toBe(50);
  });

  it("gives bulk nothing when the log could not be counted", () => {
    const b = budgetFrom({ limit: 50_000, reservePerDay: 15, used: 0, now, counted: false });
    expect(b.bulkLeft).toBe(0);
    expect(b.counted).toBe(false);
  });
});

describe("the day boundary", () => {
  it("is midnight UTC, which a send's own limit for a day still uses", () => {
    expect(utcDayStart(now).toISOString()).toBe("2026-10-06T00:00:00.000Z");
    expect(nextUtcMidnight(now).toISOString()).toBe("2026-10-07T00:00:00.000Z");
  });
});

describe("daysToFinish", () => {
  it("counts the days a mailing still needs", () => {
    expect(daysToFinish(1914, 85)).toBe(23);
    expect(daysToFinish(0, 85)).toBe(0);
    expect(daysToFinish(10, 0)).toBeNull();
  });
});
