"use client";

// Client-side calls for the Trapeza. Public reads and the submit go through the
// API via apiFetch (native rewrites to SITE_URL + Bearer). Members' own pending
// submissions are readable straight from Supabase under RLS (author-select).

import { apiFetch } from "@/lib/api/client";
import { createClient } from "@/lib/supabase/client";
import type {
  FastLevel,
  RecipeSeason,
  RecipeTradition,
  TrapezaRecipe,
} from "./recipes";

export type RecipeFilters = {
  fastLevel?: FastLevel;
  season?: RecipeSeason;
  tradition?: RecipeTradition;
};

export async function fetchRecipes(
  filters: RecipeFilters = {},
): Promise<TrapezaRecipe[]> {
  const qs = new URLSearchParams();
  if (filters.fastLevel && filters.fastLevel !== "any")
    qs.set("level", filters.fastLevel);
  if (filters.season && filters.season !== "any") qs.set("season", filters.season);
  if (filters.tradition && filters.tradition !== "any")
    qs.set("tradition", filters.tradition);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await apiFetch(`/api/trapeza${suffix}`);
  if (!res.ok) return [];
  const json = (await res.json()) as { recipes?: TrapezaRecipe[] };
  return json.recipes ?? [];
}

export async function fetchRecipe(id: string): Promise<TrapezaRecipe | null> {
  const res = await apiFetch(`/api/trapeza/${id}`);
  if (!res.ok) return null;
  const json = (await res.json()) as { recipe?: TrapezaRecipe };
  return json.recipe ?? null;
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
};

export type ApiResult = { ok: boolean; error?: string; id?: string };

async function readResult(res: Response): Promise<ApiResult> {
  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    /* empty */
  }
  if (!res.ok)
    return { ok: false, error: (json.error as string) || "Something went wrong." };
  return { ok: true, id: json.id as string | undefined };
}

export async function submitRecipe(input: SubmitRecipeInput): Promise<ApiResult> {
  const res = await apiFetch("/api/trapeza", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return readResult(res);
}

export async function reportRecipe(
  id: string,
  reason?: string,
): Promise<ApiResult> {
  const res = await apiFetch(`/api/trapeza/${id}/report`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ reason: reason || null }),
  });
  return readResult(res);
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
