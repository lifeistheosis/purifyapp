import { describe, expect, it } from "vitest";

import { readerSees, readerSteps, type StoryOrder } from "@/lib/admin/orderStory";
import { FUNNEL_STAGES } from "@/lib/shop/funnel";
import {
  asksForReview,
  groupOrders,
  offLadder,
  orderLines,
  orderTitle,
  piecePhoto,
  shipToLines,
  storyEstimate,
  storySteps,
  trackingInFours,
} from "@/lib/shop/orderStory";
import { buyerOrderStatus } from "@/lib/shop/status";
import type { ShopFulfillmentStatus } from "@/lib/shop/types";
import { trackingCard } from "@/lib/support/trackingCard";

/**
 * Orders B, "The whole story", from the reader's side (r3-19, the owner's
 * pick of 2026-10-31). What a reader would see if this broke: their own order
 * page saying a different step from the one the owner's console shows him or
 * the tracking card his email sent; a date made up for a step the order's row
 * cannot date; a review asked for before the parcel has even left (build 85
 * asked it of an unshipped wall cross); a total with no shipping line.
 *
 * Every order here is SAMPLE (the repo is public).
 */

const NOW = new Date("2026-10-31T15:00:00Z");
const PAID = "2026-10-22T14:06:00Z";
const MOVED = "2026-10-29T17:20:00Z";

const ALL_STAGES: ShopFulfillmentStatus[] = [...FUNNEL_STAGES, "cancelled", "refunded"];
const PAYMENTS = ["paid", "refunded"] as const;

/** A SAMPLE order row in the shape the reader's page reads it. */
function sample(over: Partial<StoryOrder> = {}): StoryOrder {
  return {
    id: "0c9f4e21-7a6b-4c1d-9e2f-1a2b3c4d5e01",
    payment_status: "paid",
    fulfillment_status: "received_for_inspection",
    total_cents: 3600,
    created_at: "2026-10-22T14:05:00Z",
    paid_at: PAID,
    updated_at: MOVED,
    email: "reader@example.com",
    shipping_address: null,
    outbound_tracking: null,
    inbound_tracking: null,
    items: [],
    ...over,
  } as StoryOrder;
}

describe("the reader's five steps are the owner's and the tracking card's", () => {
  it("says the same word and step as the admin's order story and the support email's card, at every stage", () => {
    for (const payment_status of PAYMENTS) {
      for (const fulfillment_status of ALL_STAGES) {
        const o = sample({ payment_status, fulfillment_status });
        const mine = storySteps(o);
        const admin = readerSteps(o, []);
        const card = trackingCard({ ...o, outbound_tracking: null }, []);
        const seen = readerSees(o);
        const at = `${payment_status}/${fulfillment_status}`;
        // The same five words, in the same order, with the same marks.
        expect(mine.map((s) => s.word), at).toEqual(admin.map((s) => s.word));
        expect(mine.map((s) => s.state), at).toEqual(admin.map((s) => s.state));
        // The step it is on is the admin's and the card's.
        expect(card.word, at).toBe(seen.word);
        expect(card.step, at).toBe(seen.step);
        const lit = mine.findIndex((s) => s.state === "now");
        const reached = lit >= 0 ? lit + 1 : mine.filter((s) => s.state === "done").length;
        expect(reached, at).toBe(seen.step);
        // Off the road (refunded, cancelled) the page says the word instead of a ladder.
        expect(offLadder(o), at).toBe(seen.step === 0 ? buyerOrderStatus(o) : null);
      }
    }
  });

  it("lights only the step it is on, and a delivered order is done all the way", () => {
    const states = (f: ShopFulfillmentStatus) => storySteps(sample({ fulfillment_status: f })).map((s) => s.state);
    expect(states("pending")).toEqual(["now", "todo", "todo", "todo", "todo"]);
    expect(states("inbound_to_eikon")).toEqual(["done", "now", "todo", "todo", "todo"]);
    expect(states("packaged")).toEqual(["done", "done", "now", "todo", "todo"]);
    expect(states("shipped")).toEqual(["done", "done", "done", "now", "todo"]);
    expect(states("delivered")).toEqual(["done", "done", "done", "done", "done"]);
  });
});

describe("a step is dated only where the order's own row knows the day", () => {
  it("dates the first step by when it was paid and the step it is on by when the row last moved", () => {
    const steps = storySteps(sample({ fulfillment_status: "shipped" }));
    expect(steps.map((s) => s.at)).toEqual([PAID, null, null, MOVED, null]);
    expect(steps[3].since).toBe(true);
    expect(steps[0].since).toBe(false);
  });

  it("falls back to when it was placed for an order paid before paid_at was kept", () => {
    const steps = storySteps(sample({ paid_at: null }));
    expect(steps[0].at).toBe("2026-10-22T14:05:00Z");
  });

  it("dates a delivered order's arrival plainly, not as since", () => {
    const steps = storySteps(sample({ fulfillment_status: "delivered" }));
    expect(steps[4]).toEqual({ word: "Delivered", state: "done", at: MOVED, since: false });
    expect(steps.slice(1, 4).map((s) => s.at)).toEqual([null, null, null]);
  });

  it("does not date the first step twice when the order is still on it", () => {
    const steps = storySteps(sample({ fulfillment_status: "pending" }));
    expect(steps[0]).toEqual({ word: "Order Confirmed", state: "now", at: PAID, since: false });
  });
});

describe("the estimate under the lit step", () => {
  const items = [{ product: { dispatch_min_days: 7, dispatch_max_days: 21 } }];
  it("is the slowest piece's promised window until the parcel is with the carrier", () => {
    const e = storyEstimate({ ...sample(), items }, NOW);
    expect(e?.from.toISOString()).toBe("2026-10-29T14:05:00.000Z");
    expect(e?.to.toISOString()).toBe("2026-11-12T14:05:00.000Z");
    expect(e?.late).toBe(false);
  });
  it("is gone once it has shipped, so no delivery date is ever made up", () => {
    expect(storyEstimate({ ...sample({ fulfillment_status: "shipped" }), items }, NOW)).toBeNull();
    expect(storyEstimate({ ...sample({ fulfillment_status: "delivered" }), items }, NOW)).toBeNull();
  });
});

describe("the review is asked for only once the order has arrived", () => {
  const items = [{ product: { slug: "byzantine-three-beam-wall-cross" } }];
  it("never at paid, preparing, ready or shipped", () => {
    for (const f of ALL_STAGES) {
      const asks = asksForReview({ payment_status: "paid", fulfillment_status: f, items });
      expect(asks, f).toBe(f === "delivered");
    }
  });
  it("not for a refunded order, nor for a piece taken down since", () => {
    expect(asksForReview({ payment_status: "refunded", fulfillment_status: "delivered", items })).toBe(false);
    expect(asksForReview({ payment_status: "paid", fulfillment_status: "delivered", items: [{ product: null }] })).toBe(false);
  });
});

describe("the parcel's list", () => {
  it("always carries a shipping line, tax only when there was any, and the total last", () => {
    const lines = orderLines({
      items: [
        { title: "Greek prayer rope, 33 knots", unit_price_cents: 2400, quantity: 1 },
        { title: "Frankincense resin", unit_price_cents: 700, quantity: 2 },
      ],
      shipping_cents: 499,
      tax_cents: 0,
      total_cents: 4299,
    });
    expect(lines.map((l) => l.kind)).toEqual(["item", "item", "shipping", "total"]);
    expect(lines[1]).toEqual({ kind: "item", title: "Frankincense resin", quantity: 2, cents: 1400 });
    const free = orderLines({ items: [], shipping_cents: 0, tax_cents: 120, total_cents: 120 });
    expect(free.map((l) => l.kind)).toEqual(["shipping", "tax", "total"]);
  });

  it("names the first piece and counts the rest", () => {
    expect(orderTitle([{ title: "Greek prayer rope, 33 knots" }, { title: "Frankincense resin" }])).toEqual({
      first: "Greek prayer rope, 33 knots",
      more: 1,
    });
    expect(orderTitle([{ title: "Byzantine wall cross" }]).more).toBe(0);
  });

  it("writes the address as lines and the tracking number in fours", () => {
    expect(
      shipToLines({
        name: "G. Sample",
        address: { line1: "12 Example Street", line2: null, city: "Anytown", state: "ST", postal_code: "00000", country: "US" },
      }),
    ).toEqual(["G. Sample", "12 Example Street", "Anytown, ST 00000", "US"]);
    expect(shipToLines(null)).toEqual([]);
    expect(trackingInFours("9400000000000000000000")).toBe("9400 0000 0000 0000 0000 00");
  });

  it("shows a piece's primary photo, else its first by order", () => {
    const media = [
      { media_url: "/shop/media/b.png", alt_text: "b", sort_order: 2, is_primary: false },
      { media_url: "/shop/media/a.png", alt_text: "a", sort_order: 1, is_primary: false },
    ];
    expect(piecePhoto({ media })?.src).toBe("/shop/media/a.png");
    expect(piecePhoto({ media: [...media, { media_url: "/shop/media/p.png", alt_text: "p", sort_order: 9, is_primary: true }] })?.src).toBe(
      "/shop/media/p.png",
    );
    expect(piecePhoto(null)).toBeNull();
  });
});

describe("your orders, under the reader's own words", () => {
  const at = Date.parse("2026-10-31T15:00:00Z");
  const row = (id: string, payment_status: StoryOrder["payment_status"], fulfillment_status: ShopFulfillmentStatus, created_at: string) => ({
    id,
    payment_status,
    fulfillment_status,
    created_at,
  });

  it("sorts orders on the road lit, the arrived solid, and an unfinished checkout last, dashed", () => {
    const groups = groupOrders(
      [
        row("delivered", "paid", "delivered", "2026-09-14T13:30:00Z"),
        row("preparing", "paid", "received_for_inspection", "2026-10-22T14:05:00Z"),
        row("shipped", "paid", "shipped", "2026-10-08T19:40:00Z"),
        row("unpaid", "pending", "pending", "2026-10-30T21:10:00Z"),
        row("refunded", "refunded", "refunded", "2026-08-01T10:00:00Z"),
      ],
      at,
    );
    expect(groups.map((g) => [g.word, g.mark, g.orders.map((o) => o.id)])).toEqual([
      ["Preparing Your Order", "now", ["preparing"]],
      ["Shipped", "now", ["shipped"]],
      ["Delivered", "done", ["delivered"]],
      ["Refunded", "todo", ["refunded"]],
      ["notFinished", "dashed", ["unpaid"]],
    ]);
  });

  it("leaves out a checkout gone stale and one cancelled unpaid", () => {
    const groups = groupOrders(
      [row("stale", "pending", "pending", "2026-10-20T10:00:00Z"), row("cancelled", "cancelled", "pending", "2026-10-31T10:00:00Z")],
      at,
    );
    expect(groups).toEqual([]);
  });

  it("puts the newest first within a word", () => {
    const groups = groupOrders(
      [row("older", "paid", "shipped", "2026-10-01T10:00:00Z"), row("newer", "paid", "shipped", "2026-10-20T10:00:00Z")],
      at,
    );
    expect(groups[0].orders.map((o) => o.id)).toEqual(["newer", "older"]);
  });
});
