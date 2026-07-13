import "server-only";
import { createServerClient } from "@supabase/ssr";

import type {
  FastLevel,
  RecipeSeason,
  RecipeTradition,
  TrapezaRecipe,
} from "./recipes";

/**
 * Public reads for the Trapeza. Cookie-less anon client, like the shop and
 * campaigns catalogs: RLS returns only published recipes, and it fails soft to
 * empty/null so a key-less CI build or a network blip never 500s.
 */
function createClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key",
    { cookies: { getAll: () => [], setAll: () => {} } },
  );
}

const SELECT =
  "id, author_id, title, fast_level, season, tradition, summary, ingredients, steps, servings, time_minutes, status, created_at";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ListRecipesOptions = {
  fastLevel?: FastLevel;
  season?: RecipeSeason;
  tradition?: RecipeTradition;
  limit?: number;
  offset?: number;
};

export async function listRecipes(
  opts: ListRecipesOptions = {},
): Promise<TrapezaRecipe[]> {
  try {
    const supabase = createClient();
    const limit = Math.min(opts.limit ?? 30, 60);
    const offset = opts.offset ?? 0;
    let query = supabase
      .from("trapeza_recipes")
      .select(SELECT)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (opts.fastLevel && opts.fastLevel !== "any")
      query = query.eq("fast_level", opts.fastLevel);
    if (opts.season && opts.season !== "any")
      query = query.eq("season", opts.season);
    if (opts.tradition && opts.tradition !== "any")
      query = query.eq("tradition", opts.tradition);
    const { data, error } = await query;
    if (error) {
      console.warn("[trapeza] listRecipes failed", error.message);
      return [];
    }
    return (data ?? []) as TrapezaRecipe[];
  } catch (e) {
    console.warn(
      "[trapeza] listRecipes threw",
      e instanceof Error ? e.message : e,
    );
    return [];
  }
}

export async function getRecipe(id: string): Promise<TrapezaRecipe | null> {
  if (!UUID_RE.test(id)) return null;
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("trapeza_recipes")
      .select(SELECT)
      .eq("id", id)
      .eq("status", "published")
      .maybeSingle();
    if (error) {
      console.warn("[trapeza] getRecipe failed", error.message);
      return null;
    }
    return (data as TrapezaRecipe | null) ?? null;
  } catch (e) {
    console.warn(
      "[trapeza] getRecipe threw",
      e instanceof Error ? e.message : e,
    );
    return null;
  }
}
