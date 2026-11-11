// The closing petition at the foot of a saint's page (1.9, found on January's
// walk, 2026-11-11).
//
// It names the saint once: components/saints/SaintIntercession.tsx set the
// registry name whole after the petition's own "Holy", so every page closed
// on "Holy St. Basil the Great, pray to God for us.", the apostles' on "Holy
// Holy Apostle Paul" and the prophets' on "Holy The Prophet Zephaniah". The
// name now goes in without its honorific (nameCore, lib/saints/nameForms.ts).
//
// And it prays to each page as what it is, in every language (the arbiter's
// word, 2026-11-11): a woman as a woman, two or more saints as more than one,
// the adjective and the verb agreeing, as each language's liturgy says it
// (Church Slavonic "Святая ... моли" and "Святии ... молите", Greek "Αγία" and
// "Άγιοι ... πρεσβεύσατε", Romanian "Sfântă" and "Sfinților ... rugați-vă",
// Italian "Santa" and "Santi ... pregate"). Before, every catalog had one
// form, the masculine singular, for St Tatiana and Sts Cyrus and John alike.
// Where a language says two forms alike it is named below with why; the
// forms and the doubts are in docs/1.9-build/notes/january-saints.md, "The
// petition, in every language".

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { LOCALES } from "@/lib/i18n/locales";
import { SAINT_GROUP_MEMBERSHIP } from "../groups";
import { nameCore } from "../nameForms";
import { byPronoun, PAIRS } from "../pronoun";
import { SAINTS } from "../saints";

const root = join(__dirname, "..", "..", "..");
const catalog = (code: string) => JSON.parse(readFileSync(join(root, `lib/i18n/messages/${code}.json`), "utf8")) as Record<string, string>;
const en = catalog("en");
const petition = (name: string) => en["saints.intercessionPetition"].replace("{name}", name);

const HIS = "saints.intercessionPetition";
const HER = "saints.intercessionPetitionHer";
const THEIR = "saints.intercessionPetitionTheir";
const PAIR = "saints.intercessionPetitionPair";

/** The key a page's petition is said in: as SaintIntercession chooses it. */
const keyFor = (s: (typeof SAINTS)[number]) => (s.pronoun === "their" && PAIRS.has(s.slug) ? PAIR : byPronoun(s.pronoun, { his: HIS, her: HER, their: THEIR }));

/** Languages whose petition to a woman reads as to a man, and why. */
const HER_ALIKE: Record<string, string> = {
  en: "Holy and pray are the same for a man and a woman",
  fil: "no gender: banal na and mo are the same",
  hu: "no gender: Szent and könyörögj are the same",
  ka: "no gender: წმიდაო and ევედრე are the same",
  ne: "no gender: पवित्र and the honorific गर्नुहोस् are the same",
  tr: "no gender: Kutsal and dua et are the same",
  ur: "no gender: مقدس and the honorific کریں are the same",
};

/** Languages whose petition to two or more reads as to one, and why. */
const THEIR_ALIKE: Record<string, string> = {
  en: "Holy and pray are the same for one and for more",
  ne: "the honorific गर्नुहोस् is said to one and to more alike, and पवित्र does not change",
  ur: "the honorific کریں is said to one and to more alike, and مقدس does not change",
};

/** "Sts. A and B" pages that are not two saints, and why. */
const NOT_PAIRS: Record<string, string> = {
  "xenophon-and-mary": "four: Xenophon, his wife Mary and their sons Arcadius and John",
};

/**
 * Pages of more than one saint in the Holy Women, each with a man among them,
 * so the masculine (common) plural every their form uses is right. A page of
 * women alone would need a feminine plural (Santas, Sfintelor), which no
 * catalog has yet: add it before such a page.
 */
const MIXED: Record<string, string> = {
  "maccabean-martyrs": "the mother with her seven sons, and Eleazar",
  "adrian-and-natalia": "Adrian and his wife",
  "galaction-and-episteme": "Galaction and his wife",
  "irenarchus-and-the-seven-women": "Irenarchus with the seven women",
};

describe("a saint page's closing petition", () => {
  it("is given the saint's name without its honorific, in the form the page is", () => {
    const src = readFileSync(join(root, "components/saints/SaintIntercession.tsx"), "utf8");
    expect(src).toContain("const name = nameCore(saint.name);");
    expect(src).not.toContain("replacements={{ name: saint.name }}");
    expect(src).toContain('saint.pronoun === "their" && PAIRS.has(saint.slug) ? (\n          <T k="saints.intercessionPetitionPair" replacements={{ name }} />');
    expect(src).toContain('his: <T k="saints.intercessionPetition" replacements={{ name }} />');
    expect(src).toContain('her: <T k="saints.intercessionPetitionHer" replacements={{ name }} />');
    expect(src).toContain('their: <T k="saints.intercessionPetitionTheir" replacements={{ name }} />');
  });

  it("says Holy once, for every saint", () => {
    expect(en[HIS]).toBe("Holy {name}, pray to God for us.");
    for (const s of SAINTS.filter((x) => !x.featured)) {
      expect(petition(nameCore(s.name)), s.slug).not.toMatch(/^Holy (Holy|The|St\.?|Sts\.|Saints?) /);
    }
  });

  it("reads as the Church says it", () => {
    expect(petition(nameCore("Holy Apostle Paul"))).toBe("Holy Apostle Paul, pray to God for us.");
    expect(petition(nameCore("St. Basil the Great"))).toBe("Holy Basil the Great, pray to God for us.");
    expect(petition(nameCore("The Prophet Zephaniah"))).toBe("Holy Prophet Zephaniah, pray to God for us.");
    expect(petition(nameCore("Sts. Cyrus and John"))).toBe("Holy Cyrus and John, pray to God for us.");
    expect(petition(nameCore("The Holy Innocents"))).toBe("Holy Innocents, pray to God for us.");
  });

  it("prays to no woman and no two saints in the masculine singular, in any language", () => {
    expect(LOCALES.length).toBe(21);
    for (const { code } of LOCALES) {
      const c = catalog(code);
      for (const k of [HIS, HER, THEIR, PAIR]) expect(c[k], `${code} ${k}`).toMatch(/\{name\}/);
      if (c[HER] === c[HIS]) expect(HER_ALIKE[code], `${code}: her reads as his`).toBeTruthy();
      else expect(HER_ALIKE[code], `${code}: named alike but is not`).toBeUndefined();
      if (c[THEIR] === c[HIS]) expect(THEIR_ALIKE[code], `${code}: their reads as his`).toBeTruthy();
      else expect(THEIR_ALIKE[code], `${code}: named alike but is not`).toBeUndefined();
      // Only Arabic, of these, says two apart from more (its dual).
      if (code === "ar") expect(c[PAIR]).not.toBe(c[THEIR]);
      else expect(c[PAIR], `${code}: a pair is said as a company`).toBe(c[THEIR]);
      // Every page, in this language: a woman's or a pair's line is never the
      // masculine singular, unless the language says them alike.
      for (const s of SAINTS.filter((x) => !x.featured)) {
        const key = keyFor(s);
        if (s.pronoun === "her" && !HER_ALIKE[code]) expect(c[key], `${code} ${s.slug}`).not.toBe(c[HIS]);
        if (s.pronoun === "their" && !THEIR_ALIKE[code]) expect(c[key], `${code} ${s.slug}`).not.toBe(c[HIS]);
      }
    }
    // The forms themselves, in the languages with a liturgy of their own.
    const ru = catalog("ru");
    expect([ru[HIS], ru[HER], ru[THEIR]]).toEqual(["Святый {name}, моли Бога о нас.", "Святая {name}, моли Бога о нас.", "Святии {name}, молите Бога о нас."]);
    const el = catalog("el");
    expect([el[HER], el[THEIR]]).toEqual(["Αγία {name}, πρέσβευε τω Θεώ υπέρ ημών.", "Άγιοι {name}, πρεσβεύσατε τω Θεώ υπέρ ημών."]);
    expect(catalog("ar")[PAIR]).toBe("أيها القدّيسان {name}، اطلبا إلى الله من أجلنا.");
  });

  it("knows each page's gender and number from its data", () => {
    // A woman of the Holy Women is her, or one of a page of more.
    for (const s of SAINTS) {
      const women = (SAINT_GROUP_MEMBERSHIP[s.slug] ?? []).includes("women");
      if (women && !s.featured) expect(["her", "their"], s.slug).toContain(s.pronoun);
      if (women && s.pronoun === "their") expect(MIXED[s.slug], `${s.slug}: a page of women alone needs a feminine plural`).toBeTruthy();
    }
    for (const slug of Object.keys(MIXED)) expect(SAINTS.find((s) => s.slug === slug)?.pronoun, slug).toBe("their");
    // Every pair is their, and every page named for two is a pair or says why not.
    for (const slug of PAIRS) expect(SAINTS.find((s) => s.slug === slug)?.pronoun, slug).toBe("their");
    for (const s of SAINTS.filter((x) => x.pronoun === "their")) {
      const two = /^(Sts\.|Saints) [^,]+ and [^,]+$/.test(s.name) && !/Companions|Youths|Women|\d/.test(s.name);
      if (two) expect(PAIRS.has(s.slug) || Boolean(NOT_PAIRS[s.slug]), `${s.slug}: ${s.name} is two saints, or says why not`).toBe(true);
      if (PAIRS.has(s.slug)) expect(two, `${s.slug} is named as a pair`).toBe(true);
    }
  });
});
