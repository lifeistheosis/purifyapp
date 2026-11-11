import { LOCALES } from "./locales";

/**
 * The direction a text runs in, from its language (1.9, build 90 note 4).
 *
 * Words say their language and their direction together, on the smallest
 * element that holds only those words: the app's English is
 * `lang="en" dir="ltr"`, and where the language comes from data,
 * `lang={x} dir={textDir(x)}`, never a direction typed by hand beside it.
 * Why: under Arabic or Urdu the whole page runs right to left
 * (`<html dir="rtl">`), and English inherits that unless it says otherwise:
 * its lines stood against the right edge, its full stops at the start of the
 * line, a verse's number to the right of its words. `lang` alone sets no
 * direction. lib/i18n/__tests__/textDirection.test.ts holds every element
 * that says a language to this.
 *
 * The app's 21 languages answer from their own row (lib/i18n/locales.ts,
 * `dir`, which also sets the page's); any other language (a downloaded
 * Bible's, the Fathers' Greek) by its script: right to left for Arabic,
 * Aramaic, Hebrew (the Old Testament's, "hbo", too), Persian, Syriac, Urdu and their kin, left to right for the
 * rest. A tag's region is set aside ("ar-EG" is "ar"); a script named in the
 * tag decides before the language does: "ar-Latn", a chant's Arabic sounds in
 * Latin letters, runs left to right.
 */
const RIGHT_TO_LEFT = new Set(["ar", "arc", "ckb", "dv", "fa", "hbo", "he", "ks", "ps", "sd", "syc", "syr", "ug", "ur", "yi"]);
/** Scripts (ISO 15924) that run right to left; any other script named in a tag runs left to right. */
const RIGHT_TO_LEFT_SCRIPTS = new Set(["arab", "aran", "hebr", "syrc", "syre", "syrj", "syrn", "thaa", "nkoo", "samr", "mand", "adlm", "rohg"]);

export type TextDirection = "ltr" | "rtl";

/**
 * No language said, no direction said: `lang={heading ? "en" : undefined}
 * dir={textDir(heading ? "en" : undefined)}` marks the English heading and
 * leaves the reader's own words in its place (a part's number, "Part 2") to
 * run with the page.
 */
export function textDir(lang: string): TextDirection;
export function textDir(lang: string | null | undefined): TextDirection | undefined;
export function textDir(lang: string | null | undefined): TextDirection | undefined {
  const parts = (lang ?? "").trim().toLowerCase().split(/[-_]/);
  const base = parts[0];
  if (!base) return undefined;
  const script = parts.slice(1).find((p) => /^[a-z]{4}$/.test(p));
  if (script) return RIGHT_TO_LEFT_SCRIPTS.has(script) ? "rtl" : "ltr";
  const own = LOCALES.find((l) => l.code === base);
  if (own) return own.dir;
  return RIGHT_TO_LEFT.has(base) ? "rtl" : "ltr";
}
