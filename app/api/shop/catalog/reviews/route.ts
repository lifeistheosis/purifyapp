import { NextResponse } from "next/server";

import { corsPreflight, withCors } from "@/lib/api/cors";
import { shopEnabled } from "@/lib/shop/flags";
import { wearsVerifiedBadge } from "@/lib/shop/reviews";
import { createClient } from "@/lib/supabase/server";

/**
 * Public reviews for a product (by slug) + the aggregate.
 *
 * NOT every review is a verified purchase: the admin seeding route inserts
 * rows with a null order_id, bypassing the delivered-order gate in SQL. This
 * docstring used to claim otherwise, which is how the badge and then the
 * rating both came to include seeded rows. Unverified rows are returned and
 * displayed, labelled, but they are excluded from reviewCount and avgStars.
 *
 * The reviewer's chosen display name + location come back for
 * marketplace-style attribution; anonymous reviews stored them as null (the
 * submit RPC nulls both when anonymous), so nothing private is exposed here.
 */
export async function GET(req: Request) {
  if (!shopEnabled()) {
    return withCors(NextResponse.json({ error: "Not found." }, { status: 404 }), req);
  }

  const slug = new URL(req.url).searchParams.get("product");
  if (!slug) {
    return withCors(
      NextResponse.json({ error: "Missing product." }, { status: 400 }),
      req,
    );
  }

  const supabase = await createClient();
  const { data: product } = await supabase
    .from("shop_products")
    .select("id")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  const empty = { reviews: [], reviewCount: 0, avgStars: null };
  if (!product) {
    return withCors(NextResponse.json(empty), req);
  }

  // order_id is selected so the client can tell a real purchase from an
  // operator-seeded row. It used to be absent, and ReviewsSection rendered
  // "Verified buyer" on EVERY row unconditionally, so admin-seeded reviews
  // (app/api/admin/shop/reviews/route.ts inserts them with order_id null,
  // bypassing the delivered-order gate in shop_submit_review) were being
  // shown to shoppers as verified purchases. That is exactly the fabricated
  // review practice this project already declined once, arriving by a
  // different door, and it is FTC exposure under 16 CFR Part 465.
  //
  // photo_urls is optional until its migration lands; fall back without it.
  const fetchRows = (withPhotos: boolean) =>
    supabase
      .from("shop_reviews")
      .select(
        `id, stars, body, created_at, display_name, location, anonymous, order_id${withPhotos ? ", photo_urls" : ""}`,
      )
      .eq("product_id", product.id)
      .order("created_at", { ascending: false })
      .limit(100);
  let { data, error } = await fetchRows(true);
  if (error && /photo_urls/i.test(error.message)) {
    ({ data, error } = await fetchRows(false));
  }
  // Cast: the dynamic column string defeats supabase-js's select parser.
  const reviews = (data ?? []) as unknown as {
    stars: number;
    order_id?: string | null;
  }[];

  // The rating is computed from VERIFIED rows only, using the same predicate
  // that governs the badge, so the number and the badge can never disagree.
  //
  // Fixing the badge alone left the half that actually moves a sale: a
  // seeded 5 was still lifting the average and the count a shopper reads
  // before deciding. That is the same fabricated-review exposure described
  // above, just expressed as a number instead of a card.
  //
  // Every row is still RETURNED, and unverified ones still render with their
  // badge withheld. Sample content stays visible and labelled rather than
  // being silently dropped, which is the standing rule for seeded content.
  const rated = reviews.filter(wearsVerifiedBadge);
  const reviewCount = rated.length;
  const total = rated.reduce((sum, r) => sum + r.stars, 0);
  const avgStars = reviewCount > 0 ? total / reviewCount : null;

  return withCors(
    NextResponse.json(
      { reviews, reviewCount, avgStars },
      { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=300" } },
    ),
    req,
  );
}

export const OPTIONS = corsPreflight;
