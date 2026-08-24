import { describe, expect, it } from "vitest";

import { shopListingSchema } from "@/lib/security/schemas";
import { CATEGORY_LABELS, CLASSIFICATION_LABELS, INVENTORY_LABELS } from "@/lib/shop/format";

/**
 * A seller must never be offered a choice the server rejects.
 *
 * This existed as a live 400. components/shop/seller/ListingForm.tsx renders a
 * <select> from CLASSIFICATION_LABELS, which has ten entries. shopListingSchema
 * hand-listed five. A seller who picked Prayer Rope, Incense, Prayer Beads,
 * Cross & Chain or Woven Textile got "Invalid request." with no indication of
 * which field was wrong, and no way to guess, because all ten were on screen.
 *
 * The database was never the constraint: probed 2026-08-24 with the service
 * role, 7 of 18 production products already carry `incense`, `prayer_rope` or
 * `beaded`. supabase/migrations/20260704_shop_phase1.sql still lists five, so
 * the CHECK was widened outside this repo and that file no longer describes
 * the table it created.
 *
 * The schema now derives its enum from the label table. These tests are the
 * ratchet: they fail if anyone reintroduces a hand-typed list, in either
 * direction.
 */

const base = {
  title: "Icon of the Theotokos",
  priceCents: 4900,
  category: "theotokos" as const,
  inventoryStatus: "ready_to_ship" as const,
  dispatchMinDays: 1,
  dispatchMaxDays: 3,
};

describe("listing vocabulary", () => {
  it("accepts every classification the form renders", () => {
    const offered = Object.keys(CLASSIFICATION_LABELS);
    expect(offered.length).toBeGreaterThanOrEqual(10);
    for (const classification of offered) {
      const result = shopListingSchema.safeParse({ ...base, classification });
      expect(
        result.success,
        `the form offers "${classification}" and the schema refuses it`,
      ).toBe(true);
    }
  });

  it("accepts the five that were never in doubt", () => {
    // Named explicitly so a change that drops them is a failure and not a
    // silently shorter loop above.
    for (const classification of [
      "printed_mounted",
      "standard_reproduction",
      "laminated",
      "wooden",
      "hand_finished_reproduction",
    ]) {
      expect(
        shopListingSchema.safeParse({ ...base, classification }).success,
      ).toBe(true);
    }
  });

  it("accepts the five non-icon goods that used to 400", () => {
    for (const classification of [
      "prayer_rope",
      "incense",
      "beaded",
      "cross",
      "textile",
    ]) {
      expect(
        shopListingSchema.safeParse({ ...base, classification }).success,
      ).toBe(true);
    }
  });

  it("still refuses a classification nobody offers", () => {
    // The enum is derived, not abandoned. A typo must not become a column
    // value the storefront has no label for.
    expect(
      shopListingSchema.safeParse({ ...base, classification: "gold_leaf" }).success,
    ).toBe(false);
    expect(
      shopListingSchema.safeParse({ ...base, classification: "" }).success,
    ).toBe(false);
  });

  it("accepts every category and inventory status the form renders", () => {
    for (const category of Object.keys(CATEGORY_LABELS)) {
      expect(
        shopListingSchema.safeParse({
          ...base,
          category,
          classification: "wooden",
        }).success,
        `the form offers category "${category}" and the schema refuses it`,
      ).toBe(true);
    }
    for (const inventoryStatus of Object.keys(INVENTORY_LABELS)) {
      expect(
        shopListingSchema.safeParse({
          ...base,
          inventoryStatus,
          classification: "wooden",
        }).success,
        `the form offers "${inventoryStatus}" and the schema refuses it`,
      ).toBe(true);
    }
  });
});
