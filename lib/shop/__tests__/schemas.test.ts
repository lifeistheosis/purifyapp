import { describe, expect, it } from "vitest";

import {
  shopCheckoutSchema,
  shopIconRequestSchema,
  shopMerchantApplicationSchema,
} from "@/lib/security/schemas";

describe("shopIconRequestSchema", () => {
  it("accepts a minimal anonymous request", () => {
    const r = shopIconRequestSchema.safeParse({
      subject: "St Moses the Black",
      requestType: "either",
      email: "seeker@example.com",
    });
    expect(r.success).toBe(true);
  });

  it("rejects malformed slugs, dates, and oversized notes", () => {
    expect(
      shopIconRequestSchema.safeParse({
        subject: "St Nicholas",
        requestType: "custom",
        saintSlug: "Not A Slug!",
      }).success,
    ).toBe(false);
    expect(
      shopIconRequestSchema.safeParse({
        subject: "St Nicholas",
        requestType: "custom",
        desiredDate: "Dec 25",
      }).success,
    ).toBe(false);
    expect(
      shopIconRequestSchema.safeParse({
        subject: "St Nicholas",
        requestType: "custom",
        notes: "x".repeat(2001),
      }).success,
    ).toBe(false);
  });
});

describe("shopMerchantApplicationSchema", () => {
  const valid = {
    proposedStoreName: "Athos Workshop",
    sellerType: "workshop",
    legalName: "Athos Workshop LLC",
    email: "workshop@example.com",
    country: "Greece",
    rightsDeclaration: true,
    agreedStandards: true,
  };

  it("accepts a valid application", () => {
    expect(shopMerchantApplicationSchema.safeParse(valid).success).toBe(true);
  });

  it("requires the rights declaration and standards agreement to be true", () => {
    expect(
      shopMerchantApplicationSchema.safeParse({ ...valid, rightsDeclaration: false })
        .success,
    ).toBe(false);
    expect(
      shopMerchantApplicationSchema.safeParse({ ...valid, agreedStandards: false })
        .success,
    ).toBe(false);
  });

  it("rejects purify_owned as a self-selectable seller type", () => {
    expect(
      shopMerchantApplicationSchema.safeParse({ ...valid, sellerType: "purify_owned" })
        .success,
    ).toBe(false);
  });

  it("rejects non-URL portfolios", () => {
    expect(
      shopMerchantApplicationSchema.safeParse({
        ...valid,
        portfolioUrl: "javascript:alert(1)",
      }).success,
    ).toBe(false);
  });
});

describe("shopCheckoutSchema", () => {
  it("accepts only a slug and small quantity — never a price", () => {
    const r = shopCheckoutSchema.safeParse({
      productSlug: "pantocrator-wooden",
      termsAccepted: true,
    });
    expect(r.success).toBe(true);
    if (r.success && "quantity" in r.data) expect(r.data.quantity).toBe(1);
    expect(
      shopCheckoutSchema.safeParse({
        productSlug: "pantocrator-wooden",
        quantity: 99,
        termsAccepted: true,
      }).success,
    ).toBe(false);
    // A price in the body is simply not part of the schema; strict shape
    // means unknown keys are ignored by default in zod objects, so assert
    // the parsed output carries no price even if a client sends one.
    const sneaky = shopCheckoutSchema.safeParse({
      productSlug: "pantocrator-wooden",
      termsAccepted: true,
      priceCents: 1,
    });
    expect(sneaky.success).toBe(true);
    if (sneaky.success) expect("priceCents" in sneaky.data).toBe(false);
  });

  it("refuses checkout without the clickwrap checkbox", () => {
    expect(
      shopCheckoutSchema.safeParse({ productSlug: "pantocrator-wooden" }).success,
    ).toBe(false);
    expect(
      shopCheckoutSchema.safeParse({
        productSlug: "pantocrator-wooden",
        termsAccepted: false,
      }).success,
    ).toBe(false);
  });

  it("accepts a cart of items, never an empty or oversized one", () => {
    expect(
      shopCheckoutSchema.safeParse({
        items: [
          { productSlug: "pantocrator-wooden", quantity: 2 },
          { productSlug: "frankincense-resin" },
        ],
        termsAccepted: true,
      }).success,
    ).toBe(true);
    expect(
      shopCheckoutSchema.safeParse({ items: [], termsAccepted: true }).success,
    ).toBe(false);
    expect(
      shopCheckoutSchema.safeParse({
        items: Array.from({ length: 21 }, (_, i) => ({
          productSlug: `icon-${i}`,
        })),
        termsAccepted: true,
      }).success,
    ).toBe(false);
    // The clickwrap gate applies to the cart shape too.
    expect(
      shopCheckoutSchema.safeParse({
        items: [{ productSlug: "pantocrator-wooden" }],
      }).success,
    ).toBe(false);
  });
});
