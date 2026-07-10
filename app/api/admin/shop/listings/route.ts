import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Owner dashboard: every listing across every store. Read + status
 * moderation only — full edits belong to the seller (their console) or
 * the EIKON product editor in the Shop tab; the owner's lever here is
 * publish/pause/archive, which is what moderation actually needs.
 */

export async function GET() {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("shop_products")
    .select(
      "id, slug, title, price_cents, currency, category, classification, inventory_status, quantity_available, status, created_at, updated_at, store:shop_stores(id, slug, public_name), media:shop_product_media(media_url, alt_text, is_primary, sort_order)",
    )
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    { products: data ?? [] },
    { headers: { "Cache-Control": "no-store" } },
  );
}

const patchSchema = z.object({
  productId: z.string().uuid(),
  status: z.enum(["draft", "published", "paused", "archived"]),
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

  const admin = createAdminClient();

  // The same honesty gate the seller console has: nothing publishes
  // without at least one image with alt text.
  if (parsed.data.status === "published") {
    const { data: media } = await admin
      .from("shop_product_media")
      .select("id")
      .eq("product_id", parsed.data.productId)
      .limit(1);
    if (!media || media.length === 0) {
      return NextResponse.json(
        { error: "This listing has no photos; it can't be published." },
        { status: 400 },
      );
    }
  }

  const { error } = await admin
    .from("shop_products")
    .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.productId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
