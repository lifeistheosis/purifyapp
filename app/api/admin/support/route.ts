import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTicketReplyEmail } from "@/lib/support/ticketEmails";
import {
  addStaffReply,
  listTickets,
  setMessageReaction,
  setTicketStatus,
  startStaffThread,
} from "@/lib/support/tickets";
import { trackingCard, type TrackingCard } from "@/lib/support/trackingCard";
import type { ShopFulfillmentStatus } from "@/lib/shop/types";

/** The order's card, read from the order and its moves. Null when it cannot be read. */
async function cardFor(orderId: string): Promise<TrackingCard | null> {
  const admin = createAdminClient();
  const [{ data: order }, { data: events }] = await Promise.all([
    admin
      .from("shop_orders")
      .select("id, payment_status, fulfillment_status, outbound_tracking, paid_at, created_at")
      .eq("id", orderId)
      .maybeSingle(),
    admin.from("shop_order_events").select("to_status, at").eq("order_id", orderId).order("at", { ascending: true }),
  ]);
  if (!order) return null;
  return trackingCard(
    order as {
      id: string;
      payment_status: "pending" | "paid" | "refunded" | "cancelled";
      fulfillment_status: ShopFulfillmentStatus;
      outbound_tracking: string | null;
      paid_at: string | null;
      created_at: string;
    },
    (events ?? []) as { to_status: string; at: string }[],
  );
}

/** Admin support console: list every ticket, reply (emails the customer), or
 *  change status. Gated on the ADMIN_EMAILS allowlist; 404 to everyone else. */
export async function GET(req: Request) {
  if (!(await getAdminUser())) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  // ?summary=1: one HEAD count, for the attention strip, which polls this
  // every ten minutes and needs one number. The full list below carries up
  // to 200 tickets with every message body, which is the right answer for
  // the console and the wrong thing to ship six times an hour for a count.
  // A failed count is a 500, never { open: 0 }: an unread queue is not an
  // empty one.
  if (new URL(req.url).searchParams.get("summary") === "1") {
    const { count, error } = await createAdminClient()
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("status", "open");
    if (error) {
      return NextResponse.json({ error: "Could not count open tickets." }, { status: 500 });
    }
    return NextResponse.json({ open: count ?? 0 }, { headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json({ tickets: await listTickets() });
}

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("reply"),
    ticketId: z.string().uuid(),
    body: z.string().min(1).max(5000),
    /**
     * The order whose card goes in the email (the console's Send tracking).
     * Read here from the order itself, never taken from the page.
     */
    cardOrderId: z.string().uuid().optional(),
  }),
  z.object({
    /**
     * A conversation he starts, from an order's page (Reply, when the reader
     * has not written). The address is the ORDER's, read here: this can only
     * write to somebody who bought from us, never to an address typed in.
     */
    action: z.literal("start"),
    orderId: z.string().uuid(),
    subject: z.string().trim().min(1).max(200),
    body: z.string().min(1).max(5000),
  }),
  z.object({
    action: z.literal("status"),
    ticketId: z.string().uuid(),
    status: z.enum(["open", "pending", "resolved", "closed"]),
  }),
  z.object({
    action: z.literal("react"),
    messageId: z.string().uuid(),
    // A short emoji, or empty string to clear.
    reaction: z.string().max(8),
  }),
]);

export async function POST(req: Request) {
  if (!(await getAdminUser())) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = actionSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (parsed.data.action === "reply") {
    const ticket = await addStaffReply(parsed.data.ticketId, parsed.data.body);
    if (!ticket) {
      return NextResponse.json({ error: "Reply failed." }, { status: 500 });
    }
    const card = parsed.data.cardOrderId ? await cardFor(parsed.data.cardOrderId) : null;
    await sendTicketReplyEmail(ticket, parsed.data.body, card).catch((e) =>
      console.warn("[support] reply email failed", (e as Error).message),
    );
    return NextResponse.json({ ok: true, card: Boolean(card) });
  }

  if (parsed.data.action === "start") {
    const admin = createAdminClient();
    const { data: order, error } = await admin
      .from("shop_orders")
      .select("id, email, user_id, shipping_address")
      .eq("id", parsed.data.orderId)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!order?.email) {
      return NextResponse.json({ error: "This order has no email to write to." }, { status: 409 });
    }
    const ticket = await startStaffThread({
      email: String(order.email),
      name: (order.shipping_address as { name?: string } | null)?.name ?? null,
      userId: (order.user_id as string | null) ?? null,
      orderId: String(order.id),
      subject: parsed.data.subject,
      body: parsed.data.body,
    });
    if (!ticket) return NextResponse.json({ error: "Could not start the conversation." }, { status: 500 });
    await sendTicketReplyEmail(ticket, parsed.data.body).catch((e) =>
      console.warn("[support] start email failed", (e as Error).message),
    );
    return NextResponse.json({ ok: true, ticketId: ticket.id });
  }

  if (parsed.data.action === "react") {
    const ok = await setMessageReaction(
      parsed.data.messageId,
      parsed.data.reaction || null,
    );
    return NextResponse.json({ ok });
  }

  const ok = await setTicketStatus(parsed.data.ticketId, parsed.data.status);
  return NextResponse.json({ ok });
}
