import { describe, expect, it } from "vitest";

import {
  fulfillmentPathFor,
  initialFulfillmentStatus,
  needsSellerAction,
  SELLER_ACTION_LABELS,
  SELLER_STATUS_LABELS,
  SELLER_TRANSITIONS,
  sellerCanTransition,
  statusLabelsFor,
  transitionNeedsTracking,
} from "../sellerOrders";
import type { ShopFulfillmentStatus } from "../types";

const ALL: ShopFulfillmentStatus[] = [
  "pending",
  "supplier_order_needed",
  "supplier_order_placed",
  "inbound_to_eikon",
  "received_for_inspection",
  "packaged",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

describe("seller transitions", () => {
  it("covers every fulfillment status", () => {
    for (const s of ALL) {
      expect(SELLER_TRANSITIONS[s]).toBeDefined();
      expect(SELLER_STATUS_LABELS[s]).toBeTruthy();
    }
  });

  it("walks the happy path forward", () => {
    expect(sellerCanTransition("pending", "packaged")).toBe(true);
    expect(sellerCanTransition("packaged", "shipped")).toBe(true);
    expect(sellerCanTransition("shipped", "delivered")).toBe(true);
  });

  it("never moves backward or skips shipping", () => {
    expect(sellerCanTransition("shipped", "packaged")).toBe(false);
    expect(sellerCanTransition("delivered", "shipped")).toBe(false);
    expect(sellerCanTransition("pending", "delivered")).toBe(false);
    expect(sellerCanTransition("pending", "shipped")).toBe(false);
  });

  it("terminal states offer nothing", () => {
    for (const s of ["delivered", "cancelled", "refunded"] as const) {
      expect(SELLER_TRANSITIONS[s]).toHaveLength(0);
    }
  });

  it("refunded is never a seller transition target", () => {
    for (const s of ALL) {
      expect(sellerCanTransition(s, "refunded")).toBe(false);
    }
  });

  it("cancel is only offered before anything ships", () => {
    expect(sellerCanTransition("pending", "cancelled")).toBe(true);
    expect(sellerCanTransition("packaged", "cancelled")).toBe(true);
    expect(sellerCanTransition("shipped", "cancelled")).toBe(false);
    expect(sellerCanTransition("delivered", "cancelled")).toBe(false);
  });

  it("shipping requires tracking; nothing else does", () => {
    for (const s of ALL) {
      expect(transitionNeedsTracking(s)).toBe(s === "shipped");
    }
  });

  it("every offered action has a label", () => {
    const targets = new Set(Object.values(SELLER_TRANSITIONS).flat());
    for (const t of targets) {
      expect(SELLER_ACTION_LABELS[t]).toBeTruthy();
    }
  });
});

describe("needsSellerAction", () => {
  it("flags new, sourcing-needed, and packaged orders", () => {
    expect(needsSellerAction("pending")).toBe(true);
    expect(needsSellerAction("supplier_order_needed")).toBe(true);
    expect(needsSellerAction("packaged")).toBe(true);
  });

  it("leaves in-motion and terminal orders alone", () => {
    expect(needsSellerAction("shipped")).toBe(false);
    expect(needsSellerAction("delivered")).toBe(false);
    expect(needsSellerAction("refunded")).toBe(false);
  });
});

/**
 * Which pipeline a store runs, and what its states are called.
 *
 * shop_products.fulfillment_type has carried 'seller_fulfilled' since the
 * first migration and nothing has ever written it, so the pipeline is decided
 * from the store's seller type instead. These assert the two things that
 * would otherwise be silent: the default direction, and that an independent
 * seller is never shown EIKON's warehouse.
 */
describe("fulfillment pipeline", () => {
  it("routes a Purify-operated store to the two-stage pipeline", () => {
    expect(fulfillmentPathFor("purify_owned")).toBe("eikon_two_stage");
  });

  it("routes everyone else to shipping their own", () => {
    for (const type of [
      "independent_iconographer",
      "monastery",
      "workshop",
      "retailer",
    ]) {
      expect(fulfillmentPathFor(type)).toBe("seller_fulfilled");
    }
  });

  it("defaults an unknown or missing seller type to seller_fulfilled", () => {
    // The safer wrong answer. The other direction prints "In inspection" over
    // a stranger shipping from their kitchen table, in Purify's voice.
    expect(fulfillmentPathFor(null)).toBe("seller_fulfilled");
    expect(fulfillmentPathFor(undefined)).toBe("seller_fulfilled");
    expect(fulfillmentPathFor("something_new")).toBe("seller_fulfilled");
  });

  it("never opens a seller-shipped order on the sourcing path", () => {
    // There is no supplier to wait on. Before this, a special-order line put
    // ANY order into supplier_order_needed, EIKON's or not.
    expect(initialFulfillmentStatus("seller_fulfilled", true)).toBe("pending");
    expect(initialFulfillmentStatus("seller_fulfilled", false)).toBe("pending");
  });

  it("still opens an EIKON special order on the sourcing path", () => {
    expect(initialFulfillmentStatus("eikon_two_stage", true)).toBe(
      "supplier_order_needed",
    );
    expect(initialFulfillmentStatus("eikon_two_stage", false)).toBe("pending");
  });
});

describe("status labels per pipeline", () => {
  it("keeps EIKON's words for EIKON", () => {
    const labels = statusLabelsFor("eikon_two_stage");
    expect(labels.supplier_order_needed).toBe("Awaiting sourcing");
    expect(labels.received_for_inspection).toBe("In inspection");
  });

  it("says nothing about sourcing or inspection to a seller who ships", () => {
    const labels = statusLabelsFor("seller_fulfilled");
    for (const state of [
      "supplier_order_needed",
      "supplier_order_placed",
      "inbound_to_eikon",
      "received_for_inspection",
    ] as const) {
      expect(labels[state]).not.toMatch(/sourc|inspect|inbound|eikon/i);
    }
  });

  it("labels every state in both pipelines", () => {
    // A state with no label renders blank, and these four are reachable on an
    // order taken before a store's pipeline was settled.
    for (const path of ["eikon_two_stage", "seller_fulfilled"] as const) {
      const labels = statusLabelsFor(path);
      for (const state of Object.keys(SELLER_TRANSITIONS) as (keyof typeof SELLER_TRANSITIONS)[]) {
        expect(labels[state]).toBeTruthy();
      }
    }
  });
});
