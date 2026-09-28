"use client";

// Client-side calls for the Kitchen. Public reads, the submit and everything
// about reviews go through the API via apiFetch (native rewrites to SITE_URL
// + Bearer). Members' own pending submissions are readable straight from
// Supabase under RLS (author-select).

import { apiFetch } from "@/lib/api/client";
import { createClient } from "@/lib/supabase/client";
import type {
  FastLevel,
  KitchenReview,
  RatingSummary,
  RecipeSeason,
  RecipeTradition,
  TrapezaRecipe,
} from "./recipes";

export type RecipeFilters = {
  fastLevel?: FastLevel;
  season?: RecipeSeason;
  tradition?: RecipeTradition;
  limit?: number;
};

/** Published recipes, or null when the read failed (not "there are none"). */
export async function fetchRecipes(
  filters: RecipeFilters = {},
): Promise<TrapezaRecipe[] | null> {
  const qs = new URLSearchParams();
  if (filters.fastLevel && filters.fastLevel !== "any")
    qs.set("level", filters.fastLevel);
  if (filters.season && filters.season !== "any") qs.set("season", filters.season);
  if (filters.tradition && filters.tradition !== "any")
    qs.set("tradition", filters.tradition);
  if (filters.limit) qs.set("limit", String(filters.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  try {
    const res = await apiFetch(`/api/trapeza${suffix}`);
    if (!res.ok) return null;
    const json = (await res.json()) as { recipes?: TrapezaRecipe[] };
    return json.recipes ?? [];
  } catch {
    return null;
  }
}

export async function fetchRecipe(id: string): Promise<TrapezaRecipe | null> {
  try {
    const res = await apiFetch(`/api/trapeza/${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    const json = (await res.json()) as { recipe?: TrapezaRecipe };
    return json.recipe ?? null;
  } catch {
    return null;
  }
}

export type SubmitRecipeInput = {
  title: string;
  fastLevel: FastLevel;
  season: RecipeSeason;
  tradition: RecipeTradition;
  summary?: string | null;
  ingredients: string;
  steps: string;
  servings?: string | null;
  timeMinutes?: number | null;
  photoUrl?: string | null;
  ownPhoto?: boolean;
};

/** `status` is the HTTP status, so the page can say something in the reader's language. */
export type ApiResult = { ok: boolean; status: number; error?: string; id?: string };

async function readResult(res: Response): Promise<ApiResult> {
  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    /* empty */
  }
  if (!res.ok)
    return {
      ok: false,
      status: res.status,
      error: (json.error as string) || "Something went wrong.",
    };
  return { ok: true, status: res.status, id: json.id as string | undefined };
}

async function send(path: string, init: RequestInit): Promise<ApiResult> {
  try {
    return await readResult(await apiFetch(path, init));
  } catch {
    return { ok: false, status: 0, error: "Something went wrong." };
  }
}

export async function submitRecipe(input: SubmitRecipeInput): Promise<ApiResult> {
  return send("/api/trapeza", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function reportRecipe(
  id: string,
  reason?: string,
): Promise<ApiResult> {
  return send(`/api/trapeza/${encodeURIComponent(id)}/report`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ reason: reason || null }),
  });
}

export async function reportReview(recipeId: string, reviewId: string): Promise<ApiResult> {
  return send(`/api/trapeza/${encodeURIComponent(recipeId)}/report`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ reviewId }),
  });
}

export type ReviewsState =
  | { kind: "closed" }
  | { kind: "failed" }
  | { kind: "ready"; reviews: KitchenReview[]; summary: RatingSummary; signedIn: boolean };

/**
 * A recipe's reviews. "closed" until the reviews table exists (the page shows
 * no reviews section at all), "failed" when the read did not work, which the
 * page must not show as "no reviews yet".
 */
export async function fetchReviews(recipeId: string): Promise<ReviewsState> {
  try {
    const res = await apiFetch(`/api/trapeza/${encodeURIComponent(recipeId)}/reviews`, {
      cache: "no-store",
    });
    if (!res.ok) return { kind: "failed" };
    const json = (await res.json()) as {
      open?: boolean;
      reviews?: KitchenReview[];
      summary?: RatingSummary;
      signedIn?: boolean;
    };
    if (json.open === false) return { kind: "closed" };
    return {
      kind: "ready",
      reviews: json.reviews ?? [],
      summary: json.summary ?? { avg: null, count: 0 },
      signedIn: Boolean(json.signedIn),
    };
  } catch {
    return { kind: "failed" };
  }
}

export type ReviewInput = {
  stars: number;
  body: string | null;
  photoUrls: string[];
  ownPhotos: boolean;
};

export async function saveReview(recipeId: string, input: ReviewInput): Promise<ApiResult> {
  return send(`/api/trapeza/${encodeURIComponent(recipeId)}/reviews`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function deleteReview(recipeId: string): Promise<ApiResult> {
  return send(`/api/trapeza/${encodeURIComponent(recipeId)}/reviews`, { method: "DELETE" });
}

/** The signed-in member's own submissions (self-select RLS), any status. */
export async function fetchMySubmissions(): Promise<TrapezaRecipe[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("trapeza_recipes")
    .select(
      "id, author_id, title, fast_level, season, tradition, summary, ingredients, steps, servings, time_minutes, status, created_at",
    )
    .eq("author_id", user.id)
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as TrapezaRecipe[];
}
