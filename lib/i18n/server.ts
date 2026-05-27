// Server-side locale helper (i18n Phase 2).
//
// Reads the `purify_locale` cookie set by middleware. Falls back to
// the default locale when missing or unknown. Pair with getMessages()
// from `./index` to load the catalog.
//
// Server components only — uses next/headers which is server-context.

import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isLocaleReady, type LocaleCode } from "./locales";

const LOCALE_COOKIE = "purify_locale";

export async function getServerLocale(): Promise<LocaleCode> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  if (value && isLocaleReady(value)) {
    return value as LocaleCode;
  }
  return DEFAULT_LOCALE;
}
