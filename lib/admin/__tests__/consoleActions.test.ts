import { describe, expect, it } from "vitest";

import { consoleRefundRefusal, reshipNote, reshipRefusal } from "../consoleActions";

/**
 * What the console refuses before any money or parcel moves. What would go
 * wrong if this broke: a refund on an order that was never paid, a second
 * refund beside one already open (paid twice), more back than was paid, or a
 * "reship" of a parcel that never left.
 */

describe("a refund from the console", () => {
  const paid = { payment_status: "paid", total_cents: 3600, currency: "usd" };

  it("lets a paid order with nothing open through, whole or in part", () => {
    expect(consoleRefundRefusal(paid, null, undefined)).toBeNull();
    expect(consoleRefundRefusal(paid, "declined", 1200)).toBeNull();
    expect(consoleRefundRefusal(paid, "processed", 3600)).toBeNull();
  });

  it("refuses an order that was never paid or is already refunded", () => {
    expect(consoleRefundRefusal({ ...paid, payment_status: "pending" }, null, undefined)?.status).toBe(409);
    expect(consoleRefundRefusal({ ...paid, payment_status: "cancelled" }, null, undefined)?.status).toBe(409);
    expect(consoleRefundRefusal({ ...paid, payment_status: "refunded" }, null, undefined)?.error).toBe(
      "This order is already refunded.",
    );
  });

  it("refuses while another refund on the order is open, so it is never paid twice", () => {
    for (const open of ["requested", "approved"]) {
      expect(consoleRefundRefusal(paid, open, undefined)?.status).toBe(409);
    }
  });

  it("refuses more than was paid, and nothing at all", () => {
    expect(consoleRefundRefusal(paid, null, 3601)).toEqual({
      status: 400,
      error: "A refund can be at most the $36 that was paid.",
    });
    expect(consoleRefundRefusal(paid, null, 0)?.status).toBe(400);
    expect(consoleRefundRefusal(paid, null, 12.5)?.status).toBe(400);
  });
});

describe("a reship", () => {
  it("is offered only for a paid order that has left us", () => {
    expect(reshipRefusal({ payment_status: "paid", fulfillment_status: "delivered" })).toBeNull();
    expect(reshipRefusal({ payment_status: "paid", fulfillment_status: "shipped" })).toBeNull();
    expect(reshipRefusal({ payment_status: "paid", fulfillment_status: "received_for_inspection" })?.status).toBe(409);
    expect(reshipRefusal({ payment_status: "refunded", fulfillment_status: "refunded" })?.error).toContain("refunded");
    expect(reshipRefusal({ payment_status: "pending", fulfillment_status: "pending" })?.status).toBe(409);
  });

  it("keeps the first parcel's tracking in the history line", () => {
    expect(reshipNote("  the cross  arrived bent ", "9400 1000")).toBe(
      "Reship at no charge: the cross arrived bent. First parcel: 9400 1000.",
    );
    expect(reshipNote("lost", null)).toBe("Reship at no charge: lost. First parcel: no tracking on file.");
    expect(reshipNote("x".repeat(800), null).length).toBe(500);
  });
});
