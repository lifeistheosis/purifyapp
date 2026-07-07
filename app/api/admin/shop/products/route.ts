import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Admin product management for Purify-operated stores (EIKON in
 * Phase 1). Service-role throughout; this is the ONLY surface where
 * sourcing/supplier data travels, and it never leaves admin-gated
 * responses.
 */

const productSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .min(3)
    .max(120)
    .regex(/^[a-z0-9-]+$/),
  title: z.string().min(2).max(200),
  subtitle: z.string().max(300).optional().nullable(),
  descriptionMd: z.string().max(8000).optional().nullable(),
  priceCents: z.number().int().min(0).max(5_000_000),
  category: z.enum([
    "christ",
    "theotokos",
    "saints",
    "feasts",
    "prayer_corner",
    "crosses",
    "sets",
  ]),
  classification: z.enum([
    "printed_mounted",
    "standard_reproduction",
    "laminated",
    "wooden",
    "hand_finished_reproduction",
    "prayer_rope",
    "incense",
    "beaded",
  ]),
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
  return NextResponse.json({
    products: products.data ?? [],
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

  // Phase 1: all admin-managed products belong to EIKON.
  const { data: store } = await admin
    .from("shop_stores")
    .select("id, seller_id")
    .eq("slug", "eikon")
    .single();
  if (!store) {
    return NextResponse.json(
      { error: "EIKON store row missing. Apply the shop migration first." },
      { status: 500 },
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
  if (productId) {
    const { error } = await admin
      .from("shop_products")
      .update(productRow)
      .eq("id", productId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { data, error } = await admin
      .from("shop_products")
      .insert(productRow)
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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
      supplier_id: supplierId,
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
