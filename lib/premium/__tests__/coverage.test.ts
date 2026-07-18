// The plan-card coverage matrix. Pins the rule both /pricing and /premium use
// to decide whether to sell a tier or acknowledge the reader already holds it.
// The failure this guards against is selling Purify Plus to someone who is
// already paying for Pro.

import { describe, it, expect } from "vitest";
import { coversTier, ownedLabel } from "@/lib/premium/coverage";

describe("coversTier", () => {
  it("Pro covers both cards (Pro is a superset of Plus)", () => {
    expect(coversTier("pro", "pro")).toBe(true);
    expect(coversTier("pro", "plus")).toBe(true);
  });

  it("Plus covers only the Plus card, so the Pro upgrade stays purchasable", () => {
    expect(coversTier("plus", "plus")).toBe(true);
    expect(coversTier("plus", "pro")).toBe(false);
  });

  it("free covers nothing", () => {
    expect(coversTier("free", "plus")).toBe(false);
    expect(coversTier("free", "pro")).toBe(false);
  });

  it("treats an unresolved tier as not covered", () => {
    // Callers render a skeleton while loading; this is the safe fallback if
    // one ever renders through it.
    expect(coversTier("loading", "plus")).toBe(false);
    expect(coversTier("loading", "pro")).toBe(false);
  });
});

describe("ownedLabel", () => {
  it("tells a Pro member the Plus card came with Pro", () => {
    expect(ownedLabel("pro", "plus")).toBe("Included with Purify Pro");
  });

  it("calls the tier the reader actually bought their current plan", () => {
    expect(ownedLabel("pro", "pro")).toBe("Your current plan");
    expect(ownedLabel("plus", "plus")).toBe("Your current plan");
  });
});
