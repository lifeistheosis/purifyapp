import { NextResponse } from "next/server";
import { z } from "zod";

import { logActivity } from "@/lib/admin/activityLog";
import { getAdminUser } from "@/lib/admin/access";
import { orderConfirmationNumber } from "@/lib/shop/orderNumber";
import {
  approveRefundRequest,
  declineRefundRequest,
  markRefundProcessed,
  releaseApprovedRefund,
} from "@/lib/shop/refundExecution";
import { sendRefundReleasedEmail } from "@/lib/shop/sellerEmails";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Owner dashboard: the whole refund pipeline across every store.
 *
 * This is the ONLY surface that can move refund money. The seller console
 * decides a request and parks it at "approved"; releasing it debits Purify's
 * Stripe balance, so it needs a second person. See the co-sign note at the top
 * of lib/shop/refundExecution.ts for why, and for when it can be undone.
 *
 * PATCH does two different jobs and says which:
 *   action "release"        - send the refund through Stripe now.
 *   action "mark-processed" - the money moved elsewhere (dashboard refund,
 *                             cheque, store credit); just stamp the row.
 *
 * The default is "mark-processed", which is what the key meant before the
 * action existed. A missing action must never be read as "spend".
 */

export async function GET() {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("shop_refund_requests")
    .select(
      "*, order:shop_orders(id, email, total_cents, currency, payment_status, stripe_payment_intent, created_at, store:shop_stores(public_name), items:shop_order_items(title, quantity))",
    )
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    { refunds: data ?? [] },
    { headers: { "Cache-Control": "no-store" } },
  );
}

const decisionSchema = z.object({
  refundId: z.string().uuid(),
  decision: z.enum(["approved", "declined"]),
  note: z.string().max(2000).optional().nullable(),
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
  const parsed = decisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: request } = await admin
    .from("shop_refund_requests")
    .select("id, status, order_id")
    .eq("id", parsed.data.refundId)
    .maybeSingle();
  if (!request) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }
  if (request.status !== "requested") {
    return NextResponse.json(
      { error: "This request has already been decided." },
      { status: 409 },
    );
  }

  if (parsed.data.decision === "declined") {
    const ok = await declineRefundRequest(request.id, parsed.data.note ?? null);
    if (!ok) return NextResponse.json({ error: "Couldn't save the decision." }, { status: 500 });
    return NextResponse.json({ ok: true, status: "declined" });
  }

  const { data: order } = await admin
    .from("shop_orders")
    .select("id, total_cents, stripe_payment_intent")
    .eq("id", request.order_id)
    .single();
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  const status = await approveRefundRequest(request.id, order, parsed.data.note ?? null);
  // Logged even on the failure paths below: an attempted refund that did not
  // happen is worth as much in the record as one that did.
  void logActivity({
    actorEmail: adminUser.email ?? null,
    action: "refund.approve",
    entityType: "refund_request",
    entityId: request.id,
    detail: { orderId: order.id, totalCents: order.total_cents, outcome: status },
  });
  if (!status) {
    return NextResponse.json({ error: "Couldn't save the decision." }, { status: 500 });
  }
  // A lost race is not a success. approveRefundRequest now claims the request
  // BEFORE it spends, so the loser never reached Stripe and no money moved;
  // reporting ok:true here would tell the decider their refund went out.
  if (status === "already-decided") {
    return NextResponse.json(
      { error: "This request was already decided by someone else. Reload to see where it stands." },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true, status });
}

const processSchema = z.object({
  refundId: z.string().uuid(),
  // Defaulted, not required, so an older client that sends only a refundId
  // keeps its old meaning instead of silently gaining the power to spend.
  action: z.enum(["release", "mark-processed"]).default("mark-processed"),
});

/** Release a parked 'approved' request, or record that it settled elsewhere. */
export async function PATCH(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = processSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const admin = createAdminClient();
  // amount_cents is read because the claim clamped it: a partial request stays
  // partial, and the release email must name what actually went back.
  const { data: request } = await admin
    .from("shop_refund_requests")
    .select("id, status, order_id, amount_cents")
    .eq("id", parsed.data.refundId)
    .maybeSingle();
  if (!request) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }
  if (request.status !== "approved") {
    return NextResponse.json(
      { error: "Only approved-but-unsettled requests can be settled." },
      { status: 409 },
    );
  }

  // currency and the store come along for the release email; the execution
  // path itself needs only the first three columns.
  const { data: order } = await admin
    .from("shop_orders")
    .select(
      "id, total_cents, currency, stripe_payment_intent, store:shop_stores(public_name, support_email)",
    )
    .eq("id", request.order_id)
    .single();
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  if (parsed.data.action === "release") {
    const status = await releaseApprovedRefund(request.id, order);
    // Logged whatever happened. A release that did NOT go through is worth as
    // much in the record as one that did, because the operator will press it
    // again and needs to know the first press reached Stripe or did not.
    void logActivity({
      actorEmail: adminUser.email ?? null,
      action: "refund.release",
      entityType: "refund_request",
      entityId: request.id,
      detail: { orderId: order.id, totalCents: order.total_cents, outcome: status },
    });
    if (!status) {
      return NextResponse.json({ error: "Couldn't release the refund." }, { status: 500 });
    }
    if (status === "approved") {
      // Still parked. Never report this as a payout.
      return NextResponse.json(
        {
          error:
            "Stripe didn't take the refund. The request is still approved and unsettled; check the Stripe dashboard before trying again.",
        },
        { status: 502 },
      );
    }
    // The seller console tells them this email is coming at the moment they
    // approve, so it has to arrive: they made the decision and then had to
    // trust somebody else to carry it out.
    const store = Array.isArray(order.store) ? order.store[0] : order.store;
    await sendRefundReleasedEmail({
      email: store?.support_email ?? null,
      storeName: store?.public_name ?? "your store",
      amountCents:
        typeof request.amount_cents === "number" && request.amount_cents > 0
          ? request.amount_cents
          : order.total_cents,
      currency: order.currency ?? "usd",
      orderNumber: orderConfirmationNumber(order.id),
    });
    return NextResponse.json({ ok: true, status });
  }

  const ok = await markRefundProcessed(request.id, order);
  // An unattributed claim that money moved OUTSIDE Stripe, with no external
  // object to corroborate it, is the least verifiable write in the shop.
  void logActivity({
    actorEmail: adminUser.email ?? null,
    action: "refund.mark-processed",
    entityType: "refund_request",
    entityId: request.id,
    detail: { orderId: order.id, totalCents: order.total_cents, applied: ok },
  });
  if (!ok) return NextResponse.json({ error: "Couldn't mark it processed." }, { status: 500 });
  return NextResponse.json({ ok: true, status: "processed" });
}
