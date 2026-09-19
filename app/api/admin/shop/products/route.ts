import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { logActivity } from "@/lib/admin/activityLog";
import { SHOP_CATEGORIES, SHOP_CLASSIFICATIONS } from "@/lib/security/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { scheduleBackInStock } from "@/lib/email/stockAlerts";

/**
 * Admin product management. Service-role throughout; this is the ONLY surface
 * where sourcing/supplier data travels, and it never leaves admin-gated
 * responses.
 *
 * IT USED TO BE ABLE TO WRITE TO EXACTLY ONE STORE. The create path looked up
 * `slug = 'eikon'` by literal and attached every product to whatever came
 * back, so an admin could not add a listing to any other store even after
 * creating one, and a database without that exact slug answered "EIKON store
 * row missing. Apply the shop migration first." storeId is now optional and
 * defaults to the oldest live store, which is EIKON today by age rather than
 * by being named here.
 */

const productSchema = z.object({
  id: z.string().uuid().optional(),
  // Which store this belongs to. Optional so the existing admin form, which
  // does not send it, keeps working: absent means the oldest live store.
  storeId: z.string().uuid().optional(),
  slug: z
    .string()
    .min(3)
    .max(120)
    .regex(/^[a-z0-9-]+$/),
  title: z.string().min(2).max(200),
  subtitle: z.string().max(300).optional().nullable(),
  descriptionMd: z.string().max(8000).optional().nullable(),
  priceCents: z.number().int().min(0).max(5_000_000),
  // Derived from CATEGORY_LABELS, like classification below. This was the
  // fourth hand-typed copy of the list, and adding a category meant finding
  // all four.
  category: z.enum(SHOP_CATEGORIES),
  // The THIRD hand-typed copy of this list, and it was missing `cross` and
  // `textile`. Derived now, like the seller schema, from the same label table
  // the forms render from. See lib/security/__tests__/listingVocabulary.test.ts.
  classification: z.enum(SHOP_CLASSIFICATIONS),
  inventoryStatus: z.enum([
    "ready_to_ship",
    "special_order",
    "coming_soon",
    "out_of_stock",
  ]),
  quantityAvailable: z.number().int().min(0).nullable().optional(),
  dispatchMinDays: z.number().int().min(0).max(365),
  dispatchMaxDays: z.number().int().min(0).max(365),
  materials: z.string().max(300).optional().nullable(),
  dimensions: z.string().max(200).optional().nullable(),
  productionMethod: z.string().max(300).optional().nullable(),
  makerName: z.string().max(200).optional().nullable(),
  countryOfOrigin: z.string().max(100).optional().nullable(),
  imageIsRepresentative: z.boolean().default(true),
  status: z.enum(["draft", "published", "paused", "archived"]),
  media: z
    .array(
      z.object({
        mediaUrl: z.string().min(1).max(1000),
        altText: z.string().min(3).max(500),
      }),
    )
    .max(8)
    .default([]),
  subjects: z
    .array(
      z.object({
        subjectType: z.enum(["saint", "christ", "theotokos", "feast", "event", "council"]),
        subjectSlug: z
          .string()
          .min(1)
          .max(100)
          .regex(/^[a-z0-9-]+$/),
      }),
    )
    .max(6)
    .default([]),
  sourcing: z
    .object({
      supplierName: z.string().max(200).optional().nullable(),
      supplierSku: z.string().max(120).optional().nullable(),
      supplierCostCents: z.number().int().min(0).nullable().optional(),
      supplierUrl: z.string().max(1000).optional().nullable(),
      leadTimeDays: z.number().int().min(0).max(365).nullable().optional(),
      stockStatus: z.string().max(120).optional().nullable(),
      attributionRequired: z.boolean().default(false),
      resaleRightsConfirmed: z.boolean().default(false),
      packagingNotes: z.string().max(2000).optional().nullable(),
      internalNotes: z.string().max(4000).optional().nullable(),
    })
    .optional()
    .nullable(),
});

export async function GET() {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const [products, sourcing, stores] = await Promise.all([
    admin
      .from("shop_products")
      .select(
        "*, media:shop_product_media(id, media_url, alt_text, sort_order, is_primary), subjects:shop_product_subjects(subject_type, subject_slug)",
      )
      .order("created_at", { ascending: false }),
    admin.from("shop_product_sourcing").select("*"),
    admin.from("shop_stores").select("id, slug, public_name, seller_id"),
  ]);
  if (products.error) {
    return NextResponse.json({ error: products.error.message }, { status: 500 });
  }
  // Soft-deleted rows leave the list, filtered here rather than in SQL so the
  // read works on a database without the column (release/v1.4 filters the
  // same way). Their slugs still come back, because a deleted product keeps
  // its slug: an old link or an order must never start resolving to a
  // different product (docs/DECISIONS.md on release/v1.4).
  const rows = (products.data ?? []) as { id: string; slug: string; title: string; deleted_at?: string | null }[];
  const live = rows.filter((p) => p.deleted_at == null);
  const deleted = rows
    .filter((p) => p.deleted_at != null)
    .sort((a, b) => String(b.deleted_at).localeCompare(String(a.deleted_at)));
  return NextResponse.json({
    products: live,
    deleted,
    sourcing: sourcing.data ?? [],
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
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid product." },
      { status: 400 },
    );
  }
  const p = parsed.data;
  if (p.dispatchMaxDays < p.dispatchMinDays) {
    return NextResponse.json(
      { error: "Dispatch max must be at least dispatch min." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // The named store, or the oldest one. Ordering by created_at rather than
  // filtering on a slug means this keeps working whatever the first store is
  // called, and it stops being a special case the moment there are two.
  const storeQuery = admin.from("shop_stores").select("id, seller_id");
  const { data: store, error: storeErr } = p.storeId
    ? await storeQuery.eq("id", p.storeId).maybeSingle()
    : await storeQuery
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
  if (storeErr) {
    return NextResponse.json({ error: storeErr.message }, { status: 500 });
  }
  if (!store) {
    return NextResponse.json(
      {
        error: p.storeId
          ? "That store doesn't exist."
          : "No stores exist yet. Create one from the Marketplace tab first.",
      },
      { status: p.storeId ? 404 : 409 },
    );
  }

  const productRow = {
    store_id: store.id,
    seller_id: store.seller_id,
    slug: p.slug,
    title: p.title,
    subtitle: p.subtitle ?? null,
    description_md: p.descriptionMd ?? null,
    price_cents: p.priceCents,
    category: p.category,
    classification: p.classification,
    inventory_status: p.inventoryStatus,
    quantity_available: p.quantityAvailable ?? null,
    dispatch_min_days: p.dispatchMinDays,
    dispatch_max_days: p.dispatchMaxDays,
    materials: p.materials ?? null,
    dimensions: p.dimensions ?? null,
    production_method: p.productionMethod ?? null,
    maker_name: p.makerName ?? null,
    country_of_origin: p.countryOfOrigin ?? null,
    image_is_representative: p.imageIsRepresentative,
    status: p.status,
    updated_at: new Date().toISOString(),
  };

  let productId = p.id ?? null;
  // Whether this save brings a sold-out piece back, so the readers who asked
  // to be told can be. Read before the write; a failed read only means no
  // alert fires, never a failed save.
  let wasOutOfStock = false;
  if (productId) {
    const { data: prior } = await admin
      .from("shop_products")
      .select("inventory_status")
      .eq("id", productId)
      .maybeSingle();
    wasOutOfStock = (prior as { inventory_status?: string } | null)?.inventory_status === "out_of_stock";

    const { error } = await admin
      .from("shop_products")
      .update(productRow)
      .eq("id", productId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (wasOutOfStock && p.inventoryStatus !== "out_of_stock" && p.status === "published") {
      scheduleBackInStock(productId);
    }
  } else {
    const { data, error } = await admin
      .from("shop_products")
      .insert(productRow)
      .select("id")
      .single();
    if (error) {
      // 23505 is a unique violation, and on this table that is the slug. Said
      // in words, because the raw message names a constraint, not a field.
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "That slug is already taken, possibly by a deleted product. Change the slug and save again.", field: "slug" },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    productId = data.id as string;
  }

  // Replace media + subjects wholesale: small sets, simplest correct thing.
  await admin.from("shop_product_media").delete().eq("product_id", productId);
  if (p.media.length > 0) {
    const { error } = await admin.from("shop_product_media").insert(
      p.media.map((m, i) => ({
        product_id: productId,
        media_url: m.mediaUrl,
        alt_text: m.altText,
        sort_order: i,
        is_primary: i === 0,
      })),
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin.from("shop_product_subjects").delete().eq("product_id", productId);
  if (p.subjects.length > 0) {
    const { error } = await admin.from("shop_product_subjects").insert(
      p.subjects.map((s) => ({
        product_id: productId,
        subject_type: s.subjectType,
        subject_slug: s.subjectSlug,
      })),
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (p.sourcing) {
    // Free-text supplier name: find-or-create keeps Phase 1 light while
    // the suppliers table stays the source of truth.
    let supplierId: string | null = null;
    if (p.sourcing.supplierName) {
      const { data: existing } = await admin
        .from("shop_suppliers")
        .select("id")
        .eq("name", p.sourcing.supplierName)
        .maybeSingle();
      if (existing) {
        supplierId = existing.id as string;
      } else {
        const { data: created } = await admin
          .from("shop_suppliers")
          .insert({ name: p.sourcing.supplierName })
          .select("id")
          .single();
        supplierId = (created?.id as string) ?? null;
      }
    }
    const { error } = await admin.from("shop_product_sourcing").upsert({
      product_id: productId,
      // Only when a name was sent. The editor never loads the supplier's name
      // back for a saved product, so its field is blank on every edit, and
      // writing supplier_id: null here unlinked the supplier each time a price
      // or a typo was fixed. A blank name now leaves the link as it was.
      ...(p.sourcing.supplierName ? { supplier_id: supplierId } : {}),
      supplier_sku: p.sourcing.supplierSku ?? null,
      supplier_cost_cents: p.sourcing.supplierCostCents ?? null,
      supplier_url: p.sourcing.supplierUrl ?? null,
      lead_time_days: p.sourcing.leadTimeDays ?? null,
      stock_status: p.sourcing.stockStatus ?? null,
      attribution_required: p.sourcing.attributionRequired,
      resale_rights_confirmed: p.sourcing.resaleRightsConfirmed,
      packaging_notes: p.sourcing.packagingNotes ?? null,
      internal_notes: p.sourcing.internalNotes ?? null,
      updated_at: new Date().toISOString(),
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: productId });
}

/**
 * Delete and restore, the two writes that are not a full save.
 *
 * DELETE IS SOFT. shop_order_items references shop_products with on delete
 * set null, so a hard delete would strip the product off every order that ever
 * bought it. deleted_at hides the row from every list here and from every
 * public read, and status goes to archived in the same write so the
 * storefront drops it even on a policy that has never heard of deleted_at.
 * Carts that still hold it fail at checkout with "isn't available any more",
 * which is the existing path for a paused listing.
 *
 * RESTORE clears deleted_at and leaves the status archived. Bringing a product
 * back into the admin list is not the same decision as putting it back on
 * sale, so the second is left to the Publish button.
 */
const patchSchema = z
  .object({
    id: z.string().uuid(),
    deleted: z.literal(true).optional(),
    restore: z.literal(true).optional(),
  })
  .refine((v) => Boolean(v.deleted) !== Boolean(v.restore), {
    message: "Say delete or restore, one of the two.",
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
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }
  const { id, deleted } = parsed.data;

  const admin = createAdminClient();
  const { data: prior } = await admin
    .from("shop_products")
    .select("slug, title, status")
    .eq("id", id)
    .maybeSingle();
  if (!prior) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = deleted
    ? { deleted_at: now, status: "archived", updated_at: now }
    : { deleted_at: null, updated_at: now };
  const { error } = await admin.from("shop_products").update(patch).eq("id", id);
  if (error) {
    // 42703 / PGRST204: the column is not there. Production has had it since
    // the v1.4 merge ran 20260905_shop_simple.sql; a database built from main
    // alone gets it from 20260918_shop_growth.sql.
    if (error.code === "42703" || error.code === "PGRST204") {
      return NextResponse.json(
        {
          error:
            "Delete needs the deleted_at column (supabase/migrations/20260918_shop_growth.sql). Pause the product for now.",
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  void logActivity({
    actorEmail: adminUser.email ?? null,
    action: deleted ? "product.delete" : "product.restore",
    entityType: "shop_product",
    entityId: id,
    // The prior status is what a restore cannot recover from the row itself.
    detail: { slug: prior.slug, title: prior.title, priorStatus: prior.status },
  });

  return NextResponse.json({ ok: true, id });
}
