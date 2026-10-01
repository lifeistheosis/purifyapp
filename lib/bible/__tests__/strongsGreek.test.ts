// The Greek word card, and the top of the Plus word study sheet, show `d` from
// lib/bible/strongs-greek.json: Strong's own definition of the word.
//
// This exists because 166 of them were wrong. The Open Scriptures XML the
// lexicon comes from tags each entry's derivation and definition separately,
// and in those entries the tag sat in the wrong place. G2316 θεός began
// "figuratively, a magistrate" because "a deity, especially (with G3588) the
// supreme Divinity;" had been filed as derivation, and G5587 began inside the
// derivation's parenthesis: "by implication, a slander; probably akin to
// G5574 (ψεύδομαι)); whispering". scripts/build-strongs-greek.mjs rebuilds the
// file and repairs them.
//
// 1. G2316 is pinned, verbatim.
// 2. No definition opens on a word that continues an earlier clause. That is
//    what a definition missing its opening looks like. Five of Strong's own
//    definitions do open that way, straight after their derivation; they are
//    in OPENS_ON_CONNECTIVE, checked against the plain e-text.
// 3. No definition closes a parenthesis it never opened before its first
//    clause ends. That is what a derivation running into it looks like. The
//    e-text itself has three stray ")" (SOURCE_SLIPS), kept as printed.
//
// Both lists must stay exact, so a repaired entry cannot leave a stale pass.

import { describe, expect, it } from "vitest";

import lexicon from "../strongs-greek.json";

type Entry = { l: string; t: string; d: string };
const LEX = lexicon as Record<string, Entry>;

const CONNECTIVE =
  /^(figuratively|by (implication|extension|analogy|Hebraism|qualification)|specially|especially|also|i\.e\.|passively)(?=[\s,])/;

const OPENS_ON_CONNECTIVE = new Set([
  "G383", // ἀνασείω: "from 303 and 4579; figuratively, to excite"
  "G2000", // ἐπισφαλής: "from a compound of 1909 and sphallo (to trip); figuratively, insecure"
  "G2866", // κομψότερον: "...(meaning, properly, well dressed, i.e. nice); figuratively, convalescent"
  "G2945", // κύκλῳ: "...(a ring, "cycle"; akin to 2947); i.e. in a circle"
  "G2956", // Κυρηναῖος: "from 2957; i.e. Cyrenæan, i.e. inhabitant of Cyrene"
]);

const SOURCE_SLIPS = new Set([
  "G852", // ἀφανής: "non-apparent)"
  "G3123", // μᾶλλον: "more (in a greater degree)) or rather"
  "G4706", // σπουδαιότερον: "more earnestly than others), i.e. very promptly"
]);

// True when `d` closes a parenthesis it never opened before its first
// top-level semicolon.
function opensInsideParenthesis(d: string): boolean {
  let depth = 0;
  for (const c of d) {
    if (c === "(") depth++;
    else if (c === ")" && --depth < 0) return true;
    else if (c === ";" && depth === 0) return false;
  }
  return false;
}

describe("Strong's Greek definitions", () => {
  it("has the whole of G2316", () => {
    expect(LEX.G2316.d).toBe(
      "a deity, especially (with G3588 (ὁ)) the supreme Divinity; figuratively, a magistrate; by Hebraism, very",
    );
  });

  it("has no definition missing its opening", () => {
    const opens = Object.entries(LEX)
      .filter(([, e]) => CONNECTIVE.test(e.d))
      .map(([k]) => k);
    expect(opens.filter((k) => !OPENS_ON_CONNECTIVE.has(k))).toEqual([]);
    expect([...OPENS_ON_CONNECTIVE].filter((k) => !opens.includes(k))).toEqual([]);
  });

  it("has no definition opening inside its derivation", () => {
    const inside = Object.entries(LEX)
      .filter(([, e]) => opensInsideParenthesis(e.d))
      .map(([k]) => k);
    expect(inside.filter((k) => !SOURCE_SLIPS.has(k))).toEqual([]);
    expect([...SOURCE_SLIPS].filter((k) => !inside.includes(k))).toEqual([]);
  });

  it("has a definition for every entry", () => {
    expect(Object.entries(LEX).filter(([, e]) => !e.d.trim()).map(([k]) => k)).toEqual([]);
  });
});
