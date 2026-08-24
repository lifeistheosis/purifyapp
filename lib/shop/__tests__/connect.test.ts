import { describe, expect, it } from "vitest";

import {
  applicationFeeCents,
  canChargeThroughConnect,
  canGoLive,
  commissionBaseCents,
  COMMISSION_CEILING_BPS,
  COMMISSION_FLOOR_BPS,
  connectStatus,
  isValidCommissionBps,
  refundConnectOptions,
  sellerNetCents,
  type StorePayouts,
} from "../connect";

const ready: StorePayouts = {
  stripe_account_id: "acct_live",
  charges_enabled: true,
  payouts_enabled: true,
  commission_rate_bps: 1000,
};

describe("commission rate validation", () => {
  it("accepts the floor and the ceiling", () => {
    expect(isValidCommissionBps(COMMISSION_FLOOR_BPS)).toBe(true);
    expect(isValidCommissionBps(COMMISSION_CEILING_BPS)).toBe(true);
  });

  it("rejects anything under the owner's 10% floor", () => {
    expect(isValidCommissionBps(999)).toBe(false);
    expect(isValidCommissionBps(0)).toBe(false);
    expect(isValidCommissionBps(-100)).toBe(false);
  });

  it("rejects a misplaced digit rather than clamping it", () => {
    // The whole reason this returns false instead of clamping: an admin who
    // types 100 meaning "100%" must be told, not quietly given 10%.
    expect(isValidCommissionBps(100_00)).toBe(false);
    expect(isValidCommissionBps(50_000)).toBe(false);
  });

  it("rejects fractional basis points", () => {
    expect(isValidCommissionBps(1000.5)).toBe(false);
    expect(isValidCommissionBps(NaN)).toBe(false);
  });
});

describe("what the commission is charged on", () => {
  it("is the item total, and excludes shipping and tax", () => {
    // The decision, asserted rather than described: the seller pays the
    // carrier, so Purify does not take a cut of the postage.
    expect(
      commissionBaseCents({ itemsTotalCents: 4000, shippingCents: 499, taxCents: 330 }),
    ).toBe(4000);
  });

  it("charges nothing on a zero-item order", () => {
    expect(commissionBaseCents({ itemsTotalCents: 0, shippingCents: 499 })).toBe(0);
  });
});

describe("applicationFeeCents", () => {
  it("takes 10% of the items, not of the charge", () => {
    // $40 of goods + $4.99 shipping. 10% of the goods is $4.00, NOT $4.50.
    expect(
      applicationFeeCents({
        itemsTotalCents: 4000,
        shippingCents: 499,
        commissionRateBps: 1000,
      }),
    ).toBe(400);
  });

  it("leaves the shipping with the seller", () => {
    // The charge is 4499; the fee is 400; 4099 transfers. The seller receives
    // the whole 499 of postage they are about to pay a carrier for.
    const charge = 4000 + 499;
    const fee = applicationFeeCents({
      itemsTotalCents: 4000,
      shippingCents: 499,
      commissionRateBps: 1000,
    });
    expect(charge - fee).toBe(4099);
  });

  it("honours a negotiated rate above the floor", () => {
    expect(
      applicationFeeCents({ itemsTotalCents: 10_000, commissionRateBps: 2250 }),
    ).toBe(2250);
  });

  it("rounds to the nearest cent", () => {
    // 1233 * 1000 / 10000 = 123.3
    expect(
      applicationFeeCents({ itemsTotalCents: 1233, commissionRateBps: 1000 }),
    ).toBe(123);
    // 1237 * 1000 / 10000 = 123.7
    expect(
      applicationFeeCents({ itemsTotalCents: 1237, commissionRateBps: 1000 }),
    ).toBe(124);
  });

  it("never exceeds the amount actually charged", () => {
    // Stripe REJECTS a session whose fee exceeds the charge, and a rejected
    // session is a checkout the buyer cannot complete. Unreachable with a sane
    // rate, which is why it is asserted.
    const fee = applicationFeeCents({
      itemsTotalCents: 1000,
      shippingCents: 0,
      commissionRateBps: COMMISSION_CEILING_BPS,
    });
    expect(fee).toBeLessThanOrEqual(1000);
  });

  it("is never negative", () => {
    expect(
      applicationFeeCents({ itemsTotalCents: -500, commissionRateBps: 1000 }),
    ).toBe(0);
  });
});

describe("canChargeThroughConnect", () => {
  it("is true only when Stripe itself says charges are enabled", () => {
    expect(canChargeThroughConnect(ready)).toBe(true);
  });

  it("is false for an account that exists but has not been enabled", () => {
    // The failure this guards: "we created the account" is not "Stripe will
    // take a charge for it". Days can pass between the two.
    expect(
      canChargeThroughConnect({ ...ready, charges_enabled: false }),
    ).toBe(false);
  });

  it("is false with no account", () => {
    expect(canChargeThroughConnect(null)).toBe(false);
    expect(canChargeThroughConnect({ ...ready, stripe_account_id: null })).toBe(false);
  });

  it("is false when the stored rate is out of range", () => {
    // A row edited by hand in the SQL editor past the CHECK, or a CHECK that
    // was rolled back. Refuse to charge on a rate nobody agreed to.
    expect(
      canChargeThroughConnect({ ...ready, commission_rate_bps: 50 }),
    ).toBe(false);
  });

  it("does not treat payouts_enabled as required to charge", () => {
    // Stripe routinely enables charges before the first payout clears.
    expect(
      canChargeThroughConnect({ ...ready, payouts_enabled: false }),
    ).toBe(true);
  });
});

describe("connectStatus", () => {
  it("distinguishes all four states", () => {
    expect(connectStatus(null)).toBe("none");
    expect(connectStatus({ ...ready, stripe_account_id: null })).toBe("none");
    expect(connectStatus({ ...ready, charges_enabled: false })).toBe("onboarding");
    expect(connectStatus({ ...ready, payouts_enabled: false })).toBe("charges_only");
    expect(connectStatus(ready)).toBe("ready");
  });
});

describe("canGoLive", () => {
  it("lets a Purify-operated store open with no payouts row", () => {
    // EIKON. Its money already lands in the right account.
    expect(canGoLive({ purifyOperated: true, payouts: null })).toEqual({ ok: true });
  });

  it("refuses a third-party store with no Stripe account", () => {
    // THE failure: a buyer pays for a stranger's goods into Purify's balance
    // with no mechanism to forward it. That is the shop's position today.
    const r = canGoLive({ purifyOperated: false, payouts: null });
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.reason).toMatch(/no Stripe account/i);
  });

  it("refuses a third-party store Stripe has not enabled", () => {
    const r = canGoLive({
      purifyOperated: false,
      payouts: { ...ready, charges_enabled: false },
    });
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.reason).toMatch(/not enabled charges/i);
  });

  it("does NOT infer purifyOperated from a missing payouts row", () => {
    // The negative control for the comment in canGoLive. If absence were read
    // as "ours", every un-onboarded third party would pass this gate and the
    // hole would be exactly as open as before.
    expect(canGoLive({ purifyOperated: false, payouts: null }).ok).toBe(false);
  });

  it("opens a store that can charge but is not yet paying out", () => {
    expect(
      canGoLive({ purifyOperated: false, payouts: { ...ready, payouts_enabled: false } }),
    ).toEqual({ ok: true });
  });

  it("refuses a store whose stored rate is out of range", () => {
    const r = canGoLive({
      purifyOperated: false,
      payouts: { ...ready, commission_rate_bps: 200 },
    });
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.reason).toMatch(/commission/i);
  });
});

describe("refundConnectOptions", () => {
  it("unwinds both legs for a Connect charge", () => {
    // reverse_transfer: the seller gives the money back, per the owner's
    // decision. refund_application_fee: Purify gives its cut back too, so a
    // fully refunded sale does not leave the seller down the commission.
    expect(refundConnectOptions("acct_live")).toEqual({
      reverse_transfer: true,
      refund_application_fee: true,
    });
  });

  it("passes NOTHING for a charge that never had a destination", () => {
    // Stripe ERRORS on these flags when there is no transfer; it does not
    // ignore them. Every order taken before Connect is in this branch.
    expect(refundConnectOptions(null)).toEqual({});
  });
});

describe("sellerNetCents", () => {
  it("subtracts the frozen fee", () => {
    expect(sellerNetCents(4499, 400)).toBe(4099);
  });

  it("returns null, not zero, when no fee was recorded", () => {
    // Zero would assert the seller kept everything. The truth is that the
    // money is in Purify's balance awaiting a manual transfer, and the caller
    // has to say so rather than print a confident number.
    expect(sellerNetCents(4499, null)).toBeNull();
  });

  it("never goes negative", () => {
    expect(sellerNetCents(100, 500)).toBe(0);
  });
});
