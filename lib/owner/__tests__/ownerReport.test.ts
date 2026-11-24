import { describe, expect, it } from "vitest";

import { bankRunningCosts, categorize, summarizeBank } from "../bank.mjs";

describe("owner report: bank lines", () => {
  it("names money in and out by who it is with", () => {
    expect(categorize({ amount: 120, counterpartyName: "Apple Inc." })).toBe("App Store payout");
    expect(categorize({ amount: -99, counterpartyName: "Apple Inc." })).toBe("Developer accounts");
    expect(categorize({ amount: 80, counterpartyName: "GOOGLE PAYMENT" })).toBe("Google Play payout");
    expect(categorize({ amount: -25, counterpartyName: "Render Services" })).toBe("Hosting (Render)");
    expect(categorize({ amount: -25, bankDescription: "SUPABASE PRO" })).toBe("Database (Supabase)");
    expect(categorize({ amount: -5, counterpartyName: "Someone" })).toBe("Other cost");
    expect(categorize({ amount: 5, counterpartyName: "Someone" })).toBe("Other income");
    expect(categorize({ amount: -500, kind: "internalTransfer" })).toBe("Transfer between accounts");
  });

  it("totals a month, leaving transfers and failed lines out of in and out", () => {
    const m = summarizeBank([
      { amount: 200, counterpartyName: "Apple", postedAt: "2026-12-03T00:00:00Z" },
      { amount: -25, counterpartyName: "Render", postedAt: "2026-12-05T00:00:00Z" },
      { amount: -500, kind: "internalTransfer", postedAt: "2026-12-06T00:00:00Z" },
      { amount: -40, counterpartyName: "Render", postedAt: "2026-12-07T00:00:00Z", status: "failed" },
    ]);
    expect(m["2026-12"]).toMatchObject({ in: 200, out: 25, net: 175 });
    expect(m["2026-12"].byCategory["Transfer between accounts"]).toBe(-500);
  });
});

describe("owner report: running costs from the bank", () => {
  it("is null until a whole month has costs", () => {
    expect(bankRunningCosts({}, "2026-12")).toBeNull();
    const thisMonthOnly = summarizeBank([{ amount: -25, counterpartyName: "Render", postedAt: "2026-12-05T00:00:00Z" }]);
    expect(bankRunningCosts(thisMonthOnly, "2026-12")).toBeNull();
  });
  it("averages up to three whole months, leaving transfers, goods and income out", () => {
    const m = summarizeBank([
      { amount: -200, counterpartyName: "Anthropic", postedAt: "2027-01-03T00:00:00Z" },
      { amount: -19, counterpartyName: "Render", postedAt: "2027-01-05T00:00:00Z" },
      { amount: -300, counterpartyName: "Printful", postedAt: "2027-01-06T00:00:00Z" },
      { amount: -1000, kind: "internalTransfer", postedAt: "2027-01-07T00:00:00Z" },
      { amount: 400, counterpartyName: "Apple", postedAt: "2027-01-15T00:00:00Z" },
      { amount: -200, counterpartyName: "Anthropic", postedAt: "2027-02-03T00:00:00Z" },
      { amount: -45, counterpartyName: "Supabase", postedAt: "2027-02-04T00:00:00Z" },
      { amount: -999, counterpartyName: "Render", postedAt: "2027-03-02T00:00:00Z" },
    ]);
    // January 219, February 245; March is the month still running.
    expect(bankRunningCosts(m, "2027-03")).toEqual({ cents: 23200, months: ["2027-01", "2027-02"] });
  });
});
