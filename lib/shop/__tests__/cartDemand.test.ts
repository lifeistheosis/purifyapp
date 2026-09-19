import { describe, expect, it } from "vitest";

import { DEMAND_WINDOW_MS, demandBySlug, type DemandCartRow } from "../cartDemand";

const now = Date.parse("2026-09-18T12:00:00.000Z");
const recent = new Date(now - 3_600_000).toISOString();
const stale = new Date(now - DEMAND_WINDOW_MS - 1).toISOString();

const row = (token: string, user: string | null, slugs: string[], updated = recent): DemandCartRow => ({
  cart_token: token,
  user_id: user,
  items: slugs.map((slug) => ({ slug, quantity: 1 })),
  updated_at: updated,
});

describe("demandBySlug", () => {
  it("counts distinct shoppers, one per signed-in person across devices", () => {
    const rows = [
      row("t1", "u1", ["beanie"]),
      row("t2", "u1", ["beanie"]), // same person, second device
      row("t3", null, ["beanie", "ring"]),
    ];
    expect(demandBySlug(rows, { slugs: ["beanie", "ring"], now })).toEqual({ beanie: 2, ring: 1 });
  });

  it("never counts the viewer, by token or by account", () => {
    const rows = [row("mine", null, ["beanie"]), row("t2", "me", ["beanie"]), row("t3", null, ["beanie"])];
    expect(demandBySlug(rows, { slugs: ["beanie"], now, viewerToken: "mine", viewerUserId: "me" })).toEqual({
      beanie: 1,
    });
  });

  it("ignores carts nobody has touched this week", () => {
    expect(demandBySlug([row("t1", null, ["beanie"], stale)], { slugs: ["beanie"], now })).toEqual({ beanie: 0 });
  });

  it("answers zero, not a floor, when nobody has it", () => {
    expect(demandBySlug([], { slugs: ["beanie"], now })).toEqual({ beanie: 0 });
  });

  it("skips zero-quantity lines and rows with no items array", () => {
    const rows: DemandCartRow[] = [
      { cart_token: "t1", user_id: null, items: [{ slug: "beanie", quantity: 0 }], updated_at: recent },
      { cart_token: "t2", user_id: null, items: null, updated_at: recent },
    ];
    expect(demandBySlug(rows, { slugs: ["beanie"], now })).toEqual({ beanie: 0 });
  });
});
