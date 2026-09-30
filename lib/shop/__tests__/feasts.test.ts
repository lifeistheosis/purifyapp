import { describe, expect, it } from "vitest";

import daily from "@/data/calendar/daily-saints.json";
import movable from "@/data/calendar/movable-readings.json";
import { orthodoxPascha } from "@/lib/calendar/orthodox";

import {
  bannerFeast,
  DROP_SPACING_DAYS,
  feastDate,
  feastDrops,
  feastPieces,
  GREAT_FEASTS,
  nextFeastDrop,
} from "../feasts";
import type { ShopProductFull } from "../types";

function product(over: Partial<ShopProductFull> & { slug: string }): ShopProductFull {
  return {
    id: over.slug,
    store_id: "s",
    seller_id: "x",
    title: over.slug,
    subtitle: null,
    description_md: null,
    price_cents: 2000,
    currency: "usd",
    category: "saints",
    classification: "wooden",
    fulfillment_type: "eikon_two_stage",
    inventory_status: "ready_to_ship",
    quantity_available: 2,
    dispatch_min_days: 1,
    dispatch_max_days: 3,
    materials: null,
    dimensions: null,
    production_method: null,
    maker_name: null,
    country_of_origin: null,
    image_is_representative: false,
    status: "published",
    created_at: "2026-09-01T00:00:00Z",
    media: [],
    subjects: [],
    store: { slug: "eikon", public_name: "EIKON", ownership_disclosure: "" },
    ...over,
  };
}

// The live catalogue's shape on 2026-09-30, reduced to what matching reads.
const VLADIMIR = product({ slug: "virgin-of-vladimir", title: "Virgin of Vladimir Icon With Hand Carved Frame" });
const CHRIST_FLAG = product({ slug: "greek-christ-flag", title: "Christ Flag, Greek", category: "flags", classification: "textile" });
const WALL_CROSS = product({ slug: "wall-cross", title: "Three-Beam Byzantine Wall Cross", category: "crosses", classification: "wooden" });
const BEANIE = product({ slug: "beanie", title: "Orthodox Cross Beanie", category: "crosses", classification: "textile" });
const SOLD_OUT = product({ slug: "kazan", title: "Theotokos of Kazan", inventory_status: "out_of_stock" });
const CATALOGUE = [VLADIMIR, CHRIST_FLAG, WALL_CROSS, BEANIE, SOLD_OUT];

const at = (iso: string) => new Date(`${iso}T09:00:00Z`);
const day = (d: Date) => d.toISOString().slice(0, 10);

describe("the great feasts", () => {
  it("are named exactly as the calendar names them", () => {
    const fixed = daily as Record<string, { name: string; kind?: string }[]>;
    const offsets = (movable as { offsets: Record<string, { label: string }> }).offsets;
    for (const feast of GREAT_FEASTS) {
      if ("fromPascha" in feast.on) {
        expect(offsets[String(feast.on.fromPascha)]?.label, feast.key).toBe(feast.name);
      } else {
        const key = `${String(feast.on.month).padStart(2, "0")}-${String(feast.on.day).padStart(2, "0")}`;
        const names = (fixed[key] ?? []).filter((c) => c.kind === "feast").map((c) => c.name);
        expect(names, feast.key).toContain(feast.name);
      }
    }
  });

  it("dates the movable feasts from Pascha", () => {
    const pascha = orthodoxPascha(2027);
    expect(day(pascha)).toBe("2027-05-02");
    const on = (key: string) => day(feastDate(GREAT_FEASTS.find((f) => f.key === key)!, 2027));
    expect(on("entry-into-jerusalem")).toBe("2027-04-25");
    expect(on("ascension")).toBe("2027-06-10");
    expect(on("pentecost")).toBe("2027-06-20");
    expect(on("dormition")).toBe("2027-08-15");
  });
});

describe("the pieces for a feast", () => {
  const find = (key: string) => GREAT_FEASTS.find((f) => f.key === key)!;

  it("gives the Theotokos's feasts an icon of her, never a flag or anything sold out", () => {
    expect(feastPieces(find("dormition"), CATALOGUE).map((p) => p.slug)).toEqual(["virgin-of-vladimir"]);
  });

  it("gives the Exaltation a cross, and not a beanie with a cross on it", () => {
    expect(feastPieces(find("exaltation-of-the-cross"), CATALOGUE).map((p) => p.slug)).toEqual(["wall-cross"]);
  });

  it("gives the Lord's feasts nothing when the shop has no icon of Christ", () => {
    expect(feastPieces(find("theophany"), CATALOGUE)).toEqual([]);
  });

  it("puts a piece tagged with the feast itself first", () => {
    const tagged = product({
      slug: "dormition-icon",
      title: "The Dormition",
      inventory_status: "special_order",
      subjects: [{ subject_type: "feast", subject_slug: "dormition" }],
    });
    expect(feastPieces(find("dormition"), [...CATALOGUE, tagged])[0].slug).toBe("dormition-icon");
  });
});

describe("the shop banner", () => {
  it("carries a feast in the three weeks before it when the shop has a piece", () => {
    const b = bannerFeast(at("2026-11-10"), CATALOGUE);
    expect(b?.feast.key).toBe("entry-of-the-theotokos");
    expect(b?.days).toBe(11);
    expect(b?.pieces[0].slug).toBe("virgin-of-vladimir");
  });

  it("shows nothing most of the year", () => {
    expect(bannerFeast(at("2026-10-01"), CATALOGUE)).toBeNull();
    expect(bannerFeast(at("2026-11-10"), [CHRIST_FLAG, BEANIE])).toBeNull();
  });

  it("still shows on the day itself", () => {
    expect(bannerFeast(at("2026-11-21"), CATALOGUE)?.days).toBe(0);
  });
});

describe("the feast emails", () => {
  it("keeps the two windows it always had, with the same keys", () => {
    const keys = feastDrops([2026], []).map((d) => d.periodKey);
    expect(keys).toEqual(["pascha-2026", "nativity-2026"]);
    const nativity = feastDrops([2026], []).find((d) => d.key === "nativity")!;
    expect(day(nativity.sendBy)).toBe("2026-11-08");
  });

  it("adds the great feasts the shop has a piece for, never two within three weeks", () => {
    const drops = feastDrops([2027], CATALOGUE);
    expect(drops.map((d) => d.periodKey)).toEqual([
      "annunciation-2027",
      "pascha-2027",
      "dormition-2027",
      "nativity-of-the-theotokos-2027",
      "nativity-2027",
    ]);
    const sends = drops.map((d) => d.sendBy.getTime()).sort((a, b) => a - b);
    for (let i = 1; i < sends.length; i += 1) {
      expect(sends[i] - sends[i - 1]).toBeGreaterThanOrEqual(DROP_SPACING_DAYS * 86_400_000);
    }
  });

  it("sends a great feast's email two weeks before it", () => {
    const dormition = feastDrops([2027], CATALOGUE).find((d) => d.key === "dormition")!;
    expect(day(dormition.sendBy)).toBe("2027-08-01");
    expect(dormition.pieces[0].slug).toBe("virgin-of-vladimir");
  });

  it("writes the next one whose day has not passed", () => {
    expect(nextFeastDrop(at("2026-09-30"), CATALOGUE).periodKey).toBe("nativity-2026");
    expect(nextFeastDrop(at("2027-03-01"), CATALOGUE).periodKey).toBe("annunciation-2027");
  });
});
