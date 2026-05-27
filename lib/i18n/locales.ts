// Locale registry (v6.4.1 — full UI translation patch).
//
// Two tracks for i18n on Purify:
//
//   Track A — UI chrome localization. Navigation, button labels,
//             eyebrows, error strings, page headings, short bodies.
//             Texts themselves (Scripture, Fathers, council canons,
//             prayer book) stay in their published languages.
//   Track B — Liturgical / textual localization. The Scriptures and
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
  | "ar";

export type Locale = {
  code: LocaleCode;
  /** Native-language label (shown in the locale switcher). */
  nativeLabel: string;
  /** English label (shown in admin / debug surfaces). */
  englishLabel: string;
  /** Whether the chrome catalog has been translated and is shippable. */
  ready: boolean;
  /** Writing direction. Arabic is rtl; everything else ltr. */
  dir: "ltr" | "rtl";
  /** Optional note about the locale's status. */
  status?: string;
};

export const DEFAULT_LOCALE: LocaleCode = "en";

export const LOCALES: Locale[] = [
  { code: "en", nativeLabel: "English", englishLabel: "English", ready: true, dir: "ltr" },
  { code: "es", nativeLabel: "Español", englishLabel: "Spanish", ready: true, dir: "ltr" },
  { code: "ro", nativeLabel: "Română", englishLabel: "Romanian", ready: true, dir: "ltr" },
  { code: "el", nativeLabel: "Ελληνικά", englishLabel: "Greek", ready: true, dir: "ltr" },
  { code: "ru", nativeLabel: "Русский", englishLabel: "Russian", ready: true, dir: "ltr" },
  { code: "fr", nativeLabel: "Français", englishLabel: "French", ready: true, dir: "ltr" },
  { code: "de", nativeLabel: "Deutsch", englishLabel: "German", ready: true, dir: "ltr" },
  { code: "sr", nativeLabel: "Српски", englishLabel: "Serbian", ready: true, dir: "ltr" },
  { code: "uk", nativeLabel: "Українська", englishLabel: "Ukrainian", ready: true, dir: "ltr" },
  { code: "it", nativeLabel: "Italiano", englishLabel: "Italian", ready: true, dir: "ltr" },
  { code: "pt", nativeLabel: "Português", englishLabel: "Portuguese", ready: true, dir: "ltr" },
  { code: "bg", nativeLabel: "Български", englishLabel: "Bulgarian", ready: true, dir: "ltr" },
  { code: "ar", nativeLabel: "العربية", englishLabel: "Arabic", ready: true, dir: "rtl" },
];

/** True if a locale is considered shippable today. */
export function isLocaleReady(code: string): boolean {
  return LOCALES.find((l) => l.code === code)?.ready === true;
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
 * Quality scores are ignored — we just look for the first listed
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
