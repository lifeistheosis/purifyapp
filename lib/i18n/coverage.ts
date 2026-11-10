/**
 * What each language of the app covers, for its row in the language list
 * (1.9, his yes to call 17 of 2026-11-10: "the language list saying in each
 * language's own row what it covers"). Every language has the menus; some
 * have a Bible of their own to download (lib/bible/downloads/catalog.ts);
 * German has some of the prayer book's rules in its own words
 * (lib/prayers/library.ts); English has everything.
 *
 * It is read from what the app holds, so a row cannot promise more than is
 * there: a language gains "the Bible" the day its Bible is in the downloads.
 * The words are in each language's own tongue, as the row's name is, so a
 * reader looking for theirs reads it in theirs.
 * lib/i18n/__tests__/coverage.test.ts holds the words to what each covers.
 */

import { DOWNLOADABLE_BIBLES } from "@/lib/bible/downloads/catalog";
import type { LocaleCode } from "@/lib/i18n/locales";

export type Coverage = "menus" | "menusBible" | "menusPrayers" | "all";

/** Languages with some of the prayer book's rules in their own words (lib/prayers/library.ts). */
export const PRAYER_LANGUAGES: readonly LocaleCode[] = ["de"];

export function coverageOf(code: LocaleCode): Coverage {
  if (code === "en") return "all";
  const bible = DOWNLOADABLE_BIBLES.some((b) => b.language === code);
  const prayers = PRAYER_LANGUAGES.includes(code);
  if (bible && prayers) return "all";
  if (bible) return "menusBible";
  if (prayers) return "menusPrayers";
  return "menus";
}

/**
 * Each language's own words for what it covers. Every language says "the
 * menus only" and "the menus and the Bible", so a Bible's arrival needs no
 * new words; "some prayers" is German's, and English says it has everything.
 */
export const COVERAGE_WORDS: Readonly<Record<LocaleCode, Partial<Record<Coverage, string>>>> = {
  en: { all: "Menus, the Bible and prayers", menusBible: "Menus and the Bible", menus: "Menus only" },
  es: { menus: "Solo los menús", menusBible: "Menús y la Biblia" },
  ro: { menus: "Doar meniurile", menusBible: "Meniurile și Biblia" },
  el: { menus: "Μόνο τα μενού", menusBible: "Μενού και η Αγία Γραφή" },
  ru: { menus: "Только меню", menusBible: "Меню и Библия" },
  fr: { menus: "Menus seulement", menusBible: "Menus et la Bible" },
  de: { menus: "Nur die Menüs", menusBible: "Menüs und die Bibel", menusPrayers: "Menüs und einige Gebete" },
  sr: { menus: "Само менији", menusBible: "Менији и Библија" },
  uk: { menus: "Лише меню", menusBible: "Меню і Біблія" },
  it: { menus: "Solo i menu", menusBible: "Menu e la Bibbia" },
  pt: { menus: "Somente os menus", menusBible: "Menus e a Bíblia" },
  bg: { menus: "Само менютата", menusBible: "Менюта и Библията" },
  ar: { menus: "القوائم فقط", menusBible: "القوائم والكتاب المقدس" },
  fil: { menus: "Mga menu lamang", menusBible: "Mga menu at ang Bibliya" },
  tr: { menus: "Yalnızca menüler", menusBible: "Menüler ve Kutsal Kitap" },
  ka: { menus: "მხოლოდ მენიუები", menusBible: "მენიუები და ბიბლია" },
  hu: { menus: "Csak a menük", menusBible: "Menük és a Biblia" },
  id: { menus: "Hanya menu", menusBible: "Menu dan Alkitab" },
  ne: { menus: "मेनु मात्र", menusBible: "मेनु र बाइबल" },
  pl: { menus: "Tylko menu", menusBible: "Menu i Biblia" },
  ur: { menus: "صرف مینو", menusBible: "مینو اور بائبل" },
};

/** What a language's row says it covers, in that language. */
export function coverageWords(code: LocaleCode): string {
  return COVERAGE_WORDS[code][coverageOf(code)] ?? "";
}
