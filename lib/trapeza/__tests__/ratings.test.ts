// A recipe card's stars are worked out from every published review.
//
// The API returns at most 1,000 rows a request, whatever .limit() asks for,
// and says nothing when it stops (docs/audit/findings.yaml F-31). The
// stand-in here caps the way the real API does, so this fails if the read
// goes back to being one request.

import { describe, expect, it, vi } from "vitest";

import { cappedApi } from "@/lib/supabase/__tests__/cappedApi";

const pad = (i: number) => String(i).padStart(5, "0");

// 1,300 reviews of one recipe, the first thousand five stars and the last
// three hundred one star, and a second recipe with two reviews.
const reviews = [
  ...Array.from({ length: 1300 }, (_, i) => ({ id: `a${pad(i)}`, recipe_id: "lentils", stars: i < 1000 ? 5 : 1, status: "published" })),
  { id: "b1", recipe_id: "fasolada", stars: 4, status: "published" },
  { id: "b2", recipe_id: "fasolada", stars: 2, status: "published" },
  { id: "b3", recipe_id: "fasolada", stars: 1, status: "hidden" },
];

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => cappedApi({ trapeza_recipe_reviews: reviews }).client,
}));

const { ratingsFor } = await import("../reviews");

describe("ratingsFor", () => {
  it("counts and averages every published review, past the first thousand", async () => {
    const ratings = await ratingsFor(["lentils", "fasolada"]);
    expect(ratings.get("lentils")).toEqual({ avg: 4.1, count: 1300 });
    expect(ratings.get("fasolada")).toEqual({ avg: 3, count: 2 });
  });
});
