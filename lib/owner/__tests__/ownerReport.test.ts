import { describe, expect, it } from "vitest";

import { categorize, summarizeBank } from "../../../scripts/owner-report.mjs";

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
