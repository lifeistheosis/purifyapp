import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { isHiddenOrder } from "@/lib/shop/orders";

export const dynamic = "force-dynamic";

/**
 * Two shopping-intent signals for the owner:
 * - liveCarts: current server-synced carts (lib/shop/cartSync), guests
 *   included. Only carts touched in the recent window are "live".
 * - abandoned: checkouts that were STARTED but never paid — a pending
 *   shop_orders row is created before Stripe, so these are real
 *   abandoned carts. Classified with the same isHiddenOrder rule the
 *   buyer's order list uses (pending over a day = stale/abandoned).
 */
const LIVE_WINDOW_MS = 3 * 86_400_000; // 3 days

export async function GET() {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const now = Date.now();
  const liveSince = new Date(now - LIVE_WINDOW_MS).toISOString();

  const [cartsRes, ordersRes] = await Promise.all([
    admin
      .from("shop_carts")
      .select("cart_token, user_id, items, item_count, subtotal_cents, currency, updated_at")
      .gt("item_count", 0)
      .gte("updated_at", liveSince)
      .order("updated_at", { ascending: false })
      .limit(300),
    admin
      .from("shop_orders")
      .select("id, email, total_cents, currency, created_at, payment_status, items:shop_order_items(title, quantity)")
      .eq("payment_status", "pending")
      .order("created_at", { ascending: false })
      .limit(300),
  ]);

  const carts = (cartsRes.data ?? []) as {
    cart_token: string;
    user_id: string | null;
    items: { slug: string; title: string; quantity: number; unitPriceCents: number }[];
    item_count: number;
    subtotal_cents: number;
    currency: string | null;
    updated_at: string;
  }[];

  // Attach buyer identity for signed-in carts via the profiles mirror.
  const userIds = [...new Set(carts.map((c) => c.user_id).filter(Boolean))] as string[];
  const profileById = new Map<string, { email: string | null; name: string | null }>();
  if (userIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, email, display_name")
      .in("id", userIds);
    for (const p of (profiles ?? []) as {
      id: string;
      email: string | null;
      display_name: string | null;
    }[]) {
      profileById.set(p.id, { email: p.email, name: p.display_name });
    }
  }

  // One row PER SHOPPER, not per cart token. A signed-in user gets a fresh
  // cart_token on every device and every signed-out-then-in session, so their
  // basket was previously split across several rows with no way to tell they
  // were the same person. Signed-in carts are merged by user_id (quantities
  // summed per product); guests have no identity to merge on, so each guest
  // token stays its own row.
  type Item = { slug: string; title: string; quantity: number; unitPriceCents: number };
  type Group = {
    key: string;
    userId: string | null;
    email: string | null;
    name: string | null;
    itemsBySlug: Map<string, Item>;
    subtotalCents: number;
    currency: string;
    updatedAt: string;
    cartCount: number;
  };

  const groups = new Map<string, Group>();
  for (const c of carts) {
    const key = c.user_id ? `u:${c.user_id}` : `t:${c.cart_token}`;
    const profile = c.user_id ? profileById.get(c.user_id) : undefined;
    let g = groups.get(key);
    if (!g) {
      g = {
        key,
        userId: c.user_id,
        email: profile?.email ?? null,
        name: profile?.name ?? null,
        itemsBySlug: new Map(),
        subtotalCents: 0,
        currency: c.currency ?? "usd",
        updatedAt: c.updated_at,
        cartCount: 0,
      };
      groups.set(key, g);
    }
    g.subtotalCents += c.subtotal_cents;
    g.cartCount += 1;
    // Carts are ordered newest first, so the first one seen is the latest.
    if (c.updated_at > g.updatedAt) g.updatedAt = c.updated_at;
    for (const item of c.items ?? []) {
      const existing = g.itemsBySlug.get(item.slug);
      if (existing) existing.quantity += item.quantity;
      else g.itemsBySlug.set(item.slug, { ...item });
    }
  }

  const liveCarts = [...groups.values()]
    .map((g) => {
      const items = [...g.itemsBySlug.values()];
      return {
        key: g.key,
        userId: g.userId,
        email: g.email,
        name: g.name,
        // Best available label, in descending order of usefulness.
        who: g.name ?? g.email ?? (g.userId ? "Signed in" : "Guest"),
        signedIn: g.userId != null,
        // How many device/session carts were merged into this row.
        cartCount: g.cartCount,
        itemCount: items.reduce((a, i) => a + i.quantity, 0),
        subtotalCents: g.subtotalCents,
        currency: g.currency,
        items,
        updatedAt: g.updatedAt,
      };
    })
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

  const orders = (ordersRes.data ?? []) as {
    id: string;
    email: string | null;
    total_cents: number;
    currency: string;
    created_at: string;
    payment_status: "pending";
    items: { title: string; quantity: number }[];
  }[];

  const abandoned = orders.map((o) => ({
    id: o.id,
    email: o.email ?? "Guest",
    totalCents: o.total_cents,
    currency: o.currency,
    createdAt: o.created_at,
    items: o.items ?? [],
    // stale = pending over a day (walked away); recent pending may still be
    // an in-flight checkout.
    stale: isHiddenOrder(
      { payment_status: o.payment_status, created_at: o.created_at },
      now,
    ),
  }));

  return NextResponse.json(
    { liveCarts, abandoned },
    { headers: { "Cache-Control": "no-store" } },
  );
}
