// The Kitchen (the Trapeza before 2026-09-28): shared shapes and taxonomies
// for the fasting-recipe catalogue. Pure data, importable from the read
// layer, route handlers, and client alike.
//
// The reader-facing name is "The Kitchen". The tables, the API paths and this
// folder keep the trapeza name, because the installed apps call /api/trapeza
// and read these shapes; renaming them would break every phone that has not
// updated.

export type FastLevel = "xerophagy" | "oil_wine" | "fish" | "any";
export type RecipeSeason = "any" | "nativity" | "lent" | "apostles" | "dormition";
export type RecipeTradition = "any" | "greek" | "russian" | "levantine" | "balkan";
export type RecipeStatus = "pending" | "published" | "removed";

/** Public shape of a published trapeza_recipes row (snake_case = columns). */
export type TrapezaRecipe = {
  id: string;
  author_id: string | null;
  title: string;
  fast_level: FastLevel;
  season: RecipeSeason;
  tradition: RecipeTradition;
  summary: string | null;
  ingredients: string;
  steps: string;
  servings: string | null;
  time_minutes: number | null;
  status: RecipeStatus;
  created_at: string;
  /** A photo of the dish. Absent until 20260928_kitchen.sql is applied. */
  photo_url?: string | null;
  /** Who took it, when the photo is not our own. */
  photo_credit?: string | null;
  /** House photos only (lib/trapeza/housePhotos.ts): the work's name, its
   *  source page and its licence deed, for the credit's links, and where the
   *  4:3 frame should sit. Never columns. */
  photo_title?: string | null;
  photo_source_url?: string | null;
  photo_license_url?: string | null;
  photo_focus?: string | null;
  /** Computed by the API from published reviews; never a column. */
  rating_avg?: number | null;
  rating_count?: number;
};

/** A published review as the API sends it. No user id: `mine` says whose it is. */
export type KitchenReview = {
  id: string;
  stars: number;
  body: string | null;
  photo_urls: string[];
  author_name: string;
  author_avatar: string | null;
  created_at: string;
  updated_at: string;
  mine: boolean;
};

export type RatingSummary = { avg: number | null; count: number };

// English labels. The admin console and the tests read these; every reader
// surface uses the kitchen.level.* / kitchen.season.* / kitchen.tradition.*
// catalog keys instead.
export const FAST_LEVELS: { slug: FastLevel; label: string; sub: string }[] = [
  { slug: "xerophagy", label: "Xerophagy", sub: "Strict, no oil" },
  { slug: "oil_wine", label: "Oil and wine", sub: "Oil permitted" },
  { slug: "fish", label: "Fish days", sub: "Fish permitted" },
  { slug: "any", label: "Any day", sub: "Feasts and dairy days" },
];

export const SEASONS: { slug: RecipeSeason; label: string }[] = [
  { slug: "any", label: "Any season" },
  { slug: "lent", label: "Great Lent" },
  { slug: "nativity", label: "Nativity Fast" },
  { slug: "apostles", label: "Apostles' Fast" },
  { slug: "dormition", label: "Dormition Fast" },
];

export const TRADITIONS: { slug: RecipeTradition; label: string }[] = [
  { slug: "any", label: "Any tradition" },
  { slug: "greek", label: "Greek" },
  { slug: "russian", label: "Russian" },
  { slug: "levantine", label: "Levantine" },
  { slug: "balkan", label: "Balkan" },
];

const LEVEL_LABEL = Object.fromEntries(
  FAST_LEVELS.map((l) => [l.slug, l.label]),
) as Record<FastLevel, string>;
const SEASON_LABEL = Object.fromEntries(
  SEASONS.map((s) => [s.slug, s.label]),
) as Record<RecipeSeason, string>;
const TRADITION_LABEL = Object.fromEntries(
  TRADITIONS.map((t) => [t.slug, t.label]),
) as Record<RecipeTradition, string>;

export function fastLevelLabel(l: FastLevel): string {
  return LEVEL_LABEL[l] ?? "Recipe";
}
export function seasonLabel(s: RecipeSeason): string {
  return SEASON_LABEL[s] ?? "Any season";
}
export function traditionLabel(t: RecipeTradition): string {
  return TRADITION_LABEL[t] ?? "Any tradition";
}

export function isFastLevel(v: unknown): v is FastLevel {
  return v === "xerophagy" || v === "oil_wine" || v === "fish" || v === "any";
}
export function isSeason(v: unknown): v is RecipeSeason {
  return (
    v === "any" ||
    v === "nativity" ||
    v === "lent" ||
    v === "apostles" ||
    v === "dormition"
  );
}
export function isTradition(v: unknown): v is RecipeTradition {
  return (
    v === "any" ||
    v === "greek" ||
    v === "russian" ||
    v === "levantine" ||
    v === "balkan"
  );
}

/** Attribution line for a recipe: the kitchen for curated, else a member. */
export function authorLabel(recipe: TrapezaRecipe): string {
  return recipe.author_id
    ? "Shared by a member of the community"
    : "From the Purify kitchen";
}

type FastKind = "strict" | "wine-oil" | "fish" | "fast" | "fast-free" | "normal";

/**
 * The calendar's FastKind, mapped to the recipe levels that suit that day.
 * A stricter dish always suits a laxer day (xerophagy food is fine on an oil
 * day), so the sets nest. Used to offer "recipes for today's fast". The last
 * element is the day's own level (the least strict thing it permits).
 */
export function recipeLevelsForFastKind(kind: FastKind): FastLevel[] {
  switch (kind) {
    case "strict":
      return ["xerophagy"];
    case "wine-oil":
    case "fast":
      return ["xerophagy", "oil_wine"];
    case "fish":
      return ["xerophagy", "oil_wine", "fish"];
    case "fast-free":
      return ["xerophagy", "oil_wine", "fish", "any"];
    default:
      return ["any"];
  }
}

/**
 * Every level that suits the day, the day's own first and then stricter
 * ones, which is the order "what can I cook today" wants: on a fish day the
 * fish dishes lead. A day with no fast at all suits everything, feast food
 * first. (recipeLevelsForFastKind answers "normal" with feast food alone,
 * which is right for its old caller and wrong for a list of what suits.)
 */
export function levelsSuitingDay(kind: FastKind): FastLevel[] {
  if (kind === "normal") return ["any", "fish", "oil_wine", "xerophagy"];
  return [...recipeLevelsForFastKind(kind)].reverse();
}

/**
 * The fasting season a calendar rule belongs to, from its rule id
 * (lib/calendar/orthodox.ts: lentStrict, nativityWeekday, apostlesWedFri,
 * dormitionTransfiguration, ...). "any" outside the four fasts.
 */
export function seasonForRuleId(ruleId: string): RecipeSeason {
  if (ruleId.startsWith("lent")) return "lent";
  if (ruleId.startsWith("nativity")) return "nativity";
  if (ruleId.startsWith("apostles")) return "apostles";
  if (ruleId.startsWith("dormition")) return "dormition";
  return "any";
}

/**
 * Recipes that suit the day, ordered for it: the day's own level first, then
 * dishes kept for the season it is in, then the newest. Pure, so the order is
 * tested rather than eyeballed.
 */
export function recipesForDay(
  recipes: TrapezaRecipe[],
  levels: FastLevel[],
  season: RecipeSeason,
): TrapezaRecipe[] {
  const rank = new Map(levels.map((l, i) => [l, i]));
  return recipes
    .filter((r) => rank.has(r.fast_level))
    .sort((a, b) => {
      const byLevel = (rank.get(a.fast_level) ?? 9) - (rank.get(b.fast_level) ?? 9);
      if (byLevel !== 0) return byLevel;
      const inSeason =
        Number(season !== "any" && b.season === season) -
        Number(season !== "any" && a.season === season);
      if (inSeason !== 0) return inSeason;
      return b.created_at.localeCompare(a.created_at);
    });
}

/**
 * Ingredients as a list. One per line is how the form asks for them and how
 * the house recipes are written. The first three house recipes and older
 * member submissions are a single comma-separated line, which splits on
 * ", " (never a bare comma, so "1,5 kg" survives).
 */
export function splitIngredients(text: string): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").trim())
    .filter(Boolean);
  if (lines.length !== 1) return lines;
  const parts = lines[0]
    .split(/,\s+|;\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 3) return lines;
  const last = parts.length - 1;
  parts[last] = parts[last].replace(/\.$/, "");
  return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1));
}

/**
 * The method as numbered steps. One step per line when written that way;
 * otherwise a single paragraph is cut at sentence ends (a full stop followed
 * by a capital letter or a digit, in any script), which is how the first
 * three house recipes read.
 */
export function splitSteps(text: string): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").trim())
    .filter(Boolean);
  if (lines.length !== 1) return lines;
  const sentences = lines[0]
    .split(/(?<=[.!?])\s+(?=[\p{Lu}\d])/u)
    .map((s) => s.trim())
    .filter(Boolean);
  return sentences.length > 1 ? sentences : lines;
}

/** Average and count over a set of star ratings; avg null when there are none. */
export function summarizeStars(stars: number[]): RatingSummary {
  const valid = stars.filter((s) => Number.isInteger(s) && s >= 1 && s <= 5);
  if (valid.length === 0) return { avg: null, count: 0 };
  const sum = valid.reduce((n, s) => n + s, 0);
  return { avg: Math.round((sum / valid.length) * 10) / 10, count: valid.length };
}
