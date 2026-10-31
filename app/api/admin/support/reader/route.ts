import { NextResponse } from "next/server";

import { userIdByEmail } from "@/lib/admin/accountEmails";
import { getAdminUser } from "@/lib/admin/access";
import { getCustomerDates, revenuecatRestConfigured } from "@/lib/billing/revenuecatRest";
import { createAdminClient } from "@/lib/supabase/admin";
import { pageAllIn } from "@/lib/supabase/pageAll";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The reader beside a request: the support console's right-hand pane (the
 * owner's pick A for Messages, 2026-10-30). Read only.
 *
 * Asked by ticket id, never by email: an address in a query string ends up in
 * the request logs, and the ticket already names who wrote. From it: their
 * paid and refunded orders (by account and by the address they bought with),
 * each with its moves, its latest refund and its pieces' Temu links, costs,
 * photos and stock; their plan and where it was bought; and the gifts they
 * were sent. The plan's store comes from entitlements.plus_source, and the
 * renewal date from RevenueCat's read-only key when it is set.
 *
 * A part that cannot be read is named in `failed` and left empty, never shown
 * as nothing: "no orders" and "the orders could not be read" are different
 * answers, and only one of them is a reason to stop looking.
 */

const ORDER_COLUMNS =
  "id, email, user_id, total_cents, currency, payment_status, fulfillment_status, created_at, updated_at, paid_at, outbound_tracking, inbound_tracking, shipping_address, items:shop_order_items(title, quantity, unit_price_cents, product_id)";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** ilike with the address's own % and _ taken literally. */
const likeExact = (s: string) => s.replace(/[\\%_]/g, (m) => `\\${m}`);

type OrderRow = {
  id: string;
  email: string | null;
  user_id: string | null;
  total_cents: number;
  currency: string | null;
  payment_status: "pending" | "paid" | "refunded" | "cancelled";
  fulfillment_status: string;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
  outbound_tracking: string | null;
  inbound_tracking: string | null;
  shipping_address: unknown;
  items: { title: string; quantity: number; unit_price_cents: number; product_id: string | null }[] | null;
};

export async function GET(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ticketId = new URL(req.url).searchParams.get("ticket") ?? "";
  if (!UUID.test(ticketId)) return NextResponse.json({ error: "ticket required." }, { status: 400 });

  const admin = createAdminClient();
  const { data: ticket, error: ticketError } = await admin
    .from("support_tickets")
    .select("id, email, name, user_id, order_id")
    .eq("id", ticketId)
    .maybeSingle();
  if (ticketError) return NextResponse.json({ error: ticketError.message }, { status: 500 });
  if (!ticket) return NextResponse.json({ error: "Request not found." }, { status: 404 });

  const email = String(ticket.email ?? "").trim();
  const failed: string[] = [];
  let userId: string | null = (ticket.user_id as string | null) ?? null;
  if (!userId && email) userId = await userIdByEmail(email).catch(() => null);

  const byAccount = userId
    ? admin
        .from("shop_orders")
        .select(ORDER_COLUMNS)
        .eq("user_id", userId)
        .in("payment_status", ["paid", "refunded"])
        .order("created_at", { ascending: false })
        .limit(25)
    : Promise.resolve({ data: [] as OrderRow[], error: null });
  const byAddress = email
    ? admin
        .from("shop_orders")
        .select(ORDER_COLUMNS)
        .ilike("email", likeExact(email))
        .in("payment_status", ["paid", "refunded"])
        .order("created_at", { ascending: false })
        .limit(25)
    : Promise.resolve({ data: [] as OrderRow[], error: null });
  const plan = userId
    ? admin.from("entitlements").select("plus_until, pro_until, plus_source").eq("user_id", userId).maybeSingle()
    : Promise.resolve({ data: null, error: null });
  const gifts = userId
    ? admin
        .from("gifts")
        .select("tier, days, created_at, claimed_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20)
    : Promise.resolve({ data: [], error: null });
  const account = userId ? admin.auth.admin.getUserById(userId).catch(() => null) : Promise.resolve(null);
  const store = userId && revenuecatRestConfigured() ? getCustomerDates(userId) : Promise.resolve(null);

  const [accountRows, addressRows, planRow, giftRows, authUser, rc] = await Promise.all([
    byAccount,
    byAddress,
    plan,
    gifts,
    account,
    store,
  ]);
  if (accountRows.error || addressRows.error) failed.push("orders");
  if (planRow.error) failed.push("plan");
  if (giftRows.error) failed.push("gifts");

  const seen = new Map<string, OrderRow>();
  for (const o of [...((accountRows.data ?? []) as OrderRow[]), ...((addressRows.data ?? []) as OrderRow[])]) {
    seen.set(o.id, o);
  }
  const orders = [...seen.values()].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)).slice(0, 25);
  const ids = orders.map((o) => o.id);
  const productIds = [...new Set(orders.flatMap((o) => (o.items ?? []).map((i) => i.product_id).filter(Boolean)))] as string[];

  const [events, refunds, sourcing, media, stock] = await Promise.all([
    pageAllIn<{ order_id: string; to_status: string; at: string }>(ids, (some, from, to) =>
      admin
        .from("shop_order_events")
        .select("order_id, to_status, at")
        .in("order_id", some)
        .order("at", { ascending: true })
        .order("id")
        .range(from, to),
    ).catch(() => null),
    pageAllIn<{ order_id: string; status: string; amount_cents: number | null; created_at: string }>(ids, (some, from, to) =>
      admin
        .from("shop_refund_requests")
        .select("order_id, status, amount_cents, created_at")
        .in("order_id", some)
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to),
    ).catch(() => null),
    pageAllIn<{ product_id: string; supplier_url: string | null; supplier_sku: string | null; supplier_cost_cents: number | null }>(
      productIds,
      (some, from, to) =>
        admin
          .from("shop_product_sourcing")
          .select("product_id, supplier_url, supplier_sku, supplier_cost_cents")
          .in("product_id", some)
          .order("product_id")
          .range(from, to),
    ).catch(() => []),
    pageAllIn<{ product_id: string; media_url: string; sort_order: number | null; is_primary: boolean | null }>(
      productIds,
      (some, from, to) =>
        admin
          .from("shop_product_media")
          .select("product_id, media_url, sort_order, is_primary")
          .in("product_id", some)
          .order("id")
          .range(from, to),
    ).catch(() => []),
    pageAllIn<{ id: string; quantity_available: number | null }>(productIds, (some, from, to) =>
      admin.from("shop_products").select("id, quantity_available").in("id", some).order("id").range(from, to),
    ).catch(() => []),
  ]);
  if (events === null) failed.push("history");
  if (refunds === null) failed.push("refunds");

  const latestRefund = new Map<string, { status: string; amount_cents: number | null }>();
  for (const r of refunds ?? []) if (!latestRefund.has(r.order_id)) latestRefund.set(r.order_id, r);

  const imageByProduct: Record<string, string> = {};
  const best = new Map<string, number>();
  for (const m of media) {
    const rank = (m.is_primary ? -1_000_000 : 0) + (m.sort_order ?? 0);
    if (!best.has(m.product_id) || rank < (best.get(m.product_id) as number)) {
      best.set(m.product_id, rank);
      imageByProduct[m.product_id] = m.media_url;
    }
  }

  const ent = planRow.data as { plus_until: string | null; pro_until: string | null; plus_source: string | null } | null;
  const now = Date.now();
  const future = (t: string | null) => !!t && Date.parse(t) > now;
  const tier = ent ? (future(ent.pro_until) ? "pro" : future(ent.plus_until) ? "plus" : null) : null;
  const meta = (authUser?.data?.user?.user_metadata ?? {}) as { full_name?: string; name?: string };

  return NextResponse.json(
    {
      reader: {
        email,
        name: (ticket.name as string | null) ?? meta.full_name ?? meta.name ?? null,
        userId,
        since: authUser?.data?.user?.created_at ?? null,
      },
      orders: orders.map((o) => ({
        ...o,
        items: o.items ?? [],
        events: (events ?? []).filter((e) => e.order_id === o.id).map((e) => ({ to_status: e.to_status, at: e.at })),
        refund: latestRefund.get(o.id) ?? null,
      })),
      plan: ent
        ? {
            tier,
            until: tier === "pro" ? ent.pro_until : ent.plus_until,
            source: ent.plus_source,
            renews: rc?.nextBilling ?? null,
            store: rc?.store ?? null,
          }
        : null,
      gifts: giftRows.data ?? [],
      supplierByProduct: Object.fromEntries(
        sourcing.map((s) => [s.product_id, { url: s.supplier_url, sku: s.supplier_sku, cost: s.supplier_cost_cents }]),
      ),
      imageByProduct,
      stockByProduct: Object.fromEntries(stock.map((p) => [p.id, p.quantity_available])),
      failed,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
