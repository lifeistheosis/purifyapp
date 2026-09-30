import type { ShopFulfillmentStatus } from "./types";

/**
 * The Fulfillment tab's board: the eight real stages (./funnel.ts) gathered
 * into the four lanes a shop owner thinks in, Unfulfilled, Processing,
 * Shipped, Delivered (asked for 2026-09-30).
 *
 * The lanes are only a grouping. Every stage stays its own drop target inside
 * its lane, so a drop always names one exact stage: EIKON's two-stage
 * fulfillment has four distinct steps between "ordered from the supplier" and
 * "packed", and a lane-level drop would have to guess which one was meant.
 *
 * ── What a drop may do ──────────────────────────────────────────────────
 *
 *  - Into Shipped: open the order, not move it. Shipping takes a tracking
 *    number and emails the buyer, and a drag cannot carry either.
 *  - Into Delivered from anything but Shipped: refused. An order that was never
 *    posted has no tracking and the buyer was never told it left.
 *  - Anything else moves, backwards included, the same as the panel's own
 *    Back button.
 *
 * Pure.
 */

export type LaneId = "unfulfilled" | "processing" | "shipped" | "delivered";

export type Lane = { id: LaneId; label: string; emoji: string; stages: ShopFulfillmentStatus[] };

export const LANES: Lane[] = [
  { id: "unfulfilled", label: "Unfulfilled", emoji: "🧾", stages: ["pending", "supplier_order_needed"] },
  {
    id: "processing",
    label: "Processing",
    emoji: "🛠️",
    stages: ["supplier_order_placed", "inbound_to_eikon", "received_for_inspection", "packaged"],
  },
  { id: "shipped", label: "Shipped", emoji: "✈️", stages: ["shipped"] },
  { id: "delivered", label: "Delivered", emoji: "🏠", stages: ["delivered"] },
];

export function laneOf(stage: ShopFulfillmentStatus): LaneId | null {
  return LANES.find((l) => l.stages.includes(stage))?.id ?? null;
}

export type DropAction =
  | { kind: "none" }
  | { kind: "move"; to: ShopFulfillmentStatus }
  | { kind: "tracking" }
  | { kind: "refuse"; reason: string };

export function dropAction(from: ShopFulfillmentStatus, to: ShopFulfillmentStatus): DropAction {
  if (from === to) return { kind: "none" };
  if (laneOf(to) == null || laneOf(from) == null) return { kind: "refuse", reason: "That order is closed." };
  if (to === "shipped" && from !== "delivered") return { kind: "tracking" };
  if (to === "delivered" && from !== "shipped") {
    return { kind: "refuse", reason: "Ship it first: it needs a tracking number before it can be delivered." };
  }
  return { kind: "move", to };
}
