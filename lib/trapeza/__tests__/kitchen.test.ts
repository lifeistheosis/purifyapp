import { describe, expect, it } from "vitest";

import {
  kitchenObjectPath,
  kitchenPhotoPrefix,
  ownsKitchenPhoto,
} from "@/lib/trapeza/photos";
import {
  levelsSuitingDay,
  recipesForDay,
  seasonForRuleId,
  splitIngredients,
  splitSteps,
  summarizeStars,
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

describe("the Kitchen: what suits the day", () => {
  it("puts the day's own level first, then stricter ones", () => {
    expect(levelsSuitingDay("fish")).toEqual(["fish", "oil_wine", "xerophagy"]);
    expect(levelsSuitingDay("wine-oil")).toEqual(["oil_wine", "xerophagy"]);
    expect(levelsSuitingDay("strict")).toEqual(["xerophagy"]);
  });

  it("offers everything on a day with no fast, feast food first", () => {
    expect(levelsSuitingDay("normal")).toEqual(["any", "fish", "oil_wine", "xerophagy"]);
    expect(levelsSuitingDay("fast-free")[0]).toBe("any");
  });

  it("names the fasting season from the calendar's rule id", () => {
    expect(seasonForRuleId("lentStrict")).toBe("lent");
    expect(seasonForRuleId("lentAnnunciation")).toBe("lent");
    expect(seasonForRuleId("nativityWeekday")).toBe("nativity");
    expect(seasonForRuleId("apostlesWedFri")).toBe("apostles");
    expect(seasonForRuleId("dormitionTransfiguration")).toBe("dormition");
    expect(seasonForRuleId("wednesdayFast")).toBe("any");
    expect(seasonForRuleId("noFast")).toBe("any");
  });

  it("orders the day's dishes: its level, then the season's, then newest", () => {
    const list = [
      recipe({ id: "strict", fast_level: "xerophagy", created_at: "2026-09-01T00:00:00Z" }),
      recipe({ id: "oil-old", fast_level: "oil_wine", created_at: "2026-01-01T00:00:00Z" }),
      recipe({ id: "oil-lent", fast_level: "oil_wine", season: "lent", created_at: "2025-01-01T00:00:00Z" }),
      recipe({ id: "feast", fast_level: "any" }),
      recipe({ id: "fish", fast_level: "fish" }),
    ];
    const ids = recipesForDay(list, levelsSuitingDay("wine-oil"), "lent").map((r) => r.id);
    // No fish and no feast food on a wine and oil day.
    expect(ids).toEqual(["oil-lent", "oil-old", "strict"]);
  });
});

describe("the Kitchen: reading a recipe", () => {
  it("keeps one ingredient per line when written that way", () => {
    expect(splitIngredients("1 cup lentils\n2 carrots\r\n\n- Salt")).toEqual([
      "1 cup lentils",
      "2 carrots",
      "Salt",
    ]);
  });

  it("splits a single comma-separated line, but never a decimal comma", () => {
    expect(
      splitIngredients(
        "Brown lentils, one onion, two carrots, a bay leaf, salt, a little vinegar or lemon at the end.",
      ),
    ).toEqual([
      "Brown lentils",
      "One onion",
      "Two carrots",
      "A bay leaf",
      "Salt",
      "A little vinegar or lemon at the end",
    ]);
    expect(splitIngredients("1,5 kg beans, 2 onions, salt")).toEqual(["1,5 kg beans", "2 onions", "Salt"]);
    expect(splitIngredients("Salt, pepper")).toEqual(["Salt, pepper"]);
  });

  it("numbers the method by line, or by sentence in a single paragraph", () => {
    expect(splitSteps("Soak the beans.\nBoil them.\n2) Serve.")).toEqual([
      "Soak the beans.",
      "Boil them.",
      "Serve.",
    ]);
    expect(splitSteps("Rinse the lentils. Soften the onion in oil. Simmer 40 minutes.")).toEqual([
      "Rinse the lentils.",
      "Soften the onion in oil.",
      "Simmer 40 minutes.",
    ]);
    // Any script: a Cyrillic capital starts a sentence too.
    expect(splitSteps("Промойте чечевицу. Варите сорок минут.")).toHaveLength(2);
    // A lone sentence stays whole, and "1.5 litres" is not a sentence end.
    expect(splitSteps("Add 1.5 litres of water and simmer.")).toEqual(["Add 1.5 litres of water and simmer."]);
  });

  it("averages stars to one decimal and ignores anything out of range", () => {
    expect(summarizeStars([])).toEqual({ avg: null, count: 0 });
    expect(summarizeStars([5, 4, 4])).toEqual({ avg: 4.3, count: 3 });
    expect(summarizeStars([5, 0, 9, 2.5])).toEqual({ avg: 5, count: 1 });
  });
});

describe("the Kitchen: whose photo is whose", () => {
  const base = "https://proj.supabase.co";
  const uid = "11111111-2222-3333-4444-555555555555";

  it("accepts a photo in the caller's own folder", () => {
    const url = `${kitchenPhotoPrefix(base, "r", uid)}1727500000000-abc123.jpg`;
    expect(url).toBe(
      `https://proj.supabase.co/storage/v1/object/public/kitchen/r/${uid}/1727500000000-abc123.jpg`,
    );
    expect(ownsKitchenPhoto(url, base, "r", uid)).toBe(true);
  });

  it("refuses someone else's folder, another folder kind, another bucket or host", () => {
    const other = "99999999-2222-3333-4444-555555555555";
    expect(ownsKitchenPhoto(`${kitchenPhotoPrefix(base, "r", other)}a.jpg`, base, "r", uid)).toBe(false);
    expect(ownsKitchenPhoto(`${kitchenPhotoPrefix(base, "s", uid)}a.jpg`, base, "r", uid)).toBe(false);
    expect(
      ownsKitchenPhoto(`${base}/storage/v1/object/public/avatars/r/${uid}/a.jpg`, base, "r", uid),
    ).toBe(false);
    expect(
      ownsKitchenPhoto(`https://evil.example/storage/v1/object/public/kitchen/r/${uid}/a.jpg`, base, "r", uid),
    ).toBe(false);
  });

  it("refuses paths that climb, nest, or carry a query", () => {
    const prefix = kitchenPhotoPrefix(base, "r", uid);
    expect(ownsKitchenPhoto(`${prefix}../x.jpg`, base, "r", uid)).toBe(false);
    expect(ownsKitchenPhoto(`${prefix}sub/x.jpg`, base, "r", uid)).toBe(false);
    expect(ownsKitchenPhoto(`${prefix}x.jpg?download=1`, base, "r", uid)).toBe(false);
    expect(ownsKitchenPhoto(prefix, base, "r", uid)).toBe(false);
  });

  it("maps our public URLs back to object paths, and nothing else", () => {
    expect(kitchenObjectPath(`${kitchenPhotoPrefix(base, "h", "abc")}1.jpg`, base)).toBe("h/abc/1.jpg");
    expect(kitchenObjectPath("https://elsewhere.example/x.jpg", base)).toBeNull();
    expect(kitchenObjectPath(`${base}/storage/v1/object/public/kitchen/../avatars/x.jpg`, base)).toBeNull();
  });
});
