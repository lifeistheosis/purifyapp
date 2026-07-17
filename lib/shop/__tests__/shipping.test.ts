// The shipping rule after the Beta 2.1 ladder restructure: free EIKON
// shipping is a Purify PRO perk. The date predicate (proShipsFree) is
// shared verbatim by the server checkout (lib/shop/checkout.ts
// hasProShipping) and the client cart display (lib/entitlements/client.ts
// hasActiveProClient), so testing the predicate pins both sides.

import { describe, it, expect, afterEach } from "vitest";
import { proShipsFree } from "@/lib/entitlements/entitlements";
import { flatShippingCents } from "@/lib/shop/checkout";

const NOW = new Date("2026-07-17T00:00:00Z");
const FUTURE = "2027-01-01T00:00:00Z";
const PAST = "2025-01-01T00:00:00Z";

describe("proShipsFree — who ships free", () => {
  it("an active Pro subscription ships free", () => {
    expect(proShipsFree({ pro_until: FUTURE }, NOW)).toBe(true);
  });

  it("a Plus-only subscriber PAYS shipping (the perk moved to Pro)", () => {
    // A plus-only entitlements row has pro_until null/absent.
    expect(proShipsFree({ pro_until: null }, NOW)).toBe(false);
  });

  it("an expired Pro subscription pays shipping", () => {
    expect(proShipsFree({ pro_until: PAST }, NOW)).toBe(false);
  });

  it("signed-out / no entitlements row pays shipping", () => {
    expect(proShipsFree(null, NOW)).toBe(false);
    expect(proShipsFree(undefined, NOW)).toBe(false);
  });
});

describe("flatShippingCents — the standard rate everyone else pays", () => {
  afterEach(() => {
    delete process.env.SHOP_FLAT_SHIPPING_CENTS;
  });

  it("defaults to $4.99", () => {
    delete process.env.SHOP_FLAT_SHIPPING_CENTS;
    expect(flatShippingCents()).toBe(499);
  });

  it("reads the env override", () => {
    process.env.SHOP_FLAT_SHIPPING_CENTS = "799";
    expect(flatShippingCents()).toBe(799);
  });

  it("falls back on garbage or negative values", () => {
    process.env.SHOP_FLAT_SHIPPING_CENTS = "not-a-number";
    expect(flatShippingCents()).toBe(499);
    process.env.SHOP_FLAT_SHIPPING_CENTS = "-100";
    expect(flatShippingCents()).toBe(499);
  });
});
