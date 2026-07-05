import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Owner dashboard: every order across every store. The owner can set
 * ANY fulfillment stage (this is where EIKON's supplier pipeline is
 * driven from) and attach tracking. Payment status is deliberately not
 * writable here: paid money only moves through the refund pipeline.
 */

export async function GET() {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("shop_orders")
    .select(
      "*, store:shop_stores(public_name, slug), items:shop_order_items(title, unit_price_cents, quantity)",
    )
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    { orders: data ?? [] },
    { headers: { "Cache-Control": "no-store" } },
  );
}

const patchSchema = z.object({
  orderId: z.string().uuid(),
  fulfillmentStatus: z
    .enum([
      "pending",
      "supplier_order_needed",
      "supplier_order_placed",
      "inbound_to_eikon",
      "received_for_inspection",
      "packaged",
      "shipped",
      "delivered",
      "cancelled",
    ])
    .optional(),
  outboundTracking: z.string().max(200).optional().nullable(),
  inboundTracking: z.string().max(200).optional().nullable(),
  supplierOrderStatus: z.string().max(200).optional().nullable(),
});

export async function PATCH(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update." }, { status: 400 });
  }
  const { orderId, fulfillmentStatus, outboundTracking, inboundTracking, supplierOrderStatus } =
    parsed.data;
  if (
    !fulfillmentStatus &&
    outboundTracking === undefined &&
    inboundTracking === undefined &&
    supplierOrderStatus === undefined
  ) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const admin = createAdminClient();

  // Cancelling a PAID order is refused here too; that's a refund.
  if (fulfillmentStatus === "cancelled") {
    const { data: order } = await admin
      .from("shop_orders")
      .select("payment_status")
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    if (order.payment_status === "paid") {
      return NextResponse.json(
        { error: "This order is paid. Refund it instead of cancelling." },
        { status: 409 },
      );
    }
  }

  const { error } = await admin
    .from("shop_orders")
    .update({
      ...(fulfillmentStatus ? { fulfillment_status: fulfillmentStatus } : {}),
      ...(fulfillmentStatus === "cancelled" ? { payment_status: "cancelled" } : {}),
      ...(outboundTracking !== undefined ? { outbound_tracking: outboundTracking } : {}),
      ...(inboundTracking !== undefined ? { inbound_tracking: inboundTracking } : {}),
      ...(supplierOrderStatus !== undefined
        ? { supplier_order_status: supplierOrderStatus }
        : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
