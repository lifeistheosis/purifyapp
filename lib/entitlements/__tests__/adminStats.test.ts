// subscriptionStats feeds estimatedMrrCents, which is the single number used
// to judge whether Purify earns. It had no tests. These pin which sources
// count as paying, because the cost of getting that wrong is a revenue figure
// that reads healthy while nobody is paying.

import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { subscriptionStats } from "@/lib/entitlements/adminStats";
import { estimatedMrrCents } from "@/lib/premium/mrr";
import { PLAN_PRICE_CENTS } from "@/lib/premium/plans";

const FUTURE = new Date(Date.now() + 30 * 86_400_000).toISOString();
const PAST = new Date(Date.now() - 30 * 86_400_000).toISOString();

type Row = {
  user_id: string;
  plus_until: string | null;
  pro_until: string | null;
  plus_source: string | null;
  is_supporter: boolean | null;
};

/** Minimal stand-in for the service-role client: one table, one select. */
function fakeAdmin(rows: Row[]): SupabaseClient {
  return {
    from: () => ({ select: async () => ({ data: rows }) }),
  } as unknown as SupabaseClient;
}

const row = (over: Partial<Row> = {}): Row => ({
  user_id: "customer",
  plus_until: FUTURE,
  pro_until: null,
  plus_source: "google",
  is_supporter: false,
  ...over,
});

describe("subscriptionStats: who counts as paying", () => {
  it("counts a real Plus subscriber", async () => {
    const s = await subscriptionStats(fakeAdmin([row()]));
    expect(s.activePlus).toBe(1);
    expect(s.paidCounts).toEqual({ plusOnly: 1, pro: 0 });
  });

  it("does not count a comped account as paying", async () => {
    const s = await subscriptionStats(fakeAdmin([row({ plus_source: "comp" })]));
    expect(s.activePlus).toBe(1);
    expect(s.paidCounts).toEqual({ plusOnly: 0, pro: 0 });
  });

  // The regression. Redeemed gifts were priced at list in the MRR estimate.
  it("does not count a redeemed gift as paying", async () => {
    const s = await subscriptionStats(fakeAdmin([row({ plus_source: "gift" })]));
    expect(s.activePlus).toBe(1);
    expect(s.paidCounts).toEqual({ plusOnly: 0, pro: 0 });
  });

  it("does not count a gifted Pro as paying either", async () => {
    const s = await subscriptionStats(
      fakeAdmin([row({ pro_until: FUTURE, plus_source: "gift" })]),
    );
    expect(s.activePro).toBe(1);
    expect(s.paidCounts).toEqual({ plusOnly: 0, pro: 0 });
  });

  it("counts a real Pro subscriber once, at Pro, never also as Plus", async () => {
    const s = await subscriptionStats(fakeAdmin([row({ pro_until: FUTURE })]));
    expect(s.activePro).toBe(1);
    expect(s.plusOnly).toBe(0);
    expect(s.paidCounts).toEqual({ plusOnly: 0, pro: 1 });
  });

  it("ignores expired rows entirely", async () => {
    const s = await subscriptionStats(
      fakeAdmin([row({ plus_until: PAST, pro_until: PAST })]),
    );
    expect(s.activePlus).toBe(0);
    expect(s.paidCounts).toEqual({ plusOnly: 0, pro: 0 });
  });

  // bySource is the admin's visibility into WHY someone has access, so it must
  // keep reporting comp and gift even though they earn nothing.
  it("still reports unpaid sources in bySource", async () => {
    const s = await subscriptionStats(
      fakeAdmin([
        row({ plus_source: "comp" }),
        row({ plus_source: "gift" }),
        row({ plus_source: "google" }),
      ]),
    );
    expect(s.bySource).toEqual({ comp: 1, gift: 1, google: 1 });
    expect(s.activePlus).toBe(3);
    expect(s.paidCounts).toEqual({ plusOnly: 1, pro: 0 });
  });

  it("counts supporters independently of payment", async () => {
    const s = await subscriptionStats(
      fakeAdmin([row({ is_supporter: true, plus_source: "comp" })]),
    );
    expect(s.supporters).toBe(1);
    expect(s.paidCounts.plusOnly).toBe(0);
  });

  it("a mixed book prices only the paying half", async () => {
    const s = await subscriptionStats(
      fakeAdmin([
        row(),                                            // paying Plus
        row(),                                            // paying Plus
        row({ plus_source: "gift" }),                     // free
        row({ plus_source: "comp" }),                     // free
        row({ pro_until: FUTURE }),                       // paying Pro
        row({ pro_until: FUTURE, plus_source: "comp" }),  // free
      ]),
    );
    expect(s.activePlus).toBe(6);
    expect(s.paidCounts).toEqual({ plusOnly: 2, pro: 1 });
    expect(estimatedMrrCents(s.paidCounts)).toBe(
      2 * PLAN_PRICE_CENTS.plusMonthly + PLAN_PRICE_CENTS.proMonthly,
    );
  });
});

describe("the paid / comped / gifted split the panel leads with", () => {
  /**
   * Production, measured 2026-08-28: 16 accounts hold active Plus and 13 of
   * them are comps. The panel's headline card read "Active Plus 16", which
   * describes a subscriber base more than five times the paying one. The
   * breakdown existed, buried in a bySource chart several cards down.
   */
  it("splits a realistic mix the way the panel must show it", async () => {
    const rows = [
      ...Array.from({ length: 13 }, () => row({ plus_source: "comp" })),
      ...Array.from({ length: 3 }, () => row({ plus_source: "google" })),
    ];
    const s = await subscriptionStats(fakeAdmin(rows));
    expect(s.activePlus).toBe(16);
    expect(s.paidPlus).toBe(3);
    expect(s.compedPlus).toBe(13);
    expect(s.giftedPlus).toBe(0);
  });

  it("ALWAYS sums back to activePlus, so the three cards cannot lie", async () => {
    // If a new unpaid source is added to the `unpaid` check without a counter
    // here, the split silently stops adding up and the panel shows a gap.
    const rows = [
      row({ plus_source: "google" }),
      row({ plus_source: "apple" }),
      row({ plus_source: "comp" }),
      row({ plus_source: "comp" }),
      row({ plus_source: "gift" }),
      row({ plus_source: "stripe", pro_until: FUTURE }),
      row({ plus_source: "comp", pro_until: FUTURE }),
      row({ plus_source: null }),
    ];
    const s = await subscriptionStats(fakeAdmin(rows));
    expect(s.paidPlus + s.compedPlus + s.giftedPlus).toBe(s.activePlus);
  });

  it("counts a comped Pro as comped, not as paying", async () => {
    const s = await subscriptionStats(
      fakeAdmin([row({ plus_source: "comp", pro_until: FUTURE })]),
    );
    expect(s.activePro).toBe(1);
    expect(s.paidPlus).toBe(0);
    expect(s.compedPlus).toBe(1);
  });

  it("ignores expired comps entirely", async () => {
    // An expired grant is not a comp the panel should report; it is nothing.
    const s = await subscriptionStats(
      fakeAdmin([row({ plus_source: "comp", plus_until: PAST })]),
    );
    expect(s.activePlus).toBe(0);
    expect(s.compedPlus).toBe(0);
  });

  it("keeps paidPlus in step with the MRR estimate's own counts", async () => {
    // Two numbers derived from the same rows by different code paths. If they
    // disagree, the panel shows a subscriber count that its own revenue
    // figure contradicts.
    const rows = [
      row({ plus_source: "google" }),
      row({ plus_source: "google" }),
      row({ plus_source: "stripe", pro_until: FUTURE }),
      row({ plus_source: "comp" }),
      row({ plus_source: "gift" }),
    ];
    const s = await subscriptionStats(fakeAdmin(rows));
    expect(s.paidPlus).toBe(s.paidCounts.plusOnly + s.paidCounts.pro);
    expect(estimatedMrrCents(s.paidCounts)).toBe(
      2 * PLAN_PRICE_CENTS.plusMonthly + PLAN_PRICE_CENTS.proMonthly,
    );
  });
});
