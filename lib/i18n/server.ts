// Server-side locale helper (i18n Phase 2).
//
// Reads the `purify_locale` cookie set by middleware. Falls back to
// the default locale when missing or unknown. Pair with getMessages()
// from `./index` to load the catalog.
//
// Server components only, uses next/headers which is server-context.

import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isLocaleSelectable, type LocaleCode } from "./locales";

const LOCALE_COOKIE = "purify_locale";

export async function getServerLocale(): Promise<LocaleCode> {
  // Android static export has no request context: there are no cookies to read,
  // and calling cookies() would force the page dynamic and break `output:export`.
  // Render the canonical default locale; the app switches locale client-side.
  // The website (BUILD_TARGET unset) is unaffected and still reads the cookie.
  if (process.env.BUILD_TARGET === "android") return DEFAULT_LOCALE;
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  // Selectable covers fully-ready locales and editorial-preview ones; missing
  // catalog keys fall back to English in getMessages either way.
  if (value && isLocaleSelectable(value)) {
    return value as LocaleCode;
  }
  return DEFAULT_LOCALE;
}
