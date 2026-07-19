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

// v6.9.1: only English and German are shippable. The other eleven
// locales stay in the registry so any stale cookie still resolves
// to a known shape; isLocaleReady() is the gate. They will return
// when the editorial team has hand-checked their catalogs.
export const LOCALES: Locale[] = [
  { code: "en", nativeLabel: "English", englishLabel: "English", ready: true, dir: "ltr", comingSoon: "Coming soon" },
  { code: "es", nativeLabel: "Español", englishLabel: "Spanish", ready: false, editorial: true, dir: "ltr", comingSoon: "Próximamente", status: "Machine translation, editorial review in progress" },
  { code: "ro", nativeLabel: "Română", englishLabel: "Romanian", ready: false, editorial: true, dir: "ltr", comingSoon: "În curând", status: "Machine translation, editorial review in progress" },
  { code: "el", nativeLabel: "Ελληνικά", englishLabel: "Greek", ready: false, editorial: true, dir: "ltr", comingSoon: "Σύντομα", status: "Machine translation, editorial review in progress" },
  { code: "ru", nativeLabel: "Русский", englishLabel: "Russian", ready: false, editorial: true, dir: "ltr", comingSoon: "Скоро", status: "Machine translation, editorial review in progress" },
  { code: "fr", nativeLabel: "Français", englishLabel: "French", ready: false, editorial: true, dir: "ltr", comingSoon: "Bientôt", status: "Editorial preview, in progress" },
  { code: "de", nativeLabel: "Deutsch", englishLabel: "German", ready: true, dir: "ltr", comingSoon: "Demnächst" },
  { code: "sr", nativeLabel: "Српски", englishLabel: "Serbian", ready: false, editorial: true, dir: "ltr", comingSoon: "Ускоро", status: "Machine translation, editorial review in progress" },
  { code: "uk", nativeLabel: "Українська", englishLabel: "Ukrainian", ready: false, editorial: true, dir: "ltr", comingSoon: "Незабаром", status: "Machine translation, editorial review in progress" },
  { code: "it", nativeLabel: "Italiano", englishLabel: "Italian", ready: false, editorial: true, dir: "ltr", comingSoon: "Prossimamente", status: "Machine translation, editorial review in progress" },
  { code: "pt", nativeLabel: "Português", englishLabel: "Portuguese", ready: false, editorial: true, dir: "ltr", comingSoon: "Em breve", status: "Machine translation, editorial review in progress" },
  { code: "bg", nativeLabel: "Български", englishLabel: "Bulgarian", ready: false, editorial: true, dir: "ltr", comingSoon: "Скоро", status: "Machine translation, editorial review in progress" },
  { code: "ar", nativeLabel: "العربية", englishLabel: "Arabic", ready: false, editorial: true, dir: "rtl", comingSoon: "قريباً", status: "Machine translation, editorial review in progress" },
  // Beta 2.3 language patch: eight locales added from Play Console
  // country data. "fil" (not "tl") per BCP-47; CLDR and Intl.PluralRules
  // both resolve it. Urdu is the second rtl locale after Arabic.
  { code: "fil", nativeLabel: "Filipino", englishLabel: "Filipino", ready: false, editorial: true, dir: "ltr", comingSoon: "Malapit na", status: "Machine translation, editorial review in progress" },
  { code: "tr", nativeLabel: "Türkçe", englishLabel: "Turkish", ready: false, editorial: true, dir: "ltr", comingSoon: "Yakında", status: "Machine translation, editorial review in progress" },
  { code: "ka", nativeLabel: "ქართული", englishLabel: "Georgian", ready: false, editorial: true, dir: "ltr", comingSoon: "მალე", status: "Machine translation, editorial review in progress" },
  { code: "hu", nativeLabel: "Magyar", englishLabel: "Hungarian", ready: false, editorial: true, dir: "ltr", comingSoon: "Hamarosan", status: "Machine translation, editorial review in progress" },
  { code: "id", nativeLabel: "Bahasa Indonesia", englishLabel: "Indonesian", ready: false, editorial: true, dir: "ltr", comingSoon: "Segera", status: "Machine translation, editorial review in progress" },
  { code: "ne", nativeLabel: "नेपाली", englishLabel: "Nepali", ready: false, editorial: true, dir: "ltr", comingSoon: "चाँडै आउँदैछ", status: "Machine translation, editorial review in progress" },
  { code: "pl", nativeLabel: "Polski", englishLabel: "Polish", ready: false, editorial: true, dir: "ltr", comingSoon: "Wkrótce", status: "Machine translation, editorial review in progress" },
  { code: "ur", nativeLabel: "اردو", englishLabel: "Urdu", ready: false, editorial: true, dir: "rtl", comingSoon: "جلد آرہا ہے", status: "Machine translation, editorial review in progress" },
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
 * Best-effort locale negotiation from an Accept-Language header. Used
 * by middleware on first visit before a `purify_locale` cookie is set.
 * Quality scores are ignored, we just look for the first listed
 * language whose primary tag is one of our ready locales.
 */
export function negotiateFromAcceptLanguage(header: string | null): LocaleCode {
  if (!header) return DEFAULT_LOCALE;
  const ranges = header
    .split(",")
    .map((part) => part.trim().split(";")[0].toLowerCase());
  for (const range of ranges) {
    const primary = range.split("-")[0];
    const candidate = LOCALES.find((l) => l.code === primary && l.ready);
    if (candidate) return candidate.code;
  }
  return DEFAULT_LOCALE;
}
