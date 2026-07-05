import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import {
  approveRefundRequest,
  declineRefundRequest,
  markRefundProcessed,
} from "@/lib/shop/refundExecution";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Owner dashboard: the whole refund pipeline across every store. The
 * owner can decide pending requests (same execution path as the seller
 * console) and, crucially, settle parked "approved" requests once the
 * money has moved outside Stripe — the one action sellers don't get.
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
  if (!status) {
    return NextResponse.json({ error: "Couldn't save the decision." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, status });
}

const processSchema = z.object({ refundId: z.string().uuid() });

/** Settle a parked 'approved' request: the money moved manually. */
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
  const { data: request } = await admin
    .from("shop_refund_requests")
    .select("id, status, order_id")
    .eq("id", parsed.data.refundId)
    .maybeSingle();
  if (!request) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }
  if (request.status !== "approved") {
    return NextResponse.json(
      { error: "Only approved-but-unsettled requests can be marked processed." },
      { status: 409 },
    );
  }

  const { data: order } = await admin
    .from("shop_orders")
    .select("id, total_cents, stripe_payment_intent")
    .eq("id", request.order_id)
    .single();
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  const ok = await markRefundProcessed(request.id, order);
  if (!ok) return NextResponse.json({ error: "Couldn't mark it processed." }, { status: 500 });
  return NextResponse.json({ ok: true, status: "processed" });
}
