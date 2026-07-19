// Locale persistence, shared by the footer switcher, the settings row,
// and the native bootstrap (Beta 2.3). Client-side only.
//
// Web: the `purify_locale` cookie is the source of truth (middleware
// negotiates it, the server layout reads it). Native: the cookie only
// lives as long as the WebView lets it, so the durable store is
// Capacitor Preferences under the same key.

import { Preferences } from "@capacitor/preferences";
import { isNativeClient } from "@/lib/platform/native";
import type { LocaleCode } from "./locales";

export const LOCALE_COOKIE = "purify_locale";

/** 1 year, root path, non-httpOnly so client and middleware both read it. */
export function writeLocaleCookie(next: LocaleCode) {
  document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

/** Read the durable native choice; null when unset or unavailable. */
export async function readNativeLocaleChoice(): Promise<string | null> {
  try {
    return (await Preferences.get({ key: LOCALE_COOKIE })).value;
  } catch {
    return null;
  }
}

/**
 * Persist an explicit user choice everywhere it needs to live. Profile
 * sync (profiles.preferred_language) is layered on by the account
 * wiring; this handles device-local persistence.
 */
export async function persistLocaleChoice(next: LocaleCode): Promise<void> {
  writeLocaleCookie(next);
  if (isNativeClient()) {
    try {
      await Preferences.set({ key: LOCALE_COOKIE, value: next });
    } catch {
      // Preferences unavailable: the cookie still covers this session.
    }
  }
}
