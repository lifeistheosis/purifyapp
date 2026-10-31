import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { heatStep, heatThresholds, niceStep } from "../map/heat";
import { EQUAL_EARTH, projectUs, projectWorld, US_VIEW, WORLD_VIEW } from "../map/projection";
import { countsLine, sameRegion, tallyCountries, tallyRegions, type Visit } from "../map/tally";
import us from "../map/us.json";
import world from "../map/world.json";

// The heat map on Traffic: the owner's pick on sheet r3-15 (2026-10-30),
// Traffic A with C's zoom, and his note 31 ("the live map becomes a heat map
// you can open").

/**
 * Cities as the sheet's helper placed them (r3-15-admin-daily-map.js): the
 * world frame (Equal Earth, 1000 wide) and the states frame (Albers USA,
 * 975 x 610). A live point must land where the shapes are drawn.
 */
const CITIES: { name: string; lat: number; lng: number; w: [number, number]; u: [number, number] | null }[] = [
  { name: "New York", lat: 40.7128, lng: -74.006, w: [315.2, 97.6], u: [869.9, 216] },
  { name: "Los Angeles", lat: 34.0522, lng: -118.2437, w: [193.2, 119.8], u: [87.9, 362.2] },
  { name: "Houston", lat: 29.7604, lng: -95.3698, w: [247.2, 134.8], u: [509.8, 508.3] },
  { name: "Anchorage", lat: 61.2181, lng: -149.9003, w: [184.2, 37.9], u: [112.3, 544.4] },
  { name: "Bucharest", lat: 44.4268, lng: 26.1025, w: [563.6, 85.7], u: null },
  { name: "London", lat: 51.5074, lng: -0.1278, w: [499.8, 64.1], u: null },
  { name: "Sydney", lat: -33.8688, lng: 151.2093, w: [892.8, 371], u: null },
];

describe("the projections", () => {
  it("put a live point on the world where the shapes are drawn", () => {
    for (const c of CITIES) {
      const p = projectWorld(c.lng, c.lat)!;
      expect(Math.hypot(p[0] - c.w[0], p[1] - c.w[1]), c.name).toBeLessThan(1);
    }
  });

  it("put a live point on the states, Alaska and Hawaii included, and nothing else there", () => {
    for (const c of CITIES.filter((x) => x.u)) {
      const p = projectUs(c.lng, c.lat)!;
      expect(p, c.name).not.toBeNull();
      expect(Math.hypot(p[0] - c.u![0], p[1] - c.u![1]), c.name).toBeLessThan(2);
    }
    // Honolulu sits in the Hawaii inset.
    const hnl = projectUs(-157.8583, 21.3069)!;
    expect(hnl[0]).toBeGreaterThan(200);
    expect(hnl[0]).toBeLessThan(340);
    expect(hnl[1]).toBeGreaterThan(500);
    // Sydney is on no state.
    expect(projectUs(151.2093, -33.8688)).toBeNull();
  });

  it("refuse a point that is not on Earth", () => {
    expect(projectWorld(Number.NaN, 10)).toBeNull();
    expect(projectWorld(200, 10)).toBeNull();
    expect(projectUs(-74, 95)).toBeNull();
  });

  it("are the same constants the shape files were built with", () => {
    expect(world.projection).toEqual({ kind: "equalEarth", ...EQUAL_EARTH });
    expect(world.view).toEqual([...WORLD_VIEW]);
    expect(us.view).toEqual([...US_VIEW]);
    expect(us.projection).toEqual({ kind: "albersUsa", scale: 1300, translate: [487.5, 305] });
  });
});

describe("the shapes", () => {
  it("carry every country with the code the sessions keep", () => {
    expect(world.countries.length).toBe(176);
    for (const c of world.countries) {
      expect(c.a2, c.name).toMatch(/^[A-Z]{2}$/);
      expect(c.d.startsWith("M"), c.name).toBe(true);
      expect(c.c.length).toBe(2);
    }
    const codes = new Set(world.countries.map((c) => c.a2));
    for (const a2 of ["US", "RO", "GR", "RS", "RU", "GB", "CA", "AU", "GE", "XK"]) expect(codes.has(a2), a2).toBe(true);
    expect(world.countries.find((c) => c.a2 === "US")?.name).toBe("United States");
  });

  it("carry the fifty states and Washington, by the names the lookups write", () => {
    expect(us.regions.length).toBe(51);
    const names = us.regions.map((r) => r.name);
    for (const n of ["California", "Texas", "New York", "District of Columbia", "Alaska", "Hawaii"]) expect(names).toContain(n);
  });

  it("ship in the build, so nothing is fetched from a CDN at run time", () => {
    const dir = join(process.cwd(), "components", "admin");
    const walk = (d: string): string[] =>
      readdirSync(d).flatMap((e) => (statSync(join(d, e)).isDirectory() ? walk(join(d, e)) : [join(d, e)]));
    for (const f of walk(dir).filter((x) => /\.tsx?$/.test(x))) {
      const src = readFileSync(f, "utf8");
      expect(src.includes("cdn.jsdelivr.net") || src.includes("react-simple-maps"), f).toBe(false);
    }
  });
});

describe("the heat steps", () => {
  it("are the sheet's steps for the sheet's day", () => {
    // Its top country had 310 visits, and it drew 1, 5, 20, 60 and 150.
    expect(heatThresholds(310)).toEqual([1, 5, 20, 60, 150]);
  });

  it("always rise, start at one, and spread a quiet hour too", () => {
    for (const max of [0, 1, 2, 3, 7, 40, 999, 12_345, Number.NaN]) {
      const t = heatThresholds(max);
      expect(t[0]).toBe(1);
      for (let i = 1; i < t.length; i++) expect(t[i], `${max}`).toBeGreaterThan(t[i - 1]);
    }
  });

  it("puts none at nothing, any visit on the map, and the most visited lit", () => {
    const t = heatThresholds(310);
    expect(heatStep(0, t)).toBe(0);
    expect(heatStep(1, t)).toBe(1);
    expect(heatStep(5, t)).toBe(2);
    expect(heatStep(96, t)).toBe(4);
    expect(heatStep(310, t)).toBe(5);
  });

  it("rounds to numbers a legend can print", () => {
    expect(niceStep(4.96)).toBe(5);
    expect(niceStep(62)).toBe(60);
    expect(niceStep(155)).toBe(150);
    expect(niceStep(510)).toBe(500);
    expect(niceStep(0.2)).toBe(1);
  });
});

const visit = (code: string | null, region: string | null, city: string | null, from = "Google", on = "Android app", country: string | null = null): Visit => ({
  code,
  country,
  region,
  city,
  from,
  on,
});

describe("the tally", () => {
  const visits: Visit[] = [
    visit("RO", "Bucuresti", "Bucharest", "Google", "Android app", "Romania"),
    visit("RO", "Bucuresti", "Bucharest", "Direct", "Website, phone", "Romania"),
    visit("RO", "Iasi", "Iasi", "Google", "Android app", "Romania"),
    visit("us", "California", "Los Angeles", "Instagram", "iPhone app", "United States"),
    visit("US", "California", "San Diego", "Google", "iPhone app", "United States"),
    visit("US", "Texas", "Houston", "Google", "Website, computer", "United States"),
    visit("US", null, null),
    visit(null, null, null),
    visit("??", null, null),
  ];

  it("counts every country with a visit, the most first, with its card's lists", () => {
    const { countries, unplaced } = tallyCountries(visits);
    expect(unplaced).toBe(2);
    expect(countries.map((c) => [c.key, c.visits])).toEqual([
      ["US", 4],
      ["RO", 3],
    ]);
    const ro = countries.find((c) => c.key === "RO")!;
    expect(ro.name).toBe("Romania");
    expect(countsLine(ro.places)).toBe("Bucuresti 2, Iasi 1");
    expect(countsLine(ro.from)).toBe("Google 2, Direct 1");
    expect(countsLine(ro.on)).toBe("Android app 2, Website, phone 1");
  });

  it("opens one country into its regions, each with its cities", () => {
    const r = tallyRegions(visits, "us");
    expect(r.total).toBe(4);
    expect(r.unplaced).toBe(1);
    expect(r.regions.map((x) => [x.key, x.visits])).toEqual([
      ["California", 2],
      ["Texas", 1],
    ]);
    expect(countsLine(r.regions[0].places)).toBe("Los Angeles 1, San Diego 1");
  });

  it("matches a region the way the shapes and the lookups both write it", () => {
    expect(sameRegion("California", "california")).toBe(true);
    expect(sameRegion("District of Columbia", "District Of Columbia")).toBe(true);
    expect(sameRegion("Bucuresti", "București")).toBe(true);
    expect(sameRegion("New York", "New Jersey")).toBe(false);
  });
});
