import { describe, expect, it } from "vitest";

import { balance, clickSeries, commissionCents, MIN_PAYOUT_CENTS, payoutDue, payoutPeriod } from "../ledger";
import { codeFromName, normalizeCode, referralLink, refFromCookieHeader, refFromUrl, REF_COOKIE } from "../referral";

describe("ambassador links", () => {
  it("accepts a real code and nothing that could not be one", () => {
    expect(normalizeCode(" Maria-K ")).toBe("maria-k");
    expect(normalizeCode("ab")).toBeNull();
    expect(normalizeCode("-lead")).toBeNull();
    expect(normalizeCode("x".repeat(25))).toBeNull();
    expect(normalizeCode("drop table")).toBeNull();
  });

  it("takes ref off the address and keeps everything else", () => {
    const r = refFromUrl(new URL("https://purifyapp.net/shop/eikon?ref=Maria&sort=new#top"));
    expect(r?.code).toBe("maria");
    expect(r?.clean.toString()).toBe("https://purifyapp.net/shop/eikon?sort=new#top");
    expect(refFromUrl(new URL("https://purifyapp.net/shop"))).toBeNull();
    expect(refFromUrl(new URL("https://purifyapp.net/shop?ref=%3Cx%3E"))?.code).toBeNull();
  });

  it("reads the code back out of a cookie header", () => {
    expect(refFromCookieHeader(`a=1; ${REF_COOKIE}=maria; b=2`)).toBe("maria");
    expect(refFromCookieHeader(`${REF_COOKIE}=%3Cscript%3E`)).toBeNull();
    expect(refFromCookieHeader("a=1")).toBeNull();
  });

  it("makes a code from a name, unique", () => {
    expect(codeFromName("Father Seraphim", new Set())).toBe("father-seraphim");
    expect(codeFromName("Father Seraphim", new Set(["father-seraphim"]))).toBe("father-seraphim-2");
    expect(codeFromName("Ζωή", new Set())).toMatch(/^[a-z0-9][a-z0-9-]{2,23}$/);
    expect(codeFromName("Al", new Set())).toBe("al-purify");
  });

  it("builds the link an ambassador shares", () => {
    expect(referralLink("https://purifyapp.net", "maria")).toBe("https://purifyapp.net/shop/eikon?ref=maria");
  });
});

describe("the commission ledger", () => {
  it("sums each status and leaves reversed orders out of conversions", () => {
    const b = balance([
      { status: "pending", amount_cents: 300, created_at: "" },
      { status: "cleared", amount_cents: 500, created_at: "" },
      { status: "paid", amount_cents: 700, created_at: "" },
      { status: "reversed", amount_cents: 900, created_at: "" },
    ]);
    expect(b).toEqual({ pendingCents: 300, clearedCents: 500, paidCents: 700, conversions: 3, reversed: 1 });
  });

  it("pays monthly, over the minimum, to a connected account only", () => {
    expect(payoutDue(MIN_PAYOUT_CENTS, true)).toBe(true);
    expect(payoutDue(MIN_PAYOUT_CENTS - 1, true)).toBe(false);
    expect(payoutDue(10_000, false)).toBe(false);
    expect(payoutPeriod(Date.parse("2026-10-01T03:00:00Z"))).toBe("2026-10");
  });

  it("takes 10% of the items, rounded down, as the trigger does", () => {
    expect(commissionCents(4999)).toBe(499);
    expect(commissionCents(-5)).toBe(0);
  });

  it("fills the days nobody clicked", () => {
    const now = Date.parse("2026-09-30T12:00:00Z");
    const s = clickSeries([{ day: "2026-09-29", clicks: 4 }], now, 3);
    expect(s).toEqual([
      { day: "2026-09-28", clicks: 0 },
      { day: "2026-09-29", clicks: 4 },
      { day: "2026-09-30", clicks: 0 },
    ]);
  });
});
