import { describe, expect, it } from "vitest";

import {
  ORDER_GIFT_DAYS_PER_MONTH,
  ORDER_GIFT_SCHEDULE,
  autoClaimPick,
  giftDays,
  isOrderBuyer,
  orderDelivered,
  orderGiftMonths,
  orderNumberOf,
  parseOrderNumber,
  plusRunning,
  zipMatches,
  type OrderGiftOrder,
  type OrderGiftState,
} from "../orderGift";
import { orderConfirmationNumber } from "@/lib/shop/orderNumber";

const NOW = new Date("2026-11-06T15:00:00Z");
const DAY = 86_400_000;
const iso = (ms: number) => new Date(NOW.getTime() + ms).toISOString();

describe("orderGiftMonths", () => {
  it("is 1 month for every purchase, whatever its date (the owner, 2026-11-11)", () => {
    expect(ORDER_GIFT_SCHEDULE).toEqual([{ from: "2020-01-01", months: 1 }]);
    expect(orderGiftMonths(NOW)).toBe(1);
    // An order from before the cards were made counts too.
    expect(orderGiftMonths("2026-09-20T10:00:00Z")).toBe(1);
  });

  it("gives nothing to an order with no date", () => {
    expect(orderGiftMonths(null)).toBe(0);
    expect(orderGiftMonths("not a date")).toBe(0);
  });

  it("keeps the months of the day an order was paid after a switch", () => {
    const schedule = [
      { from: "2026-11-06", months: 3 },
      { from: "2027-03-01", months: 1 },
    ];
    expect(orderGiftMonths("2027-02-28T23:00:00Z", schedule)).toBe(3);
    expect(orderGiftMonths("2027-03-01T00:00:00Z", schedule)).toBe(1);
    // The order of the lines in the file does not matter.
    expect(orderGiftMonths("2027-04-01T00:00:00Z", [...schedule].reverse())).toBe(1);
  });
});

describe("giftDays", () => {
  it("one month is 30 days, whichever month it falls in", () => {
    expect(ORDER_GIFT_DAYS_PER_MONTH).toBe(30);
    expect(giftDays(1)).toBe(30);
    expect(new Date(NOW.getTime() + giftDays(1) * DAY).toISOString().slice(0, 10)).toBe("2026-12-06");
    expect(giftDays(0)).toBe(0);
  });

  it("never asks the database for more than it accepts", () => {
    expect(giftDays(24)).toBe(400);
  });
});

describe("order numbers", () => {
  const id = "72d8d24b-1c2d-4e5f-8a9b-0c1d2e3f4a5b";

  it("matches the number the shop prints", () => {
    expect(orderNumberOf(id)).toBe(orderConfirmationNumber(id));
    expect(orderNumberOf(id)).toBe("EIK-72D8D24B");
  });

  it("reads the number however it is typed", () => {
    for (const typed of ["EIK-72D8D24B", "eik-72d8d24b", "EIK 72D8D24B", " 72d8d24b ", "eik72D8-D24B"]) {
      expect(parseOrderNumber(typed)).toBe("72d8d24b");
    }
  });

  it("refuses anything that is not 8 hex characters", () => {
    for (const typed of ["", "EIK-", "EIK-72D8D24", "EIK-72D8D24BB", "EIK-72D8D24G", "' or 1=1 --", null, undefined]) {
      expect(parseOrderNumber(typed)).toBeNull();
    }
  });
});

describe("zipMatches", () => {
  it("compares US ZIPs on their first five digits", () => {
    expect(zipMatches("60614", "60614")).toBe(true);
    expect(zipMatches("60614-1234", "60614")).toBe(true);
    expect(zipMatches(" 60614 ", "606141234")).toBe(true);
    expect(zipMatches("60615", "60614")).toBe(false);
  });

  it("never matches an empty value", () => {
    expect(zipMatches("", "60614")).toBe(false);
    expect(zipMatches("60614", null)).toBe(false);
    expect(zipMatches(null, undefined)).toBe(false);
  });

  it("compares other postcodes as letters and digits", () => {
    expect(zipMatches("k1a 0b1", "K1A0B1")).toBe(true);
    expect(zipMatches("K1A 0B2", "K1A0B1")).toBe(false);
  });
});

describe("isOrderBuyer", () => {
  const reader = { id: "u1", email: "Reader_One@Example.com", emailConfirmed: true };

  it("is their own order", () => {
    expect(isOrderBuyer({ user_id: "u1", email: null }, reader)).toBe(true);
    expect(isOrderBuyer({ user_id: "u2", email: "reader_one@example.com" }, reader)).toBe(false);
  });

  it("is a guest order with the address they have confirmed, in any case", () => {
    expect(isOrderBuyer({ user_id: null, email: "reader_one@example.com" }, reader)).toBe(true);
    // "_" is a wildcard to the database's ilike; here it must match exactly.
    expect(isOrderBuyer({ user_id: null, email: "readerXone@example.com" }, reader)).toBe(false);
  });

  it("is never a guest order when the address is not confirmed", () => {
    expect(isOrderBuyer({ user_id: null, email: "reader_one@example.com" }, { ...reader, emailConfirmed: false })).toBe(false);
    expect(isOrderBuyer({ user_id: null, email: null }, reader)).toBe(false);
  });
});

describe("plusRunning", () => {
  const row = (plus: number | null, pro: number | null = null) => ({
    is_supporter: false,
    plus_source: "google",
    plus_until: plus === null ? null : iso(plus),
    pro_until: pro === null ? null : iso(pro),
  });

  it("is off with no row, or with Plus and Pro both ended", () => {
    expect(plusRunning(null, NOW)).toEqual({ running: false, pro: false, until: null });
    expect(plusRunning(row(-DAY, -DAY), NOW).running).toBe(false);
  });

  it("is on while Plus has time left, until its end", () => {
    expect(plusRunning(row(20 * DAY), NOW)).toEqual({ running: true, pro: false, until: iso(20 * DAY) });
  });

  it("counts Pro (the EIKON Box) as Plus, until the later end", () => {
    expect(plusRunning(row(5 * DAY, 9 * DAY), NOW)).toEqual({ running: true, pro: true, until: iso(9 * DAY) });
    expect(plusRunning(row(null, 9 * DAY), NOW).running).toBe(true);
  });

  it("does not count the supporter's lifetime sync as Plus", () => {
    expect(plusRunning({ ...row(null), is_supporter: true }, NOW).running).toBe(false);
  });
});

describe("the gift opens at delivery, given on arrival", () => {
  const order = (over: Partial<OrderGiftOrder>): OrderGiftOrder => ({
    id: "o1",
    number: "EIK-00000001",
    paidAt: "2026-11-10T00:00:00Z",
    months: 3,
    delivered: true,
    claimed: false,
    mine: false,
    ...over,
  });
  const signedIn = (orders: OrderGiftOrder[], running = false): OrderGiftState => ({
    signedIn: true,
    plus: { running, pro: false, until: running ? "2027-01-01T00:00:00Z" : null },
    orders,
  });

  it("counts only 'delivered' as delivered", () => {
    expect(orderDelivered("delivered")).toBe(true);
    for (const s of ["shipped", "packaged", "pending", "refunded", "cancelled", null, undefined]) {
      expect(orderDelivered(s)).toBe(false);
    }
  });

  it("claims the newest delivered order nobody has claimed", () => {
    const state = signedIn([
      order({ id: "old", paidAt: "2026-11-08T00:00:00Z" }),
      order({ id: "new", paidAt: "2026-11-20T00:00:00Z" }),
      order({ id: "taken", paidAt: "2026-11-25T00:00:00Z", claimed: true, mine: true }),
      order({ id: "coming", paidAt: "2026-11-30T00:00:00Z", delivered: false }),
    ]);
    expect(autoClaimPick(state)).toBe("new");
  });

  it("claims nothing for an order still on its way", () => {
    expect(autoClaimPick(signedIn([order({ delivered: false })]))).toBeNull();
  });

  it("claims nothing while Plus or Pro runs, signed out, or before the gift began", () => {
    expect(autoClaimPick(signedIn([order({})], true))).toBeNull();
    expect(autoClaimPick({ signedIn: false })).toBeNull();
    expect(autoClaimPick(null)).toBeNull();
    expect(autoClaimPick(signedIn([order({ months: 0 })]))).toBeNull();
  });
});
