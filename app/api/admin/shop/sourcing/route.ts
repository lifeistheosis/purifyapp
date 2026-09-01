import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { logActivity } from "@/lib/admin/activityLog";
import { createAdminClient } from "@/lib/supabase/admin";
import { recheckQueue, type RecheckItem } from "@/lib/shop/recheck";

export const dynamic = "force-dynamic";

/**
 * The sourcing worklist, and the write-back that records a price check.
 *
 * ── This route fetches no supplier prices, deliberately ─────────────────
 *
 * CLAUDE.md rule 8: no paid APIs for internal tooling, the agent is the
 * pipeline. There is no free, reliable, general way to read a supplier's price
 * programmatically, and a scraper per supplier is a maintenance burden that
 * breaks silently and reports stale numbers as fresh ones, which is worse than
 * reporting nothing.
 *
 * So GET answers "what is worth going and looking at, in what order, and where
 * do I look", and POST records what was found. The looking is done by whoever
 * is holding the queue.
 *
 * ── Every check is recorded, including the ones that found nothing ──────
 *
 * outcome carries 'unavailable' and 'not-found' as first-class results. A
 * product the supplier has discontinued is the single most valuable thing this
 * can discover, and a system that only records prices would have no way to say
 * it.
 */

/** The queue is meant to be finished, so it is capped rather than paged. */
const QUEUE_LIMIT = 40;

/** Sales inside this window count as volume for prioritisation. */
const VOLUME_WINDOW_DAYS = 90;

export async function GET(req: NextRequest) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const includeFresh = url.searchParams.get("all") === "1";

  const supa = createAdminClient();
  const since = new Date(
    Date.now() - VOLUME_WINDOW_DAYS * 86_400_000,
  ).toISOString();

  const [productsRes, sourcingRes, soldRes] = await Promise.all([
    supa
      .from("shop_products")
      .select("id, title, price_cents, status")
      .neq("status", "archived")
      .limit(1000),
    supa
      .from("shop_product_sourcing")
      .select("product_id, supplier_cost_cents, supplier_url, cost_checked_at")
      .limit(1000),
    // Units sold per product in the window, assembled here rather than in SQL
    // because there is no view for it and a group-by through PostgREST would
    // need one.
    supa
      .from("shop_order_items")
      .select("product_id, quantity, order:shop_orders!inner(created_at, payment_status)")
      .gte("order.created_at", since)
      .eq("order.payment_status", "paid")
      .limit(5000),
  ]);

  if (productsRes.error) {
    return NextResponse.json(
      { error: "Could not read products.", detail: productsRes.error.message },
      { status: 500 },
    );
  }
  // The sourcing read is allowed to fail in one specific way: the migration
  // adding cost_checked_at may not be applied. Reported as itself rather than
  // as an empty queue, because an empty queue reads as "nothing to do".
  if (sourcingRes.error) {
    const missingColumn =
      sourcingRes.error.code === "42703" || sourcingRes.error.code === "42P01";
    return NextResponse.json(
      {
        error: missingColumn
          ? "The cost-check columns are not on this database. 20260901_shop_cost_checks.sql has not been applied."
          : "Could not read sourcing.",
        detail: sourcingRes.error.message,
        missing: missingColumn,
      },
      { status: missingColumn ? 501 : 500 },
    );
  }

  type SourcingRow = {
    product_id: string;
    supplier_cost_cents: number | null;
    supplier_url: string | null;
    cost_checked_at: string | null;
  };
  const sourcing = new Map(
    ((sourcingRes.data ?? []) as SourcingRow[]).map((s) => [s.product_id, s]),
  );

  const sold = new Map<string, number>();
  for (const row of (soldRes.data ?? []) as {
    product_id: string | null;
    quantity: number;
  }[]) {
    if (!row.product_id) continue;
    sold.set(row.product_id, (sold.get(row.product_id) ?? 0) + (row.quantity ?? 0));
  }

  const items: RecheckItem[] = (
    (productsRes.data ?? []) as {
      id: string;
      title: string;
      price_cents: number;
      status: string;
    }[]
  ).map((p) => {
    const s = sourcing.get(p.id);
    return {
      productId: p.id,
      title: p.title,
      priceCents: p.price_cents ?? 0,
      costCents: s?.supplier_cost_cents ?? null,
      checkedAt: s?.cost_checked_at ?? null,
      supplierUrl: s?.supplier_url ?? null,
      supplierName: null,
      unitsSold: sold.get(p.id) ?? 0,
      published: p.status === "published",
    };
  });

  const queue = recheckQueue(items, Date.now(), {
    includeFresh,
    limit: QUEUE_LIMIT,
  });

  return NextResponse.json(
    {
      queue,
      totalProducts: items.length,
      dueCount: recheckQueue(items, Date.now()).length,
      volumeWindowDays: VOLUME_WINDOW_DAYS,
      limit: QUEUE_LIMIT,
      truncated: queue.length >= QUEUE_LIMIT,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

const checkSchema = z.object({
  productId: z.string().uuid(),
  /** Null is meaningful: the supplier no longer lists it. */
  costCents: z.number().int().min(0).max(10_000_000).nullable(),
  outcome: z.enum(["ok", "changed", "unavailable", "not-found"]).default("ok"),
  note: z.string().max(1000).optional().nullable(),
});

export async function POST(req: NextRequest) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = checkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid check." },
      { status: 400 },
    );
  }
  const { productId, costCents, outcome, note } = parsed.data;

  const supa = createAdminClient();
  const now = new Date().toISOString();

  // The price at the moment of the check, so the history can reconstruct the
  // margin as it stood without joining a price that has since moved.
  const { data: product } = await supa
    .from("shop_products")
    .select("price_cents")
    .eq("id", productId)
    .maybeSingle<{ price_cents: number }>();
  if (!product) {
    return NextResponse.json({ error: "No such product." }, { status: 404 });
  }

  const { error: histErr } = await supa.from("shop_cost_checks").insert({
    product_id: productId,
    cost_cents: costCents,
    price_cents: product.price_cents ?? 0,
    outcome,
    checked_by: adminUser.email ?? "admin",
    note: note ?? null,
  });
  if (histErr) {
    const missing = histErr.code === "42P01";
    return NextResponse.json(
      {
        error: missing
          ? "shop_cost_checks is not on this database. 20260901_shop_cost_checks.sql has not been applied."
          : "Could not record the check.",
        detail: histErr.message,
        missing,
      },
      { status: missing ? 501 : 500 },
    );
  }

  // The current cost is only overwritten when one was actually found. A
  // 'not-found' check must NOT blank the last known cost: knowing what it used
  // to be is what makes the disappearance legible.
  const patch: Record<string, unknown> = {
    product_id: productId,
    cost_checked_at: now,
    updated_at: now,
  };
  if (costCents !== null) patch.supplier_cost_cents = costCents;

  const { error: srcErr } = await supa
    .from("shop_product_sourcing")
    .upsert(patch, { onConflict: "product_id" });
  if (srcErr) {
    return NextResponse.json(
      { error: "The check was recorded but the cost did not save.", detail: srcErr.message },
      { status: 500 },
    );
  }

  void logActivity({
    actorEmail: adminUser.email ?? null,
    action: "shop.cost_check",
    entityType: "shop_products",
    entityId: productId,
    detail: { costCents, outcome, note },
  });

  return NextResponse.json({ ok: true, checkedAt: now });
}
