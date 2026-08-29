import { describe, expect, it } from "vitest";

import {
  MARKUP_OUTLIER,
  buyableCount,
  findShopIssues,
  supplierIdentity,
} from "../integrity";
import type { IntegrityProduct, IntegritySourcing } from "../integrity";

/**
 * Pinned to the live EIKON catalogue as scanned on 2026-08-28, so these are
 * the four real faults and not invented ones. If the checker stops catching
 * them it has stopped being worth running.
 */

const LIVE_STORE = { id: "store-live", status: "live" };
const PAUSED_STORE = { id: "store-paused", status: "paused" };

const prod = (
  slug: string,
  over: Partial<IntegrityProduct> = {},
): IntegrityProduct => ({
  id: slug,
  slug,
  status: "published",
  inventory_status: "ready_to_ship",
  quantity_available: null,
  price_cents: 1999,
  store_id: LIVE_STORE.id,
  media: [{}],
  ...over,
});

const src = (
  product_id: string,
  over: Partial<IntegritySourcing> = {},
): IntegritySourcing => ({
  product_id,
  supplier_url: `https://www.temu.com/thing-g-${product_id}.html`,
  supplier_cost_cents: 300,
  ...over,
});

const TEMU_A =
  "https://www.temu.com/-natural-frankincense--resin-sachets-g-605630718903927.html";

describe("the four faults found on production", () => {
  it("catches two listings resold from one supplier item", () => {
    // frankincense-resin $12.99 and frankincense-myrrh-resin-set $16.99 both
    // cited g-605630718903927. The tracking query differs; the item does not.
    const issues = findShopIssues({
      products: [prod("frankincense-resin"), prod("frankincense-myrrh-resin-set")],
      sourcing: [
        src("frankincense-resin", { supplier_url: TEMU_A + "?_oak_mp_inf=aaa" }),
        src("frankincense-myrrh-resin-set", {
          supplier_url: TEMU_A + "?_oak_mp_inf=zzz&refer_page_sn=10037",
        }),
      ],
      stores: [LIVE_STORE],
    });
    const dup = issues.filter((i) => i.kind === "duplicate-supplier-url");
    expect(dup).toHaveLength(1);
    expect(dup[0].slugs).toEqual([
      "frankincense-myrrh-resin-set",
      "frankincense-resin",
    ]);
    expect(dup[0].severity).toBe("error");
  });

  it("catches out of stock while holding units", () => {
    // christ-pantocrator-mounted and theotokos-of-vladimir-mounted, both 8.
    const issues = findShopIssues({
      products: [
        prod("christ-pantocrator-mounted", {
          inventory_status: "out_of_stock",
          quantity_available: 8,
        }),
      ],
      sourcing: [src("christ-pantocrator-mounted")],
      stores: [LIVE_STORE],
    });
    const bad = issues.find((i) => i.kind === "stock-contradiction");
    expect(bad?.detail).toContain("holding 8");
  });

  it("catches a listing published to nobody", () => {
    const issues = findShopIssues({
      products: [prod("ghost", { store_id: PAUSED_STORE.id })],
      sourcing: [src("ghost")],
      stores: [LIVE_STORE, PAUSED_STORE],
    });
    const bad = issues.find((i) => i.kind === "invisible-published");
    expect(bad?.severity).toBe("error");
    expect(bad?.detail).toContain("paused");
  });

  it("counts how few can actually be bought", () => {
    // 11 published, 3 ready to ship.
    const products = [
      ...["a", "b", "c"].map((s) => prod(s)),
      ...["d", "e", "f", "g", "h"].map((s) =>
        prod(s, { inventory_status: "out_of_stock" as const }),
      ),
      ...["i", "j", "k"].map((s) =>
        prod(s, { inventory_status: "special_order" as const }),
      ),
    ];
    expect(products).toHaveLength(11);
    expect(buyableCount(products)).toBe(3);
  });
});

describe("what it will not do", () => {
  it("reports a markup outlier without calling it wrong", () => {
    // greek-33-knot-prayer-rope: $19.99 on $2.16 is 9.3x.
    const issues = findShopIssues({
      products: [prod("greek-33-knot-prayer-rope", { price_cents: 1999 })],
      sourcing: [src("greek-33-knot-prayer-rope", { supplier_cost_cents: 216 })],
      stores: [LIVE_STORE],
    });
    const note = issues.find((i) => i.kind === "markup-outlier");
    expect(note?.severity).toBe("note");
    expect(note?.detail).toContain("9.3x");
    expect(note?.detail).toContain("Not a fault");
  });

  it("leaves an ordinary markup alone", () => {
    // 6.9x, which is where most of the catalogue sits.
    const issues = findShopIssues({
      products: [prod("byzantine-three-beam-wall-cross", { price_cents: 1499 })],
      sourcing: [
        src("byzantine-three-beam-wall-cross", { supplier_cost_cents: 216 }),
      ],
      stores: [LIVE_STORE],
    });
    expect(issues.some((i) => i.kind === "markup-outlier")).toBe(false);
    expect(1499 / 216).toBeLessThan(MARKUP_OUTLIER);
  });

  it("says nothing about drafts and archived listings", () => {
    // The 7 archived rows have no supplier link at all. That is fine: they are
    // not on sale, and flagging them would bury the live faults in noise.
    const issues = findShopIssues({
      products: [
        prod("archived-one", { status: "archived" }),
        prod("archived-two", { status: "archived", media: [] }),
      ],
      sourcing: [],
      stores: [LIVE_STORE],
    });
    expect(issues).toEqual([]);
  });

  it("does not divide by a zero or missing cost", () => {
    const issues = findShopIssues({
      products: [prod("free"), prod("unknown-cost")],
      sourcing: [
        src("free", { supplier_cost_cents: 0 }),
        src("unknown-cost", { supplier_cost_cents: null }),
      ],
      stores: [LIVE_STORE],
    });
    expect(issues.some((i) => i.kind === "markup-outlier")).toBe(false);
    expect(issues.every((i) => Number.isFinite(0) && !/NaN|Infinity/.test(i.detail))).toBe(true);
  });
});

describe("supplier identity", () => {
  it("ignores tracking, keeps the item", () => {
    expect(supplierIdentity(TEMU_A + "?a=1")).toBe(
      supplierIdentity(TEMU_A + "?b=2&c=3"),
    );
  });

  it("keeps different items apart", () => {
    expect(supplierIdentity("https://www.temu.com/x-g-1.html")).not.toBe(
      supplierIdentity("https://www.temu.com/x-g-2.html"),
    );
  });

  it("survives a malformed url instead of throwing", () => {
    expect(supplierIdentity("not a url")).toBe("not a url");
  });
});

describe("ordering", () => {
  it("puts errors before warnings before notes", () => {
    const issues = findShopIssues({
      products: [
        prod("a", { inventory_status: "out_of_stock", quantity_available: 4 }),
        prod("b", { media: [] }),
        prod("c", { price_cents: 9999 }),
      ],
      sourcing: [src("a"), src("b"), src("c", { supplier_cost_cents: 300 })],
      stores: [LIVE_STORE],
    });
    const sev = issues.map((i) => i.severity);
    expect(sev).toEqual([...sev].sort((x, y) =>
      ({ error: 0, warning: 1, note: 2 })[x] - ({ error: 0, warning: 1, note: 2 })[y]));
    expect(sev[0]).toBe("error");
  });
});
