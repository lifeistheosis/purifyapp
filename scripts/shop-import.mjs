// One-time import of the EIKON seed catalogue into the table and the bucket.
//
// WHY. docs/plans/v1.4/shop-simple.md, "Import". scripts/seed-shop.mjs wrote
// the 28 products with media_url pointing at /shop/media/<file>, a path in
// the web bundle, and no thumbnails. The admin list and the shop grid now
// prefer thumb_url, and a product the owner edits from /admin/shop should
// hold bucket URLs like every product uploaded from the form. This script
// pushes each seed image through lib/shop/imageNormalise.ts (the same EXIF
// rotate, 1600px, JPEG q82 and 400px thumbnail the media routes apply) into
// the shop-media bucket, and upserts the row by slug.
//
// NEVER OVERWRITES THE OWNER'S WORK. A row whose updated_at is later than the
// seed file's date was edited after the seed was written and is skipped
// whole: no columns, no media, no subjects. Everything else is upserted.
// The date is the file's last git commit, not its mtime: a fresh checkout
// stamps every file with today, which would make every edit look older than
// the seed and hand the script permission to overwrite all of them. That is
// exactly what the first dry run in this worktree showed. mtime is the
// fallback only when git is not there to ask.
//
// NEW ROWS ARRIVE AS DRAFTS. The seed prices are placeholders the owner sets
// from the form, so a row that did not exist is written hidden. A row that
// already exists keeps the status it has.
//
// DRY RUN BY DEFAULT. Prints the plan; --apply writes. Reads .env.local with
// a \r?\n split (CRLF on this machine, see scripts/patch-notes.mjs).
//
// Runs under Node 24, which strips the types off lib/shop/imageNormalise.ts
// without a flag. On Node 22 add --experimental-strip-types.
//
// Usage:
//   node scripts/shop-import.mjs            plan only
//   node scripts/shop-import.mjs --apply    write

import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

import { normaliseImage, thumbPath } from "../lib/shop/imageNormalise.ts";

const ROOT = process.cwd();
const APPLY = process.argv.includes("--apply");
const BUCKET = "shop-media";
const SEED_FILE = path.join(ROOT, "data", "shop", "seed-products.json");
const MEDIA_DIR = path.join(ROOT, "public", "shop", "media");

try {
  const env = await fs.readFile(path.join(ROOT, ".env.local"), "utf8");
  for (const line of env.split(/\r?\n/)) {
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

const SEEDS = JSON.parse(await fs.readFile(SEED_FILE, "utf8"));
const seedMtime = await seedDate();

async function seedDate() {
  try {
    const iso = execFileSync("git", ["log", "-1", "--format=%cI", "--", SEED_FILE], {
      cwd: ROOT,
      encoding: "utf8",
    }).trim();
    if (iso) return new Date(iso);
  } catch {
    /* no git, or not a checkout */
  }
  return (await fs.stat(SEED_FILE)).mtime;
}

const { data: store, error: storeError } = await admin
  .from("shop_stores")
  .select("id, seller_id")
  .eq("slug", "eikon")
  .single();
if (storeError || !store) {
  console.error("EIKON store not found. Apply supabase/migrations/20260704_shop_phase1.sql first.");
  process.exit(1);
}

/** PostgREST's "column not found", the same test lib/admin/tableAbsent.ts makes. */
function columnAbsent(err) {
  if (!err) return false;
  if (err.code === "42703" || err.code === "PGRST204") return true;
  return /schema cache/i.test(err.message ?? "") && /could not find the .* column/i.test(err.message ?? "");
}

if (APPLY) {
  const { error: bucketError } = await admin.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 25 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
  });
  if (bucketError && !/already exists/i.test(bucketError.message)) {
    console.error("bucket:", bucketError.message);
    process.exit(1);
  }
}

console.log(
  `${APPLY ? "APPLY" : "DRY RUN"}: ${SEEDS.products.length} seed products, seed file dated ${seedMtime.toISOString()}\n`,
);

let written = 0;
let skipped = 0;
let failed = 0;

for (const p of SEEDS.products) {
  const { data: existing } = await admin
    .from("shop_products")
    .select("id, status, updated_at")
    .eq("slug", p.slug)
    .maybeSingle();

  if (existing && existing.updated_at && new Date(existing.updated_at) > seedMtime) {
    console.log(`skip     ${p.slug}: edited ${existing.updated_at}, after the seed file`);
    skipped++;
    continue;
  }

  const imageFile = p.media?.file ? path.join(MEDIA_DIR, p.media.file) : null;
  let imageBytes = null;
  if (imageFile) {
    try {
      imageBytes = await fs.readFile(imageFile);
    } catch {
      console.warn(`         ${p.slug}: image missing (${p.media.file}), row goes in without media`);
    }
  }

  const verb = existing ? "update" : "insert";
  const tail = existing ? ` (keeps status ${existing.status})` : " (as draft)";
  console.log(`${verb.padEnd(8)} ${p.slug}${tail}${imageBytes ? `, image ${p.media.file}` : ""}`);
  if (!APPLY) continue;

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
    status: existing ? existing.status : "draft",
    updated_at: new Date().toISOString(),
  };
  const { data: upserted, error } = await admin
    .from("shop_products")
    .upsert(row, { onConflict: "slug" })
    .select("id")
    .single();
  if (error || !upserted) {
    console.error(`         ${p.slug}: upsert failed: ${error?.message}`);
    failed++;
    continue;
  }
  const productId = upserted.id;

  let mediaRow = null;
  if (imageBytes) {
    try {
      const out = await normaliseImage(imageBytes);
      // Fixed paths, upserted: the import is idempotent by design and these
      // files are never swapped from the form, which writes fresh paths.
      const full = `products/seed-${p.slug}.jpg`;
      const thumb = thumbPath(full);
      const up1 = await admin.storage
        .from(BUCKET)
        .upload(full, out.full, { contentType: "image/jpeg", upsert: true });
      if (up1.error) throw new Error(up1.error.message);
      const up2 = await admin.storage
        .from(BUCKET)
        .upload(thumb, out.thumb, { contentType: "image/jpeg", upsert: true });
      if (up2.error) throw new Error(up2.error.message);
      mediaRow = {
        product_id: productId,
        media_url: admin.storage.from(BUCKET).getPublicUrl(full).data.publicUrl,
        thumb_url: admin.storage.from(BUCKET).getPublicUrl(thumb).data.publicUrl,
        alt_text: p.media.alt,
        sort_order: 0,
        is_primary: true,
      };
    } catch (e) {
      console.error(`         ${p.slug}: image failed: ${e instanceof Error ? e.message : e}`);
      failed++;
    }
  }

  if (mediaRow) {
    await admin.from("shop_product_media").delete().eq("product_id", productId);
    let { error: mediaError } = await admin.from("shop_product_media").insert(mediaRow);
    if (mediaError && columnAbsent(mediaError)) {
      // thumb_url ships ahead of 20260905_shop_simple.sql.
      const rest = { ...mediaRow };
      delete rest.thumb_url;
      ({ error: mediaError } = await admin.from("shop_product_media").insert(rest));
    }
    if (mediaError) console.error(`         ${p.slug}: media insert failed: ${mediaError.message}`);
  }

  await admin.from("shop_product_subjects").delete().eq("product_id", productId);
  if (p.subjects?.length) {
    const { error: subjectError } = await admin.from("shop_product_subjects").insert(
      p.subjects.map((s) => ({ product_id: productId, subject_type: s.type, subject_slug: s.slug })),
    );
    if (subjectError) console.error(`         ${p.slug}: subjects insert failed: ${subjectError.message}`);
  }
  written++;
}

if (APPLY) {
  console.log(`\nWritten ${written}, skipped ${skipped}, failed ${failed}.`);
} else {
  console.log(`\nWould write ${SEEDS.products.length - skipped}, skip ${skipped}. Run with --apply to write.`);
}
