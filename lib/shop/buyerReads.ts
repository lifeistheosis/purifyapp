import type { SupabaseClient } from "@supabase/supabase-js";

import type { InboxConversation, InboxLast, InboxTicket } from "./inbox";
import type { ShopFulfillmentStatus } from "./types";

/**
 * The buyer's own rows for the shop's pages (r3-19: Orders B, Messages A),
 * read on the device with the reader's own client, so each page works in
 * the apps' static export with no server read (AGENTS.md, "the one gotcha").
 * Row level security proves whose they are: shop_orders_self_select and its
 * items, shop_conversations_buyer_select, shop_messages_participant_select,
 * support_tickets_owner_select and its messages. A piece's product and
 * photos are the public catalog's (published pieces only), so a piece taken
 * down since shows its title without a photo.
 *
 * Every column read here was the reader's to read before 1.8; nothing new is
 * opened to them.
 */

export type BuyerOrderMedia = { media_url: string; alt_text: string; sort_order: number; is_primary: boolean };

export type BuyerOrderItem = {
  title: string;
  unit_price_cents: number;
  quantity: number;
  /** Null when the piece was taken down since it was bought. */
  product: {
    slug: string;
    dispatch_min_days: number | null;
    dispatch_max_days: number | null;
    media: BuyerOrderMedia[] | null;
  } | null;
};

export type BuyerAddress = {
  name?: string | null;
  address?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country?: string | null;
  } | null;
} | null;

export type BuyerOrder = {
  id: string;
  items_total_cents: number;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
  currency: string;
  payment_status: "pending" | "paid" | "refunded" | "cancelled";
  fulfillment_status: ShopFulfillmentStatus;
  outbound_tracking: string | null;
  shipping_address: BuyerAddress;
  created_at: string;
  paid_at: string | null;
  updated_at: string | null;
  items: BuyerOrderItem[];
  store: { public_name: string; slug: string | null } | null;
};

export const BUYER_ORDER_COLS =
  "id, items_total_cents, shipping_cents, tax_cents, total_cents, currency, payment_status, fulfillment_status, outbound_tracking, shipping_address, created_at, paid_at, updated_at, " +
  "items:shop_order_items(title, unit_price_cents, quantity, product:shop_products(slug, dispatch_min_days, dispatch_max_days, media:shop_product_media(media_url, alt_text, sort_order, is_primary))), " +
  "store:shop_stores(public_name, slug)";

/** Every order of the reader's, newest first. */
export async function readOrders(supabase: SupabaseClient): Promise<BuyerOrder[]> {
  const { data, error } = await supabase
    .from("shop_orders")
    .select(BUYER_ORDER_COLS)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as BuyerOrder[];
}

/** One order of the reader's, or null when it is not theirs or not there. */
export async function readOrder(supabase: SupabaseClient, id: string): Promise<BuyerOrder | null> {
  if (!id) return null;
  const { data, error } = await supabase.from("shop_orders").select(BUYER_ORDER_COLS).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as BuyerOrder | null) ?? null;
}

/** The reader's orders that threads are about, for the pieces beside them. */
export async function readOrdersById(supabase: SupabaseClient, ids: readonly string[]): Promise<Map<string, BuyerOrder>> {
  const want = [...new Set(ids.filter(Boolean))].slice(0, 60);
  if (!want.length) return new Map();
  const { data } = await supabase.from("shop_orders").select(BUYER_ORDER_COLS).in("id", want);
  return new Map(((data ?? []) as unknown as BuyerOrder[]).map((o) => [o.id, o]));
}

/** How many threads lend their last line to the inbox (one read, grouped on the device). */
const PREVIEWED = 50;

export type InboxData = {
  conversations: InboxConversation[];
  lastMessages: InboxLast[];
  tickets: InboxTicket[];
  orders: Map<string, BuyerOrder>;
};

/**
 * The inbox: the reader's conversations with stores, the last message of
 * each in one read of shop_messages, their support tickets with their
 * messages, and the orders those are about. A ticket read that fails (a
 * network blip on that one query) leaves the stores' threads standing.
 */
export async function readInbox(supabase: SupabaseClient, userId: string): Promise<InboxData> {
  const [convRes, ticketRes] = await Promise.all([
    supabase
      .from("shop_conversations")
      .select("id, subject, status, order_id, last_message_at, buyer_last_read_at, store:shop_stores(public_name, slug)")
      .eq("buyer_user_id", userId)
      .order("last_message_at", { ascending: false })
      .limit(200),
    supabase
      .from("support_tickets")
      .select("id, subject, status, order_id, created_at, updated_at, messages:support_ticket_messages(author, body, created_at)")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(100),
  ]);
  if (convRes.error) throw new Error(convRes.error.message);
  const conversations = (convRes.data ?? []) as unknown as InboxConversation[];
  const tickets = ticketRes.error ? [] : ((ticketRes.data ?? []) as unknown as InboxTicket[]);

  const ids = conversations.slice(0, PREVIEWED).map((c) => c.id);
  const [msgRes, orders] = await Promise.all([
    ids.length
      ? supabase
          .from("shop_messages")
          .select("conversation_id, sender, body, created_at")
          .in("conversation_id", ids)
          .order("created_at", { ascending: false })
          .limit(400)
      : Promise.resolve({ data: [] as InboxLast[] }),
    readOrdersById(supabase, [
      ...conversations.map((c) => c.order_id ?? ""),
      ...tickets.map((t) => t.order_id ?? ""),
    ]),
  ]);
  return {
    conversations,
    lastMessages: ((msgRes as { data: unknown }).data ?? []) as InboxLast[],
    tickets,
    orders,
  };
}

export type TicketThreadData = {
  ticket: {
    id: string;
    subject: string;
    status: "open" | "pending" | "resolved" | "closed";
    order_id: string | null;
    created_at: string;
  };
  messages: { id: string; author: "customer" | "staff"; body: string; created_at: string }[];
  order: BuyerOrder | null;
};

/** One support ticket of the reader's, its messages oldest first, and the order it is about. */
export async function readTicket(supabase: SupabaseClient, id: string): Promise<TicketThreadData | null> {
  if (!id) return null;
  const { data, error } = await supabase
    .from("support_tickets")
    .select("id, subject, status, order_id, created_at, messages:support_ticket_messages(id, author, body, created_at)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as unknown as TicketThreadData["ticket"] & { messages: TicketThreadData["messages"] | null };
  const order = row.order_id ? await readOrder(supabase, row.order_id).catch(() => null) : null;
  return {
    ticket: { id: row.id, subject: row.subject, status: row.status, order_id: row.order_id, created_at: row.created_at },
    messages: [...(row.messages ?? [])].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at)),
    order,
  };
}
