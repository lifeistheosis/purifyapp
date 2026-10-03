import { describe, expect, it } from "vitest";

import { kitchenObjectPath, newKitchenPhotoPaths } from "@/lib/trapeza/photos";
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

describe("the Kitchen: which photos a member may attach", () => {
  const base = "https://proj.supabase.co";
  const bucket = `${base}/storage/v1/object/public/kitchen/`;
  const uid = "11111111-2222-4333-8444-555555555555";
  const one = `${bucket}r/0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d.jpg`;
  const two = `${bucket}r/1a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d.png`;
  const old = `${bucket}r/${uid}/1727500000000-abc123.jpg`;

  it("gives the paths of new photos, for the record to be asked about", () => {
    expect(newKitchenPhotoPaths([one, two], [], base, "r")).toEqual([
      "r/0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d.jpg",
      "r/1a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d.png",
    ]);
    expect(newKitchenPhotoPaths([], [], base, "r")).toEqual([]);
  });

  it("does not ask again about a photo the review already carries, whatever its path", () => {
    expect(newKitchenPhotoPaths([old, one], [old], base, "r")).toEqual([
      "r/0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d.jpg",
    ]);
    expect(newKitchenPhotoPaths([old], [old], base, "r")).toEqual([]);
  });

  it("attaches nothing new from a path that names its owner", () => {
    expect(newKitchenPhotoPaths([old], [], base, "r")).toBeNull();
    expect(newKitchenPhotoPaths([one, old], [], base, "r")).toBeNull();
  });

  it("refuses another folder kind, another bucket or host", () => {
    expect(newKitchenPhotoPaths([one], [], base, "s")).toBeNull();
    expect(
      newKitchenPhotoPaths([`${bucket}h/0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d/1.jpg`], [], base, "r"),
    ).toBeNull();
    expect(newKitchenPhotoPaths([one.replace("/kitchen/", "/avatars/")], [], base, "r")).toBeNull();
    expect(
      newKitchenPhotoPaths([one.replace("proj.supabase.co", "evil.example")], [], base, "r"),
    ).toBeNull();
  });

  it("refuses paths that climb, nest, or carry a query", () => {
    expect(newKitchenPhotoPaths([`${bucket}r/../x.jpg`], [], base, "r")).toBeNull();
    expect(newKitchenPhotoPaths([`${bucket}r/sub/x.jpg`], [], base, "r")).toBeNull();
    expect(newKitchenPhotoPaths([`${one}?download=1`], [], base, "r")).toBeNull();
    expect(newKitchenPhotoPaths([`${bucket}r/`], [], base, "r")).toBeNull();
  });

  it("maps our public URLs back to object paths, and nothing else", () => {
    expect(kitchenObjectPath(`${bucket}h/abc/1.jpg`, base)).toBe("h/abc/1.jpg");
    expect(kitchenObjectPath(one, base)).toBe("r/0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d.jpg");
    expect(kitchenObjectPath(old, base)).toBe(`r/${uid}/1727500000000-abc123.jpg`);
    expect(kitchenObjectPath("https://elsewhere.example/x.jpg", base)).toBeNull();
    expect(kitchenObjectPath(`${base}/storage/v1/object/public/kitchen/../avatars/x.jpg`, base)).toBeNull();
  });
});
