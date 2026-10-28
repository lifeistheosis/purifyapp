import { describe, expect, it } from "vitest";

import seedsJson from "@/data/shop/seed-products.json";
import profiledSaints from "@/data/calendar/profiled-saints.json";

import {
  carriesSaint,
  saintShopHref,
  shopSaint,
  shopSaints,
  shortSaintName,
} from "../bySaint";
import type { ShopProductFull, ShopProductSubject } from "../types";

// Only the fields bySaint.ts reads; the rest is irrelevant and stubbed.
function piece(slug: string, subjects: ShopProductSubject[], over: Partial<ShopProductFull> = {}): ShopProductFull {
  return {
    slug,
    title: slug,
    subjects,
    inventory_status: "ready_to_ship",
    ...over,
  } as ShopProductFull;
}

const saint = (subject_slug: string): ShopProductSubject => ({ subject_type: "saint", subject_slug });

describe("shopSaints", () => {
  it("groups the pieces by the saint they carry, the saint with the most pieces first", () => {
    const rows = shopSaints([
      piece("nicholas-wooden", [saint("nicholas-the-wonderworker")]),
      piece("peter-laminated", [saint("apostle-peter")]),
      piece("nicholas-mounted", [saint("nicholas-the-wonderworker")]),
    ]);
    expect(rows.map((r) => [r.slug, r.pieces])).toEqual([
      ["nicholas-the-wonderworker", 2],
      ["apostle-peter", 1],
    ]);
  });

  it("orders saints with as many pieces by the name the row writes", () => {
    const rows = shopSaints([
      piece("a", [saint("seraphim-of-sarov")]),
      piece("b", [saint("apostle-peter")]),
      piece("c", [saint("archangel-michael")]),
    ]);
    expect(rows.map((r) => r.shortName)).toEqual(["Apostle Peter", "Archangel Michael", "Seraphim of Sarov"]);
  });

  it("counts a piece once per saint, and for each saint it carries", () => {
    const rows = shopSaints([
      piece("deesis", [saint("john-the-baptist"), saint("john-the-baptist"), saint("apostle-peter")]),
    ]);
    expect(rows.map((r) => [r.slug, r.pieces])).toEqual([
      ["apostle-peter", 1],
      ["john-the-baptist", 1],
    ]);
  });

  it("leaves out sold-out pieces, so a saint whose only piece is gone is not offered", () => {
    const rows = shopSaints([
      piece("gone", [saint("sergius-of-radonezh")], { inventory_status: "out_of_stock" }),
      piece("coming", [saint("apostle-peter")], { inventory_status: "coming_soon" }),
    ]);
    expect(rows.map((r) => r.slug)).toEqual(["apostle-peter"]);
  });

  it("reads only saints, never Christ, the Theotokos, a feast or an event", () => {
    const rows = shopSaints([
      piece("pantocrator", [{ subject_type: "christ", subject_slug: "pantocrator" }]),
      piece("kazan", [{ subject_type: "theotokos", subject_slug: "kazan" }]),
      piece("pascha", [{ subject_type: "feast", subject_slug: "pascha" }]),
    ]);
    expect(rows).toEqual([]);
  });

  it("never makes up a saint: a slug the library has no profile of is left out", () => {
    const rows = shopSaints([piece("george", [saint("george-of-somewhere")])]);
    expect(rows).toEqual([]);
  });

  it("gives each saint the library's name and picture", () => {
    const [row] = shopSaints([piece("peter", [saint("apostle-peter")])]);
    expect(row).toMatchObject({
      slug: "apostle-peter",
      name: "Holy Apostle Peter",
      shortName: "Apostle Peter",
      iconUrl: "/saints/icons/apostle-peter.jpg",
      pieces: 1,
    });
  });

  it("finds every saint the shop's own seed catalogue names", () => {
    type Seed = { slug: string; inventoryStatus: string; subjects?: { type: string; slug: string }[] };
    const seeds = (seedsJson as { products: Seed[] }).products;
    const catalogue = seeds.map((s) =>
      piece(
        s.slug,
        (s.subjects ?? []).map((x) => ({ subject_type: x.type, subject_slug: x.slug }) as ShopProductSubject),
        { inventory_status: s.inventoryStatus as ShopProductFull["inventory_status"] },
      ),
    );
    const named = new Set(seeds.flatMap((s) => (s.subjects ?? []).filter((x) => x.type === "saint").map((x) => x.slug)));
    const rows = shopSaints(catalogue);
    expect(rows.map((r) => r.slug).sort()).toEqual([...named].sort());
    for (const r of rows) expect(r.iconUrl, r.slug).toBeTruthy();
  });
});

describe("shortSaintName", () => {
  it("takes the honorific off, as the saint's names in texts do", () => {
    expect(shortSaintName("nicholas-the-wonderworker", "St. Nicholas the Wonderworker")).toBe("Nicholas the Wonderworker");
    expect(shortSaintName("archangel-michael", "The Holy Archangel Michael")).toBe("Archangel Michael");
  });

  it("gives a title with a comma, or a long name, way to the shortest form the texts know", () => {
    expect(shortSaintName("john-the-baptist", "Holy Prophet, Forerunner, and Baptist John")).toBe("John the Baptist");
    expect(shortSaintName("apostle-matthew", "Holy Apostle and Evangelist Matthew")).toBe("Apostle Matthew");
    expect(shortSaintName("titus-of-crete", "St. Titus, Bishop of Crete")).toBe("Titus of Crete");
  });

  it("keeps the whole name when no shorter form is known, never a bare first name", () => {
    expect(shortSaintName("someone", "St. Someone, Bishop of Somewhere")).toBe("Someone, Bishop of Somewhere");
    expect(shortSaintName("nicholas-the-wonderworker", "St. Nicholas the Wonderworker")).toBe("Nicholas the Wonderworker");
  });

  it("writes every profiled saint a name, no longer than the library's", () => {
    for (const s of profiledSaints as { slug: string; name: string }[]) {
      const short = shortSaintName(s.slug, s.name);
      expect(short.trim().length, s.slug).toBeGreaterThan(1);
      expect(short.length, s.slug).toBeLessThanOrEqual(s.name.length);
    }
  });
});

describe("shopSaint and carriesSaint", () => {
  it("answers null for a slug with no profile", () => {
    expect(shopSaint("not-a-saint")).toBeNull();
    expect(shopSaint("seraphim-of-sarov")?.name).toBe("St. Seraphim of Sarov");
  });

  it("knows whether a piece carries a saint", () => {
    const p = piece("p", [saint("apostle-peter"), { subject_type: "christ", subject_slug: "apostle-peter" }]);
    expect(carriesSaint(p, "apostle-peter")).toBe(true);
    expect(carriesSaint(p, "nicholas-the-wonderworker")).toBe(false);
    expect(carriesSaint(piece("q", [{ subject_type: "christ", subject_slug: "x" }]), "x")).toBe(false);
  });

  it("leads a saint to the shop's pieces of him", () => {
    expect(saintShopHref("john-the-baptist")).toBe("/shop/category/all?saint=john-the-baptist");
  });
});
