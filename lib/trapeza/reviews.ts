import "server-only";

import { avatarSrc } from "@/lib/community/avatarSrc";
import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  summarizeStars,
  type KitchenReview,
  type RatingSummary,
  type TrapezaRecipe,
} from "./recipes";

/**
 * Reviews of Kitchen recipes, read on the service role.
 *
 * trapeza_recipe_reviews has no read policy (20260928_kitchen.sql): the
 * member's user id stays on the server, and each review goes out with a
 * `mine` flag instead. Every function here fails soft, and tells "the table
 * is not there yet" apart from "the read failed", because the first means
 * reviews are simply not open and the second must not read as "no reviews".
 */

const REVIEW_SELECT =
  "id, author_id, stars, body, photo_urls, author_name, author_avatar, created_at, updated_at";

type ReviewRow = {
  id: string;
  author_id: string;
  stars: number;
  body: string | null;
  photo_urls: string[] | null;
  author_name: string;
  author_avatar: string | null;
  created_at: string;
  updated_at: string;
};

export type ReviewsRead =
  | { open: false }
  | { open: true; failed: false; reviews: KitchenReview[]; summary: RatingSummary }
  | { open: true; failed: true };

function toReview(row: ReviewRow, viewerId: string | null): KitchenReview {
  return {
    id: row.id,
    stars: row.stars,
    body: row.body,
    photo_urls: row.photo_urls ?? [],
    author_name: row.author_name,
    // Google pictures through our own domain, as the community feed does
    // (lib/community/avatarSrc.ts), so they load in the Android app.
    author_avatar: avatarSrc(row.author_avatar),
    created_at: row.created_at,
    updated_at: row.updated_at,
    mine: viewerId !== null && row.author_id === viewerId,
  };
}

/** Published reviews of one recipe, newest first, the viewer's own leading. */
export async function listReviews(
  recipeId: string,
  viewerId: string | null,
): Promise<ReviewsRead> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("trapeza_recipe_reviews")
      .select(REVIEW_SELECT)
      .eq("recipe_id", recipeId)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      if (isTableAbsent(error)) return { open: false };
      console.warn("[kitchen] listReviews failed", error.message);
      return { open: true, failed: true };
    }
    const rows = (data ?? []) as ReviewRow[];
    const reviews = rows
      .map((r) => toReview(r, viewerId))
      .sort((a, b) => Number(b.mine) - Number(a.mine));
    return {
      open: true,
      failed: false,
      reviews,
      summary: summarizeStars(rows.map((r) => r.stars)),
    };
  } catch (e) {
    console.warn("[kitchen] listReviews threw", e instanceof Error ? e.message : e);
    return { open: true, failed: true };
  }
}

/**
 * Average and count per recipe, for the catalogue's cards. Empty when the
 * table is absent or the read fails: a card without stars is the right
 * fallback for both, since neither says "rated zero".
 */
export async function ratingsFor(ids: string[]): Promise<Map<string, RatingSummary>> {
  const out = new Map<string, RatingSummary>();
  if (ids.length === 0) return out;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("trapeza_recipe_reviews")
      .select("recipe_id, stars")
      .in("recipe_id", ids)
      .eq("status", "published")
      .limit(5000);
    if (error) {
      if (!isTableAbsent(error)) console.warn("[kitchen] ratingsFor failed", error.message);
      return out;
    }
    const byRecipe = new Map<string, number[]>();
    for (const row of (data ?? []) as { recipe_id: string; stars: number }[]) {
      const list = byRecipe.get(row.recipe_id) ?? [];
      list.push(row.stars);
      byRecipe.set(row.recipe_id, list);
    }
    for (const [id, stars] of byRecipe) out.set(id, summarizeStars(stars));
    return out;
  } catch (e) {
    console.warn("[kitchen] ratingsFor threw", e instanceof Error ? e.message : e);
    return out;
  }
}

/** The recipes with their rating fields filled in. */
export async function withRatings(recipes: TrapezaRecipe[]): Promise<TrapezaRecipe[]> {
  const ratings = await ratingsFor(recipes.map((r) => r.id));
  return recipes.map((r) => {
    const s = ratings.get(r.id);
    return { ...r, rating_avg: s?.avg ?? null, rating_count: s?.count ?? 0 };
  });
}
