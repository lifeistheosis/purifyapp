// Seed the EIKON catalog from data/shop/seed-products.json.
//
// Idempotent: products upsert by slug; media and subjects are replaced
// per product. Requires the shop migration to be applied first (the
// EIKON store row must exist) and the service-role key in the env
// (reads .env.local when present, same values the app uses).
//
// Usage: node scripts/seed-shop.mjs

import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();

// Minimal .env.local loader (no dotenv dependency in this repo).
try {
  const env = await fs.readFile(path.join(ROOT, ".env.local"), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
} catch {
  /* rely on the process env */
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SEEDS = JSON.parse(
  await fs.readFile(path.join(ROOT, "data", "shop", "seed-products.json"), "utf8"),
);

const { data: store, error: storeError } = await admin
  .from("shop_stores")
  .select("id, seller_id")
  .eq("slug", "eikon")
  .single();
if (storeError || !store) {
  console.error(
    "EIKON store not found. Apply supabase/migrations/20260704_shop_phase1.sql first.",
  );
  process.exit(1);
}

for (const p of SEEDS.products) {
  const row = {
    store_id: store.id,
    seller_id: store.seller_id,
    slug: p.slug,
    title: p.title,
    subtitle: p.subtitle ?? null,
    description_md: p.description ?? null,
    price_cents: p.priceCents,
    currency: "usd",
    category: p.category,
    classification: p.classification,
    fulfillment_type: "eikon_two_stage",
    inventory_status: p.inventoryStatus,
    quantity_available: p.quantityAvailable ?? null,
    dispatch_min_days: p.dispatchMinDays,
    dispatch_max_days: p.dispatchMaxDays,
    materials: p.materials ?? null,
    dimensions: p.dimensions ?? null,
    production_method: p.productionMethod ?? null,
    maker_name: p.makerName ?? null,
    country_of_origin: p.countryOfOrigin ?? null,
    image_is_representative: true,
    status: "published",
    updated_at: new Date().toISOString(),
  };

  const { data: upserted, error } = await admin
    .from("shop_products")
    .upsert(row, { onConflict: "slug" })
    .select("id")
    .single();
  if (error || !upserted) {
    console.error(`${p.slug}: upsert failed`, error?.message);
    continue;
  }
  const productId = upserted.id;

  await admin.from("shop_product_media").delete().eq("product_id", productId);
  const mediaPath = `/shop/media/${p.media.file}`;
  try {
    await fs.access(path.join(ROOT, "public", "shop", "media", p.media.file));
    const { error: mediaError } = await admin.from("shop_product_media").insert({
      product_id: productId,
      media_url: mediaPath,
      alt_text: p.media.alt,
      sort_order: 0,
      is_primary: true,
    });
    if (mediaError) console.error(`${p.slug}: media insert failed`, mediaError.message);
  } catch {
    console.warn(`${p.slug}: image missing (${mediaPath}), seeded without media`);
  }

  await admin.from("shop_product_subjects").delete().eq("product_id", productId);
  if (p.subjects?.length) {
    const { error: subjectError } = await admin.from("shop_product_subjects").insert(
      p.subjects.map((s) => ({
        product_id: productId,
        subject_type: s.type,
        subject_slug: s.slug,
      })),
    );
    if (subjectError)
      console.error(`${p.slug}: subjects insert failed`, subjectError.message);
  }

  console.log(`seeded: ${p.slug}`);
}

console.log("\nDone. Products are status=published; visibility is governed by NEXT_PUBLIC_SHOP_ENABLED.");
