// No sparkle star (CLAUDE.md, the owner's word of 2026-11-11, build 93 note
// 7): "I made it very clear to not use this icon widget design of that like
// star, because that is a vibe coded AI slop detected design. So anywhere
// where it's used, replace it with a new design." The four-point sparkle, the
// Sparkle icon and the three characters below, is drawn nowhere the app
// draws. Each place that wore it wears an icon that names what it is
// (docs/1.9-build/notes/build-93.md, note 7, lists them).
//
// Readers' own text is theirs: lib/community/symbols.ts names the characters
// only to draw what a reader typed in a face that has them, and is excepted
// by name. The five-point Star of bookmarks and ratings and the eight-point
// Octogram are not sparkles. scripts/mock-check.mjs holds mockups to the same
// (its `sparkle` rule, proved by --self-test).
//
// The characters are written here as their codes, so this file holds none of
// them.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { fourPointStars } from "@/scripts/lib/four-point-star.mjs";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const ROOTS = ["app", "components", "lib"];
const KINDS = /\.(css|tsx?|mjs|js|json|svg|html)$/;

/** Readers' own text, drawn as they typed it (see above). */
const READERS_OWN = new Set(["lib/community/symbols.ts"]);

/** U+2726 black four pointed star, U+2727 white four pointed star, U+2728 sparkles. */
const CODES = [0x2726, 0x2727, 0x2728];
const GLYPH = new RegExp(`[${CODES.map((c) => String.fromCodePoint(c)).join("")}]`, "u");
/** The same characters escaped: \u2726 and \u{2726} in code, &#x2726; and &#10022; in markup, \2726 in CSS. */
const ESCAPED = new RegExp(
  [
    String.raw`\\u\{?0*272[678]\}?`,
    String.raw`&#x0*272[678];`,
    String.raw`&#1002[234];`,
    String.raw`\\272[678](?![0-9a-f])`,
  ].join("|"),
  "i",
);
/** The Sparkle icon (or lucide's Sparkles) imported or drawn, and a sparkle named as an icon kind. */
const ICON = [
  /icons\/Sparkles?["']/,
  /import[^;]*\b(?:Wand)?Sparkles?\b[^;]*from/,
  /<(?:Wand)?Sparkles?[\s/>]/,
  /(["'`])sparkles?\1/i,
];

function walk(dir: string, out: string[] = [], kinds: RegExp = KINDS): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "__tests__") continue;
    const file = path.join(dir, name);
    if (statSync(file).isDirectory()) walk(file, out, kinds);
    else if (kinds.test(name)) out.push(file);
  }
  return out;
}

/**
 * A star of four points drawn as its own shape, which no name finds: the
 * Nativity card's star, the gift's wax seal and the desktop's Discord Plus
 * mode were found this way (the SSM board's shape check,
 * scripts/lib/four-point-star.mjs, 8c891a552). The pictures in public/ are
 * read too. A picture that waits on its owner is named here: it leaves this
 * list when it is redrawn, and the test below fails until it does. None
 * waits now: the Night sky mode's picture (public/themes/nightsky-horizon.svg,
 * made by scripts/theme-pictures.mjs) was the last, and wears the star of
 * Bethlehem's eight points since build 93 note 7.
 */
const DRAWN_WAITING: Record<string, string> = {};

const rel = (f: string) => path.relative(ROOT, f).replace(/\\/g, "/");

describe("no sparkle star in the app", () => {
  const files = ROOTS.flatMap((r) => walk(path.join(ROOT, r))).filter((f) => !READERS_OWN.has(rel(f)));

  it("reads the app's code", () => {
    expect(files.length).toBeGreaterThan(500);
  });

  it("the Sparkle icon has left the set", () => {
    expect(existsSync(path.join(ROOT, "components/ui/icons/Sparkle.tsx"))).toBe(false);
    expect(existsSync(path.join(ROOT, "components/ui/icons/Sparkles.tsx"))).toBe(false);
  });

  it("nothing imports, draws or names a sparkle icon", () => {
    const found = files.flatMap((f) => {
      const src = readFileSync(f, "utf8");
      return ICON.some((re) => re.test(src)) ? [rel(f)] : [];
    });
    expect(found, "a sparkle icon; give the place an icon from components/ui/icons that names what it is").toEqual([]);
  });

  it("no sparkle character is written, plain or escaped", () => {
    const found = files.flatMap((f) => {
      const src = readFileSync(f, "utf8");
      return GLYPH.test(src) || ESCAPED.test(src) ? [rel(f)] : [];
    });
    expect(found, "a sparkle character; give the place an icon from components/ui/icons that names what it is").toEqual([]);
  });

  it("no sparkle character in the notes a reader reads (data/changelog: What's new, the board, the release letter's sources)", () => {
    // The arbiter's word with the fresh-eyes items (2026-11-11): the old notes
    // are held to the same rule as the app that shows them.
    const notes = walk(path.join(ROOT, "data", "changelog"));
    expect(notes.length).toBeGreaterThan(3);
    const found = notes.flatMap((f) => {
      const src = readFileSync(f, "utf8");
      return GLYPH.test(src) || ESCAPED.test(src) ? [rel(f)] : [];
    });
    expect(found, "a sparkle character in a release note; say it in words, or with an icon the app draws").toEqual([]);
  });

  it("draws no star of four points, in the code or in public/'s pictures", () => {
    const pictures = walk(path.join(ROOT, "public"), [], /\.(svg|html)$/);
    const found = [...files, ...pictures].flatMap((f) => {
      const stars = fourPointStars(readFileSync(f, "utf8"));
      return stars.length && !DRAWN_WAITING[rel(f)] ? [`${rel(f)}: ${stars.length}`] : [];
    });
    expect(found, "a four-point star drawn; draw what the place is (the Octogram for the star of Bethlehem)").toEqual([]);
  });

  it("each picture still waiting on its owner still holds one (so the list only shrinks)", () => {
    for (const [file, owner] of Object.entries(DRAWN_WAITING)) {
      expect(fourPointStars(readFileSync(path.join(ROOT, file), "utf8")).length, `${file} is redrawn: take it off DRAWN_WAITING (${owner})`).toBeGreaterThan(0);
    }
  });

  it("knows a sparkle when it sees one, and the stars that are not", () => {
    const four = String.fromCodePoint(0x2726);
    expect(GLYPH.test(`a ${four} b`)).toBe(true);
    expect(GLYPH.test(`a ${String.fromCodePoint(0x2728)}`)).toBe(true);
    expect(ESCAPED.test(String.raw`content: "\2726"`)).toBe(true);
    expect(ESCAPED.test('"\\u2728"')).toBe(true);
    expect(ESCAPED.test("&#10022;")).toBe(true);
    expect(ICON.some((re) => re.test('import { Sparkle } from "@/components/ui/icons/Sparkle";'))).toBe(true);
    expect(ICON.some((re) => re.test('icon: <Glyph kind="sparkle" />'))).toBe(true);
    // The five-point star, the eight-point star and the cross are not sparkles.
    for (const ok of ['import { Star } from "@/components/ui/icons/Star";', "<Octogram size={16} />", "\u2605 \u2606 \u2629", "a comment about a sparkle"]) {
      expect(GLYPH.test(ok) || ESCAPED.test(ok) || ICON.some((re) => re.test(ok)), ok).toBe(false);
    }
  });
});
