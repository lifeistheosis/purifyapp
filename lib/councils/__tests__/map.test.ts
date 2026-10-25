import { describe, expect, it } from "vitest";

import { COUNCILS } from "../councils";
import { COUNCIL_PLACES, councilMap, project } from "../map";

// The councils on a map (1.8): every council the app carries is placed, on
// the map, and each mark names its councils in the list under it.

describe("the councils' map", () => {
  it("places every council the app carries", () => {
    for (const c of COUNCILS) expect(COUNCIL_PLACES[c.slug], c.slug).toBeDefined();
    for (const slug of Object.keys(COUNCIL_PLACES)) expect(COUNCILS.some((c) => c.slug === slug), slug).toBe(true);
  });

  it("puts every mark inside the map", () => {
    const { view, places } = councilMap();
    for (const p of places) {
      expect(p.x, p.place).toBeGreaterThan(0);
      expect(p.x, p.place).toBeLessThan(view[0]);
      expect(p.y, p.place).toBeGreaterThan(0);
      expect(p.y, p.place).toBeLessThan(view[1]);
    }
  });

  it("names each council under its city once, in order of year", () => {
    const { places } = councilMap();
    const all = places.flatMap((p) => p.councils.map((c) => c.slug));
    expect(new Set(all).size).toBe(COUNCILS.length);
    for (const p of places) {
      const years = p.councils.map((c) => c.year);
      expect(years, p.place).toEqual([...years].sort((a, b) => a - b));
    }
  });

  it("draws Constantinople north of Ephesus and Carthage west of Antioch", () => {
    expect(project(41.008, 28.978).y).toBeLessThan(project(37.941, 27.342).y);
    expect(project(36.853, 10.323).x).toBeLessThan(project(36.202, 36.16).x);
  });
});
