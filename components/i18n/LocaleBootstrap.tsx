"use client";

// Native locale bootstrap (Beta 2.3). The Android static export bakes
// the root layout in English (`getServerLocale` cannot read cookies in
// `output: export`), so on native this corrects the provider after
// mount: apply the user's stored choice, or negotiate the device
// language against selectable locales. On the web it is a no-op:
// middleware + the server layout already agreed on the locale.
//
// Statically-rendered page prose stays English until the native content
// layer (Phase 6) fetches overrides; this switches the chrome.
//
// THE ORDER (1.6). What the device knows by itself comes first and is
// applied at once: the reader's own choice on this device, or else the
// phone's language. That decides the language the app opens in, and the
// first screen and the splash wait for it (lib/i18n/launchLanguage.ts).
// The account's language is asked for only after that, because it is a
// request to the server. Until 1.6 it was asked for BEFORE the phone's
// language was looked at, so a reader who had never picked a language
// waited on a network round trip, in English, on every launch. When the
// account does name a language the device has not chosen, it still wins
// and is remembered here, exactly as before: it only no longer holds
// the opening screen.

import { useEffect, useRef } from "react";
import {
  isLocaleSelectable,
  resolveLocale,
  type LocaleCode,
} from "@/lib/i18n/locales";
import { launchLanguage, markLanguageSettled } from "@/lib/i18n/launchLanguage";
import {
  persistLocaleChoice,
  readNativeLocaleChoice,
  readProfileLocale,
  syncProfileLocale,
} from "@/lib/i18n/switchLocale";
import { isNativeClient } from "@/lib/platform/native";
import { useSetLocale, useTranslate } from "./MessagesProvider";

/** The WebView's languages, in the reader's own order of preference. */
function deviceLanguages(): readonly string[] {
  return navigator.languages && navigator.languages.length > 0
    ? navigator.languages
    : [navigator.language];
}

export function LocaleBootstrap() {
  const { locale } = useTranslate();
  const setLocale = useSetLocale();
  const ran = useRef(false);
  /** The language this launch is opening in, once it is decided. */
  const opening = useRef<LocaleCode | null>(null);

  // Settled means on the screen, not asked for. This runs after the commit
  // that drew the new catalog, so whatever waits on the mark waits for the
  // words themselves.
  useEffect(() => {
    if (opening.current !== null && locale === opening.current) markLanguageSettled();
  }, [locale]);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (!isNativeClient()) {
      markLanguageSettled();
      return;
    }
    void (async () => {
      let remembered: string | null = null;
      let applied: LocaleCode = locale;
      try {
        remembered = await readNativeLocaleChoice();
        const choice = launchLanguage(remembered, deviceLanguages(), locale);
        opening.current = choice;
        if (choice === locale) markLanguageSettled();
        else await setLocale(choice);
        applied = choice;
      } catch {
        // Whatever went wrong, the app opens: in the language it was built in.
        markLanguageSettled();
      }

      // From here nothing holds the opening screen. The account's language
      // is a request to the server, best-effort.
      if (remembered && isLocaleSelectable(remembered)) {
        // Backfill the profile when it has no value yet.
        if ((await readProfileLocale()) === null) await syncProfileLocale(applied);
        return;
      }
      const fromProfile = await readProfileLocale();
      if (fromProfile && isLocaleSelectable(fromProfile)) {
        const target = resolveLocale(fromProfile);
        // A fresh device adopting a choice made on another one. Remembered
        // here so later launches open in it at once, and work offline.
        await persistLocaleChoice(target);
        if (target !== applied) await setLocale(target);
      }
    })();
  }, [locale, setLocale]);

  return null;
}
