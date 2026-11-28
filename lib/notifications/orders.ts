// A reader's orders in the bell (2.0). His word, 2026-11-28: "make the
// notification button on the app a universal notification system
// (updates/announcements from purify, updates about their orders, updates to
// pray, updates from community etc)".
//
// The bell reads the reader's own orders as Your orders does (RLS
// self-select, lib/shop/buyerReads.ts), in a lean shape: the two states the
// reader's word is made from and the pieces' names, no pictures. It asks the
// server at most once every six hours, keeping the last answer on the device
// between launches, and again when the sheet opens. Nothing runs on a schedule
// (lib/community/inbox.ts keeps the same rule), and the egress stays small
// (Supabase's free quota, docs/NOW.md).
//
// An order is new to the bell when its word has changed since the reader last
// opened the sheet. The first time a device reads a reader's orders, every
// order is taken as seen, so a delivery from months ago never lights it.

import type { SupabaseClient } from "@supabase/supabase-js";
import { useSyncExternalStore } from "react";

import { isHiddenOrder } from "@/lib/shop/orders";
import { orderTitle, STATUS_KEY, type StoryRow } from "@/lib/shop/orderStory";
import { buyerOrderStatus, type BuyerOrderStatus } from "@/lib/shop/status";

/** What the bell reads of each order: no pictures, no addresses, no money. */
export const ORDER_NOTICE_COLS = "id, payment_status, fulfillment_status, created_at, paid_at, updated_at, items:shop_order_items(title)";

export type OrderNoticeRow = StoryRow & { id: string; items?: readonly { title: string }[] | null };

export type OrderNotice = {
  id: string;
  /** The reader's own word for where it is (lib/shop/status.ts). */
  status: BuyerOrderStatus;
  statusKey: string;
  /** The first piece's name, and how many more. */
  first: string;
  more: number;
  /** When it last changed. */
  at: string;
  href: string;
};

const DAY = 86_400_000;
/** How long an order stays in the bell after it last changed. */
export const ORDER_NOTICE_DAYS = 30;
/** The most the bell shows; Your orders has them all. */
export const ORDER_NOTICES_SHOWN = 5;
/** How often the bell asks the server, at most. */
export const ORDER_CHECK_EVERY = 6 * 60 * 60 * 1000;

/**
 * The orders the bell shows, newest change first: paid ones (a checkout left
 * unpaid is not news, and a cancelled one is hidden as Your orders hides it),
 * changed in the last thirty days, five at most.
 */
export function orderNotices(rows: readonly OrderNoticeRow[], now: number): OrderNotice[] {
  return rows
    .filter((o) => o.payment_status !== "pending" && !isHiddenOrder(o, now))
    .map((o) => {
      const status = buyerOrderStatus(o);
      const { first, more } = orderTitle(o.items ?? []);
      return { id: o.id, status, statusKey: STATUS_KEY[status], first, more, at: o.updated_at ?? o.paid_at ?? o.created_at, href: `/shop/orders/detail?id=${o.id}` };
    })
    // A state the bell has no word for is left out, never drawn blank.
    .filter((n) => Boolean(n.status && n.statusKey) && now - Date.parse(n.at) < ORDER_NOTICE_DAYS * DAY)
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, ORDER_NOTICES_SHOWN);
}

/** Each order's word as the reader last saw it in the sheet, by order id. */
export type OrdersSeen = Record<string, string>;

/** The orders whose word is new since the sheet was last opened. Nothing, before the device has seen any. */
export function freshOrders(notices: readonly OrderNotice[], seen: OrdersSeen | null): Set<string> {
  if (!seen) return new Set();
  return new Set(notices.filter((n) => seen[n.id] !== n.status).map((n) => n.id));
}

// ── On the device, one reader's at a time ──

const seenKey = (userId: string) => `purify:orders-seen:${userId}`;
const cacheKey = (userId: string) => `purify:orders-bell:${userId}`;

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // A full or blocked store: the bell simply asks again next time.
  }
}

export function readOrdersSeen(userId: string): OrdersSeen | null {
  const v = readJson<OrdersSeen>(seenKey(userId));
  return v && typeof v === "object" && !Array.isArray(v) ? v : null;
}

/** The sheet was opened: each order shown is seen as it stands. */
export function markOrdersSeen(userId: string, notices: readonly OrderNotice[]): void {
  const seen = readOrdersSeen(userId) ?? {};
  for (const n of notices) seen[n.id] = n.status;
  writeJson(seenKey(userId), seen);
}

// ── The store the bell and its sheet read ──

export type OrdersBell = { userId: string | null; notices: OrderNotice[] };
const EMPTY: OrdersBell = { userId: null, notices: [] };
let state: OrdersBell = EMPTY;
const listeners = new Set<() => void>();
let inFlight: Promise<void> | null = null;

function set(next: OrdersBell): void {
  state = next;
  for (const l of listeners) l();
}
function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getOrdersBell(): OrdersBell {
  return state;
}

export function useOrdersBell(): OrdersBell {
  return useSyncExternalStore(subscribe, getOrdersBell, () => EMPTY);
}

/** The reader's orders, lean, from the server under RLS. */
export async function readOrderNoticeRows(supabase: SupabaseClient): Promise<OrderNoticeRow[]> {
  const { data, error } = await supabase.from("shop_orders").select(ORDER_NOTICE_COLS).order("created_at", { ascending: false }).limit(20);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as OrderNoticeRow[];
}

/**
 * Fill the store for this reader: from the device's last answer while it is
 * under six hours old, else from the server. `force` asks the server now (the
 * sheet opening). A reader the device has never read is seen as they stand.
 */
export async function refreshOrdersBell(
  userId: string,
  read: () => Promise<OrderNoticeRow[]>,
  opts: { force?: boolean; now?: number } = {},
): Promise<void> {
  const now = opts.now ?? Date.now();
  const cached = readJson<{ at: number; notices: OrderNotice[] }>(cacheKey(userId));
  if (cached && Array.isArray(cached.notices)) set({ userId, notices: cached.notices });
  if (!opts.force && cached && now - cached.at < ORDER_CHECK_EVERY) return;
  if (inFlight) return inFlight;
  inFlight = read()
    .then((rows) => {
      const notices = orderNotices(rows, now);
      if (readOrdersSeen(userId) === null) markOrdersSeen(userId, notices);
      writeJson(cacheKey(userId), { at: now, notices });
      set({ userId, notices });
    })
    .catch(() => {
      // No signal, or no answer: the last one stands.
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}
