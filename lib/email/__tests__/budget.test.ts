import { describe, expect, it } from "vitest";

import { budgetFrom, daysToFinish, emailDailyLimit, emailReserve, nextUtcMidnight, utcDayStart } from "../budget";

const now = new Date("2026-09-19T16:40:00Z");

describe("the day's limit and reserve", () => {
  it("defaults to Resend's Free plan and a reserve for mail a reader is waiting on", () => {
    expect(emailDailyLimit({})).toBe(100);
    expect(emailReserve({})).toBe(15);
  });

  it("takes the plan from the environment", () => {
    expect(emailDailyLimit({ EMAIL_DAILY_LIMIT: "3000" })).toBe(3000);
    expect(emailReserve({ EMAIL_DAILY_LIMIT: "3000", EMAIL_RESERVE: "200" })).toBe(200);
  });

  it("ignores nonsense and never lets the reserve eat more than half the day", () => {
    expect(emailDailyLimit({ EMAIL_DAILY_LIMIT: "none" })).toBe(100);
    expect(emailDailyLimit({ EMAIL_DAILY_LIMIT: "-5" })).toBe(100);
    expect(emailReserve({ EMAIL_DAILY_LIMIT: "20", EMAIL_RESERVE: "18" })).toBe(10);
    expect(emailReserve({ EMAIL_RESERVE: "0" })).toBe(0);
  });
});

describe("budgetFrom", () => {
  it("holds the reserve back from bulk", () => {
    const b = budgetFrom({ limit: 100, reserve: 15, used: 20, now });
    expect(b.left).toBe(80);
    expect(b.bulkLeft).toBe(65);
    expect(b.resetsAt).toBe("2026-09-20T00:00:00.000Z");
  });

  it("gives bulk nothing once the day is down to the reserve", () => {
    expect(budgetFrom({ limit: 100, reserve: 15, used: 90, now }).bulkLeft).toBe(0);
    expect(budgetFrom({ limit: 100, reserve: 15, used: 200, now }).left).toBe(0);
  });

  it("gives bulk nothing when the log could not be counted", () => {
    const b = budgetFrom({ limit: 100, reserve: 15, used: 0, now, counted: false });
    expect(b.bulkLeft).toBe(0);
    expect(b.counted).toBe(false);
  });
});

describe("the day boundary", () => {
  it("is midnight UTC, which is when Resend's count restarts", () => {
    expect(utcDayStart(now).toISOString()).toBe("2026-09-19T00:00:00.000Z");
    expect(nextUtcMidnight(now).toISOString()).toBe("2026-09-20T00:00:00.000Z");
  });
});

describe("daysToFinish", () => {
  it("counts the days a mailing still needs", () => {
    expect(daysToFinish(1914, 85)).toBe(23);
    expect(daysToFinish(0, 85)).toBe(0);
    expect(daysToFinish(10, 0)).toBeNull();
  });
});
