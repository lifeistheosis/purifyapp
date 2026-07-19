"use client";

// Native locale bootstrap (Beta 2.3). The Android static export bakes
// the root layout in English (`getServerLocale` cannot read cookies in
// `output: export`), so on native this corrects the provider after
// mount: apply the user's stored choice, or on first run negotiate the
// device language against selectable locales. On the web it is a no-op:
// middleware + the server layout already agreed on the locale.
//
// Statically-rendered page prose stays English until the native content
// layer (Phase 6) fetches overrides; this switches the chrome.

import { useEffect, useRef } from "react";
import {
  isLocaleSelectable,
  resolveLocale,
  type LocaleCode,
} from "@/lib/i18n/locales";
import { readNativeLocaleChoice } from "@/lib/i18n/switchLocale";
import { isNativeClient } from "@/lib/platform/native";
import { useSetLocale, useTranslate } from "./MessagesProvider";

/** First-run negotiation from the WebView's language list. Selectable
 * covers ready + editorial locales; the switcher marks editorial ones
 * "in progress" and content pages carry the translation banner. */
function negotiateFromNavigator(): LocaleCode | null {
  const ranges =
    navigator.languages && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language];
  for (const range of ranges) {
    const primary = range?.toLowerCase().split("-")[0];
    if (primary && isLocaleSelectable(primary)) return resolveLocale(primary);
  }
  return null;
}

export function LocaleBootstrap() {
  const { locale } = useTranslate();
  const setLocale = useSetLocale();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (!isNativeClient()) return;
    void (async () => {
      const stored = await readNativeLocaleChoice();
      const target =
        stored && isLocaleSelectable(stored)
          ? resolveLocale(stored)
          : negotiateFromNavigator();
      if (target && target !== locale) await setLocale(target);
    })();
  }, [locale, setLocale]);

  return null;
}
