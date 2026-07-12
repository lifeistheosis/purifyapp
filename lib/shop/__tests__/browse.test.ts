import { describe, expect, it } from "vitest";

import { activeFilterCount, filterProducts } from "../browse";
import type { ShopProductFull } from "../types";

// Only the fields browse.ts reads; the rest of ShopProductFull is irrelevant
// to filtering and stubbed via cast.
function make(over: Partial<ShopProductFull>): ShopProductFull {
  return {
    id: over.title ?? "p",
    title: "St Nicholas the Wonderworker",
    subtitle: null,
    subjects: [{ subject_type: "saint", subject_slug: "nicholas-of-myra" }],
    category: "saints",
    classification: "printed_mounted",
    inventory_status: "ready_to_ship",
    price_cents: 45_00,
    store: { public_name: "EIKON" },
    ...over,
  } as ShopProductFull;
}

const catalog: ShopProductFull[] = [
  make({ title: "St Nicholas the Wonderworker", price_cents: 45_00 }),
  make({
    title: "Christ Pantocrator",
    subjects: [{ subject_type: "christ", subject_slug: "christ-pantocrator" }],
    category: "christ",
    classification: "wooden",
    price_cents: 95_00,
    inventory_status: "special_order",
  }),
  make({
    title: "Theotokos of Vladimir",
    subjects: [{ subject_type: "theotokos", subject_slug: "theotokos-vladimir" }],
    category: "theotokos",
    classification: "hand_finished_reproduction",
    price_cents: 240_00,
  }),
];

describe("filterProducts", () => {
  it("returns everything when no filters are set", () => {
    expect(filterProducts(catalog, {})).toHaveLength(3);
  });

  it("matches free text against title, subject, and category, all terms required", () => {
    expect(filterProducts(catalog, { q: "pantocrator" })).toHaveLength(1);
    expect(filterProducts(catalog, { q: "theotokos vladimir" })).toHaveLength(1);
    expect(filterProducts(catalog, { q: "CHRIST" })[0].title).toBe(
      "Christ Pantocrator",
    );
    expect(filterProducts(catalog, { q: "christ nicholas" })).toHaveLength(0);
  });

  it("matches classification words in free text (mounted, wooden)", () => {
    expect(filterProducts(catalog, { q: "wooden" })[0].title).toBe(
      "Christ Pantocrator",
    );
  });

  it("readyOnly keeps ready_to_ship products only", () => {
    const out = filterProducts(catalog, { readyOnly: true });
    expect(out.map((p) => p.inventory_status)).toEqual([
      "ready_to_ship",
      "ready_to_ship",
    ]);
  });

  it("filters by classification facet", () => {
    expect(
      filterProducts(catalog, { classification: "wooden" })[0].title,
    ).toBe("Christ Pantocrator");
  });

  it("filters by price band, inclusive bounds on 50_100", () => {
    expect(filterProducts(catalog, { priceBand: "under_50" })).toHaveLength(1);
    expect(filterProducts(catalog, { priceBand: "50_100" })).toHaveLength(1);
    expect(filterProducts(catalog, { priceBand: "100_plus" })).toHaveLength(1);
    const edge = [make({ price_cents: 50_00 }), make({ price_cents: 100_00 })];
    expect(filterProducts(edge, { priceBand: "50_100" })).toHaveLength(2);
  });

  it("stacks facets and text together", () => {
    const out = filterProducts(catalog, {
      q: "theotokos",
      readyOnly: true,
      priceBand: "100_plus",
    });
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe("Theotokos of Vladimir");
  });
});

describe("activeFilterCount", () => {
  it("counts facets, not search text", () => {
    expect(activeFilterCount({})).toBe(0);
    expect(activeFilterCount({ q: "nicholas" })).toBe(0);
    expect(
      activeFilterCount({ readyOnly: true, classification: "wooden", priceBand: "under_50" }),
    ).toBe(3);
  });
});
