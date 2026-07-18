import { NextResponse } from "next/server";
import { z } from "zod";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Count a product-detail view. The client pings this once per browser
 * session per product (it dedups), so this is a real view, not a refresh.
 * The increment RPC is service-role only, so a browser can never inflate a
 * counter directly. Analytics only — nothing here affects price or stock.
 *
 * Reachable from the native shell (cross-origin), same as the catalog.
 */
const schema = z.object({ slug: z.string().min(1).max(200) });

async function handlePOST(req: Request) {
  if (await rateLimited(`product-view:${ipKey(req.headers)}`, 60, 60)) {
    return NextResponse.json({ ok: true }); // silently drop, never error a view
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: product } = await admin
    .from("shop_products")
    .select("id")
    .eq("slug", parsed.data.slug)
    .eq("status", "published")
    .maybeSingle();
  if (product?.id) {
    await admin.rpc("shop_increment_product_view", { p_product_id: product.id });
  }
  return NextResponse.json({ ok: true });
}

export const POST = corsRoute(handlePOST);
export const OPTIONS = corsPreflight;
