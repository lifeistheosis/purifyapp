import { describe, expect, it } from "vitest";

import { censorText, compileFilter, findHits, handleBlocked, normalizeForMatch, type TermEntry } from "../filter";
import { ALLOWED_WORDS, BUILT_IN_TERMS } from "../terms";

// Mechanics are tested on made-up words, so this file holds no slur in plain
// text. The built-in list is checked by decoding it at run time.
const SYNTHETIC: TermEntry[] = [
  ["zorbak", "tpa"], // anywhere in a word, anywhere in a handle
  ["glum", "twk", "s|ed"], // whole word, whole handle token
  ["vex", "h-k"], // handles only, as a token
  ["quizzle", "h-a"], // handles only, anywhere
];
const F = compileFilter(SYNTHETIC, ["bezorbakian"]);
const REAL = compileFilter(BUILT_IN_TERMS, ALLOWED_WORDS);
const decode = (b64: string) => Buffer.from(b64, "base64").toString("utf8");
const N = decode("bmlnZ2Vy");
const F4 = decode("ZnVjaw==");

describe("normalizeForMatch", () => {
  it("lowers, strips accents and invisible characters, and maps back to the text as written", () => {
    const n = normalizeForMatch("Zór​bak!");
    expect(n.norm).toBe("zorbak!");
    expect(n.from.length).toBe(n.norm.length);
  });

  it("reads digits as letters only inside a word, so punctuation still ends one", () => {
    expect(normalizeForMatch("z0rb4k").norm).toBe("zorbak");
    expect(normalizeForMatch("glum! 2024").norm).toBe("glum! 2024");
  });

  it("swaps look-alike letters only in a word that mixes scripts", () => {
    expect(normalizeForMatch("zоrbak").norm).toBe("zorbak"); // a Cyrillic о inside
    expect(normalizeForMatch("Слава Богу").norm).toBe("слава богу");
  });
});

describe("findHits and censorText", () => {
  it("masks a listed word where it stands, keeping everything else", () => {
    expect(censorText("Well, glum to you.", F)).toEqual({ text: "Well, **** to you.", hits: 1 });
    expect(censorText("Nothing here.", F)).toEqual({ text: "Nothing here.", hits: 0 });
  });

  it("catches the usual ways round", () => {
    for (const s of ["ZORBAK", "z.o.r.b.a.k", "z o r b a k", "zzzorrrbaaak", "z0rb4k", "zórbák", "zo​rbak", "megazorbakz"]) {
      expect(findHits(s, F).length, s).toBe(1);
    }
    expect(findHits("glums and glumed", F).length).toBe(2);
  });

  it("leaves ordinary words that only contain a listed one", () => {
    expect(findHits("glumly", F)).toEqual([]); // a whole-word term
    expect(findHits("the bezorbakian rite", F)).toEqual([]); // the allowlist
  });

  it("does not touch handle-only words in writing", () => {
    expect(findHits("vex quizzle", F)).toEqual([]);
  });

  it("masks the text as written, accents and spacing included", () => {
    expect(censorText("so z.o.r.b.a.k!", F).text).toBe("so ******!");
  });
});

describe("handleBlocked", () => {
  it("refuses a listed word anywhere, digits read as letters", () => {
    for (const h of ["zorbak", "xx_zorbak_xx", "z0rb4k", "the.zorbak.99", "quizzle123", "aquizzleb"]) expect(handleBlocked(h, F), h).toBe(true);
  });

  it("refuses a token-only word as a whole token, not inside other words", () => {
    expect(handleBlocked("vex", F)).toBe(true);
    expect(handleBlocked("vex_99", F)).toBe(true);
    expect(handleBlocked("vexes", F)).toBe(false);
    expect(handleBlocked("convex", F)).toBe(false);
    expect(handleBlocked("glum", F)).toBe(true);
    expect(handleBlocked("glumly", F)).toBe(false);
  });

  it("lets ordinary handles through", () => {
    for (const h of ["maria.p", "reader123456", "seraphim_of_sarov", "john.chrysostom"]) expect(handleBlocked(h, F), h).toBe(false);
  });
});

describe("the built-in list", () => {
  it("catches real terms, disguised", () => {
    expect(findHits(`you ${N}`, REAL).length).toBe(1);
    expect(findHits(`you ${[...N].join(".")}`, REAL).length).toBe(1);
    expect(findHits(`${F4}ing hell`, REAL).length).toBe(1);
    expect(handleBlocked(`xx${N}xx`, REAL)).toBe(true);
    expect(handleBlocked(N.replace("i", "1").replace("e", "3"), REAL)).toBe(true);
  });

  it("leaves the classic false alarms alone in writing", () => {
    const clean = [
      "Niger and Nigeria",
      "the children began to snigger",
      "Scunthorpe United",
      "a flame retardant coat",
      "a pinch of spice, a spicy stew",
      "Santiago de Compostela",
      "the sexton rang the bell",
      "my therapist said",
      "a careful analysis of the canal",
      "Dickens wrote of Sussex",
      "before the cock crow, thou shalt deny me thrice",
      "Babylon the great, the mother of harlots",
      "the raccoon and the cocoon",
      "Pakistan and the Yiddish press",
      "we fight against porn addiction with prayer",
      "Lord have mercy on me, a sinner. Hell and damnation.",
    ];
    for (const s of clean) expect(findHits(s, REAL), s).toEqual([]);
  });

  it("leaves ordinary handles and names alone", () => {
    for (const h of ["sexton.john", "the.therapist", "canal_walks", "dickens_fan", "santiago", "nigeria.orthodox", "analysis", "peacock", "convex", "spice.girl", "reader104512"]) {
      expect(handleBlocked(h, REAL), h).toBe(false);
    }
  });

  it("refuses handles with NSFW words a post could fairly use", () => {
    for (const h of ["porn_star", "nsfw.only", "onlyfans.link", "sexy.girl", "satan_666"]) expect(handleBlocked(h, REAL), h).toBe(true);
  });
});
