import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Admin reviews workbench. Lets an operator seed and remove REAL reviews on any
 * product or store, bypassing the verified-buyer + delivered gates that the
 * public shop_submit_review / shop_submit_store_review RPCs enforce. Used to
 * test how ratings render live. Service-role throughout; admin-gated.
 *
 * A seeded review is attributed to the admin's own user id (the tables require
 * a real auth.users row and are unique per user+product / user+store), so a
 * re-seed updates the admin's existing row rather than stacking. order_id is
 * left null — these are operator test rows, not purchase-linked. The
 * denormalized rating counters resync via the table triggers; we also call the
 * resync RPC explicitly so the write is self-contained.
 */

const seedSchema = z.discriminatedUnion("target", [
  z.object({
    target: z.literal("product"),
    productId: z.string().uuid(),
    stars: z.number().int().min(1).max(5),
    body: z.string().trim().max(4000).nullish(),
    displayName: z.string().trim().max(80).nullish(),
    location: z.string().trim().max(80).nullish(),
    anonymous: z.boolean().optional(),
  }),
  z.object({
    target: z.literal("store"),
    storeId: z.string().uuid(),
    stars: z.number().int().min(1).max(5),
    body: z.string().trim().max(4000).nullish(),
    displayName: z.string().trim().max(80).nullish(),
    location: z.string().trim().max(80).nullish(),
    anonymous: z.boolean().optional(),
  }),
]);

const deleteSchema = z.object({
  target: z.enum(["product", "store"]),
  id: z.string().uuid(),
});

function clean(v: string | null | undefined): string | null {
  const t = (v ?? "").trim();
  return t.length > 0 ? t : null;
}

export async function GET() {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const [productReviews, storeReviews, products, stores] = await Promise.all([
    admin
      .from("shop_reviews")
      .select(
        "id, stars, body, created_at, display_name, location, anonymous, order_id, product:shop_products(slug, title), store:shop_stores(slug, public_name)",
      )
      .order("created_at", { ascending: false })
      .limit(200),
    admin
      .from("shop_store_reviews")
      .select(
        "id, stars, body, created_at, display_name, location, anonymous, order_id, store:shop_stores(slug, public_name)",
      )
      .order("created_at", { ascending: false })
      .limit(200),
    admin
      .from("shop_products")
      .select("id, slug, title")
      .order("title", { ascending: true }),
    admin
      .from("shop_stores")
      .select("id, slug, public_name")
      .order("public_name", { ascending: true }),
  ]);

  if (productReviews.error) {
    return NextResponse.json(
      { error: productReviews.error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({
    productReviews: productReviews.data ?? [],
    storeReviews: storeReviews.data ?? [],
    products: products.data ?? [],
    stores: stores.data ?? [],
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
  const parsed = seedSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid review." },
      { status: 400 },
    );
  }
  const p = parsed.data;
  const admin = createAdminClient();
  const anon = p.anonymous ?? false;
  const identity = {
    display_name: anon ? null : clean(p.displayName),
    location: anon ? null : clean(p.location),
    anonymous: anon,
  };

  if (p.target === "product") {
    const { data: product, error: prodErr } = await admin
      .from("shop_products")
      .select("id, store_id")
      .eq("id", p.productId)
      .maybeSingle();
    if (prodErr) return NextResponse.json({ error: prodErr.message }, { status: 500 });
    if (!product) {
      return NextResponse.json({ error: "Product not found." }, { status: 400 });
    }

    const { error } = await admin.from("shop_reviews").upsert(
      {
        product_id: product.id,
        store_id: product.store_id,
        user_id: adminUser.id,
        order_id: null,
        stars: p.stars,
        body: clean(p.body),
        ...identity,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,product_id" },
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await admin.rpc("shop_reviews_resync", { p_product_id: product.id });
    return NextResponse.json({ ok: true });
  }

  // target === "store"
  const { data: store, error: storeErr } = await admin
    .from("shop_stores")
    .select("id")
    .eq("id", p.storeId)
    .maybeSingle();
  if (storeErr) return NextResponse.json({ error: storeErr.message }, { status: 500 });
  if (!store) {
    return NextResponse.json({ error: "Store not found." }, { status: 400 });
  }

  const { error } = await admin.from("shop_store_reviews").upsert(
    {
      store_id: store.id,
      user_id: adminUser.id,
      order_id: null,
      stars: p.stars,
      body: clean(p.body),
      ...identity,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,store_id" },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await admin.rpc("shop_store_reviews_resync", { p_store_id: store.id });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }
  const { target, id } = parsed.data;
  const admin = createAdminClient();

  if (target === "product") {
    const { data, error } = await admin
      .from("shop_reviews")
      .delete()
      .eq("id", id)
      .select("product_id")
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (data?.product_id) {
      await admin.rpc("shop_reviews_resync", { p_product_id: data.product_id });
    }
    return NextResponse.json({ ok: true });
  }

  const { data, error } = await admin
    .from("shop_store_reviews")
    .delete()
    .eq("id", id)
    .select("store_id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (data?.store_id) {
    await admin.rpc("shop_store_reviews_resync", { p_store_id: data.store_id });
  }
  return NextResponse.json({ ok: true });
}
