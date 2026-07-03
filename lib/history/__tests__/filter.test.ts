// Shared filter/search/state semantics for the History timeline — the same
// pure functions drive every platform shell, so this is where cross-platform
// consistency is proven. Includes the 500-record structural scale check.

import { describe, expect, it } from "vitest";

import { HISTORY_ERAS, publishedEvents } from "../events";
import {
  EMPTY_FILTERS,
  applyFilters,
  groupByEra,
  hasActiveFilters,
  matchesQuery,
  searchEvents,
} from "../filter";
import { EMPTY_STATE, fromSearchParams, toSearchParams } from "../state";
import { generateStructuralRecords } from "./fixtures";

const EVENTS = publishedEvents();

describe("applyFilters", () => {
  it("no filters returns everything", () => {
    expect(applyFilters(EVENTS, EMPTY_FILTERS)).toHaveLength(EVENTS.length);
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
  });

  it("filters by era", () => {
    const out = applyFilters(EVENTS, { ...EMPTY_FILTERS, era: "imperial-conciliar" });
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((e) => e.era === "imperial-conciliar")).toBe(true);
  });

  it("filters by category (any-of)", () => {
    const out = applyFilters(EVENTS, { ...EMPTY_FILTERS, categories: ["councils"] });
    expect(out.every((e) => e.categories.includes("councils"))).toBe(true);
  });

  it("filters by century across year ranges", () => {
    const out = applyFilters(EVENTS, { ...EMPTY_FILTERS, century: 4 });
    expect(out.some((e) => e.slug === "first-council-of-nicaea")).toBe(true);
    expect(out.some((e) => e.slug === "fall-of-constantinople")).toBe(false);
  });

  it("query matches title, alias, and year", () => {
    expect(applyFilters(EVENTS, { ...EMPTY_FILTERS, query: "nicaea" }).length).toBeGreaterThan(0);
    expect(applyFilters(EVENTS, { ...EMPTY_FILTERS, query: "1453" })[0]?.slug).toBe(
      "fall-of-constantinople",
    );
    const alias = EVENTS.find((e) => e.aliases?.length);
    if (alias) {
      expect(matchesQuery(alias, alias.aliases![0].toLowerCase())).toBe(true);
    }
  });
});

describe("searchEvents", () => {
  it("ranks title prefix over body hits and respects limit", () => {
    const out = searchEvents(EVENTS, "the", 3);
    expect(out.length).toBeLessThanOrEqual(3);
    const nicaea = searchEvents(EVENTS, "first ecumenical");
    expect(nicaea[0]?.slug).toBe("first-council-of-nicaea");
  });

  it("empty query returns nothing", () => {
    expect(searchEvents(EVENTS, "  ")).toHaveLength(0);
  });
});

describe("groupByEra", () => {
  it("groups chronologically and skips empty eras", () => {
    const groups = groupByEra(EVENTS);
    const order = HISTORY_ERAS.map((e) => e.id);
    let last = -1;
    for (const g of groups) {
      const idx = order.indexOf(g.era.id);
      expect(idx).toBeGreaterThan(last);
      last = idx;
      expect(g.events.length).toBeGreaterThan(0);
    }
  });
});

describe("URL state codec", () => {
  it("round-trips a full state", () => {
    const state = {
      era: "estrangement" as const,
      categories: ["schisms" as const, "doctrine" as const],
      certainty: "historically-attested" as const,
      century: 11,
      query: "schism",
      selected: "great-schism-1054",
    };
    const round = fromSearchParams(toSearchParams(state));
    expect(round).toEqual(state);
  });

  it("empty state serializes to an empty string (bare URL stays bare)", () => {
    expect(toSearchParams(EMPTY_STATE).toString()).toBe("");
  });

  it("drops unknown or malicious values instead of throwing", () => {
    const p = new URLSearchParams(
      "era=nope&cat=councils,fake&cert=x&c=99&e=<script>&q=ok",
    );
    const s = fromSearchParams(p);
    expect(s.era).toBeUndefined();
    expect(s.categories).toEqual(["councils"]);
    expect(s.certainty).toBeUndefined();
    expect(s.century).toBeUndefined();
    expect(s.selected).toBeUndefined();
    expect(s.query).toBe("ok");
  });
});

describe("structural scale (500 generated records)", () => {
  const big = generateStructuralRecords(500);

  it("filters/search/group stay correct at scale", () => {
    expect(big).toHaveLength(500);
    const byEra = applyFilters(big, { ...EMPTY_FILTERS, era: "modern" });
    expect(byEra.every((e) => e.era === "modern")).toBe(true);
    const groups = groupByEra(big);
    expect(groups.reduce((n, g) => n + g.events.length, 0)).toBe(500);
    expect(searchEvents(big, "structural test record 42").length).toBeGreaterThan(0);
  });

  it("stays fast enough for interactive filtering", () => {
    const t0 = performance.now();
    for (let i = 0; i < 50; i++) {
      applyFilters(big, { ...EMPTY_FILTERS, query: "record " + i });
    }
    expect(performance.now() - t0).toBeLessThan(1000);
  });
});
