"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { LocaleCode } from "@/lib/i18n/locales";
import { interpolate, resolvePluralKey } from "@/lib/i18n/plural";

type Messages = Record<string, string>;

type Ctx = {
  locale: LocaleCode;
  messages: Messages;
};

const MessagesContext = createContext<Ctx | null>(null);

export function MessagesProvider({
  locale,
  messages,
  children,
}: {
  locale: LocaleCode;
  messages: Messages;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ locale, messages }), [locale, messages]);
  return (
    <MessagesContext.Provider value={value}>
      {children}
    </MessagesContext.Provider>
  );
}

/**
 * Hook for client components. Returns:
 *   locale , the active locale code ("en" | "es" | …)
 *   t(key) , translate a key; falls back to the key itself on miss
 *   tn(key, count, replacements?), singular/plural-aware variant
 */
export function useTranslate() {
  const ctx = useContext(MessagesContext);
  const messages = ctx?.messages ?? {};
  const locale = (ctx?.locale ?? "en") as LocaleCode;

  function t(key: string, replacements?: Record<string, string | number>): string {
    return interpolate(messages[key] ?? key, replacements);
  }

  function tn(
    keyBase: string,
    count: number,
    replacements?: Record<string, string | number>,
  ): string {
    const value = resolvePluralKey(messages, keyBase, count, locale);
    return interpolate(value, { ...(replacements ?? {}), count });
  }

  return { locale, t, tn };
}
