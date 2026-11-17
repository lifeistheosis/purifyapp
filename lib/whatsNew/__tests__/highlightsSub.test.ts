// What's New's line under the 1.9 headline (`whatsnew.highlights.sub`, drawn
// from RELEASE_HIGHLIGHTS.sub) says what 1.9 gives in the note's own terms
// (docs/plans/v1.9/patch-note-1.9.json): the journal and a verse's Greek for
// everyone, seven more Bibles, and cross-references, Remember the verse and
// the new reading plans with Purify Plus. Until 2026-11-17 it said "five more
// Bibles" in all 21 languages, where the note, the tour, the release email and
// the drop say seven, and it named Purify Plus nowhere, so it offered the Plus
// features as if to every reader. Each language is held to its own catalog's
// names: the tour's "Seven more Bibles" (`tour.step.bibles.title`) and "New
// reading plans" (`tour.step.plans.title`), the verse sheet's cross-references
// (`bible.crossRefs`) and the Remember the verse page (`remember.title`).

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { RELEASE_HIGHLIGHTS } from "../highlights";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const MESSAGES = path.join(ROOT, "lib/i18n/messages");
const LANGS = fs.readdirSync(MESSAGES).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));
const CATALOGS = Object.fromEntries(
  LANGS.map((l) => [l, JSON.parse(fs.readFileSync(path.join(MESSAGES, `${l}.json`), "utf8")) as Record<string, string>]),
);
const KEY = RELEASE_HIGHLIGHTS.sub;
const PLUS = "Purify Plus";
/** Written by its number, so the character itself is in no file. */
const EM_DASH = String.fromCharCode(0x2014);

/** The old count, as each language's line put it before 2026-11-17. */
const FIVE: Record<string, string> = {
  ar: "خمسة كتب",
  bg: "пет Библии",
  de: "fünf weitere",
  el: "πέντε ακόμη",
  en: "five more",
  es: "cinco Biblias",
  fil: "limang",
  fr: "cinq Bibles",
  hu: "öt további",
  id: "lima Alkitab",
  it: "cinque Bibbie",
  ka: "ხუთი ბიბლია",
  ne: "पाँच बाइबल",
  pl: "pięć kolejnych",
  pt: "cinco Bíblias",
  ro: "cinci Biblii",
  ru: "пять Библий",
  sr: "пет Библија",
  tr: "beş Kutsal",
  uk: "п'ять Біблій",
  ur: "پانچ مزید",
};

const lower = (s: string, lang: string) => s.toLocaleLowerCase(lang);
const at = (lang: string, phrase: string) => lower(CATALOGS[lang][KEY], lang).indexOf(lower(phrase, lang));

describe("What's New's line under the 1.9 headline", () => {
  it("is in every catalog, in all 21 languages", () => {
    expect(RELEASE_HIGHLIGHTS.version).toBe("1.9");
    expect(KEY).toBe("whatsnew.highlights.sub");
    expect(LANGS).toHaveLength(21);
    expect(Object.keys(FIVE).sort()).toEqual([...LANGS].sort());
    for (const lang of LANGS) expect(CATALOGS[lang][KEY], lang).toBeTruthy();
  });

  it("counts the Bibles as the note does: seven, never five", () => {
    const note = fs.readFileSync(path.join(ROOT, "docs/plans/v1.9/patch-note-1.9.json"), "utf8");
    expect(note).toContain("Seven more Bibles");
    expect(CATALOGS.en[KEY]).toContain("seven more Bibles");
    for (const lang of LANGS) {
      expect(CATALOGS[lang][KEY], `${lang} still says five`).not.toContain(FIVE[lang]);
      // The tour's own "Seven more Bibles", in the line, in the same words.
      expect(at(lang, CATALOGS[lang]["tour.step.bibles.title"]), `${lang} names the tour's seven Bibles`).toBeGreaterThanOrEqual(0);
    }
  });

  it("names Purify Plus before the features that come with it, and only after what is free", () => {
    for (const lang of LANGS) {
      const plus = CATALOGS[lang][KEY].indexOf(PLUS);
      expect(plus, `${lang} names Purify Plus`).toBeGreaterThan(0);
      // Free: the seven Bibles stand before Purify Plus is named.
      const bibles = at(lang, CATALOGS[lang]["tour.step.bibles.title"]);
      expect(bibles, `${lang}: the Bibles come before Purify Plus`).toBeLessThan(plus);
      // Plus: each of the three first appears after it.
      for (const k of ["bible.crossRefs", "remember.title", "tour.step.plans.title"]) {
        const where = at(lang, CATALOGS[lang][k]);
        expect(where, `${lang}: ${k} is in the line`).toBeGreaterThanOrEqual(0);
        expect(where, `${lang}: ${k} comes after Purify Plus`).toBeGreaterThan(plus);
      }
    }
  });

  it("holds no em dash", () => {
    for (const lang of LANGS) expect(CATALOGS[lang][KEY], lang).not.toContain(EM_DASH);
  });
});
