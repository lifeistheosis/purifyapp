import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, it, expect } from "vitest";
import { estimatedMrrCents, estimatedArrCents } from "@/lib/premium/mrr";
import { PLAN_PRICE_CENTS, PREMIUM_PLAN_DE, PREMIUM_PLAN_EN } from "@/lib/premium/plans";

// The estimate counts what the app says it sells. Plus read $4.99 and
// $38.99 in PLAN_PRICE_CENTS for two weeks after the app and the Terms moved
// to $9.99 and $71.99 (2026-10-18), and every Plus member was counted at
// half; nothing compared the two. This does, in both copies of the plan text
// and in the Terms.
describe("the prices the estimate counts", () => {
  /** "$9.99 / month", "71,99 $ / Jahr", "US $199 per year" as cents. */
  const cents = (text: string) => {
    const m = /(\d+)(?:[.,](\d{2}))?/.exec(text.replace(/US /, ""));
    if (!m) throw new Error(`no price in ${text}`);
    return Number(m[1]) * 100 + Number(m[2] ?? 0);
  };

  it("are the prices the plan pages show, in English and in German", () => {
    for (const plan of [PREMIUM_PLAN_EN, PREMIUM_PLAN_DE]) {
      expect(cents(plan.plusPriceMonthly), plan.plusPriceMonthly).toBe(PLAN_PRICE_CENTS.plusMonthly);
      expect(cents(plan.plusPriceYearly), plan.plusPriceYearly).toBe(PLAN_PRICE_CENTS.plusYearly);
      expect(cents(plan.proPriceMonthly), plan.proPriceMonthly).toBe(PLAN_PRICE_CENTS.proMonthly);
      expect(cents(plan.proPriceYearly), plan.proPriceYearly).toBe(PLAN_PRICE_CENTS.proYearly);
    }
    expect(PLAN_PRICE_CENTS).toEqual({ plusMonthly: 999, plusYearly: 7199, proMonthly: 1999, proYearly: 19900 });
  });

  it("are the prices the Terms state", () => {
    const terms = readFileSync(path.resolve(__dirname, "../../../components/legal/TermsText.tsx"), "utf8").replace(/\s+/g, " ");
    const usd = (c: number) => `US $${c % 100 ? (c / 100).toFixed(2) : c / 100}`;
    expect(terms).toContain(`${usd(PLAN_PRICE_CENTS.plusMonthly)} per month or ${usd(PLAN_PRICE_CENTS.plusYearly)} per year`);
    expect(terms).toContain(`${usd(PLAN_PRICE_CENTS.proMonthly)} per month or ${usd(PLAN_PRICE_CENTS.proYearly)} per year`);
  });
});

describe("estimated subscription revenue", () => {
  it("prices Plus-only and Pro at their monthly list price", () => {
    const counts = { plusOnly: 3, pro: 2 };
    expect(estimatedMrrCents(counts)).toBe(
      3 * PLAN_PRICE_CENTS.plusMonthly + 2 * PLAN_PRICE_CENTS.proMonthly,
    );
  });

  it("counts a Pro subscriber once at the Pro price, never also as Plus", () => {
    // plusOnly already excludes Pro (Pro is a superset), so a pure-Pro
    // account contributes only the Pro price.
    expect(estimatedMrrCents({ plusOnly: 0, pro: 1 })).toBe(
      PLAN_PRICE_CENTS.proMonthly,
    );
  });

  it("is zero with no paying subscribers", () => {
    expect(estimatedMrrCents({ plusOnly: 0, pro: 0 })).toBe(0);
    expect(estimatedArrCents({ plusOnly: 0, pro: 0 })).toBe(0);
  });

  it("ARR is 12x MRR", () => {
    const counts = { plusOnly: 5, pro: 4 };
    expect(estimatedArrCents(counts)).toBe(estimatedMrrCents(counts) * 12);
  });
});
