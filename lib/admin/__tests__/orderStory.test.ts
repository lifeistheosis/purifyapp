import { describe, expect, it } from "vitest";

import {
  addressLines,
  backMove,
  bucketCounts,
  findByNumber,
  inboundLine,
  inBucket,
  labelCsv,
  nextMove,
  orderMoney,
  ordersIn,
  outboundLine,
  readerSees,
  readerSteps,
  stageWord,
  storySteps,
  type StoryOrder,
} from "../orderStory";
import { hashFor, parseHash } from "../handoff";
import type { ShopFulfillmentStatus } from "@/lib/shop/types";

/**
 * Orders, the owner's pick B (r3-16, 2026-10-30): a list of Open, Late and
 * Done, each order opening as its whole story. What would go wrong if this
 * broke: an unfinished checkout listed as an order to post, a late parcel
 * drawn as on time, the reader's word on the page disagreeing with the one on
 * their own order page, or a margin made up for a piece with no cost.
 */

const NOW = new Date("2026-10-30T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

function order(over: Partial<StoryOrder> & { id: string }): StoryOrder {
  return {
    payment_status: "paid",
    fulfillment_status: "received_for_inspection",
    total_cents: 3600,
    created_at: hoursAgo(200),
    updated_at: hoursAgo(20),
    paid_at: hoursAgo(199),
    email: "g.sample@example.com",
    currency: "usd",
    shipping_address: null,
    outbound_tracking: null,
    inbound_tracking: null,
    items: [{ title: "Byzantine wall cross", quantity: 1, unit_price_cents: 3600, product_id: "p-cross" }],
    ...over,
  };
}

describe("the three lists", () => {
  it("keeps an unpaid checkout out of every list", () => {
    for (const payment_status of ["pending", "cancelled"] as const) {
      const o = order({ id: "a", payment_status });
      for (const b of ["open", "late", "done"] as const) expect(inBucket(o, b, NOW), `${payment_status} ${b}`).toBe(false);
    }
  });

  it("lists a late order under Open and under Late, and a finished one under Done only", () => {
    const late = order({ id: "late", fulfillment_status: "inbound_to_eikon", updated_at: hoursAgo(16 * 24) });
    const fresh = order({ id: "fresh", fulfillment_status: "pending", updated_at: hoursAgo(3) });
    const delivered = order({ id: "done", fulfillment_status: "delivered" });
    const refunded = order({ id: "ref", payment_status: "refunded", fulfillment_status: "refunded" });
    expect(bucketCounts([late, fresh, delivered, refunded], NOW)).toEqual({ open: 2, late: 1, done: 2 });
    expect(inBucket(late, "open", NOW)).toBe(true);
    expect(inBucket(fresh, "late", NOW)).toBe(false);
    expect(inBucket(delivered, "open", NOW)).toBe(false);
  });

  it("puts the most overdue first, then what waits on him, then the oldest", () => {
    const withTemu = order({ id: "temu", fulfillment_status: "supplier_order_placed", updated_at: hoursAgo(100) });
    const toPack = order({ id: "pack", fulfillment_status: "received_for_inspection", updated_at: hoursAgo(10) });
    const veryLate = order({ id: "v", fulfillment_status: "inbound_to_eikon", updated_at: hoursAgo(30 * 24) });
    const bitLate = order({ id: "b", fulfillment_status: "pending", updated_at: hoursAgo(13) });
    expect(ordersIn([withTemu, toPack, bitLate, veryLate], "open", NOW).map((o) => o.id)).toEqual(["v", "b", "pack", "temu"]);
  });
});

describe("the eight stages on one line", () => {
  it("draws done, now and what is ahead, with the day each was reached", () => {
    const o = order({ id: "x" });
    const steps = storySteps(
      o,
      [
        { to_status: "supplier_order_needed", at: hoursAgo(198) },
        { to_status: "supplier_order_placed", at: hoursAgo(190) },
        { to_status: "inbound_to_eikon", at: hoursAgo(150) },
        { to_status: "received_for_inspection", at: hoursAgo(20) },
      ],
      NOW,
    );
    expect(steps.map((s) => s.label)).toEqual([
      "Paid",
      "Needs sourcing",
      "Ordered",
      "On its way to us",
      "Being checked",
      "Packed",
      "Shipped",
      "Delivered",
    ]);
    expect(steps.map((s) => s.state)).toEqual(["done", "done", "done", "done", "now", "todo", "todo", "todo"]);
    expect(steps[0].at).toBe(o.paid_at);
    expect(steps[4].at).toBe(hoursAgo(20));
    expect(steps[5].at).toBeNull();
  });

  it("dashes the stage an order has sat in past its target", () => {
    const o = order({ id: "x", fulfillment_status: "inbound_to_eikon", updated_at: hoursAgo(16 * 24) });
    expect(storySteps(o, [], NOW)[3].state).toBe("late");
  });

  it("draws a delivered order done all the way, and lights nothing on a refunded one", () => {
    const delivered = storySteps(order({ id: "d", fulfillment_status: "delivered" }), [], NOW);
    expect(delivered.every((s) => s.state === "done")).toBe(true);
    const refunded = storySteps(
      order({ id: "r", payment_status: "refunded", fulfillment_status: "refunded" }),
      [{ to_status: "supplier_order_needed", at: hoursAgo(100) }],
      NOW,
    );
    expect(refunded.some((s) => s.state === "now" || s.state === "late")).toBe(false);
    expect(refunded.slice(0, 2).map((s) => s.state)).toEqual(["done", "done"]);
  });

  it("uses the latest entry when an order went back and came again", () => {
    const o = order({ id: "x", fulfillment_status: "packaged" });
    const steps = storySteps(
      o,
      [
        { to_status: "packaged", at: hoursAgo(50) },
        { to_status: "received_for_inspection", at: hoursAgo(40) },
        { to_status: "packaged", at: hoursAgo(5) },
      ],
      NOW,
    );
    expect(steps[5].at).toBe(hoursAgo(5));
  });
});

describe("what the reader sees", () => {
  it("says the reader's own word and step, the same as their order page", () => {
    expect(readerSees({ payment_status: "paid", fulfillment_status: "received_for_inspection" })).toEqual({
      word: "Preparing Your Order",
      step: 2,
      of: 5,
    });
    expect(readerSees({ payment_status: "paid", fulfillment_status: "shipped" }).step).toBe(4);
    expect(readerSees({ payment_status: "refunded", fulfillment_status: "refunded" })).toEqual({
      word: "Refunded",
      step: 0,
      of: 5,
    });
  });

  it("dates each of the reader's five steps by the first stage that reached it", () => {
    const o = order({ id: "x", fulfillment_status: "shipped" });
    const steps = readerSteps(o, [
      { to_status: "supplier_order_needed", at: hoursAgo(190) },
      { to_status: "received_for_inspection", at: hoursAgo(100) },
      { to_status: "packaged", at: hoursAgo(60) },
      { to_status: "shipped", at: hoursAgo(50) },
    ]);
    expect(steps.map((s) => s.state)).toEqual(["done", "done", "done", "now", "todo"]);
    expect(steps[1].at).toBe(hoursAgo(190));
    expect(steps[3].at).toBe(hoursAgo(50));
    expect(steps[4].at).toBeNull();
  });
});

describe("the moves", () => {
  it("offers the stage's own move, and asks for a tracking number before Shipped", () => {
    expect(nextMove({ payment_status: "paid", fulfillment_status: "received_for_inspection" })).toEqual({
      to: "packaged",
      label: "Packed",
      needsTracking: false,
    });
    expect(nextMove({ payment_status: "paid", fulfillment_status: "packaged" })?.needsTracking).toBe(true);
    expect(nextMove({ payment_status: "paid", fulfillment_status: "delivered" })).toBeNull();
    expect(backMove({ payment_status: "paid", fulfillment_status: "packaged" })).toEqual({
      to: "received_for_inspection",
      label: "Being checked",
    });
  });

  it("offers no move on an order whose money went back", () => {
    const r = { payment_status: "refunded" as const, fulfillment_status: "refunded" as ShopFulfillmentStatus };
    expect(nextMove(r)).toBeNull();
    expect(backMove(r)).toBeNull();
    expect(stageWord(r)).toBe("Refunded");
  });
});

describe("the money", () => {
  it("takes the card fee and today's Temu cost from what was paid", () => {
    const m = orderMoney(order({ id: "x" }), { "p-cross": 980 });
    expect(m).toEqual({ paidCents: 3600, feeCents: 134, supplierCents: 980, keepsCents: 2486, refunded: false });
  });

  it("does not invent a margin when a piece has no recorded cost", () => {
    const m = orderMoney(order({ id: "x" }), {});
    expect(m.supplierCents).toBeNull();
    expect(m.keepsCents).toBeNull();
  });

  it("multiplies the cost by the quantity", () => {
    const o = order({
      id: "x",
      total_cents: 2800,
      items: [{ title: "Frankincense resin", quantity: 2, unit_price_cents: 1400, product_id: "p-f" }],
    });
    expect(orderMoney(o, { "p-f": 320 }).supplierCents).toBe(640);
  });
});

describe("both trackings", () => {
  it("names the inbound leg by where the order is", () => {
    expect(inboundLine({ fulfillment_status: "supplier_order_needed", inbound_tracking: null }).word).toBe("not ordered yet");
    expect(inboundLine({ fulfillment_status: "inbound_to_eikon", inbound_tracking: "YT123" })).toEqual({
      word: "on its way",
      tone: "wait",
      tracking: "YT123",
    });
    expect(inboundLine({ fulfillment_status: "packaged", inbound_tracking: null }).tone).toBe("done");
  });

  it("says when a parcel left with no tracking", () => {
    expect(outboundLine({ fulfillment_status: "shipped", outbound_tracking: null }).word).toBe("shipped, no tracking");
    expect(outboundLine({ fulfillment_status: "received_for_inspection", outbound_tracking: null }).word).toBe(
      "after packing",
    );
  });
});

describe("the parcel's paperwork", () => {
  const address = {
    name: "G. Sample",
    address: { line1: "12 Example Street", line2: null, city: "Anytown", state: "ST", postal_code: "00000", country: "US" },
  };

  it("writes the address as lines with no empty second line", () => {
    expect(addressLines(address)).toEqual(["G. Sample", "12 Example Street", "Anytown, ST 00000", "US"]);
    expect(addressLines(null)).toEqual([]);
  });

  it("writes a label file a label tool can import", () => {
    const csv = labelCsv([{ id: "0c9f4e21-0000-0000-0000-000000000000", email: "g@example.com", address }]);
    expect(csv.split("\n")[0]).toBe("Order,Name,Street1,Street2,City,State,Zip,Country,Email,Weight (lb)");
    expect(csv.split("\n")[1]).toBe("EIK-0C9F4E21,G. Sample,12 Example Street,,Anytown,ST,00000,US,g@example.com,");
  });

  it("finds an order by the number a reader typed, in any case", () => {
    const orders = [{ id: "0c9f4e21-0000-0000-0000-000000000000" }];
    expect(findByNumber(orders, "eik-0c9f4e21")).toBe(orders[0]);
    expect(findByNumber(orders, "EIK-00000000")).toBeNull();
  });
});

describe("the address names what is open", () => {
  it("reads a deep link's tab and its extra part", () => {
    expect(parseHash("#tab=orders&order=EIK-0C9F4E21")).toEqual({ tab: "orders", params: { order: "EIK-0C9F4E21" } });
    expect(parseHash("")).toEqual({ tab: null, params: {} });
  });

  it("writes the same address back", () => {
    expect(hashFor("orders", { order: "EIK-0C9F4E21" })).toBe("#tab=orders&order=EIK-0C9F4E21");
    expect(hashFor("orders", { order: "" })).toBe("#tab=orders");
  });
});
