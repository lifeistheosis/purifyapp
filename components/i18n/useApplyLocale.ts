"use client";

// The one way to change language, used by the footer switcher and the
// settings row. Persists the choice, then applies it per platform:
// web reloads (the root layout re-renders from the cookie, invalidating
// every prefetched RSC payload); native swaps catalogs in place because
// the static export has no server to re-render.

import { useCallback } from "react";
import type { LocaleCode } from "@/lib/i18n/locales";
import { persistLocaleChoice } from "@/lib/i18n/switchLocale";
import { isNativeClient } from "@/lib/platform/native";
import { useSetLocale } from "./MessagesProvider";

export function useApplyLocale(): (next: LocaleCode) => Promise<void> {
  const setLocale = useSetLocale();
  return useCallback(
    async (next: LocaleCode) => {
      await persistLocaleChoice(next);
      if (isNativeClient()) {
        await setLocale(next);
      } else {
        window.location.reload();
      }
    },
    [setLocale],
  );
}
