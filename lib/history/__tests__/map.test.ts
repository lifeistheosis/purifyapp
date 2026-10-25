import { describe, expect, it } from "vitest";

import { COUNCILS } from "@/lib/councils/councils";

import { publishedEvents } from "../events";
import { EVENT_PLACES, historyMap } from "../map";

// History on the map (1.8): every published event placed, on the map or
// listed beyond it, each named once, and a council's own account not listed
// beside the council.

describe("history on the map", () => {
  it("places every published event, and only events the timeline has", () => {
    const slugs = publishedEvents().map((e) => e.slug);
    for (const slug of slugs) expect(EVENT_PLACES[slug], slug).toBeDefined();
    for (const slug of Object.keys(EVENT_PLACES)) expect(slugs, slug).toContain(slug);
  });

  it("puts every mark inside the map", () => {
    const { view, places } = historyMap();
    for (const p of places) {
      expect(p.x, p.place).toBeGreaterThan(0);
      expect(p.x, p.place).toBeLessThan(view[0]);
      expect(p.y, p.place).toBeGreaterThan(0);
      expect(p.y, p.place).toBeLessThan(view[1]);
    }
  });

  it("lists every council once, and an event once unless it is a council's own account", () => {
    const { places, beyond } = historyMap();
    const hrefs = [...places.flatMap((p) => p.items.map((i) => i.href)), ...beyond.map((i) => i.href)];
    expect(new Set(hrefs).size).toBe(hrefs.length);
    for (const c of COUNCILS) expect(hrefs, c.slug).toContain(`/councils/${c.slug}`);
    // The seven Ecumenical Councils' accounts are the councils on this map.
    for (const slug of ["first-council-of-nicaea", "council-of-chalcedon", "second-council-of-nicaea"]) {
      expect(hrefs, slug).not.toContain(`/history/${slug}`);
    }
    // An event that names a council but happened elsewhere stays.
    expect(hrefs).toContain("/history/arian-controversy-begins");
    expect(hrefs).toContain("/history/non-chalcedonian-estrangement");
  });

  it("keeps each place's items in order of year", () => {
    for (const p of historyMap().places) {
      const years = p.items.map((i) => i.year);
      expect(years, p.place).toEqual([...years].sort((a, b) => a - b));
    }
  });

  it("draws places too near to tell apart as one mark with both names", () => {
    const places = historyMap().places;
    const named = (place: string) => places.find((p) => p.place === place);
    expect(places.map((p) => p.place)).not.toContain("Nicaea");
    // The map carries the shorter name: the one with more to it, a council's city on a tie.
    expect(named("Nicomedia and Nicaea")?.label).toBe("Nicaea");
    expect(named("Smyrna and Ephesus")?.label).toBe("Ephesus");
  });

  it("lists Alaska and America under the map, and has Rus' on it", () => {
    const { places, beyond } = historyMap();
    expect(beyond.map((i) => i.href)).toEqual(["/history/alaska-mission", "/history/oca-autocephaly"]);
    const kyiv = places.find((p) => p.place === "Kyiv");
    const moscow = places.find((p) => p.place === "Moscow");
    expect(kyiv?.items.map((i) => i.year)).toEqual([988, 2018]);
    expect(moscow?.items.map((i) => i.year)).toEqual([1589, 1917, 2018]);
    // North is up: Moscow above Kyiv above Constantinople.
    const city = places.find((p) => p.place.startsWith("Constantinople"));
    expect(moscow!.y).toBeLessThan(kyiv!.y);
    expect(kyiv!.y).toBeLessThan(city!.y);
  });
});
