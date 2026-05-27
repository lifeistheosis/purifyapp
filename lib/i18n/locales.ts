// Locale registry (v6.4 PRD §2).
//
// Two tracks for i18n on Purify:
//
//   Track A — UI chrome localization. Navigation, button labels,
//             eyebrows, error strings, FAQ, About, prayer-rule
//             scaffolding. Texts themselves (Scripture, Fathers) stay
//             in their published languages.
//   Track B — Liturgical / textual localization. The Scriptures and
//             prayers in Greek, Slavonic / Russian. Mostly a content
//             acquisition problem; one corpus + editorial pass per
//             language.
//
// This file is the *engineering* foundation: a typed registry of
// locales the site knows about, and the helpers needed to load and
// resolve message catalogs. No routing changes here — that belongs to
// a follow-up patch that moves every page under app/[locale]/(app)/.

export type LocaleCode = "en" | "es" | "el" | "ru";

export type Locale = {
  code: LocaleCode;
  /** Native-language label (shown in the locale switcher). */
  nativeLabel: string;
  /** English label (shown in admin / debug surfaces). */
  englishLabel: string;
  /** Whether the chrome catalog has been translated and is shippable. */
  ready: boolean;
  /** Optional note about the locale's status. */
  status?: string;
};

export const DEFAULT_LOCALE: LocaleCode = "en";

export const LOCALES: Locale[] = [
  {
    code: "en",
    nativeLabel: "English",
    englishLabel: "English",
    ready: true,
  },
  {
    code: "es",
    nativeLabel: "Español",
    englishLabel: "Spanish",
    ready: false,
    status:
      "UI chrome translation pending. The catalog skeleton ships under lib/i18n/messages/es.json with placeholders matching the English keys.",
  },
  {
    code: "el",
    nativeLabel: "Ελληνικά",
    englishLabel: "Greek",
    ready: false,
    status:
      "Greek UI chrome pending. Greek Bible reader column is separate work (Track B).",
  },
  {
    code: "ru",
    nativeLabel: "Русский",
    englishLabel: "Russian",
    ready: false,
    status:
      "Russian UI chrome pending. The Synodal Bible + Slavonic prayer corpus is the largest content lift; budget accordingly (Track B).",
  },
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
    const candidate = LOCALES.find(
      (l) => l.code === primary && l.ready,
    );
    if (candidate) return candidate.code;
  }
  return DEFAULT_LOCALE;
}
