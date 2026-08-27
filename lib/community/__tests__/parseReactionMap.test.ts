import { describe, expect, it } from "vitest";

import { nextReaction, parseReactionMap } from "../reactions";

/**
 * The seam between the wire and the button.
 *
 * GET /api/community/mine tells a reader which way they voted, and the button
 * renders pressed from it. Everything else in this module is a closed set of
 * three states (1, -1, absent) reasoned about by identity, so ONE bad value
 * crossing this boundary does not degrade, it sticks: a truthy non-Reaction
 * renders as pressed, and then every transition compares it against 1 and -1,
 * matches neither, and no press can clear it.
 *
 * A cast would have compiled. That is the whole reason this is a function with
 * tests rather than an `as Record<string, ReactionState>` at the fetch site.
 */

describe("parseReactionMap", () => {
  it("keeps the two real reactions", () => {
    expect(parseReactionMap({ a: 1, b: -1 })).toEqual({ a: 1, b: -1 });
  });

  it("DROPS zero, which is the value that would stick", () => {
    // 0 is the tempting encoding for "no reaction" and it is not one here.
    // Absent is how this module spells that, and 0 is falsy but not absent:
    // it would survive a cast and then match no transition.
    expect(parseReactionMap({ a: 0 })).toEqual({});
  });

  it("drops a stringified reaction, which no === in this module matches", () => {
    // JSON from an older deploy, or a hand-rolled request. "1" is truthy and
    // is not 1.
    expect(parseReactionMap({ a: "1", b: "-1" })).toEqual({});
  });

  it("drops null, undefined, booleans, objects and out-of-range numbers", () => {
    expect(
      parseReactionMap({
        a: null,
        b: undefined,
        c: true,
        d: {},
        e: 2,
        f: -2,
        g: 1.0000001,
        h: NaN,
      }),
    ).toEqual({});
  });

  it("keeps the good entries and drops the bad ones in the same object", () => {
    // The realistic failure is a partly-bad payload, not a wholly-bad one.
    expect(parseReactionMap({ good: 1, bad: 0, alsoGood: -1, alsoBad: "x" })).toEqual({
      good: 1,
      alsoGood: -1,
    });
  });

  it("survives a payload that is not an object at all", () => {
    for (const raw of [null, undefined, 1, "x", true, [1, -1]]) {
      expect(parseReactionMap(raw), String(raw)).toEqual({});
    }
  });

  it("drops an empty id, which could never address a post", () => {
    expect(parseReactionMap({ "": 1 })).toEqual({});
  });

  it("leaves what it keeps usable by the transition table", () => {
    // The point of the narrowing: whatever comes out must round-trip through
    // the rule the button applies. A dropped entry reads as "holding neither",
    // and pressing then gives a like rather than doing nothing.
    const parsed = parseReactionMap({ held: 1, dropped: 0 });
    expect(nextReaction(parsed.held ?? null, 1)).toBe(null);
    expect(nextReaction(parsed.held ?? null, -1)).toBe(-1);
    expect(nextReaction(parsed.dropped ?? null, 1)).toBe(1);
  });

  it("does not inherit keys from the prototype chain", () => {
    const raw = Object.create({ inherited: 1 }) as Record<string, unknown>;
    raw.own = 1;
    expect(parseReactionMap(raw)).toEqual({ own: 1 });
  });
});
