import { describe, expect, it } from "vitest";

import { isReservedProductSlug, slugify, uniqueSlug } from "../slug";

/** A shop_products table with exactly these slugs taken. */
function tableWith(taken: Record<string, string>) {
  return {
    from: () => ({
      select: () => ({
        eq: (_col: string, value: string) => ({
          maybeSingle: async () => ({
            data: taken[value] ? { id: taken[value] } : null,
          }),
        }),
      }),
    }),
  };
}

describe("slugify", () => {
  it("turns a product name into a lowercase hyphenated slug", () => {
    expect(slugify("Christ Pantocrator")).toBe("christ-pantocrator");
    expect(slugify("  St. Nicholas, Wooden Icon  ")).toBe("st-nicholas-wooden-icon");
  });

  it("strips diacritics rather than dropping the letter", () => {
    expect(slugify("Théotokos of Vladímir")).toBe("theotokos-of-vladimir");
  });

  it("caps at 80 characters and never ends on a hyphen", () => {
    const long = slugify("a ".repeat(100));
    expect(long.length).toBeLessThanOrEqual(80);
    expect(long.endsWith("-")).toBe(false);
  });

  it("returns an empty string for a name with nothing usable in it", () => {
    expect(slugify("★★★")).toBe("");
  });
});

describe("uniqueSlug", () => {
  it("uses the base when it is free", async () => {
    await expect(uniqueSlug(tableWith({}), "st-george")).resolves.toBe("st-george");
  });

  it("appends -2, then -3, on a collision", async () => {
    const db = tableWith({ "st-george": "a", "st-george-2": "b" });
    await expect(uniqueSlug(db, "st-george")).resolves.toBe("st-george-3");
  });

  it("does not count the product being edited as a collision", async () => {
    const db = tableWith({ "st-george": "own-id" });
    await expect(uniqueSlug(db, "st-george", { excludeId: "own-id" })).resolves.toBe(
      "st-george",
    );
  });

  it("falls back to 'icon' for an empty base", async () => {
    await expect(uniqueSlug(tableWith({}), "")).resolves.toBe("icon");
  });

  it("refuses the reserved slug 'detail' and moves past it", async () => {
    expect(isReservedProductSlug("detail")).toBe(true);
    expect(isReservedProductSlug("detail-2")).toBe(false);
    // A product literally named "Detail" must never own the route beside it.
    await expect(uniqueSlug(tableWith({}), slugify("Detail"))).resolves.toBe("detail-2");
  });
});
