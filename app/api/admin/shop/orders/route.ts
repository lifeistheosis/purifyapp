import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import {
  canCancelPayment,
  cancelRefusalMessage,
  guardedOrderUpdate,
  readOrderState,
  staleOrderMessage,
  type OrderStateSnapshot,
  type OrderWriteDb,
} from "@/lib/shop/orderWrite";
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
      "*, store:shop_stores(public_name, slug), items:shop_order_items(title, unit_price_cents, quantity, product_id)",
    )
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Supplier reorder links, keyed by product. This is an admin-only surface
  // (same gate as the product console), so sourcing data is allowed to travel
  // here: when a paid order arrives the owner clicks straight through to the
  // supplier to reorder the item. Kept as a side map so the sourcing rows are
  // fetched once, not per line item.
  const orders = data ?? [];
  const productIds = Array.from(
    new Set(
      orders.flatMap((o) =>
        ((o.items as { product_id: string | null }[] | null) ?? [])
          .map((i) => i.product_id)
          .filter((id): id is string => Boolean(id)),
      ),
    ),
  );
  let supplierByProduct: Record<
    string,
    { url: string | null; sku: string | null }
  > = {};
  if (productIds.length > 0) {
    const { data: srcRows } = await admin
      .from("shop_product_sourcing")
      .select("product_id, supplier_url, supplier_sku")
      .in("product_id", productIds);
    supplierByProduct = Object.fromEntries(
      (srcRows ?? []).map((s) => [
        s.product_id as string,
        {
          url: (s.supplier_url as string | null) ?? null,
          sku: (s.supplier_sku as string | null) ?? null,
        },
      ]),
    );
  }

  return NextResponse.json(
    { orders, supplierByProduct },
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
  const db = admin as unknown as OrderWriteDb;

  // One read of the row as it stands right now, used for two things: the
  // cancel allow-list, and the compare-and-swap values below. Read here rather
  // than trusting the client, because this table can sit open for minutes.
  let before: OrderStateSnapshot | null = null;
  if (fulfillmentStatus) {
    const read = await readOrderState(db, orderId);
    // A failed READ is not an absent row. 500, never 404. The old code
    // destructured only `data`, so a transient error read as "Order not found."
    if (!read.ok) return NextResponse.json({ error: read.message }, { status: 500 });
    if (!read.state) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    before = read.state;
    // Cancelling a PAID order is a refund. Cancelling a REFUNDED order erases
    // the two columns every money surface reads, and the old check tested
    // `=== "paid"` only, so a refunded order went straight through.
    if (fulfillmentStatus === "cancelled" && !canCancelPayment(before.payment_status)) {
      return NextResponse.json(
        { error: cancelRefusalMessage(before.payment_status) },
        { status: 409 },
      );
    }
  }

  const result = await guardedOrderUpdate(
    db,
    orderId,
    // A tracking or supplier-note save touches no status column and has no
    // competing writer, so it needs no guard. Any status change compares and
    // swaps on both columns. The previous update carried `.eq("id", orderId)`
    // and nothing else, so a settlement landing mid-request was overwritten.
    before
      ? { payment_status: before.payment_status, fulfillment_status: before.fulfillment_status }
      : {},
    {
      ...(fulfillmentStatus ? { fulfillment_status: fulfillmentStatus } : {}),
      ...(fulfillmentStatus === "cancelled" ? { payment_status: "cancelled" } : {}),
      ...(outboundTracking !== undefined ? { outbound_tracking: outboundTracking } : {}),
      ...(inboundTracking !== undefined ? { inbound_tracking: inboundTracking } : {}),
      ...(supplierOrderStatus !== undefined
        ? { supplier_order_status: supplierOrderStatus }
        : {}),
      updated_at: new Date().toISOString(),
    },
  );
  if (!result.ok && result.reason === "error") {
    return NextResponse.json({ error: result.message }, { status: 500 });
  }
  if (!result.ok) {
    if (!result.found) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    console.warn(
      `[shop] admin order update lost a race order=${orderId} found='${result.found.payment_status}/${result.found.fulfillment_status}'`,
    );
    return NextResponse.json(
      { error: staleOrderMessage(result.found), found: result.found },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true, order: result.row });
}
