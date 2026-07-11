import { NextResponse } from "next/server";
import { z } from "zod";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { rateLimited } from "@/lib/security/ratelimit";
import { shopRefundRequestSchema } from "@/lib/security/schemas";
import { shopEnabled } from "@/lib/shop/flags";
import { canRequestRefund, refundIsActive } from "@/lib/shop/refunds";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";

import type { ShopRefundStatus } from "@/lib/shop/types";

/**
 * Buyer refund intake. A request is a claim on the order, not an
 * amount — the figure is settled at decision time from the order row.
 * Ownership is proven by reading the order with the buyer's own client
 * (RLS), then the insert runs with the service role so status can
 * never be forged.
 */
async function handlePOST(req: Request) {
  if (!shopEnabled()) {
    return NextResponse.json({ error: "Shop is not available." }, { status: 404 });
  }

  const supabase = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to request a refund." },
      { status: 401 },
    );
  }
  if (await rateLimited(`shop-refund:${user.id}`, 3600, 10)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = shopRefundRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const { data: order } = await supabase
    .from("shop_orders")
    .select("id, user_id, payment_status")
    .eq("id", parsed.data.orderId)
    .maybeSingle();
  if (!order || order.user_id !== user.id) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from("shop_refund_requests")
    .select("status")
    .eq("order_id", order.id)
    .order("created_at", { ascending: false })
    .limit(1);
  const active = (existing?.[0]?.status ?? null) as ShopRefundStatus | null;

  if (!canRequestRefund(order.payment_status, active)) {
    return NextResponse.json(
      {
        error:
          order.payment_status === "refunded"
            ? "This order has already been refunded."
            : active && refundIsActive(active)
              ? "A refund request is already open for this order."
              : "This order isn't eligible for a refund request.",
      },
      { status: 409 },
    );
  }

  const admin = createAdminClient();
  const { error } = await admin.from("shop_refund_requests").insert({
    order_id: order.id,
    requested_by: user.id,
    reason: parsed.data.reason,
    details: parsed.data.details ?? null,
  });
  if (error) {
    console.warn("[shop] refund request insert failed", error.message);
    return NextResponse.json(
      { error: "Couldn't file the request. Please try again." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}

const withdrawSchema = z.object({ refundId: z.string().uuid() });

/** Buyer withdraws a still-pending request. */
async function handlePATCH(req: Request) {
  if (!shopEnabled()) {
    return NextResponse.json({ error: "Shop is not available." }, { status: 404 });
  }

  const supabase = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = withdrawSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Visible via buyer RLS = it's on the caller's own order.
  const { data: request } = await supabase
    .from("shop_refund_requests")
    .select("id, status, order_id, requested_by")
    .eq("id", parsed.data.refundId)
    .maybeSingle();
  if (!request || request.requested_by !== user.id) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }
  if (request.status !== "requested") {
    return NextResponse.json(
      { error: "This request has already been decided." },
      { status: 409 },
    );
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("shop_refund_requests")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", request.id)
    .eq("status", "requested");
  if (error) {
    console.warn("[shop] refund withdraw failed", error.message);
    return NextResponse.json(
      { error: "Couldn't withdraw the request." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}

export const POST = corsRoute(handlePOST);
export const PATCH = corsRoute(handlePATCH);
export const OPTIONS = corsPreflight;
