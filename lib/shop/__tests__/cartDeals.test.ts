import { describe, expect, it } from "vitest";

import {
  addedAtOf,
  countdownLabel,
  dealPrice,
  dealWindow,
  floorPriceCents,
  stampCartItems,
  type CartDealConfig,
} from "../cartDeals";
import { unitEconomics } from "../pricing";

const line = (slug: string) => ({ slug, title: slug, quantity: 1, unitPriceCents: 2499 });
const NOW = "2026-09-18T12:00:00.000Z";

describe("stampCartItems", () => {
  it("stamps a new line with the server's now", () => {
    expect(stampCartItems([], [line("beanie")], NOW)).toEqual([{ ...line("beanie"), addedAt: NOW }]);
  });

  it("carries a stored stamp forward, so the clock cannot be reset by a resync", () => {
    const prev = [{ slug: "beanie", addedAt: "2026-09-14T08:00:00.000Z" }];
    expect(stampCartItems(prev, [line("beanie")], NOW)[0].addedAt).toBe("2026-09-14T08:00:00.000Z");
  });

  it("refuses a stamp from the future or one that does not parse", () => {
    const prev = [
      { slug: "a", addedAt: "2027-01-01T00:00:00.000Z" },
      { slug: "b", addedAt: "yesterday" },
    ];
    const out = stampCartItems(prev, [line("a"), line("b")], NOW);
    expect(out.map((l) => l.addedAt)).toEqual([NOW, NOW]);
  });

  it("drops a line's stamp once the line leaves the cart", () => {
    const prev = [{ slug: "a", addedAt: "2026-09-10T00:00:00.000Z" }];
    const emptied = stampCartItems(prev, [], NOW);
    expect(emptied).toEqual([]);
    expect(stampCartItems(emptied, [line("a")], NOW)[0].addedAt).toBe(NOW);
  });

  it("reads a stamp back out", () => {
    expect(addedAtOf([{ slug: "a", addedAt: NOW }], "a")).toBe(NOW);
    expect(addedAtOf([{ slug: "a" }], "a")).toBeNull();
    expect(addedAtOf(null, "a")).toBeNull();
  });
});

describe("dealWindow", () => {
  const cfg: CartDealConfig = { enabled: true, afterDays: 3, percent: 10, windowHours: 48, minMarginCents: 100 };
  const added = "2026-09-10T12:00:00.000Z";
  const t = (iso: string) => Date.parse(iso);

  it("is off when the owner has not turned it on", () => {
    expect(dealWindow(added, { ...cfg, enabled: false }, t(NOW)).status).toBe("off");
    expect(dealWindow(null, cfg, t(NOW)).status).toBe("off");
  });

  it("waits, unlocks, then expires on the server's clock", () => {
    expect(dealWindow(added, cfg, t("2026-09-13T11:59:59.000Z")).status).toBe("waiting");
    expect(dealWindow(added, cfg, t("2026-09-13T12:00:00.000Z")).status).toBe("active");
    expect(dealWindow(added, cfg, t("2026-09-15T11:59:59.000Z")).status).toBe("active");
    expect(dealWindow(added, cfg, t("2026-09-15T12:00:00.000Z")).status).toBe("expired");
  });
});

describe("dealPrice", () => {
  it("takes the asked percentage off when the margin allows it", () => {
    // $24.99 with a $6 cost has plenty of room for 10%.
    expect(dealPrice(2499, 10, 600, 100)).toEqual({ unitCents: 2249, discountCents: 250, percent: 10 });
  });

  it("never discounts a product whose cost is unknown", () => {
    expect(dealPrice(2499, 10, null, 100)).toBeNull();
    expect(dealPrice(2499, 10, undefined, 100)).toBeNull();
  });

  it("shrinks to the floor and says the smaller number", () => {
    // $12 item costing $9.50: 20% off would lose money.
    const d = dealPrice(1200, 20, 950, 50);
    expect(d).not.toBeNull();
    const e = unitEconomics(d!.unitCents, 950);
    expect(e.contributionCents).toBeGreaterThanOrEqual(50);
    expect(d!.percent).toBeLessThan(20);
    expect(d!.percent).toBe(Math.floor((d!.discountCents / 1200) * 100));
  });

  it("gives nothing rather than a deal below the floor", () => {
    expect(dealPrice(1000, 10, 950, 100)).toBeNull();
  });

  it("finds the exact floor cent", () => {
    for (const [cost, margin] of [
      [600, 100],
      [0, 0],
      [1234, 250],
      [99, 1],
    ] as const) {
      const f = floorPriceCents(cost, margin);
      expect(unitEconomics(f, cost).contributionCents).toBeGreaterThanOrEqual(margin);
      expect(unitEconomics(f - 1, cost).contributionCents).toBeLessThan(margin);
    }
  });
});

describe("countdownLabel", () => {
  it("counts hours past a day and never goes negative", () => {
    expect(countdownLabel(47 * 3_600_000 + 59 * 60_000 + 5_000)).toBe("47:59:05");
    expect(countdownLabel(-5)).toBe("0:00:00");
  });
});
