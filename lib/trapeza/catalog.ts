import "server-only";
import { createServerClient } from "@supabase/ssr";

import { isColumnAbsent } from "@/lib/supabase/columnAbsent";
import { withHousePhoto } from "./housePhotos";
import type {
  FastLevel,
  RecipeSeason,
  RecipeTradition,
  TrapezaRecipe,
} from "./recipes";

/**
 * Public reads for the Kitchen. Cookie-less anon client, like the shop and
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

const BASE_SELECT =
  "id, author_id, title, fast_level, season, tradition, summary, ingredients, steps, servings, time_minutes, status, created_at";
// The photo columns arrive with 20260928_kitchen.sql. Until that is applied
// a select naming them fails outright (42703), and failing soft to an empty
// list would empty the whole Kitchen, so a read that meets the missing column
// asks again without it and remembers for a minute rather than paying the
// round trip twice on every request.
const PHOTO_SELECT = `${BASE_SELECT}, photo_url, photo_credit`;
const ABSENT_TTL_MS = 60_000;
let photosAbsentAt = 0;

function selectList(): string {
  return Date.now() - photosAbsentAt < ABSENT_TTL_MS ? BASE_SELECT : PHOTO_SELECT;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isRecipeId(id: string): boolean {
  return UUID_RE.test(id);
}

export type ListRecipesOptions = {
  fastLevel?: FastLevel;
  season?: RecipeSeason;
  tradition?: RecipeTradition;
  limit?: number;
  offset?: number;
};

/** The most a single list read returns: the whole catalogue, for now. */
export const MAX_LIST = 120;

export async function listRecipes(
  opts: ListRecipesOptions = {},
): Promise<TrapezaRecipe[]> {
  try {
    const supabase = createClient();
    const limit = Math.min(Math.max(opts.limit ?? 30, 1), MAX_LIST);
    const offset = opts.offset ?? 0;
    const run = (select: string) => {
      let query = supabase
        .from("trapeza_recipes")
        .select(select)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .order("title", { ascending: true })
        .range(offset, offset + limit - 1);
      if (opts.fastLevel && opts.fastLevel !== "any")
        query = query.eq("fast_level", opts.fastLevel);
      if (opts.season && opts.season !== "any")
        query = query.eq("season", opts.season);
      if (opts.tradition && opts.tradition !== "any")
        query = query.eq("tradition", opts.tradition);
      return query;
    };
    let { data, error } = await run(selectList());
    if (error && isColumnAbsent(error)) {
      photosAbsentAt = Date.now();
      ({ data, error } = await run(BASE_SELECT));
    }
    if (error) {
      console.warn("[trapeza] listRecipes failed", error.message);
      return [];
    }
    return ((data ?? []) as unknown as TrapezaRecipe[]).map(withHousePhoto);
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
    const run = (select: string) =>
      supabase
        .from("trapeza_recipes")
        .select(select)
        .eq("id", id)
        .eq("status", "published")
        .maybeSingle();
    let { data, error } = await run(selectList());
    if (error && isColumnAbsent(error)) {
      photosAbsentAt = Date.now();
      ({ data, error } = await run(BASE_SELECT));
    }
    if (error) {
      console.warn("[trapeza] getRecipe failed", error.message);
      return null;
    }
    const recipe = (data as unknown as TrapezaRecipe | null) ?? null;
    return recipe ? withHousePhoto(recipe) : null;
  } catch (e) {
    console.warn(
      "[trapeza] getRecipe threw",
      e instanceof Error ? e.message : e,
    );
    return null;
  }
}
