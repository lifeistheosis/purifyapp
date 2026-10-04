import { describe, expect, it } from "vitest";

import {
  dayBasisNote,
  foldDailyRevenue,
  utcDayOf,
  type RevenueDay,
  type RevenueOrder,
} from "@/lib/admin/revenueDaily";

/**
 * Which day a sale belongs to.
 *
 * The calendar used to place an order on the day its checkout was OPENED,
 * because nothing recorded when it was paid, and the day view carried an
 * apology for it. shop_orders.paid_at is written at settlement now (audit
 * F-33), so the day is the day the money landed. What is held here is that
 * switch, and the one thing it must not do: lose a sale that has no payment
 * time on its row.
 */

const DAYS = ["2026-09-16", "2026-09-17", "2026-09-18"];

/** The route's own example: opened at 23:50 UTC on the 17th, paid on the 18th. */
function order(over: Partial<RevenueOrder> = {}): RevenueOrder {
  return {
    total_cents: 1998,
    payment_status: "paid",
    created_at: "2026-09-17T23:50:00.123456+00:00",
    paid_at: "2026-09-18T00:04:10+00:00",
    ...over,
  };
}

const on = (days: RevenueDay[], date: string) => days.find((d) => d.date === date)!;

describe("foldDailyRevenue", () => {
  it("counts an order on the day it was paid, not the day checkout opened", () => {
    const days = foldDailyRevenue([order()], DAYS);
    expect(on(days, "2026-09-18")).toEqual({ date: "2026-09-18", netCents: 1998, orderCount: 1, byCheckoutStart: 0 });
    expect(on(days, "2026-09-17")).toEqual({ date: "2026-09-17", netCents: 0, orderCount: 0, byCheckoutStart: 0 });
  });

  it("keeps a paid order that has no payment time, on its checkout day, and says so", () => {
    // The four orders that settled before the settlement wrote the column.
    // Dropping them would paint a day that took money as a day with no sales.
    const days = foldDailyRevenue([order({ paid_at: null })], DAYS);
    expect(on(days, "2026-09-17")).toEqual({ date: "2026-09-17", netCents: 1998, orderCount: 1, byCheckoutStart: 1 });
    expect(on(days, "2026-09-18").orderCount).toBe(0);
  });

  it("counts only the unstamped orders as placed by checkout start", () => {
    const days = foldDailyRevenue(
      [
        order({ created_at: "2026-09-17T10:00:00+00:00", paid_at: "2026-09-17T10:01:00+00:00" }),
        order({ created_at: "2026-09-17T11:00:00+00:00", paid_at: null, total_cents: 3494 }),
      ],
      DAYS,
    );
    expect(on(days, "2026-09-17")).toEqual({ date: "2026-09-17", netCents: 5492, orderCount: 2, byCheckoutStart: 1 });
  });

  it("keeps a refunded order visible on its paid day, worth nothing", () => {
    const days = foldDailyRevenue([order({ payment_status: "refunded" })], DAYS);
    expect(on(days, "2026-09-18")).toEqual({ date: "2026-09-18", netCents: 0, orderCount: 1, byCheckoutStart: 0 });
  });

  it("never counts a checkout that is not paid, whatever times it carries", () => {
    // A cancelled row can carry a paid_at: paid, then cancelled by hand.
    const days = foldDailyRevenue(
      [order({ payment_status: "pending", paid_at: null }), order({ payment_status: "cancelled" })],
      DAYS,
    );
    expect(days.every((d) => d.orderCount === 0 && d.netCents === 0)).toBe(true);
  });

  it("gives every day asked for, in order, with an explicit zero", () => {
    // A calendar has to tell a day that sold nothing from a day outside the range.
    const days = foldDailyRevenue([], DAYS);
    expect(days.map((d) => d.date)).toEqual(DAYS);
    expect(days.every((d) => d.netCents === 0 && d.orderCount === 0 && d.byCheckoutStart === 0)).toBe(true);
  });

  it("leaves out an order whose day is not among them", () => {
    const days = foldDailyRevenue([order({ paid_at: "2026-09-19T00:00:00+00:00" })], DAYS);
    expect(days.every((d) => d.orderCount === 0)).toBe(true);
  });
});

describe("dayBasisNote", () => {
  const BASIS = "An order is counted on the day its payment landed, in UTC, not the day checkout started.";
  const SHOP_ONLY =
    "Shop orders only. Donations are stored monthly and subscription revenue has no date, so neither can be placed on a day.";

  it("says which day an order is counted on, and nothing more when every order has a time", () => {
    expect(dayBasisNote(true, 0)).toBe(`${SHOP_ONLY} ${BASIS}`);
    expect(dayBasisNote(false, 0)).toBe(BASIS);
  });

  it("says how many of the day's orders sit there by checkout start", () => {
    // The column's own rule: never fall back to created_at without saying so.
    expect(dayBasisNote(true, 1)).toBe(
      `${SHOP_ONLY} ${BASIS} 1 order here has no recorded payment time, so it sits on the day its checkout started.`,
    );
    expect(dayBasisNote(false, 3)).toBe(
      `${BASIS} 3 orders here have no recorded payment time, so they sit on the day their checkout started.`,
    );
  });

  it("gives no note to a series that is not shop orders", () => {
    expect(dayBasisNote(false, null)).toBeNull();
    expect(dayBasisNote(true, null)).toBeNull();
  });

  it("no longer says the database has no settlement time", () => {
    // What the day view printed until F-33 was fixed, and it stopped being true.
    for (const note of [dayBasisNote(true, 0), dayBasisNote(true, 2), dayBasisNote(false, 1)]) {
      expect(note).not.toMatch(/no settlement timestamp|checkout STARTED/);
      // The repo allows no em dash anywhere, this file included: by code point.
      expect(note).not.toContain(String.fromCharCode(0x2014));
    }
  });
});

describe("utcDayOf", () => {
  it("reads the UTC day however the instant is written", () => {
    expect(utcDayOf("2026-09-18T00:04:10+00:00")).toBe("2026-09-18");
    expect(utcDayOf("2026-09-18T00:04:10.000Z")).toBe("2026-09-18");
    expect(utcDayOf("2026-09-17T23:50:00.123456+00:00")).toBe("2026-09-17");
  });

  it("does not take the first ten characters on trust", () => {
    // 8:04 in the evening in New York on the 17th is the 18th in UTC. A slice
    // would say the 17th.
    expect(utcDayOf("2026-09-17T20:04:10-04:00")).toBe("2026-09-18");
  });

  it("is null for something that is not a time", () => {
    expect(utcDayOf("")).toBeNull();
    expect(utcDayOf("yesterday")).toBeNull();
  });
});
