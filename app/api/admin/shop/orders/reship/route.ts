import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { logActivity } from "@/lib/admin/activityLog";
import { reshipNote, reshipRefusal } from "@/lib/admin/consoleActions";
import { guardedOrderUpdate, readOrderState, staleOrderMessage, type OrderWriteDb } from "@/lib/shop/orderWrite";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Make it right by sending it again (the support console's reship, the
 * owner's r3-16 picks, 2026-10-30): "The order starts again as a reship, at
 * no charge: the Temu link for you now, the label when it arrives."
 *
 * NO MONEY MOVES AND NO NEW ORDER IS MADE. The same order goes back to Needs
 * sourcing, so the reader's own order page reads Preparing Your Order again
 * and the next move is the Temu link. Both trackings are cleared for the new
 * parcels, and the first parcel's tracking is kept in the order's history
 * (shop_order_events) with the reason and who did it.
 *
 * Only an order that has left us can be reshipped (lib/admin/consoleActions):
 * one still with us is moved back with its own Back button. The write is a
 * compare and swap on both status columns, so a refund or a move that lands
 * while the console is open is never overwritten.
 *
 * A piece is never taken from what is kept for quality control: the console
 * says so beside the button, and the order goes to Temu.
 */

const schema = z.object({
  orderId: z.string().uuid(),
  reason: z.string().trim().min(1).max(300),
  confirm: z.literal(true),
});

export async function POST(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Say why it is going again, then confirm." }, { status: 400 });
  }
  const { orderId, reason } = parsed.data;

  const admin = createAdminClient();
  const db = admin as unknown as OrderWriteDb;
  const read = await readOrderState(db, orderId);
  if (!read.ok) return NextResponse.json({ error: read.message }, { status: 500 });
  if (!read.state) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  const refusal = reshipRefusal(read.state);
  if (refusal) return NextResponse.json({ error: refusal.error }, { status: refusal.status });

  const { data: before } = await admin
    .from("shop_orders")
    .select("outbound_tracking")
    .eq("id", orderId)
    .maybeSingle();
  const firstTracking = (before?.outbound_tracking as string | null | undefined) ?? null;

  const result = await guardedOrderUpdate(
    db,
    orderId,
    { payment_status: read.state.payment_status, fulfillment_status: read.state.fulfillment_status },
    {
      fulfillment_status: "supplier_order_needed",
      outbound_tracking: null,
      inbound_tracking: null,
      updated_at: new Date().toISOString(),
    },
  );
  if (!result.ok && result.reason === "error") {
    return NextResponse.json({ error: result.message }, { status: 500 });
  }
  if (!result.ok) {
    return NextResponse.json({ error: staleOrderMessage(result.found), found: result.found }, { status: 409 });
  }

  const note = reshipNote(reason, firstTracking);
  // The history row, best effort like every move (app/api/admin/shop/orders):
  // the order has already moved, and losing the row is smaller than a 500.
  const { error: eventError } = await admin.from("shop_order_events").insert({
    order_id: orderId,
    from_status: read.state.fulfillment_status,
    to_status: "supplier_order_needed",
    note,
    actor_email: adminUser.email ?? null,
  });
  if (eventError) console.warn(`[shop] could not record reship ${orderId}: ${eventError.message}`);

  void logActivity({
    actorEmail: adminUser.email ?? null,
    action: "order.reship",
    entityType: "shop_order",
    entityId: orderId,
    detail: { from: read.state.fulfillment_status, reason, firstTracking },
  });

  return NextResponse.json({ ok: true, order: result.row });
}
