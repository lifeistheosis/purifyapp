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

const seedCommon = {
  stars: z.number().int().min(1).max(5),
  body: z.string().trim().max(4000).nullish(),
  displayName: z.string().trim().max(80).nullish(),
  location: z.string().trim().max(80).nullish(),
  anonymous: z.boolean().optional(),
  /** Backdate a seeded review ("YYYY-MM-DD" or ISO). Never in the future. */
  createdAt: z.string().trim().min(4).max(40).nullish(),
  /** Photos shown on the review (uploaded via /api/admin/shop/media). */
  photoUrls: z.array(z.string().url().max(1000)).max(12).optional(),
};

const seedSchema = z.discriminatedUnion("target", [
  z.object({
    target: z.literal("product"),
    productId: z.string().uuid(),
    ...seedCommon,
  }),
  z.object({
    target: z.literal("store"),
    storeId: z.string().uuid(),
    ...seedCommon,
  }),
]);

/** Parse a seed's backdate. Returns an ISO string, null for "use now", or
 *  an error message. Date-only strings pin to noon UTC so timezones can't
 *  slide them a day. */
function parseSeedDate(v: string | null | undefined): string | null | { error: string } {
  const raw = (v ?? "").trim();
  if (!raw) return null;
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T12:00:00Z` : raw;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return { error: "That date could not be read." };
  if (t > Date.now() + 60 * 60 * 1000) {
    return { error: "A review can't be dated in the future." };
  }
  return new Date(t).toISOString();
}

/** True when the write failed because photo_urls doesn't exist yet (the
 *  20260722_shop_review_seeds_photos migration hasn't been applied). */
function missingPhotoColumn(message: string | undefined): boolean {
  return /photo_urls/i.test(message ?? "");
}

const SEED_LIMIT_HINT =
  "This product already carries your seeded review. Apply supabase/migrations/20260722_shop_review_seeds_photos.sql to seed unlimited reviews.";

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

  // photo_urls is optional until its migration lands; on "column missing"
  // the selects fall back without it and rows read as photo-less.
  const productCols = (withPhotos: boolean) =>
    `id, stars, body, created_at, display_name, location, anonymous, order_id${withPhotos ? ", photo_urls" : ""}, product:shop_products(slug, title), store:shop_stores(slug, public_name)`;
  const storeCols = (withPhotos: boolean) =>
    `id, stars, body, created_at, display_name, location, anonymous, order_id${withPhotos ? ", photo_urls" : ""}, store:shop_stores(slug, public_name)`;

  const reviewQueries = (withPhotos: boolean) =>
    Promise.all([
      admin
        .from("shop_reviews")
        .select(productCols(withPhotos))
        .order("created_at", { ascending: false })
        .limit(200),
      admin
        .from("shop_store_reviews")
        .select(storeCols(withPhotos))
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

  let [productReviews, storeReviews] = await reviewQueries(true);
  if (missingPhotoColumn(productReviews.error?.message ?? storeReviews.error?.message)) {
    [productReviews, storeReviews] = await reviewQueries(false);
  }

  const [products, stores] = await Promise.all([
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

  const when = parseSeedDate(p.createdAt);
  if (when && typeof when === "object") {
    return NextResponse.json({ error: when.error }, { status: 400 });
  }
  const photos = (p.photoUrls ?? []).filter(Boolean);

  // Each seed INSERTS a fresh row (the old upsert silently replaced the
  // admin's previous seed on the same product, which read as "adding more
  // reviews deletes the old ones"). Timestamps: an explicit backdate sets
  // BOTH created_at and updated_at so the review sorts and reads as of that
  // day.
  const row = {
    user_id: adminUser.id,
    order_id: null,
    stars: p.stars,
    body: clean(p.body),
    display_name: anon ? null : clean(p.displayName),
    location: anon ? null : clean(p.location),
    anonymous: anon,
    ...(when ? { created_at: when, updated_at: when } : { updated_at: new Date().toISOString() }),
  };

  async function insertSeed(
    table: "shop_reviews" | "shop_store_reviews",
    target: Record<string, string>,
  ): Promise<string | null> {
    // photo_urls rides along only when photos were attached, so seeding
    // without photos keeps working before the migration is applied.
    const withPhotos = photos.length > 0 ? { photo_urls: photos } : {};
    const { error } = await admin.from(table).insert({ ...row, ...target, ...withPhotos });
    if (!error) return null;
    if (error.code === "23505") return SEED_LIMIT_HINT;
    if (photos.length > 0 && missingPhotoColumn(error.message)) {
      return "Photos need supabase/migrations/20260722_shop_review_seeds_photos.sql applied first.";
    }
    return error.message;
  }

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

    const failed = await insertSeed("shop_reviews", {
      product_id: product.id,
      store_id: product.store_id,
    });
    if (failed) return NextResponse.json({ error: failed }, { status: 500 });
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

  const failed = await insertSeed("shop_store_reviews", { store_id: store.id });
  if (failed) return NextResponse.json({ error: failed }, { status: 500 });
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
