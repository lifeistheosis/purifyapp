// The Trapeza: shared shapes and taxonomies for the fasting-recipe board.
// Pure data, importable from the read layer, route handlers, and client alike.

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
};

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

/**
 * The calendar's FastKind, mapped to the recipe levels that suit that day.
 * A stricter dish always suits a laxer day (xerophagy food is fine on an oil
 * day), so the sets nest. Used to offer "recipes for today's fast".
 */
export function recipeLevelsForFastKind(
  kind: "strict" | "wine-oil" | "fish" | "fast" | "fast-free",
): FastLevel[] {
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
