import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { logActivity } from "@/lib/admin/activityLog";
import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { addedAtOf, dealWindow } from "@/lib/shop/cartDeals";
import { DEMAND_WINDOW_MS } from "@/lib/shop/cartDemand";
import { flatShippingCents } from "@/lib/shop/checkout";
import {
  forgetShopSettings,
  readShopSettings,
  rowFromSettings,
  type ShopSettings,
} from "@/lib/shop/settings";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * The owner's shop switches (lib/shop/settings.ts): the cart deal, the
 * free-shipping threshold, and the "in other carts" line.
 *
 * GET also answers the questions the owner needs before flipping one: how
 * many carts would be touched, how many products the deal can never apply to
 * because nobody recorded what they cost, and what an average paid order
 * actually comes to, so a threshold is set against the real number.
 */

const bodySchema = z.object({
  cartDeal: z.object({
    enabled: z.boolean(),
    afterDays: z.number().int().min(1).max(60),
    percent: z.number().int().min(1).max(50),
    windowHours: z.number().int().min(1).max(336),
    minMarginCents: z.number().int().min(0).max(1_000_000),
  }),
  freeShippingThresholdCents: z.number().int().min(100).max(10_000_000).nullable(),
  showCartDemand: z.boolean(),
});

export async function GET() {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { settings, present } = await readShopSettings({ fresh: true });
  const admin = createAdminClient();
  const now = Date.now();

  const [carts, products, sourcing, orders] = await Promise.all([
    admin
      .from("shop_carts")
      .select("items, updated_at")
      .gt("item_count", 0)
      .gte("updated_at", new Date(now - DEMAND_WINDOW_MS).toISOString())
      .limit(5000),
    admin.from("shop_products").select("*").eq("status", "published"),
    admin.from("shop_product_sourcing").select("product_id, supplier_cost_cents"),
    admin
      .from("shop_orders")
      .select("items_total_cents")
      .eq("payment_status", "paid")
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  // Carts holding something that has already waited long enough, whether or
  // not the deal is on: the number the owner is deciding about.
  const cfgOn = { ...settings.cartDeal, enabled: true };
  let waitedLongEnough = 0;
  for (const c of (carts.data ?? []) as { items: unknown }[]) {
    const items = Array.isArray(c.items) ? c.items : [];
    const any = items.some((it) => {
      const slug = (it as { slug?: unknown } | null)?.slug;
      if (typeof slug !== "string") return false;
      const w = dealWindow(addedAtOf(items, slug), cfgOn, now);
      return w.status === "active" || w.status === "expired";
    });
    if (any) waitedLongEnough += 1;
  }

  const costKnown = new Set(
    ((sourcing.data ?? []) as { product_id: string; supplier_cost_cents: number | null }[])
      .filter((s) => typeof s.supplier_cost_cents === "number")
      .map((s) => s.product_id),
  );
  const live = ((products.data ?? []) as { id: string; deleted_at?: string | null }[]).filter(
    (p) => p.deleted_at == null,
  );
  const withoutCost = live.filter((p) => !costKnown.has(p.id)).length;

  const totals = ((orders.data ?? []) as { items_total_cents: number | null }[])
    .map((o) => o.items_total_cents)
    .filter((n): n is number => typeof n === "number" && n > 0);
  const averageOrderCents = totals.length ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : null;

  return NextResponse.json({
    settings,
    present,
    stats: {
      cartsThisWeek: (carts.data ?? []).length,
      cartsWaitedLongEnough: waitedLongEnough,
      liveProducts: live.length,
      liveProductsWithoutCost: withoutCost,
      paidOrders: totals.length,
      averageOrderCents,
      flatShippingCents: flatShippingCents(),
    },
  });
}

export async function POST(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Invalid settings." },
      { status: 400 },
    );
  }
  const next: ShopSettings = parsed.data;
  const { settings: prior } = await readShopSettings({ fresh: true });

  const admin = createAdminClient();
  const { error } = await admin
    .from("shop_settings")
    .upsert({ id: 1, ...rowFromSettings(next), updated_at: new Date().toISOString() }, { onConflict: "id" });
  if (error) {
    if (isTableAbsent(error)) {
      return NextResponse.json(
        {
          error:
            "These switches live in shop_settings, which supabase/migrations/20260918_shop_growth.sql creates. Until it runs, everything here stays off.",
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  forgetShopSettings();

  void logActivity({
    actorEmail: adminUser.email ?? null,
    action: "shop.settings",
    entityType: "shop_settings",
    entityId: "1",
    // The prior values are the undo: the row itself only holds the new ones.
    detail: { prior, next },
  });

  return NextResponse.json({ ok: true, settings: next });
}
