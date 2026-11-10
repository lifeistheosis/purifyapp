// A palette's name in the reader's own words (1.9, the arbiter's of
// 2026-11-10 07:43 UTC, found by the Themes chat). The five everyday
// palettes, Dark, Light, True black, Candlelight and Monastery, were drawn in
// English in sixteen of the twenty-one languages, beside the eighteen looks'
// names in the reader's own words, and "Candlelight and Monastery are part of
// Purify Plus" named them in English in all twenty. They are in each
// language's own words now, and so are the lines that name them.
//
// What this holds:
//
//  - Every palette and look in the registry (lib/reader/readingModes.ts), and
//    every family the looks are shelved in, has a name in every catalog that
//    is not the English, unless the pair is named in SAME_AS_ENGLISH with its
//    reason: a place the language spells as English does (Jordan, Patmos), or
//    a word that is the language's own as well (Roses in French).
//  - No catalog but English names a palette in English anywhere else, so a
//    line that names one ("Candlelight and Monastery are part of Purify
//    Plus", "Candlelight at Vespers") says it as that catalog's own name
//    does. A line that carries one of those English words for another reason
//    is named in NOT_THE_PALETTE.
//  - Each exception is still needed: a catalog that has found a word of its
//    own lets its exception go.
//
// What it does not hold: whether the words are the right ones. They were
// chosen with each catalog's own words for these things (its monastery, its
// candle, its dark palette) and fitted to the narrowest places they are
// drawn: a palette's name in Settings is 66px wide and cannot break a word,
// and the Plus preview's switch cuts a long name short.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { LOCALES } from "@/lib/i18n/locales";
import { READING_THEMES, THEME_FAMILIES } from "@/lib/reader/readingModes";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const catalog = (code: string) =>
  JSON.parse(fs.readFileSync(path.join(ROOT, `lib/i18n/messages/${code}.json`), "utf8")) as Record<string, string>;

const EN = catalog("en");
const OTHERS = LOCALES.map((l) => l.code).filter((code) => code !== "en");

/** Each name the picker draws: the palettes and looks, and the families of looks. */
const NAMES = [
  ...READING_THEMES.map((theme) => ({ key: theme.labelKey ?? "", of: `the ${theme.id} palette` })),
  ...THEME_FAMILIES.map((family) => ({ key: family.labelKey, of: `the ${family.id} family` })),
];

/** The palettes' English names, as a line in another catalog could carry them. */
const ENGLISH_NAMES = [...new Set(READING_THEMES.map((theme) => EN[theme.labelKey ?? ""]))];

const PLACE = "a place, which the language spells as English does";

/** A name the same as the English in a language, on purpose. Keyed `<code>:<the English name>`. */
const SAME_AS_ENGLISH: Record<string, string> = {
  "de:Jordan": PLACE,
  "fil:Jordan": PLACE,
  "pl:Jordan": PLACE,
  "de:Patmos": PLACE,
  "es:Patmos": PLACE,
  "fil:Patmos": PLACE,
  "fr:Patmos": PLACE,
  "id:Patmos": PLACE,
  "it:Patmos": PLACE,
  "pl:Patmos": PLACE,
  "pt:Patmos": PLACE,
  "ro:Patmos": PLACE,
  "tr:Patmos": PLACE,
  "fr:Roses": "the French for roses is the same word",
  "id:Linen": "Indonesian has the word as its own (kain linen)",
};

/** A line that carries a palette's English name for another reason. Keyed `<code>:<key>`, or `*:<key>` for every catalog. */
const NOT_THE_PALETTE: Record<string, string> = {
  "*:ui.theMorningAndEveningRules": "St. Tikhon's Monastery Press, a publisher's name, kept as it is printed",
  // Not here since 2026-11-10: the Hungarian "Wi-Fire" (Wi-Fi with the ending
  // -re). It needed a place while Fire was a look's English name, and Fire
  // came out of the looks that day.
};

/** Where `name` stands as a word of its own in `line`. */
const namedIn = (line: string, name: string) => new RegExp(`(?<![\\p{L}\\p{M}])${name}(?![\\p{L}\\p{M}])`, "u").test(line);

describe("a palette's name", () => {
  it("is in each language's own words, in every catalog", () => {
    expect(OTHERS.length).toBe(20);
    // Twenty-four palettes and looks, and four families (twenty-nine before Fire came out of the looks).
    expect(NAMES.length).toBeGreaterThanOrEqual(28);
    const english: string[] = [];
    for (const code of OTHERS) {
      const words = catalog(code);
      for (const { key, of } of NAMES) {
        expect(key, of).not.toBe("");
        const value = words[key];
        expect(typeof value === "string" && value.trim() !== "", `${code}: ${key} (${of}) has no words`).toBe(true);
        if (value === EN[key] && !SAME_AS_ENGLISH[`${code}:${value}`]) english.push(`${code}: ${key} (${of}) is "${value}", the English`);
      }
    }
    // A name that is rightly the English: SAME_AS_ENGLISH, with its reason.
    expect(english).toEqual([]);
  });

  it("is never left in English for the five everyday palettes", () => {
    // Dark, Light, True black, Candlelight and Monastery: the five the arbiter found in English.
    const five = READING_THEMES.filter((theme) => !theme.look && !theme.collection).map((theme) => EN[theme.labelKey ?? ""]);
    expect(five).toEqual(["Dark", "Light", "True black", "Candlelight", "Monastery"]);
    for (const name of five) expect(Object.keys(SAME_AS_ENGLISH).filter((pair) => pair.endsWith(`:${name}`)), name).toEqual([]);
  });

  it("is said in a catalog's own words wherever a line names it", () => {
    const left: string[] = [];
    for (const code of OTHERS) {
      for (const [key, line] of Object.entries(catalog(code))) {
        if (typeof line !== "string" || NOT_THE_PALETTE[`${code}:${key}`] || NOT_THE_PALETTE[`*:${key}`]) continue;
        for (const name of ENGLISH_NAMES) {
          if (namedIn(line, name) && !SAME_AS_ENGLISH[`${code}:${name}`]) left.push(`${code}: ${key} names "${name}" in English: ${line}`);
        }
      }
    }
    // A line that carries the English word for another reason: NOT_THE_PALETTE, with its reason.
    expect(left).toEqual([]);
  });

  it("keeps no exception it no longer needs", () => {
    for (const pair of Object.keys(SAME_AS_ENGLISH)) {
      const [code, name] = [pair.slice(0, pair.indexOf(":")), pair.slice(pair.indexOf(":") + 1)];
      const words = catalog(code);
      const still = NAMES.some(({ key }) => EN[key] === name && words[key] === name);
      expect(still, `${pair}: the catalog has its own word now; let the exception go`).toBe(true);
    }
    for (const pair of Object.keys(NOT_THE_PALETTE)) {
      const [code, key] = [pair.slice(0, pair.indexOf(":")), pair.slice(pair.indexOf(":") + 1)];
      const codes = code === "*" ? OTHERS : [code];
      const still = codes.some((c) => ENGLISH_NAMES.some((name) => namedIn(catalog(c)[key] ?? "", name)));
      expect(still, `${pair}: the line names no palette in English now; let the exception go`).toBe(true);
    }
  });
});
