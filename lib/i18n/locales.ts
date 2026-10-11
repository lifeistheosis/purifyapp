// Locale registry (v6.4.1, full UI translation patch).
//
// Two tracks for i18n on Purify:
//
//   Track A, UI chrome localization. Navigation, button labels,
//             eyebrows, error strings, page headings, short bodies.
//             Texts themselves (Scripture, Fathers, council canons,
//             prayer book) stay in their published languages.
//   Track B, Liturgical / textual localization. The Scriptures and
//             prayers in Greek, Slavonic / Russian. Mostly a content
//             acquisition problem; one corpus + editorial pass per
//             language. Out of scope for v6.4.1.
//
// What v6.4.1 ships: thirteen locales with full UI chrome translation.
// Cookie-based; no route restructure. Long-prose pages (FAQ bodies,
// Privacy detail, individual saint bios, Bible) stay English with a
// disclaimer banner.

export type LocaleCode =
  | "en"
  | "es"
  | "ro"
  | "el"
  | "ru"
  | "fr"
  | "de"
  | "sr"
  | "uk"
  | "it"
  | "pt"
  | "bg"
  | "ar"
  | "fil"
  | "tr"
  | "ka"
  | "hu"
  | "id"
  | "ne"
  | "pl"
  | "ur";

export type Locale = {
  code: LocaleCode;
  /** Native-language label (shown in the locale switcher). */
  nativeLabel: string;
  /** English label (shown in admin / debug surfaces). */
  englishLabel: string;
  /** Whether the chrome catalog has been translated and is shippable. */
  ready: boolean;
  /**
   * In editorial preview: the catalog is substantially translated and the
   * locale is selectable and applied (missing keys fall back to English),
   * but it is marked "in progress" rather than fully ready, pending the
   * editorial team's review. `ready` locales need not set this; a locale
   * is selectable when `ready || editorial`.
   */
  editorial?: boolean;
  /** Writing direction. Arabic and Urdu are rtl; everything else ltr. */
  dir: "ltr" | "rtl";
  /** "Coming soon" rendered in this locale's own language (used by the
   *  locale switcher to mark not-yet-ready languages). */
  comingSoon: string;
  /** Optional note about the locale's status. */
  status?: string;
};

export const DEFAULT_LOCALE: LocaleCode = "en";

// Beta 2.3: all twenty-one locales ship public (owner decision,
// 2026-07-19). Core chrome is translated per locale and missing keys
// fall back to English; the editorial team refines translations in
// place. isLocaleReady() remains the negotiation gate.
export const LOCALES: Locale[] = [
  { code: "en", nativeLabel: "English", englishLabel: "English", ready: true, dir: "ltr", comingSoon: "Coming soon" },
  { code: "es", nativeLabel: "Español", englishLabel: "Spanish", ready: true, dir: "ltr", comingSoon: "Próximamente" },
  { code: "ro", nativeLabel: "Română", englishLabel: "Romanian", ready: true, dir: "ltr", comingSoon: "În curând" },
  { code: "el", nativeLabel: "Ελληνικά", englishLabel: "Greek", ready: true, dir: "ltr", comingSoon: "Σύντομα" },
  { code: "ru", nativeLabel: "Русский", englishLabel: "Russian", ready: true, dir: "ltr", comingSoon: "Скоро" },
  { code: "fr", nativeLabel: "Français", englishLabel: "French", ready: true, dir: "ltr", comingSoon: "Bientôt" },
  { code: "de", nativeLabel: "Deutsch", englishLabel: "German", ready: true, dir: "ltr", comingSoon: "Demnächst" },
  { code: "sr", nativeLabel: "Српски", englishLabel: "Serbian", ready: true, dir: "ltr", comingSoon: "Ускоро" },
  { code: "uk", nativeLabel: "Українська", englishLabel: "Ukrainian", ready: true, dir: "ltr", comingSoon: "Незабаром" },
  { code: "it", nativeLabel: "Italiano", englishLabel: "Italian", ready: true, dir: "ltr", comingSoon: "Prossimamente" },
  { code: "pt", nativeLabel: "Português", englishLabel: "Portuguese", ready: true, dir: "ltr", comingSoon: "Em breve" },
  { code: "bg", nativeLabel: "Български", englishLabel: "Bulgarian", ready: true, dir: "ltr", comingSoon: "Скоро" },
  { code: "ar", nativeLabel: "العربية", englishLabel: "Arabic", ready: true, dir: "rtl", comingSoon: "قريباً" },
  // Beta 2.3 language patch: eight locales added from Play Console
  // country data. "fil" (not "tl") per BCP-47; CLDR and Intl.PluralRules
  // both resolve it. Urdu is the second rtl locale after Arabic.
  { code: "fil", nativeLabel: "Filipino", englishLabel: "Filipino", ready: true, dir: "ltr", comingSoon: "Malapit na" },
  { code: "tr", nativeLabel: "Türkçe", englishLabel: "Turkish", ready: true, dir: "ltr", comingSoon: "Yakında" },
  { code: "ka", nativeLabel: "ქართული", englishLabel: "Georgian", ready: true, dir: "ltr", comingSoon: "მალე" },
  { code: "hu", nativeLabel: "Magyar", englishLabel: "Hungarian", ready: true, dir: "ltr", comingSoon: "Hamarosan" },
  { code: "id", nativeLabel: "Bahasa Indonesia", englishLabel: "Indonesian", ready: true, dir: "ltr", comingSoon: "Segera" },
  { code: "ne", nativeLabel: "नेपाली", englishLabel: "Nepali", ready: true, dir: "ltr", comingSoon: "चाँडै आउँदैछ" },
  { code: "pl", nativeLabel: "Polski", englishLabel: "Polish", ready: true, dir: "ltr", comingSoon: "Wkrótce" },
  { code: "ur", nativeLabel: "اردو", englishLabel: "Urdu", ready: true, dir: "rtl", comingSoon: "جلد آرہا ہے" },
];

/** True if a locale is considered shippable today. */
export function isLocaleReady(code: string): boolean {
  return LOCALES.find((l) => l.code === code)?.ready === true;
}

/** True if a locale is in editorial preview (selectable, marked in progress). */
export function isLocaleEditorial(code: string): boolean {
  return LOCALES.find((l) => l.code === code)?.editorial === true;
}

/**
 * True if a user may switch to this locale and have it applied: either fully
 * ready, or in editorial preview. Not-yet-started locales remain unselectable.
 */
export function isLocaleSelectable(code: string): boolean {
  const l = LOCALES.find((x) => x.code === code);
  return l?.ready === true || l?.editorial === true;
}

/** Coerce an arbitrary string into a known locale code, with fallback. */
export function resolveLocale(input: string | null | undefined): LocaleCode {
  if (!input) return DEFAULT_LOCALE;
  const found = LOCALES.find((l) => l.code === input);
  return found ? found.code : DEFAULT_LOCALE;
}

/** Look up a Locale record by code, with fallback to English. */
export function getLocale(code: string | null | undefined): Locale {
  const resolved = resolveLocale(code);
  return LOCALES.find((l) => l.code === resolved) ?? LOCALES[0];
}

/**
 * The older spelling a phone or a browser may still send for a language we
 * carry under its current code.
 *
 * Filipino is the one that matters: it is one of the three languages 1.6
 * is built around, the registry files it as "fil", and a phone set to it
 * can say "tl" (Tagalog), which matched nothing, so the app opened in
 * English for exactly the reader the translation was made for.
 *
 * These apply only when reading what a DEVICE says. A stored choice is
 * always one of our own codes, and `resolveLocale` stays strict about it.
 */
const DEVICE_SPELLINGS: Record<string, LocaleCode> = {
  tl: "fil", // Tagalog, the name Filipino went by before BCP-47 gave it its own
  in: "id", // Indonesian, as Java and older Android spell it
  mo: "ro", // Moldavian, retired in 2008 in favour of "ro"
};

/**
 * The locale a device's language tag names ("tl-PH", "pt_BR", "EL"), or
 * null when we do not carry that language at all.
 */
export function localeForLanguageTag(tag: string | null | undefined): LocaleCode | null {
  const primary = tag?.trim().toLowerCase().split(/[-_]/)[0];
  if (!primary) return null;
  const code = DEVICE_SPELLINGS[primary] ?? primary;
  return LOCALES.find((l) => l.code === code)?.code ?? null;
}

/**
 * The first of a device's languages, in its own order of preference, that
 * the app can be switched to. The apps ask this on first open, before the
 * reader has chosen anything (components/i18n/LocaleBootstrap.tsx). Null
 * means none of them: the app stays as it was built, in English.
 */
export function negotiateFromLanguages(
  languages: readonly (string | null | undefined)[],
): LocaleCode | null {
  for (const tag of languages) {
    const code = localeForLanguageTag(tag);
    if (code && isLocaleSelectable(code)) return code;
  }
  return null;
}

/**
 * Best-effort locale negotiation from an Accept-Language header. Used
 * by middleware on first visit before a `purify_locale` cookie is set.
 * Quality scores are ignored, we just look for the first listed
 * language whose primary tag is one of our ready locales.
 */
export function negotiateFromAcceptLanguage(header: string | null): LocaleCode {
  if (!header) return DEFAULT_LOCALE;
  const ranges = header.split(",").map((part) => part.trim().split(";")[0]);
  for (const range of ranges) {
    const code = localeForLanguageTag(range);
    if (code && isLocaleReady(code)) return code;
  }
  return DEFAULT_LOCALE;
}
