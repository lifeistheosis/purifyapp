import { describe, expect, it } from "vitest";

import { US_JURISDICTIONS } from "@/lib/onboarding/clergy";

import { PARISH_LIMIT, SHOW_ALL_UNDER, US_STATES, searchParishes, words } from "../search";
import { US_PARISH_LIST, type UsParish } from "../usParishes";

/**
 * The parishes a US priest or deacon searches in the welcome questions (1.8.x,
 * the owner's note 54), and the search itself: by name, city or state, offline.
 * The list is a SAMPLE until a whole one is ours to use (the file says why).
 */

const P = US_PARISH_LIST.parishes;
const ids = (list: readonly UsParish[]) => list.map((p) => p.id);

describe("the list", () => {
  it("is marked SAMPLE, with no source, until a whole list is ours to use", () => {
    expect(US_PARISH_LIST.sample).toBe(true);
    expect(US_PARISH_LIST.source).toBeNull();
    expect(US_PARISH_LIST.checkedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("holds each parish once, in a state, under a jurisdiction of the Assembly, with where it was read", () => {
    expect(new Set(ids(P)).size).toBe(P.length);
    const jurisdictions = new Set(US_JURISDICTIONS.map((j) => j.id));
    for (const p of P) {
      expect(jurisdictions.has(p.jurisdiction), p.id).toBe(true);
      expect(US_STATES[p.state], p.id).toBeTruthy();
      expect(p.name.trim().length, p.id).toBeGreaterThan(1);
      expect(p.city.trim().length, p.id).toBeGreaterThan(1);
      // A sample entry was read on a page, never written from memory.
      expect(p.from, p.id).toMatch(/^https?:\/\/\S+$/);
    }
  });
});

describe("the search", () => {
  it("shows a short list whole before anything is typed, and a long one only once a word is", () => {
    expect(P.length).toBeLessThanOrEqual(SHOW_ALL_UNDER);
    expect(searchParishes(P, "")).toHaveLength(P.length);
    const long = Array.from({ length: SHOW_ALL_UNDER + 1 }, (_, i) => ({ ...P[0], id: `p${i}` }));
    expect(searchParishes(long, "  ")).toEqual([]);
    expect(searchParishes(long, "nicholas").length).toBeLessThanOrEqual(PARISH_LIMIT);
  });

  it("finds by city", () => {
    expect(ids(searchParishes(P, "Chicago")).sort()).toEqual(
      ["albanian-chicago-st-nicholas", "romanian-chicago-constantine-helen", "serbian-chicago-holy-resurrection"].sort(),
    );
  });

  it("finds by state, by its code or its name", () => {
    const illinois = ["albanian-chicago-st-nicholas", "bulgarian-des-plaines-st-sophia", "romanian-chicago-constantine-helen", "serbian-chicago-holy-resurrection"].sort();
    expect(ids(searchParishes(P, "IL")).sort()).toEqual(illinois);
    expect(ids(searchParishes(P, "illinois")).sort()).toEqual(illinois);
    expect(ids(searchParishes(P, "Massachusetts")).sort()).toEqual(["albanian-south-boston-holy-trinity", "romanian-andover-st-parascheva"].sort());
  });

  it("finds by name, with Saint and St. as one word, and accents and case aside", () => {
    const nicholas = ids(searchParishes(P, "nicholas"));
    expect(nicholas).toEqual(expect.arrayContaining(["oca-washington-st-nicholas", "antiochian-brooklyn-st-nicholas", "mospat-new-york-st-nicholas", "albanian-chicago-st-nicholas"]));
    expect(nicholas).toHaveLength(4);
    expect(ids(searchParishes(P, "Saint Nicholas")).sort()).toEqual([...nicholas].sort());
    expect(ids(searchParishes(P, "ST. NICHOLAS")).sort()).toEqual([...nicholas].sort());
    expect(ids(searchParishes(P, "Saints Constantine"))).toEqual(["romanian-chicago-constantine-helen"]);
    expect(ids(searchParishes(P, "parascheva"))).toEqual(["romanian-andover-st-parascheva"]);
    expect(words("Ss. Constantine and Helen")).toEqual(["ss", "constantine", "and", "helen"]);
  });

  it("needs every word typed: a name and a city narrow to the one meant", () => {
    expect(ids(searchParishes(P, "nicholas chicago"))).toEqual(["albanian-chicago-st-nicholas"]);
    expect(ids(searchParishes(P, "trinity new york"))).toEqual(["goa-new-york-holy-trinity"]);
    expect(searchParishes(P, "nicholas dallas")).toEqual([]);
    expect(searchParishes(P, "zzz")).toEqual([]);
  });

  it("puts a name that begins with what was typed first", () => {
    expect(ids(searchParishes(P, "holy")).slice(0, 4).sort()).toEqual(
      ["goa-new-york-holy-trinity", "rocor-san-francisco-holy-virgin", "serbian-chicago-holy-resurrection", "albanian-south-boston-holy-trinity"].sort(),
    );
  });

  it("puts the reader's own jurisdiction first among equals", () => {
    expect(searchParishes(P, "chicago", { prefer: "romanian" })[0].id).toBe("romanian-chicago-constantine-helen");
    expect(searchParishes(P, "chicago", { prefer: "albanian" })[0].id).toBe("albanian-chicago-st-nicholas");
    expect(searchParishes(P, "", { prefer: "rocor" })[0].id).toBe("rocor-san-francisco-holy-virgin");
  });

  it("keeps to its limit", () => {
    expect(searchParishes(P, "", { limit: 3 })).toHaveLength(3);
  });
});
