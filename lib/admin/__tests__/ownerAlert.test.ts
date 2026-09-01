import { describe, expect, it } from "vitest";

import { saleAlert } from "../ownerAlert";

/**
 * What the owner's phone actually shows.
 *
 * A push notification renders on a lock screen in whatever room the phone is
 * in, and the owner is not always the only person who can see it. So the
 * assertions below are mostly about what is NOT in the body.
 */

describe("saleAlert", () => {
  it("says the amount", () => {
    expect(saleAlert(2_498, "usd").body).toContain("$24.98");
  });

  it("formats whole amounts without dropping the cents", () => {
    expect(saleAlert(5_000, "usd").body).toContain("$50.00");
  });

  it("handles a non-USD currency", () => {
    const body = saleAlert(1_000, "eur").body;
    expect(body).toMatch(/10\.00/);
  });

  it("does not throw on a currency code Stripe invented", () => {
    // Intl.NumberFormat throws on an unknown currency, and a webhook must not
    // be able to crash the alert with a bad code.
    expect(() => saleAlert(1_000, "zzz")).not.toThrow();
    expect(saleAlert(1_000, "zzz").body).toContain("10.00");
  });

  it("carries no buyer detail at all", () => {
    // The whole notification, title and body, checked for anything that could
    // identify a customer. The order page behind the link has all of it,
    // behind the admin gate.
    const a = saleAlert(2_498, "usd");
    const text = `${a.title} ${a.body}`;
    expect(text).not.toMatch(/@/);
    expect(text).not.toMatch(/\b\d{4,}\b/); // no order ids
  });

  it("links into the panel's orders view", () => {
    expect(saleAlert(100, "usd").url).toBe("/admin#orders");
  });

  it("is tagged so a run of sales groups instead of stacking", () => {
    expect(saleAlert(100, "usd").kind).toBe("owner-sale");
  });

  it("survives a zero amount rather than reading as broken", () => {
    // amount_total is nullable on a Stripe session; the webhook passes 0.
    expect(saleAlert(0, "usd").body).toContain("$0.00");
  });
});
