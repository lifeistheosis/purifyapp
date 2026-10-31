import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { logActivity } from "@/lib/admin/activityLog";
import { consoleRefundRefusal } from "@/lib/admin/consoleActions";
import { sendOrderRefundedEmail } from "@/lib/shop/orderEmails";
import { approveRefundRequest } from "@/lib/shop/refundExecution";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A refund started from the support console or an order's page (the owner's
 * note 28 and his r3-16 picks, 2026-10-30).
 *
 * NO NEW MONEY PATH. The console files a refund request on the order, then
 * hands it to approveRefundRequest() in lib/shop/refundExecution.ts: the same
 * claim, spend and settle the Marketplace refunds use. The request is claimed
 * before Stripe is called, the refund carries an idempotency key derived from
 * the request, and the one-live-request-per-order index refuses a second
 * request while one is open, so a double press cannot pay twice. A Stripe
 * hiccup parks the request at approved, which Marketplace, Refunds settles.
 *
 * NOTHING REFUNDS BY ITSELF. The page asks for the button to be held, and
 * this route wants `confirm: true` as a literal, so a request that does not
 * say it was confirmed is refused before anything is read. Every attempt is
 * recorded as the admin's who made it (logActivity, refund.console), whatever
 * the outcome.
 *
 * A plan bought in a store is not here: Apple and Google refund those, and
 * the console says so (lib/admin/support.ts storeRefundRule).
 */

const schema = z.object({
  orderId: z.string().uuid(),
  /** Absent for the whole order. */
  amountCents: z.number().int().positive().optional(),
  note: z.string().trim().max(500).optional(),
  /** The request it was started from, for the record. */
  ticketId: z.string().uuid().optional(),
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
    return NextResponse.json({ error: "Invalid refund. Hold the button to confirm it." }, { status: 400 });
  }
  const { orderId, amountCents, note, ticketId } = parsed.data;

  const admin = createAdminClient();
  const { data: order, error: orderError } = await admin
    .from("shop_orders")
    .select("id, email, total_cents, currency, payment_status, stripe_payment_intent")
    .eq("id", orderId)
    .maybeSingle();
  // A read that failed is not an order that is absent.
  if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  const { data: open, error: openError } = await admin
    .from("shop_refund_requests")
    .select("status")
    .eq("order_id", orderId)
    .in("status", ["requested", "approved"])
    .limit(1);
  if (openError) return NextResponse.json({ error: openError.message }, { status: 500 });

  const refusal = consoleRefundRefusal(
    order as { payment_status: string; total_cents: number; currency: string | null },
    (open?.[0]?.status as string | undefined) ?? null,
    amountCents,
  );
  if (refusal) return NextResponse.json({ error: refusal.error }, { status: refusal.status });

  const actor = adminUser.email ?? null;
  const { data: filed, error: fileError } = await admin
    .from("shop_refund_requests")
    .insert({
      order_id: orderId,
      requested_by: null,
      reason: "other",
      details: `Started from the support console by ${actor ?? "an admin"}${note ? `: ${note}` : "."}`,
      amount_cents: amountCents ?? null,
    })
    .select("id")
    .single();
  if (fileError || !filed) {
    // 23505: the one-live-request index. Somebody filed one a moment ago.
    if (fileError?.code === "23505") {
      return NextResponse.json(
        { error: "A refund for this order was opened a moment ago. Reload to see where it stands." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: fileError?.message ?? "Couldn't file the refund." }, { status: 500 });
  }

  const status = await approveRefundRequest(
    filed.id as string,
    {
      id: order.id as string,
      total_cents: order.total_cents as number,
      stripe_payment_intent: (order.stripe_payment_intent as string | null) ?? null,
    },
    note ?? "Refunded from the support console.",
  );
  const refunded = Math.min(amountCents ?? (order.total_cents as number), order.total_cents as number);

  // Logged whatever happened: an attempt that did not reach Stripe is worth as
  // much in the record as one that did, because it will be pressed again.
  void logActivity({
    actorEmail: actor,
    action: "refund.console",
    entityType: "refund_request",
    entityId: filed.id as string,
    detail: { orderId, amountCents: refunded, totalCents: order.total_cents, outcome: status, ticketId: ticketId ?? null },
  });

  if (!status) return NextResponse.json({ error: "Couldn't save the refund." }, { status: 500 });
  if (status === "already-decided") {
    return NextResponse.json(
      { error: "This refund was decided by someone else a moment ago. Reload to see where it stands." },
      { status: 409 },
    );
  }
  if (status === "approved") {
    return NextResponse.json(
      {
        error:
          "Stripe did not take the refund. It is approved and waiting: check Stripe, then settle it under Catalogue, Marketplace, Refunds.",
        status,
      },
      { status: 502 },
    );
  }

  await sendOrderRefundedEmail({
    id: order.id as string,
    email: (order.email as string | null) ?? null,
    amountCents: refunded,
    currency: (order.currency as string | null) ?? "usd",
    viaCard: true,
  }).catch((e) => console.warn("[admin/refunds/console] refund email failed", (e as Error).message));

  return NextResponse.json({ ok: true, status, amountCents: refunded, requestId: filed.id });
}
