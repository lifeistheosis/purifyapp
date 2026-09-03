import { describe, expect, it } from "vitest";

import { STALE_AFTER_MS, staleCounts } from "../attentionOrders";

const NOW = Date.parse("2026-09-01T12:00:00Z");
const DAY = 86_400_000;
const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString();
const pending = (msAgo: number) => ({ payment_status: "pending", created_at: iso(msAgo) });
const paid = (msAgo: number) => ({ payment_status: "paid", created_at: iso(msAgo) });

/**
 * The replay that matters: the shape production had on 2026-09-01, when
 * thirty-one orders sat pending with Stripe sessions attached and one was
 * marked paid, and nothing on the panel said a word.
 */
describe("the 2026-09-01 shape", () => {
  it("counts every day-old pending order as stale and, with no reconcile ever run, unchecked", () => {
    const orders = [
      ...Array.from({ length: 31 }, (_, k) => pending(2 * DAY + k * DAY)),
      paid(DAY),
    ];
    const r = staleCounts(orders, 31, NOW, null);
    expect(r.stale).toBe(31);
    expect(r.unchecked).toBe(31);
    expect(r.newestStaleAt).toBe(iso(2 * DAY));
  });
});

describe("what is stale", () => {
  it("is nothing inside Stripe's 24 hour session lifetime", () => {
    // Someone may still be typing a card number.
    const r = staleCounts([pending(STALE_AFTER_MS - 1), pending(60_000)], 2, NOW, null);
    expect(r.stale).toBe(0);
    expect(r.unchecked).toBe(0);
    expect(r.newestStaleAt).toBeNull();
  });

  it("is a pending order exactly a day old", () => {
    expect(staleCounts([pending(STALE_AFTER_MS)], 1, NOW, null).stale).toBe(1);
  });

  it("never counts a paid, refunded or cancelled row", () => {
    const rows = [paid(5 * DAY), { payment_status: "refunded", created_at: iso(5 * DAY) }, { payment_status: "cancelled", created_at: iso(5 * DAY) }];
    expect(staleCounts(rows, 0, NOW, null).stale).toBe(0);
  });

  it("counts pending rows outside the page as stale without a query for them", () => {
    // The page holds 30 days. pendingTotal says there are 40 pending in all,
    // so 39 are older than the page and therefore older than a day.
    const r = staleCounts([pending(2 * DAY)], 40, NOW, null);
    expect(r.stale).toBe(40);
  });

  it("never goes negative when the total lags the page", () => {
    // A count taken a moment before a new pending row landed in the page.
    expect(staleCounts([pending(2 * DAY), pending(3 * DAY)], 1, NOW, null).stale).toBe(2);
  });
});

describe("what is unchecked", () => {
  it("is only what was placed after the last reconcile", () => {
    const rows = [pending(2 * DAY), pending(5 * DAY), pending(9 * DAY)];
    const r = staleCounts(rows, 3, NOW, iso(4 * DAY));
    expect(r.stale).toBe(3);
    expect(r.unchecked).toBe(1);
  });

  it("is zero once a reconcile has run after the newest stale order", () => {
    // Applying a reconcile is what clears the finding. This is that.
    const rows = [pending(2 * DAY), pending(5 * DAY)];
    expect(staleCounts(rows, 2, NOW, iso(DAY)).unchecked).toBe(0);
  });

  it("treats rows outside the page as checked by any reconcile inside the window", () => {
    // They were all placed before the window opened, so a reconcile inside it saw them.
    const r = staleCounts([], 40, NOW, iso(10 * DAY));
    expect(r.stale).toBe(40);
    expect(r.unchecked).toBe(0);
  });

  it("treats rows outside the page as unchecked by a reconcile older than the window", () => {
    // Cannot tell, and cannot-tell must not read as clear.
    const r = staleCounts([], 40, NOW, iso(45 * DAY));
    expect(r.unchecked).toBe(40);
  });

  it("ignores a reconcile timestamp it cannot parse", () => {
    expect(staleCounts([pending(2 * DAY)], 1, NOW, "not a date").unchecked).toBe(1);
  });
});

describe("the comparison point for the webhook", () => {
  it("is the newest stale row in the page", () => {
    const r = staleCounts([pending(2 * DAY), pending(3 * DAY), pending(DAY / 2)], 3, NOW, null);
    expect(r.newestStaleAt).toBe(iso(2 * DAY));
  });

  it("is the page boundary when every stale row is outside the page", () => {
    const r = staleCounts([], 5, NOW, null);
    expect(r.newestStaleAt).toBe(new Date(NOW - 30 * DAY).toISOString());
  });
});
