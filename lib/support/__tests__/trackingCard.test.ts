import { describe, expect, it } from "vitest";

import { cardHeadline, trackingCard } from "../trackingCard";

/**
 * The card in a support reply about a parcel (the console's Send tracking).
 * What would go wrong if this broke: a reader told their parcel is at a step
 * their own order page does not show, a date that is not when it got there,
 * or a carrier link for a parcel that has no tracking.
 */

const base = {
  id: "5a3e19c0-0000-0000-0000-000000000000",
  payment_status: "paid" as const,
  outbound_tracking: null as string | null,
  paid_at: "2026-10-08T10:00:00Z",
  created_at: "2026-10-08T09:59:00Z",
};

describe("the tracking card", () => {
  it("says the reader's own word and step, the day it got there, and the carrier's link", () => {
    const card = trackingCard(
      { ...base, fulfillment_status: "shipped", outbound_tracking: "9400 1000 0000 0000 0000 00" },
      [
        { to_status: "supplier_order_needed", at: "2026-10-08T11:00:00Z" },
        { to_status: "packaged", at: "2026-10-23T11:00:00Z" },
        { to_status: "shipped", at: "2026-10-24T15:00:00Z" },
      ],
    );
    expect(card).toEqual({
      number: "EIK-5A3E19C0",
      word: "Shipped",
      step: 4,
      of: 5,
      at: "2026-10-24T15:00:00Z",
      carrier: "USPS",
      url: "https://tools.usps.com/go/TrackConfirmAction?tLabels=9400100000000000000000",
    });
    expect(cardHeadline(card)).toBe("Shipped · Oct 24");
  });

  it("dates Preparing by the first stage that reads that way", () => {
    const card = trackingCard({ ...base, fulfillment_status: "received_for_inspection" }, [
      { to_status: "received_for_inspection", at: "2026-10-29T10:00:00Z" },
      { to_status: "supplier_order_needed", at: "2026-10-08T11:00:00Z" },
    ]);
    expect(card.word).toBe("Preparing Your Order");
    expect(card.at).toBe("2026-10-08T11:00:00Z");
    expect(card.url).toBeNull();
  });

  it("dates a confirmed order by its payment, and puts a refunded one off the ladder", () => {
    expect(trackingCard({ ...base, fulfillment_status: "pending" }, []).at).toBe(base.paid_at);
    const refunded = trackingCard({ ...base, payment_status: "refunded", fulfillment_status: "refunded" }, []);
    expect(refunded.step).toBe(0);
    expect(refunded.word).toBe("Refunded");
    expect(cardHeadline(refunded)).toBe("Refunded");
  });
});
