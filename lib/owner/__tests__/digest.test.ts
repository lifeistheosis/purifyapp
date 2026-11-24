import { describe, expect, it } from "vitest";

import { buildDigest, digestHasNoPersonalData, digestTokenMatches, type DigestInputs } from "../digest";

const TOKEN = "a".repeat(48);

describe("digestTokenMatches", () => {
  it("opens only for the exact bearer", () => {
    expect(digestTokenMatches(`Bearer ${TOKEN}`, TOKEN)).toBe(true);
    expect(digestTokenMatches(`bearer ${TOKEN}`, TOKEN)).toBe(true);
    expect(digestTokenMatches(`Bearer ${TOKEN}x`, TOKEN)).toBe(false);
    expect(digestTokenMatches(TOKEN, TOKEN)).toBe(false);
    expect(digestTokenMatches(null, TOKEN)).toBe(false);
  });
  it("stays closed while the token is unset or short", () => {
    expect(digestTokenMatches("Bearer ", undefined)).toBe(false);
    expect(digestTokenMatches("Bearer short", "short")).toBe(false);
  });
});

const inputs: DigestInputs = {
  generatedAt: "2026-11-24T18:00:00.000Z",
  accounts: { total: 3591, new7: 146, newPrev7: 200, new30: 837 },
  readers: { signedIn7: 180, signedInPrev7: 170, sessions7: 4984, sessionsPrev7: 0, pageviews7: 75750 },
  plus: {
    paid: 23, trial: 0, trialsKnown: true, comped: 14, gifted: 3, legacy: 0, developer: 0, test: 0,
    bySource: { apple: 11, google: 12, gift: 3, comp: 14 },
    cancelling: 5, billingIssue: 1, estimatedMrrCents: 22977,
  },
  shop: { paidOrders30: 0, paidRevenueCents30: 0 },
};

describe("buildDigest", () => {
  it("works out the rates", () => {
    const d = buildDigest(inputs);
    expect(d.rates.plusConversionPct).toBe(0.6);
    expect(d.rates.cancellingPct).toBe(21.7);
    expect(d.rates.newAccountsChangePct).toBe(-27);
    expect(d.rates.sessionsChangePct).toBeNull();
    expect(d.rates.pageviewsPerSession).toBe(15.2);
  });
  it("carries no personal data", () => {
    expect(digestHasNoPersonalData(buildDigest(inputs))).toBe(true);
    expect(digestHasNoPersonalData({ ...inputs, who: "someone@example.com" })).toBe(false);
    expect(digestHasNoPersonalData({ plus: { bySource: { "a@b.c": 1 } } })).toBe(false);
  });
});
