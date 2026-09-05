import { describe, expect, it, vi } from "vitest";

// Soft delete: a row with deleted_at set never comes out of a public read,
// whether or not 20260905_shop_simple.sql has put `deleted_at is null` into
// the policy yet. Before the migration the column is not there to filter on
// in SQL, so lib/shop/catalog.ts checks the row after `select *`. This suite
// drives that code path with rows the "database" hands back regardless.

const live = {
  id: "p1",
  slug: "st-george",
  title: "St George",
  status: "published",
  deleted_at: null,
  created_at: "2026-09-01T00:00:00Z",
  media: [{ id: "m1", media_url: "/shop/media/st-george.jpg", alt_text: "St George", sort_order: 0, is_primary: true }],
  subjects: [],
  store: { slug: "eikon", public_name: "EIKON", ownership_disclosure: "", status: "live" },
};
const gone = {
  ...live,
  id: "p2",
  slug: "st-nicholas",
  title: "St Nicholas",
  deleted_at: "2026-09-05T10:00:00Z",
};
// A row from a database that has not had the migration: no deleted_at at all.
const preMigration: Partial<typeof live> = { ...live, id: "p3", slug: "st-seraphim" };
delete preMigration.deleted_at;

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => {
    const rows = [live, gone, preMigration];
    let slugFilter: string | null = null;
    const builder: Record<string, unknown> = {};
    for (const m of ["select", "in", "order", "range", "limit"]) {
      builder[m] = () => builder;
    }
    builder.eq = (col: string, value: string) => {
      if (col === "slug") slugFilter = value;
      return builder;
    };
    builder.maybeSingle = async () => {
      const hit = rows.find((r) => r.slug === slugFilter) ?? null;
      slugFilter = null;
      return { data: hit, error: null };
    };
    builder.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: rows, error: null }).then(resolve);
    return { from: () => builder };
  },
}));

import { getProduct, listProducts, listPublishedProductSlugs } from "../catalog";

describe("the catalogue never returns a deleted product", () => {
  it("listProducts drops the deleted row and keeps the pre-migration one", async () => {
    const slugs = (await listProducts()).map((p) => p.slug);
    expect(slugs).toContain("st-george");
    expect(slugs).toContain("st-seraphim");
    expect(slugs).not.toContain("st-nicholas");
  });

  it("getProduct answers null for a deleted slug", async () => {
    await expect(getProduct("st-nicholas")).resolves.toBeNull();
    await expect(getProduct("st-george")).resolves.not.toBeNull();
    await expect(getProduct("st-seraphim")).resolves.not.toBeNull();
  });

  it("listPublishedProductSlugs gives a deleted product no static shell", async () => {
    const slugs = await listPublishedProductSlugs();
    expect(slugs).toEqual(["st-george", "st-seraphim"]);
  });
});
