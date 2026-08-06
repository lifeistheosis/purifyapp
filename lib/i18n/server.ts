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
import { IS_STATIC_EXPORT } from "@/lib/platform/buildTarget";

const LOCALE_COOKIE = "purify_locale";

export async function getServerLocale(): Promise<LocaleCode> {
  // The native static export (Android and iOS) has no request context: there are
  // no cookies to read, and calling cookies() would force the page dynamic and
  // break `output:export`. Render the canonical default locale; the app switches
  // locale client-side. The website is unaffected and still reads the cookie.
  if (IS_STATIC_EXPORT) return DEFAULT_LOCALE;
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  // Selectable covers fully-ready locales and editorial-preview ones; missing
  // catalog keys fall back to English in getMessages either way.
  if (value && isLocaleSelectable(value)) {
    return value as LocaleCode;
  }
  return DEFAULT_LOCALE;
}
