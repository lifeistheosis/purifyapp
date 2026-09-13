import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { isColumnAbsent } from "@/lib/admin/tableAbsent";
import { SHOP_CLASSIFICATIONS } from "@/lib/security/schemas";
import { SLUG_PATTERN, isReservedProductSlug, slugify, uniqueSlug, type SlugLookup } from "@/lib/shop/slug";
import { createAdminClient } from "@/lib/supabase/admin";

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
 *
 * THREE COLUMNS SHIP AHEAD OF THEIR MIGRATION (supabase/migrations/
 * 20260905_shop_simple.sql): shop_products.blessing_available and deleted_at,
 * shop_product_media.thumb_url. Every write that names one retries without
 * it when PostgREST answers "column not found", and every read selects `*`
 * so an absent column is simply not in the row. The form works either way;
 * what it cannot do until the migration lands is delete or offer a blessing,
 * and PATCH says so.
 *
 * ERRORS NAME THEIR FIELD. A rejected save answers { error, field } where
 * field is the payload key zod complained about, so the form can put the
 * sentence beside the box rather than at the bottom of the page.
 */

const productSchema = z.object({
  id: z.string().uuid().optional(),
  // Which store this belongs to. Optional so the existing admin form, which
  // does not send it, keeps working: absent means the oldest live store.
  storeId: z.string().uuid().optional(),
  // Optional now. Absent on a new product means "make one from the title"
  // (lib/shop/slug.ts); absent on an edit means "keep the one it has".
  slug: z
    .string()
    .min(3)
    .max(120)
    .regex(SLUG_PATTERN, "Lowercase letters, digits and hyphens only.")
    .optional(),
  title: z.string().min(2, "Give the product a name.").max(200),
  subtitle: z.string().max(300).optional().nullable(),
  descriptionMd: z.string().max(8000).optional().nullable(),
  priceCents: z
    .number()
    .int()
    .min(0, "The price cannot be negative.")
    .max(5_000_000, "That price is above the $50,000 ceiling."),
  category: z.enum([
    "christ",
    "theotokos",
    "saints",
    "feasts",
    "prayer_corner",
    "crosses",
    "sets",
  ]),
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
  blessingAvailable: z.boolean().optional(),
  media: z
    .array(
      z.object({
        mediaUrl: z.string().min(1).max(1000),
        altText: z.string().min(3, "Say what the photo shows, in a few words.").max(500),
        thumbUrl: z.string().max(1000).optional().nullable(),
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

export type AdminProductPayload = z.input<typeof productSchema>;

/** { error, field } from the first zod issue, so the form can place it. */
function fieldError(error: z.ZodError, fallback: string) {
  const issue = error.issues[0];
  const field = issue?.path[0];
  return NextResponse.json(
    {
      error: issue?.message ?? fallback,
      field: typeof field === "string" ? field : undefined,
    },
    { status: 400 },
  );
}

/** Columns the migration adds. Stripped and retried when the table lacks them. */
const AHEAD_OF_MIGRATION = ["blessing_available", "deleted_at"] as const;

export async function GET() {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const [products, sourcing, stores] = await Promise.all([
    admin
      .from("shop_products")
      // `*` on media too: thumb_url rides along once the migration lands and
      // is simply absent before it, where a named column would 400.
      .select(
        "*, media:shop_product_media(*), subjects:shop_product_subjects(subject_type, subject_slug)",
      )
      .order("created_at", { ascending: false }),
    admin.from("shop_product_sourcing").select("*"),
    admin.from("shop_stores").select("id, slug, public_name, seller_id, status"),
  ]);
  if (products.error) {
    return NextResponse.json({ error: products.error.message }, { status: 500 });
  }
  // Soft-deleted rows leave every list. Filtered here rather than in SQL so
  // the read works before the column exists.
  const live = (products.data ?? []).filter(
    (p) => (p as { deleted_at?: string | null }).deleted_at == null,
  );
  return NextResponse.json({
    products: live,
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
  if (!parsed.success) return fieldError(parsed.error, "Invalid product.");
  const p = parsed.data;
  if (p.dispatchMaxDays < p.dispatchMinDays) {
    return NextResponse.json(
      { error: "Dispatch max must be at least dispatch min.", field: "dispatchMaxDays" },
      { status: 400 },
    );
  }
  if (p.slug && isReservedProductSlug(p.slug)) {
    return NextResponse.json(
      { error: "That slug is a route of its own. Choose another.", field: "slug" },
      { status: 400 },
    );
  }
  if (p.status === "published" && p.media.length === 0) {
    return NextResponse.json(
      { error: "Add at least one photo before making it visible.", field: "media" },
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

  // The slug. Typed, it is checked for collision against every other row;
  // absent on a new product, it is made from the title. An edit that sends
  // none keeps its own.
  let slug: string | null = null;
  if (p.slug) {
    const { data: taken } = await admin
      .from("shop_products")
      .select("id")
      .eq("slug", p.slug)
      .maybeSingle();
    if (taken && taken.id !== p.id) {
      return NextResponse.json(
        { error: "Another product already uses that slug.", field: "slug" },
        { status: 409 },
      );
    }
    slug = p.slug;
  } else if (!p.id) {
    slug = await uniqueSlug(admin as unknown as SlugLookup, slugify(p.title));
  }

  const productRow: Record<string, unknown> = {
    store_id: store.id,
    seller_id: store.seller_id,
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
  if (slug) productRow.slug = slug;
  if (p.blessingAvailable !== undefined) productRow.blessing_available = p.blessingAvailable;

  let productId = p.id ?? null;
  const written = await writeProduct(admin, productRow, productId);
  if ("error" in written) {
    return NextResponse.json({ error: written.error }, { status: 500 });
  }
  productId = written.id;

  // Replace media + subjects wholesale: small sets, simplest correct thing.
  await admin.from("shop_product_media").delete().eq("product_id", productId);
  if (p.media.length > 0) {
    const mediaErr = await insertMedia(
      admin,
      p.media.map((m, i) => ({
        product_id: productId,
        media_url: m.mediaUrl,
        alt_text: m.altText,
        sort_order: i,
        is_primary: i === 0,
        thumb_url: m.thumbUrl ?? null,
      })),
    );
    if (mediaErr) return NextResponse.json({ error: mediaErr, field: "media" }, { status: 500 });
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
    if (error) return NextResponse.json({ error: error.message, field: "subjects" }, { status: 500 });
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
    if (error) return NextResponse.json({ error: error.message, field: "sourcing" }, { status: 500 });
  }

  const { data: saved } = await admin
    .from("shop_products")
    .select("slug")
    .eq("id", productId)
    .maybeSingle();
  return NextResponse.json({ ok: true, id: productId, slug: saved?.slug ?? slug });
}

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Insert or update the product row. On "column not found" the columns that
 * are ahead of their migration are dropped and the write runs again, so a
 * save from the new form succeeds on a database that has not had
 * 20260905_shop_simple.sql yet.
 */
async function writeProduct(
  admin: Admin,
  row: Record<string, unknown>,
  id: string | null,
): Promise<{ id: string } | { error: string }> {
  const attempt = async (r: Record<string, unknown>) => {
    if (id) {
      const { error } = await admin.from("shop_products").update(r).eq("id", id);
      return { id, error };
    }
    const { data, error } = await admin.from("shop_products").insert(r).select("id").single();
    return { id: (data?.id as string | undefined) ?? null, error };
  };
  let res = await attempt(row);
  if (res.error && isColumnAbsent(res.error)) {
    const trimmed = { ...row };
    for (const col of AHEAD_OF_MIGRATION) delete trimmed[col];
    res = await attempt(trimmed);
  }
  if (res.error) return { error: res.error.message };
  if (!res.id) return { error: "The product was not saved." };
  return { id: res.id };
}

async function insertMedia(
  admin: Admin,
  rows: Record<string, unknown>[],
): Promise<string | null> {
  let { error } = await admin.from("shop_product_media").insert(rows);
  if (error && isColumnAbsent(error)) {
    ({ error } = await admin.from("shop_product_media").insert(
      rows.map((r) => {
        const rest = { ...r };
        delete rest.thumb_url;
        return rest;
      }),
    ));
  }
  return error ? error.message : null;
}

/**
 * The two small writes the list page makes without opening the form:
 * the Visible switch (status published or draft, nothing else touched)
 * and soft delete (deleted_at set, the row gone from every list and every
 * public read; the slug stays taken).
 */
const patchSchema = z
  .object({
    id: z.string().uuid(),
    status: z.enum(["published", "draft"]).optional(),
    deleted: z.literal(true).optional(),
  })
  .refine((v) => v.status !== undefined || v.deleted === true, {
    message: "Nothing to change.",
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
  if (!parsed.success) return fieldError(parsed.error, "Invalid request.");
  const { id, status, deleted } = parsed.data;

  const admin = createAdminClient();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status) patch.status = status;
  if (deleted) patch.deleted_at = new Date().toISOString();

  const { data, error } = await admin
    .from("shop_products")
    .update(patch)
    .eq("id", id)
    .select("id, status")
    .maybeSingle();
  if (error) {
    if (deleted && isColumnAbsent(error)) {
      return NextResponse.json(
        {
          error:
            "Delete needs the shop_simple migration (supabase/migrations/20260905_shop_simple.sql). Until it is applied, set the product to hidden instead.",
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Product not found." }, { status: 404 });
  return NextResponse.json({ ok: true, id: data.id, status: data.status });
}
