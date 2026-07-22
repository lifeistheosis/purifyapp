import { NextResponse } from "next/server";

import { corsPreflight, withCors } from "@/lib/api/cors";
import { shopEnabled } from "@/lib/shop/flags";
import { createClient } from "@/lib/supabase/server";

/**
 * Public store-level reviews for a store (by slug) + the aggregate. Every
 * review is from a buyer with a delivered order from the store. The reviewer's
 * chosen display name + location come back for marketplace-style attribution;
 * anonymous reviews stored them as null (the submit RPC nulls both), so nothing
 * private is exposed here.
 */
export async function GET(req: Request) {
  if (!shopEnabled()) {
    return withCors(NextResponse.json({ error: "Not found." }, { status: 404 }), req);
  }

  const slug = new URL(req.url).searchParams.get("store");
  if (!slug) {
    return withCors(
      NextResponse.json({ error: "Missing store." }, { status: 400 }),
      req,
    );
  }

  const supabase = await createClient();
  const { data: store } = await supabase
    .from("shop_stores")
    .select("id")
    .eq("slug", slug)
    .eq("status", "live")
    .maybeSingle();

  const empty = { reviews: [], reviewCount: 0, avgStars: null };
  if (!store) {
    return withCors(NextResponse.json(empty), req);
  }

  // photo_urls is optional until its migration lands; fall back without it.
  const fetchRows = (withPhotos: boolean) =>
    supabase
      .from("shop_store_reviews")
      .select(
        `id, stars, body, created_at, display_name, location, anonymous${withPhotos ? ", photo_urls" : ""}`,
      )
      .eq("store_id", store.id)
      .order("created_at", { ascending: false })
      .limit(100);
  let { data, error } = await fetchRows(true);
  if (error && /photo_urls/i.test(error.message)) {
    ({ data, error } = await fetchRows(false));
  }
  // Cast: the dynamic column string defeats supabase-js's select parser.
  const reviews = (data ?? []) as unknown as { stars: number }[];
  const reviewCount = reviews.length;
  const total = reviews.reduce((sum, r) => sum + (r.stars as number), 0);
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
