// Locale persistence, shared by the footer switcher, the settings row,
// and the native bootstrap (Beta 2.3). Client-side only.
//
// Web: the `purify_locale` cookie is the source of truth (middleware
// negotiates it, the server layout reads it). Native: the cookie only
// lives as long as the WebView lets it, so the durable store is
// Capacitor Preferences under the same key.

import { Preferences } from "@capacitor/preferences";
import { createClient } from "@/lib/supabase/client";
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
 * Persist an explicit user choice everywhere it needs to live: cookie
 * (web rendering), Capacitor Preferences (durable native store), and
 * best-effort profiles.preferred_language for cross-device sync.
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
  await syncProfileLocale(next);
}

/**
 * Mirror a choice to profiles.preferred_language when signed in.
 * Best-effort by design: no-ops when signed out, offline, or before
 * the owner applies the 20260719 migration (the update just errors
 * server-side and we move on). Capped at 2s so a slow network never
 * delays the visible language switch.
 */
export async function syncProfileLocale(next: LocaleCode): Promise<void> {
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user?.id;
    if (!uid) return;
    await Promise.race([
      supabase
        .from("profiles")
        .update({
          preferred_language: next,
          updated_at: new Date().toISOString(),
        })
        .eq("id", uid),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);
  } catch {
    // Signed out, offline, or column not applied yet.
  }
}

/** Read the signed-in user's stored language; null when signed out,
 * unset, offline, or the migration is not applied yet. */
export async function readProfileLocale(): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user?.id;
    if (!uid) return null;
    const { data: row } = await supabase
      .from("profiles")
      .select("preferred_language")
      .eq("id", uid)
      .maybeSingle();
    return (
      (row as { preferred_language?: string | null } | null)
        ?.preferred_language ?? null
    );
  } catch {
    return null;
  }
}
