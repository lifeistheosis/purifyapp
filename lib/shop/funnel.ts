import type { ShopFulfillmentStatus } from "./types";

/**
 * The road from "somebody paid" to "it is on their doorstep", as a thing that
 * can be looked at.
 *
 * ── Why this exists ─────────────────────────────────────────────────────
 *
 * Every stage of EIKON's two-stage fulfillment was already in the database
 * (shop_orders.fulfillment_status has held these eight since 20260704), and
 * the only way to see them was a table of rows with a status word in the last
 * column. That answers "what is this order doing" and never answers the two
 * questions an owner actually has: where is the work piling up, and what is
 * late. An order that has waited nine days to be sourced looks exactly like
 * one paid this morning.
 *
 * So: the stages in order, what each one is waiting for, how long each should
 * take, and a fold from a list of orders into per-stage counts, money, and
 * age. Pure, no clock of its own, so the panel and any future digest say the
 * same thing.
 *
 * ── The targets are promises, not guesses ──────────────────────────────
 *
 * A stage is "late" when an order has sat in it longer than the stage's
 * target. The targets below are what EIKON can honestly hold to on a
 * supplier-sourced item, and they are deliberately generous at the two stages
 * a supplier controls. Change them here and the board, the counts and the
 * queue all move together.
 */

/** The stages an order passes through, in order. Terminal states are not here. */
export const FUNNEL_STAGES: ShopFulfillmentStatus[] = [
  "pending",
  "supplier_order_needed",
  "supplier_order_placed",
  "inbound_to_eikon",
  "received_for_inspection",
  "packaged",
  "shipped",
  "delivered",
];

export type StageMeta = {
  /** What the owner calls it. */
  label: string;
  /** A scan marker, the way the rest of the panel uses them. */
  emoji: string;
  /** What this stage is waiting for, in one line. */
  waitingOn: string;
  /** The move out of it, as a verb the button can wear. */
  action: string;
  /** Hours before an order sitting here is late. null: nothing is owed. */
  targetHours: number | null;
};

export const STAGE: Record<ShopFulfillmentStatus, StageMeta> = {
  pending: {
    label: "Paid, not started",
    emoji: "💳",
    waitingOn: "You, to decide how this one is fulfilled.",
    action: "Needs sourcing",
    targetHours: 12,
  },
  supplier_order_needed: {
    label: "Needs sourcing",
    emoji: "🧾",
    waitingOn: "You, to place the order with the supplier.",
    action: "Order placed",
    targetHours: 24,
  },
  supplier_order_placed: {
    label: "Ordered from supplier",
    emoji: "📮",
    waitingOn: "The supplier to ship it to us.",
    action: "On its way to us",
    targetHours: 7 * 24,
  },
  inbound_to_eikon: {
    label: "On its way to us",
    emoji: "🚚",
    waitingOn: "The carrier bringing it in.",
    action: "Arrived, inspect it",
    targetHours: 14 * 24,
  },
  received_for_inspection: {
    label: "Here, being checked",
    emoji: "🔍",
    waitingOn: "You, to open it and look at it.",
    action: "Packed",
    targetHours: 48,
  },
  packaged: {
    label: "Packed, ready to post",
    emoji: "📦",
    waitingOn: "You, to buy a label and hand it over.",
    action: "Shipped",
    targetHours: 24,
  },
  shipped: {
    label: "On its way to them",
    emoji: "✈️",
    waitingOn: "The carrier, and the buyer's doorstep.",
    action: "Delivered",
    targetHours: 14 * 24,
  },
  delivered: {
    label: "Delivered",
    emoji: "🏠",
    waitingOn: "Nothing. It is done.",
    action: "Done",
    targetHours: null,
  },
  cancelled: {
    label: "Cancelled",
    emoji: "🚫",
    waitingOn: "Nothing.",
    action: "Done",
    targetHours: null,
  },
  refunded: {
    label: "Refunded",
    emoji: "↩️",
    waitingOn: "Nothing.",
    action: "Done",
    targetHours: null,
  },
};

/** The stage after this one, or null at the end of the road. */
export function nextStage(status: ShopFulfillmentStatus): ShopFulfillmentStatus | null {
  const i = FUNNEL_STAGES.indexOf(status);
  return i >= 0 && i < FUNNEL_STAGES.length - 1 ? FUNNEL_STAGES[i + 1] : null;
}

export function prevStage(status: ShopFulfillmentStatus): ShopFulfillmentStatus | null {
  const i = FUNNEL_STAGES.indexOf(status);
  return i > 0 ? FUNNEL_STAGES[i - 1] : null;
}

export type FunnelOrder = {
  id: string;
  payment_status: "pending" | "paid" | "refunded" | "cancelled";
  fulfillment_status: ShopFulfillmentStatus;
  total_cents: number;
  created_at: string;
  /** When it last moved, which is when the current stage began. */
  updated_at: string;
  /** When the money landed. Null on an order that was never paid. */
  paid_at?: string | null;
};

export const HOUR = 3_600_000;

/** Hours between two moments, floored at 0. */
export function hoursBetween(fromIso: string | null | undefined, now: Date): number {
  if (!fromIso) return 0;
  const t = Date.parse(fromIso);
  return Number.isFinite(t) ? Math.max(0, (now.getTime() - t) / HOUR) : 0;
}

export type StageRow = {
  stage: ShopFulfillmentStatus;
  meta: StageMeta;
  /** Orders sitting here now. */
  count: number;
  /** What those orders are worth, in cents. */
  cents: number;
  /** The longest anything here has waited, in hours. */
  oldestHours: number;
  /** How many are past this stage's target. */
  late: number;
};

export type Funnel = {
  stages: StageRow[];
  /** Paid orders that have not reached "delivered" and were not cancelled. */
  openCount: number;
  openCents: number;
  /** Everything late, across every stage. */
  lateCount: number;
  /** Paid, shipped and delivered counts over the whole set handed in. */
  paid: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  refunded: number;
};

const LIVE_PAYMENT = new Set(["paid"]);

/**
 * Fold orders into the funnel.
 *
 * Only PAID orders count. An unpaid row is an unfinished checkout, not an
 * order (lib/shop/status.ts says the same thing to the buyer), and counting
 * them here is what made the old Overview read thirty-one abandoned carts as
 * money waiting to be shipped.
 */
export function buildFunnel(orders: readonly FunnelOrder[], now: Date): Funnel {
  const live = orders.filter((o) => LIVE_PAYMENT.has(o.payment_status));
  const rows: StageRow[] = FUNNEL_STAGES.map((stage) => ({
    stage,
    meta: STAGE[stage],
    count: 0,
    cents: 0,
    oldestHours: 0,
    late: 0,
  }));
  const byStage = new Map(rows.map((r) => [r.stage, r]));

  let shipped = 0;
  let delivered = 0;
  for (const o of live) {
    const row = byStage.get(o.fulfillment_status);
    if (!row) continue;
    row.count += 1;
    row.cents += o.total_cents;
    const waited = hoursBetween(o.updated_at, now);
    if (waited > row.oldestHours) row.oldestHours = waited;
    if (isLate(o, now)) row.late += 1;
    if (o.fulfillment_status === "shipped") shipped += 1;
    if (o.fulfillment_status === "delivered") delivered += 1;
  }

  const open = live.filter((o) => o.fulfillment_status !== "delivered");
  return {
    stages: rows,
    openCount: open.length,
    openCents: open.reduce((n, o) => n + o.total_cents, 0),
    lateCount: rows.reduce((n, r) => n + r.late, 0),
    paid: live.length,
    shipped,
    delivered,
    cancelled: orders.filter((o) => o.payment_status === "cancelled").length,
    refunded: orders.filter((o) => o.payment_status === "refunded").length,
  };
}

/** Has this order waited longer in its stage than the stage allows? */
export function isLate(order: FunnelOrder, now: Date): boolean {
  const target = STAGE[order.fulfillment_status]?.targetHours;
  if (target === null || target === undefined) return false;
  if (order.payment_status !== "paid") return false;
  return hoursBetween(order.updated_at, now) > target;
}

/**
 * What to do next, in the order it should be done: the latest thing first,
 * and within the same lateness, the oldest.
 */
export function workQueue(orders: readonly FunnelOrder[], now: Date): FunnelOrder[] {
  const over = (o: FunnelOrder) => {
    const target = STAGE[o.fulfillment_status]?.targetHours;
    if (target === null || target === undefined) return -1;
    return hoursBetween(o.updated_at, now) - target;
  };
  return orders
    .filter((o) => o.payment_status === "paid" && isLate(o, now))
    .sort((a, b) => over(b) - over(a));
}

/** "3h", "2 days", "3 weeks". Coarse: the order of magnitude is the point. */
export function ageText(hours: number): string {
  if (hours < 1) return "just now";
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = Math.round(hours / 24);
  if (days < 14) return `${days} day${days === 1 ? "" : "s"}`;
  return `${Math.round(days / 7)} weeks`;
}

export type StageEvent = {
  order_id: string;
  from_status: string | null;
  to_status: string;
  at: string;
};

/**
 * How long each stage actually takes, in hours, from the recorded moves.
 *
 * The median rather than the mean, because one order that sat over Christmas
 * should not tell the owner that inspection takes a fortnight. A stage with
 * fewer than two completed passes reports null: two numbers are not a
 * typical.
 */
export function medianStageHours(events: readonly StageEvent[]): Partial<Record<ShopFulfillmentStatus, number>> {
  const byOrder = new Map<string, StageEvent[]>();
  for (const e of events) {
    const list = byOrder.get(e.order_id) ?? [];
    list.push(e);
    byOrder.set(e.order_id, list);
  }
  const spans = new Map<string, number[]>();
  for (const list of byOrder.values()) {
    const sorted = [...list].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
    for (let i = 1; i < sorted.length; i++) {
      const from = sorted[i - 1];
      const hours = (Date.parse(sorted[i].at) - Date.parse(from.at)) / HOUR;
      if (!Number.isFinite(hours) || hours < 0) continue;
      const arr = spans.get(from.to_status) ?? [];
      arr.push(hours);
      spans.set(from.to_status, arr);
    }
  }
  const out: Partial<Record<ShopFulfillmentStatus, number>> = {};
  for (const [stage, arr] of spans) {
    if (arr.length < 2) continue;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    out[stage as ShopFulfillmentStatus] =
      sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return out;
}
