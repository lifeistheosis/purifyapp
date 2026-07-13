import { describe, expect, it } from "vitest";

import {
  FAST_LEVELS,
  SEASONS,
  TRADITIONS,
  authorLabel,
  fastLevelLabel,
  isFastLevel,
  isSeason,
  isTradition,
  recipeLevelsForFastKind,
  type TrapezaRecipe,
} from "@/lib/trapeza/recipes";

function recipe(over: Partial<TrapezaRecipe> = {}): TrapezaRecipe {
  return {
    id: "r",
    author_id: null,
    title: "Dish",
    fast_level: "oil_wine",
    season: "any",
    tradition: "any",
    summary: null,
    ingredients: "x",
    steps: "y",
    servings: null,
    time_minutes: null,
    status: "published",
    created_at: "2026-07-13T00:00:00Z",
    ...over,
  };
}

describe("trapeza recipe helpers", () => {
  it("keeps four fast levels, five seasons, five traditions", () => {
    expect(FAST_LEVELS).toHaveLength(4);
    expect(SEASONS).toHaveLength(5);
    expect(TRADITIONS).toHaveLength(5);
    expect(fastLevelLabel("xerophagy")).toBe("Xerophagy");
  });

  it("validates taxonomy slugs", () => {
    expect(isFastLevel("fish")).toBe(true);
    expect(isFastLevel("meat")).toBe(false);
    expect(isSeason("lent")).toBe(true);
    expect(isSeason("advent")).toBe(false);
    expect(isTradition("greek")).toBe(true);
    expect(isTradition("coptic")).toBe(false);
  });

  it("attributes curated vs member recipes", () => {
    expect(authorLabel(recipe({ author_id: null }))).toMatch(/purify kitchen/i);
    expect(authorLabel(recipe({ author_id: "user-1" }))).toMatch(/member/i);
  });

  it("nests fast levels so stricter dishes suit laxer days", () => {
    expect(recipeLevelsForFastKind("strict")).toEqual(["xerophagy"]);
    expect(recipeLevelsForFastKind("wine-oil")).toEqual(["xerophagy", "oil_wine"]);
    expect(recipeLevelsForFastKind("fish")).toEqual([
      "xerophagy",
      "oil_wine",
      "fish",
    ]);
    expect(recipeLevelsForFastKind("fast-free")).toContain("any");
    // Every laxer set is a superset of the stricter one.
    const strict = recipeLevelsForFastKind("strict");
    const fish = recipeLevelsForFastKind("fish");
    expect(strict.every((l) => fish.includes(l))).toBe(true);
  });
});
