import { describe, expect, it } from "vitest";

import { applyResponse, countsOf, parseResponseMap, toggleMine } from "../responses";

describe("responses", () => {
  const counts = { amen: 2, praying: 0, glory: 1 };

  it("moves only the response tapped, and only when it changes", () => {
    expect(applyResponse(counts, [], "praying", true)).toEqual({ amen: 2, praying: 1, glory: 1 });
    expect(applyResponse(counts, ["amen"], "amen", false)).toEqual({ amen: 1, praying: 0, glory: 1 });
    // Already held: turning it on again changes nothing.
    expect(applyResponse(counts, ["amen"], "amen", true)).toBe(counts);
  });

  it("never goes below zero", () => {
    expect(applyResponse({ amen: 0, praying: 0, glory: 0 }, ["amen"], "amen", false).amen).toBe(0);
  });

  it("keeps a reader's own responses in a fixed order", () => {
    expect(toggleMine(["glory"], "amen", true)).toEqual(["amen", "glory"]);
    expect(toggleMine(["amen", "glory"], "amen", false)).toEqual(["glory"]);
  });

  it("reads totals off a row from any server", () => {
    expect(countsOf({ amen_count: 3, praying_count: null })).toEqual({ amen: 3, praying: 0, glory: 0 });
  });

  it("narrows the wire, dropping anything that is not a response", () => {
    expect(parseResponseMap({ a: ["amen", "wow", "glory"], b: "amen", c: [] })).toEqual({ a: ["amen", "glory"] });
    expect(parseResponseMap(null)).toEqual({});
  });
});
