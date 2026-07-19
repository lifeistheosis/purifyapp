"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getLocale, type LocaleCode } from "@/lib/i18n/locales";
import { loadClientCatalog } from "@/lib/i18n/client";
import { interpolate, resolvePluralKey } from "@/lib/i18n/plural";
import enCatalog from "@/lib/i18n/messages/en.json";

type Messages = Record<string, string>;

// The English catalog ships in the client bundle ONCE. Without this,
// the root layout's `messages` prop serialized the full catalog into
// every prerendered page's HTML and flight payload: ~135 KB x 2 copies
// x ~1,750 exported pages, roughly 470 MB inside the APK. The layout
// now omits the prop for English (the only locale the static export
// renders); non-English web requests are dynamic and still pass their
// catalog through the prop.
const EN_MESSAGES = enCatalog as Messages;

type Ctx = {
  locale: LocaleCode;
  messages: Messages;
  /**
   * Swap the active catalog client-side and update <html lang/dir>.
   * Exists for the native app, where the static export bakes English
   * and there is no server to re-render; the web switcher keeps its
   * cookie + hard-reload path instead.
   */
  setLocale: (next: LocaleCode) => Promise<void>;
};

const MessagesContext = createContext<Ctx | null>(null);

export function MessagesProvider({
  locale,
  messages,
  children,
}: {
  locale: LocaleCode;
  /** Omitted for English: the bundled EN_MESSAGES serves as the
   * catalog, keeping the export free of per-page catalog copies. */
  messages?: Messages;
  children: ReactNode;
}) {
  // Server-rendered values are the initial state. On the web they are
  // already correct (cookie-negotiated per request) and never change
  // within a page lifetime; on native the export always hands us "en"
  // and LocaleBootstrap corrects it after mount.
  const [state, setState] = useState({
    locale,
    messages: messages ?? EN_MESSAGES,
  });

  const setLocale = useCallback(async (next: LocaleCode) => {
    const nextMessages = await loadClientCatalog(next);
    setState({ locale: next, messages: nextMessages });
    document.documentElement.lang = next;
    document.documentElement.dir = getLocale(next).dir;
  }, []);

  const value = useMemo(() => ({ ...state, setLocale }), [state, setLocale]);
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
 *   tn(key, count, replacements?), CLDR plural-aware variant (legacy
 *   .singular/.plural keys keep working, see lib/i18n/plural.ts)
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

/** Client-side catalog swap. See Ctx.setLocale for when to use this. */
export function useSetLocale(): (next: LocaleCode) => Promise<void> {
  const ctx = useContext(MessagesContext);
  if (!ctx) {
    // Outside the provider (should not happen in app code): no-op that
    // keeps callers from crashing.
    return async () => {};
  }
  return ctx.setLocale;
}
