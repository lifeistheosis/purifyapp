import { NextResponse } from "next/server";
import { z } from "zod";

import { rateLimited } from "@/lib/security/ratelimit";
import { shopListingSchema } from "@/lib/security/schemas";
import { shopEnabled } from "@/lib/shop/flags";
import { getSellerContext } from "@/lib/shop/seller";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Seller listings. The route derives store and seller identity from
 * the session — the payload can't place a product in someone else's
 * store, and price/inventory columns only ever come from the validated
 * body, never merged blind. Publishing has two honesty gates: at least
 * one image (with alt text), and a live store.
 */

function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

type ListingData = z.infer<typeof shopListingSchema>;

function productColumns(data: ListingData) {
  return {
    title: data.title,
    subtitle: data.subtitle ?? null,
    description_md: data.descriptionMd ?? null,
    price_cents: data.priceCents,
    category: data.category,
    classification: data.classification,
    inventory_status: data.inventoryStatus,
    quantity_available: data.quantityAvailable ?? null,
    dispatch_min_days: data.dispatchMinDays,
    dispatch_max_days: data.dispatchMaxDays,
    materials: data.materials ?? null,
    dimensions: data.dimensions ?? null,
    production_method: data.productionMethod ?? null,
    maker_name: data.makerName ?? null,
    country_of_origin: data.countryOfOrigin ?? null,
    image_is_representative: data.imageIsRepresentative,
    status: data.status,
    updated_at: new Date().toISOString(),
  };
}

function validateListing(data: ListingData, storeLive: boolean): string | null {
  if (data.dispatchMaxDays < data.dispatchMinDays) {
    return "The dispatch window's end can't come before its start.";
  }
  if (data.status === "published" && data.media.length === 0) {
    return "Add at least one photo before publishing.";
  }
  if (data.status === "published" && !storeLive) {
    return "Your store isn't live yet; save this listing as a draft.";
  }
  return null;
}

async function guard() {
  if (!shopEnabled()) {
    return {
      error: NextResponse.json({ error: "Shop is not available." }, { status: 404 }),
    } as const;
  }
  const ctx = await getSellerContext();
  if (ctx.state !== "seller") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const;
  }
  if (ctx.seller.status !== "active") {
    return {
      error: NextResponse.json(
        { error: "Your seller account is not active." },
        { status: 403 },
      ),
    } as const;
  }
  if (!ctx.store) {
    return {
      error: NextResponse.json(
        { error: "Your store is still being set up." },
        { status: 409 },
      ),
    } as const;
  }
  if (await rateLimited(`shop-seller-listing:${ctx.userId}`, 3600, 120)) {
    return {
      error: NextResponse.json(
        { error: "Too many updates. Please try again later." },
        { status: 429 },
      ),
    } as const;
  }
  return { ctx: { ...ctx, store: ctx.store } } as const;
}

async function replaceMedia(
  productId: string,
  media: ListingData["media"],
): Promise<void> {
  const admin = createAdminClient();
  await admin.from("shop_product_media").delete().eq("product_id", productId);
  if (media.length > 0) {
    await admin.from("shop_product_media").insert(
      media.map((m, i) => ({
        product_id: productId,
        media_url: m.url,
        alt_text: m.alt,
        sort_order: i,
        is_primary: i === 0,
      })),
    );
  }
}

export async function POST(req: Request) {
  const g = await guard();
  if ("error" in g) return g.error;
  const { ctx } = g;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = shopListingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid listing." },
      { status: 400 },
    );
  }
  const invalid = validateListing(parsed.data, ctx.store.status === "live");
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  const admin = createAdminClient();

  // Unique slug: title, then title-2, title-3… capped so a hostile
  // title can't spin the loop.
  const base = slugify(parsed.data.title) || "icon";
  let slug = base;
  for (let attempt = 2; attempt <= 20; attempt++) {
    const { data: taken } = await admin
      .from("shop_products")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!taken) break;
    slug = `${base}-${attempt}`;
  }

  const { data: product, error } = await admin
    .from("shop_products")
    .insert({
      store_id: ctx.store.id,
      seller_id: ctx.seller.id,
      slug,
      ...productColumns(parsed.data),
    })
    .select("id, slug")
    .single();
  if (error || !product) {
    console.warn("[shop] listing insert failed", error?.message);
    return NextResponse.json(
      { error: "Couldn't create the listing. Please try again." },
      { status: 500 },
    );
  }
  await replaceMedia(product.id, parsed.data.media);

  return NextResponse.json({ ok: true, id: product.id, slug: product.slug });
}

const updateSchema = shopListingSchema.extend({ id: z.string().uuid() });

export async function PATCH(req: Request) {
  const g = await guard();
  if ("error" in g) return g.error;
  const { ctx } = g;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid listing." },
      { status: 400 },
    );
  }
  const invalid = validateListing(parsed.data, ctx.store.status === "live");
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  // Ownership check with the seller's own client.
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("shop_products")
    .select("id, seller_id")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!existing || existing.seller_id !== ctx.seller.id) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("shop_products")
    .update(productColumns(parsed.data))
    .eq("id", existing.id);
  if (error) {
    console.warn("[shop] listing update failed", error.message);
    return NextResponse.json(
      { error: "Couldn't save the listing. Please try again." },
      { status: 500 },
    );
  }
  await replaceMedia(existing.id, parsed.data.media);

  return NextResponse.json({ ok: true, id: existing.id });
}
