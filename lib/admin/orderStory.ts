/**
 * An order as its whole story: the owner's pick B for Orders (r3-16,
 * 2026-10-30, "do B for order"). Orders is a list (Open, Late, Done) and each
 * order opens as one page: its eight stages on one line (done solid, now lit,
 * late dashed) with what the reader sees under it, the parcel, the address,
 * the money and both trackings.
 *
 * The stages, their targets and lateness are lib/shop/funnel.ts, and the
 * reader's five words are lib/shop/status.ts, so this page, the funnel and
 * the reader's own order page cannot disagree about where an order is. This
 * file only arranges them.
 *
 * Pure: the clock is handed in.
 */

import { toCsv } from "./csv";
import type { ShippingAddress } from "@/lib/eikonBox/types";
import {
  FUNNEL_STAGES,
  STAGE,
  ageText,
  hoursBetween,
  isLate,
  nextStage,
  prevStage,
  type FunnelOrder,
} from "@/lib/shop/funnel";
import { orderConfirmationNumber } from "@/lib/shop/orderNumber";
import { unitEconomics } from "@/lib/shop/pricing";
import { BUYER_ORDER_STEPS, buyerOrderStatus, buyerStepIndex, type BuyerOrderStatus } from "@/lib/shop/status";
import type { ShopFulfillmentStatus } from "@/lib/shop/types";

export type StoryItem = {
  title: string;
  quantity: number;
  unit_price_cents: number;
  product_id: string | null;
};

export type StoryOrder = FunnelOrder & {
  email: string | null;
  currency?: string | null;
  shipping_address: unknown;
  outbound_tracking: string | null;
  inbound_tracking: string | null;
  items: StoryItem[];
};

/** One move, as shop_order_events holds it. */
export type StoryEvent = { to_status: string; at: string };

export type Bucket = "open" | "late" | "done";

/** A finished order: delivered, or its money went back. */
function finished(o: Pick<FunnelOrder, "payment_status" | "fulfillment_status">): boolean {
  return (
    o.payment_status === "refunded" ||
    o.fulfillment_status === "delivered" ||
    o.fulfillment_status === "refunded" ||
    o.fulfillment_status === "cancelled"
  );
}

/**
 * Whether an order belongs in a bucket. Open holds every paid order still on
 * the road, late ones included (the drawing lists the late order under Open
 * with its lateness in a dashed box); Late is the late ones alone; Done is
 * the delivered and the refunded.
 *
 * An unpaid row is an unfinished checkout, not an order (lib/shop/orders.ts),
 * and is in no bucket at all.
 */
export function inBucket(o: StoryOrder, bucket: Bucket, now: Date): boolean {
  if (o.payment_status !== "paid" && o.payment_status !== "refunded") return false;
  if (bucket === "done") return finished(o);
  if (finished(o) || o.payment_status !== "paid") return false;
  return bucket === "open" ? true : isLate(o, now);
}

export function bucketCounts(orders: readonly StoryOrder[], now: Date): Record<Bucket, number> {
  const out = { open: 0, late: 0, done: 0 };
  for (const o of orders) {
    if (inBucket(o, "open", now)) out.open += 1;
    if (inBucket(o, "late", now)) out.late += 1;
    if (inBucket(o, "done", now)) out.done += 1;
  }
  return out;
}

/** The stages that wait on the owner rather than on Temu or a carrier. */
export const WAITS_ON_YOU: ReadonlySet<ShopFulfillmentStatus> = new Set<ShopFulfillmentStatus>([
  "pending",
  "supplier_order_needed",
  "received_for_inspection",
  "packaged",
]);

/**
 * A bucket in the order to work it. Open and Late: the most overdue first,
 * then what waits on him, then whatever has sat longest in its stage. Done:
 * the most recently finished first.
 */
export function ordersIn(orders: readonly StoryOrder[], bucket: Bucket, now: Date): StoryOrder[] {
  const list = orders.filter((o) => inBucket(o, bucket, now));
  if (bucket === "done") {
    return list.sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
  }
  const over = (o: StoryOrder) => {
    const target = STAGE[o.fulfillment_status]?.targetHours;
    return target == null ? -Infinity : hoursBetween(o.updated_at, now) - target;
  };
  return list.sort((a, b) => {
    const la = isLate(a, now) ? 1 : 0;
    const lb = isLate(b, now) ? 1 : 0;
    if (la !== lb) return lb - la;
    if (la && lb) return over(b) - over(a);
    const ya = WAITS_ON_YOU.has(a.fulfillment_status) ? 1 : 0;
    const yb = WAITS_ON_YOU.has(b.fulfillment_status) ? 1 : 0;
    if (ya !== yb) return yb - ya;
    return Date.parse(a.updated_at) - Date.parse(b.updated_at);
  });
}

/** The stage's name on the one line, shortened where the line is tight. */
export const STAGE_SHORT: Record<ShopFulfillmentStatus, string> = {
  pending: "Paid",
  supplier_order_needed: "Needs sourcing",
  supplier_order_placed: "Ordered",
  inbound_to_eikon: "On its way to us",
  received_for_inspection: "Being checked",
  packaged: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export type StepState = "done" | "now" | "late" | "todo";

export type StoryStep = {
  stage: ShopFulfillmentStatus;
  label: string;
  state: StepState;
  /** When the order last entered this stage, or null when that is not known. */
  at: string | null;
};

/** When the order last came into each stage, from its recorded moves. */
function enteredAt(events: readonly StoryEvent[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const e of events) {
    const prev = out.get(e.to_status);
    if (!prev || Date.parse(e.at) > Date.parse(prev)) out.set(e.to_status, e.at);
  }
  return out;
}

/**
 * The eight stages on one line. Done is solid, the stage it is in now is lit,
 * or dashed when it has sat there past the stage's target, and what is still
 * ahead is hollow. A delivered order is done all the way along.
 *
 * A refunded order has left the road, so it is drawn by the stages its moves
 * recorded, and the line says Refunded beside it rather than lighting one.
 */
export function storySteps(o: StoryOrder, events: readonly StoryEvent[], now: Date): StoryStep[] {
  const at = enteredAt(events);
  const cur = FUNNEL_STAGES.indexOf(o.fulfillment_status);
  const late = isLate(o, now);
  return FUNNEL_STAGES.map((stage, i) => {
    let state: StepState;
    if (cur < 0) state = stage === "pending" || at.has(stage) ? "done" : "todo";
    else if (i < cur) state = "done";
    else if (i === cur) state = stage === "delivered" ? "done" : late ? "late" : "now";
    else state = "todo";
    const when = stage === "pending" ? (o.paid_at ?? o.created_at) : (at.get(stage) ?? null);
    return { stage, label: STAGE_SHORT[stage], state, at: state === "todo" ? null : when };
  });
}

/** Where the order is, in the owner's words: "Here, being checked". */
export function stageWord(o: Pick<FunnelOrder, "payment_status" | "fulfillment_status">): string {
  if (o.payment_status === "refunded") return "Refunded";
  return STAGE[o.fulfillment_status]?.label ?? o.fulfillment_status;
}

/** What the reader sees on their own order page, and which of their five steps it is. */
export function readerSees(o: Pick<FunnelOrder, "payment_status" | "fulfillment_status">): {
  word: BuyerOrderStatus;
  /** 1 to 5, or 0 for Refunded and Cancelled, which are off the ladder. */
  step: number;
  of: number;
} {
  const word = buyerOrderStatus(o);
  return { word, step: buyerStepIndex(word) + 1, of: BUYER_ORDER_STEPS.length };
}

/** The reader's five steps with the date each was reached, for the console's ladder. */
export function readerSteps(
  o: StoryOrder,
  events: readonly StoryEvent[],
): { word: BuyerOrderStatus; state: "done" | "now" | "todo"; at: string | null }[] {
  const at = enteredAt(events);
  const { step } = readerSees(o);
  // The first move into any stage that maps to the reader's word.
  const firstInto = (word: BuyerOrderStatus): string | null => {
    if (word === "Order Confirmed") return o.paid_at ?? o.created_at;
    let best: string | null = null;
    for (const stage of FUNNEL_STAGES) {
      if (buyerOrderStatus({ payment_status: "paid", fulfillment_status: stage }) !== word) continue;
      const t = at.get(stage);
      if (t && (!best || Date.parse(t) < Date.parse(best))) best = t;
    }
    return best;
  };
  return BUYER_ORDER_STEPS.map((word, i) => {
    const state = step === 0 ? "todo" : i + 1 < step ? "done" : i + 1 === step ? (word === "Delivered" ? "done" : "now") : "todo";
    return { word, state, at: state === "todo" ? null : firstInto(word) };
  });
}

export type Move = { to: ShopFulfillmentStatus; label: string; needsTracking: boolean };

/** The one move out of the stage it is in, or null when there is none to make. */
export function nextMove(o: Pick<FunnelOrder, "payment_status" | "fulfillment_status">): Move | null {
  if (o.payment_status !== "paid") return null;
  const to = nextStage(o.fulfillment_status);
  if (!to) return null;
  return { to, label: STAGE[o.fulfillment_status].action, needsTracking: to === "shipped" };
}

/** One stage back, for a move made by mistake. */
export function backMove(
  o: Pick<FunnelOrder, "payment_status" | "fulfillment_status">,
): { to: ShopFulfillmentStatus; label: string } | null {
  if (o.payment_status !== "paid") return null;
  const to = prevStage(o.fulfillment_status);
  return to ? { to, label: STAGE_SHORT[to] } : null;
}

export type OrderMoney = {
  paidCents: number;
  /** Card processing at the standard rate: an estimate, as lib/shop/pricing.ts says. */
  feeCents: number;
  /** What the pieces cost on Temu today, or null when any piece has no recorded cost. */
  supplierCents: number | null;
  keepsCents: number | null;
  refunded: boolean;
};

/**
 * What the order brought in and what it keeps. The supplier side is the
 * pieces' cost as recorded today: the order does not store what was paid to
 * Temu for it, and the page says so beside the figure.
 */
export function orderMoney(
  o: Pick<StoryOrder, "total_cents" | "payment_status" | "items">,
  costByProduct: Record<string, number | null | undefined>,
): OrderMoney {
  const fee = unitEconomics(o.total_cents, 0).feeCents;
  let supplier = 0;
  let known = o.items.length > 0;
  for (const it of o.items) {
    const c = it.product_id ? costByProduct[it.product_id] : undefined;
    if (typeof c !== "number" || !Number.isFinite(c)) {
      known = false;
      break;
    }
    supplier += c * it.quantity;
  }
  return {
    paidCents: o.total_cents,
    feeCents: fee,
    supplierCents: known ? supplier : null,
    keepsCents: known ? o.total_cents - fee - supplier : null,
    refunded: o.payment_status === "refunded",
  };
}

export type TrackLine = { word: string; tone: "done" | "wait" | "idle"; tracking: string | null };

const stageIndex = (s: ShopFulfillmentStatus) => FUNNEL_STAGES.indexOf(s);

/** The parcel coming in from Temu. */
export function inboundLine(o: Pick<StoryOrder, "fulfillment_status" | "inbound_tracking">): TrackLine {
  const i = stageIndex(o.fulfillment_status);
  const tracking = o.inbound_tracking?.trim() || null;
  if (i >= stageIndex("received_for_inspection")) return { word: "arrived", tone: "done", tracking };
  if (o.fulfillment_status === "inbound_to_eikon") return { word: "on its way", tone: "wait", tracking };
  if (o.fulfillment_status === "supplier_order_placed") return { word: "ordered", tone: "wait", tracking };
  if (i < 0) return { word: tracking ? "on file" : "none", tone: "idle", tracking };
  return { word: "not ordered yet", tone: "idle", tracking };
}

/** The parcel going out to the reader. */
export function outboundLine(o: Pick<StoryOrder, "fulfillment_status" | "outbound_tracking">): TrackLine {
  const tracking = o.outbound_tracking?.trim() || null;
  if (o.fulfillment_status === "delivered") return { word: "delivered", tone: "done", tracking };
  if (o.fulfillment_status === "shipped") return { word: tracking ? "on its way" : "shipped, no tracking", tone: "wait", tracking };
  if (o.fulfillment_status === "packaged") return { word: "after the label", tone: "idle", tracking };
  if (stageIndex(o.fulfillment_status) < 0) return { word: tracking ? "on file" : "none", tone: "idle", tracking };
  return { word: "after packing", tone: "idle", tracking };
}

/** How long it has been where it is, or when it finished. */
export function ageLine(o: StoryOrder, now: Date): string {
  if (finished(o)) {
    return new Date(o.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  }
  return ageText(hoursBetween(o.updated_at, now));
}

/** The address as lines, for the page, the copy button and the label file. */
export function addressLines(a: ShippingAddress | null): string[] {
  if (!a) return [];
  return [
    a.name,
    a.address.line1,
    a.address.line2 ?? "",
    `${a.address.city}, ${a.address.state} ${a.address.postal_code}`.trim(),
    a.address.country,
  ].filter((l) => l && l.trim() && l.trim() !== ",");
}

/**
 * The addresses as a file a label tool reads. Generic column names on
 * purpose: Pirate Ship and Shippo both map columns on import, and one tool's
 * exact spelling would make the file useless in the other. Weight is empty
 * because nothing here records it.
 */
export function labelCsv(
  orders: readonly { id: string; email: string | null; address: ShippingAddress | null }[],
): string {
  return toCsv(
    ["Order", "Name", "Street1", "Street2", "City", "State", "Zip", "Country", "Email", "Weight (lb)"],
    orders.map((o) => [
      orderConfirmationNumber(o.id),
      o.address?.name ?? "",
      o.address?.address.line1 ?? "",
      o.address?.address.line2 ?? "",
      o.address?.address.city ?? "",
      o.address?.address.state ?? "",
      o.address?.address.postal_code ?? "",
      o.address?.address.country ?? "",
      o.email ?? "",
      "",
    ]),
  );
}

/** Find an order by the number a reader typed ("eik-0c9f4e21" counts). */
export function findByNumber<T extends { id: string }>(orders: readonly T[], number: string): T | null {
  const want = number.trim().toUpperCase();
  return orders.find((o) => orderConfirmationNumber(o.id) === want) ?? null;
}
