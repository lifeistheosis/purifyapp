import { describe, expect, it } from "vitest";

import {
  STALE_AFTER_DAYS,
  daysSince,
  queueAsChecklist,
  rankRecheck,
  recheckQueue,
  type RecheckItem,
} from "../recheck";

const NOW = Date.parse("2026-09-01T00:00:00Z");
const daysAgo = (n: number) => new Date(NOW - n * 86_400_000).toISOString();

const item = (over: Partial<RecheckItem> = {}): RecheckItem => ({
  productId: "p1",
  title: "Icon of St Nicholas",
  priceCents: 2_499,
  costCents: 900,
  checkedAt: daysAgo(10),
  supplierUrl: "https://supplier.example/sku-1",
  supplierName: "Supplier",
  unitsSold: 0,
  published: true,
  ...over,
});

describe("daysSince", () => {
  it("measures whole and fractional days", () => {
    expect(daysSince(daysAgo(30), NOW)).toBeCloseTo(30, 5);
  });

  it("treats never-checked as older than anything real", () => {
    expect(daysSince(null, NOW)).toBeGreaterThan(1000);
  });

  it("treats an unparseable timestamp as never checked", () => {
    expect(daysSince("not-a-date", NOW)).toBeGreaterThan(1000);
  });

  it("never reports a negative age", () => {
    // A clock skew putting a check in the future must not sort to the very
    // top of the queue as impossibly stale.
    expect(daysSince(new Date(NOW + 86_400_000).toISOString(), NOW)).toBe(0);
  });
});

describe("rankRecheck", () => {
  it("puts a loss-maker above a merely old check", () => {
    // The ordering claim that matters. A product losing money on every sale
    // is more urgent than one whose cost was last confirmed a year ago, and
    // staleness alone would get that backwards.
    const losing = rankRecheck(
      item({ productId: "loss", priceCents: 500, costCents: 600, checkedAt: daysAgo(95) }),
      NOW,
    );
    const old = rankRecheck(
      item({ productId: "old", priceCents: 5_000, costCents: 1_000, checkedAt: daysAgo(300) }),
      NOW,
    );
    expect(losing.priority).toBeGreaterThan(old.priority);
    expect(losing.reason).toBe("loss-making");
  });

  it("weights a thin margin that is actually selling", () => {
    const idle = rankRecheck(
      item({ productId: "a", priceCents: 5_000, costCents: 4_000, unitsSold: 0, checkedAt: daysAgo(120) }),
      NOW,
    );
    const selling = rankRecheck(
      item({ productId: "b", priceCents: 5_000, costCents: 4_000, unitsSold: 40, checkedAt: daysAgo(120) }),
      NOW,
    );
    expect(selling.priority).toBeGreaterThan(idle.priority);
    expect(selling.reason).toBe("thin-and-selling");
  });

  it("sinks a draft nobody can buy", () => {
    const live = rankRecheck(item({ productId: "a", checkedAt: daysAgo(200) }), NOW);
    const draft = rankRecheck(
      item({ productId: "b", checkedAt: daysAgo(200), published: false }),
      NOW,
    );
    expect(draft.priority).toBeLessThan(live.priority);
  });

  it("sinks an item with nowhere to look, without hiding it", () => {
    // A missing supplier URL is real work, but it cannot be done by going and
    // checking a price today, so it must not outrank one that can.
    const actionable = rankRecheck(item({ productId: "a", checkedAt: daysAgo(200) }), NOW);
    const blocked = rankRecheck(
      item({ productId: "b", checkedAt: daysAgo(200), supplierUrl: null }),
      NOW,
    );
    expect(blocked.blocked).toBe(true);
    expect(blocked.priority).toBeLessThan(actionable.priority);
  });

  it("calls a never-sourced product never-checked", () => {
    const r = rankRecheck(item({ checkedAt: null, costCents: null }), NOW);
    expect(r.reason).toBe("never-checked");
    expect(r.band).toBe("unknown");
  });

  it("calls a recent healthy check fresh", () => {
    expect(rankRecheck(item({ checkedAt: daysAgo(3) }), NOW).reason).toBe("fresh");
  });

  it("turns stale exactly at the threshold", () => {
    expect(rankRecheck(item({ checkedAt: daysAgo(STALE_AFTER_DAYS - 1) }), NOW).reason).toBe("fresh");
    expect(rankRecheck(item({ checkedAt: daysAgo(STALE_AFTER_DAYS) }), NOW).reason).toBe("stale");
  });
});

describe("recheckQueue", () => {
  it("leaves out what does not need checking", () => {
    const rows = recheckQueue(
      [item({ productId: "fresh", checkedAt: daysAgo(2) }), item({ productId: "old", checkedAt: daysAgo(200) })],
      NOW,
    );
    expect(rows.map((r) => r.productId)).toEqual(["old"]);
  });

  it("keeps a loss-maker even when it was checked this morning", () => {
    // Freshness is not the question for a product that is losing money. The
    // check is not what is wrong with it.
    const rows = recheckQueue(
      [item({ productId: "losing", priceCents: 500, costCents: 600, checkedAt: daysAgo(0) })],
      NOW,
    );
    expect(rows.map((r) => r.productId)).toEqual(["losing"]);
  });

  it("ranks loss above thin above merely stale, at equal volume", () => {
    // The band ordering, isolated by holding volume constant so the volume
    // weight cannot confound it.
    const rows = recheckQueue(
      [
        item({ productId: "stale", checkedAt: daysAgo(120), unitsSold: 5 }),
        item({ productId: "losing", priceCents: 500, costCents: 600, checkedAt: daysAgo(120), unitsSold: 5 }),
        item({ productId: "thin", priceCents: 5_000, costCents: 4_000, checkedAt: daysAgo(120), unitsSold: 5 }),
      ],
      NOW,
    );
    expect(rows.map((r) => r.productId)).toEqual(["losing", "thin", "stale"]);
  });

  it("lets volume lift a thin seller above a loss-maker nobody buys", () => {
    // A DELIBERATE ORDERING, and the one place the model contradicts the
    // obvious rule. "Loss always first" is the intuitive answer and it is
    // wrong: a loss-making product with no sales is losing nothing today,
    // while a thin one selling thirty units a period is thirty chances that a
    // drifted cost has already turned each sale negative.
    //
    // This test first asserted the intuitive order and failed. The ordering
    // was correct and the expectation was not, so the rule is written down
    // here rather than left to be rediscovered.
    const rows = recheckQueue(
      [
        item({ productId: "losing-idle", priceCents: 500, costCents: 600, checkedAt: daysAgo(120), unitsSold: 0 }),
        item({ productId: "thin-selling", priceCents: 5_000, costCents: 4_000, checkedAt: daysAgo(120), unitsSold: 30 }),
      ],
      NOW,
    );
    expect(rows[0].productId).toBe("thin-selling");
  });

  it("is stable, so the queue does not reshuffle under the operator", () => {
    const items = [
      item({ productId: "b", checkedAt: daysAgo(120) }),
      item({ productId: "a", checkedAt: daysAgo(120) }),
    ];
    const first = recheckQueue(items, NOW).map((r) => r.productId);
    const second = recheckQueue([...items].reverse(), NOW).map((r) => r.productId);
    expect(first).toEqual(second);
  });

  it("honours a limit, so the queue stays finishable", () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      item({ productId: `p${i}`, checkedAt: daysAgo(200 + i) }),
    );
    expect(recheckQueue(many, NOW, { limit: 5 })).toHaveLength(5);
  });

  it("can include everything when asked", () => {
    const rows = recheckQueue([item({ checkedAt: daysAgo(1) })], NOW, { includeFresh: true });
    expect(rows).toHaveLength(1);
  });

  it("handles an empty catalogue", () => {
    expect(recheckQueue([], NOW)).toEqual([]);
  });
});

describe("queueAsChecklist", () => {
  it("says so when there is nothing to do", () => {
    expect(queueAsChecklist([])).toMatch(/nothing to recheck/i);
  });

  it("gives one actionable line per row, with where to look", () => {
    const rows = recheckQueue([item({ checkedAt: daysAgo(200) })], NOW);
    const text = queueAsChecklist(rows);
    expect(text).toContain("Icon of St Nicholas");
    expect(text).toContain("$24.99");
    expect(text).toContain("https://supplier.example/sku-1");
  });

  it("shouts when there is nowhere to look", () => {
    const rows = recheckQueue([item({ checkedAt: daysAgo(200), supplierUrl: null })], NOW);
    expect(queueAsChecklist(rows)).toContain("NO SUPPLIER URL");
  });

  it("says the cost is unknown rather than printing $0.00", () => {
    const rows = recheckQueue([item({ checkedAt: null, costCents: null })], NOW);
    expect(queueAsChecklist(rows)).toContain("cost unknown");
  });
});
