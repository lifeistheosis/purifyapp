"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getLocale, type LocaleCode } from "@/lib/i18n/locales";
import { loadClientLanguage } from "@/lib/i18n/client";
import { languageSettled, subscribeLanguageSettled } from "@/lib/i18n/launchLanguage";
import { APPLIED_LANGUAGE_KEY } from "@/lib/i18n/languagePrepaint";
import { isNativeClient } from "@/lib/platform/native";
import { RouteLanguageHold } from "./LaunchLanguageGate";
import { interpolate, resolvePluralKey } from "@/lib/i18n/plural";
import enCatalog from "@/lib/i18n/messages/en.json";

type Messages = Record<string, string>;

/** Stable identity for the no-provider case, so useTranslate's memo below
 * does not invalidate on every call against a fresh `{}`. */
const EMPTY_MESSAGES: Messages = Object.freeze({});

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

/** Put a language on <html>, and in the apps keep it for the language pre-paint. */
function showLanguage(code: LocaleCode): void {
  const root = document.documentElement;
  const dir = getLocale(code).dir;
  if (root.lang !== code) root.lang = code;
  if (root.dir !== dir) root.dir = dir;
  if (!isNativeClient()) return;
  try {
    window.localStorage.setItem(APPLIED_LANGUAGE_KEY, code);
  } catch {
    // Storage refused (a private window): the next open guesses from the device.
  }
}

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

  // The language on <html> is the language of the words drawn (Updates 82).
  // It is written in the commit that draws them, before that frame is painted,
  // never ahead of it: written by setLocale before React drew the new table, a
  // switch in Settings drew 195 to 272ms of frames mirrored with the old words
  // (docs/handoffs/updates-81.md, step 3b). Nothing is written at mount: the
  // server wrote the page's language, and in the apps the language pre-paint
  // (lib/i18n/languagePrepaint.ts) has already written the reader's.
  const shown = useRef(state.locale);
  const asked = useRef(false);
  useLayoutEffect(() => {
    if (shown.current === state.locale) return;
    shown.current = state.locale;
    showLanguage(state.locale);
  }, [state.locale]);
  // And once the opening language is settled, <html> says what is drawn, if
  // no language was asked for: the pre-paint guessed from what this device
  // last applied, and the reader may have chosen otherwise on another device
  // or in the phone's settings since.
  useEffect(() => {
    const follow = () => {
      if (!asked.current) showLanguage(shown.current);
    };
    if (languageSettled()) {
      follow();
      return;
    }
    return subscribeLanguageSettled(follow);
  }, []);

  const setLocale = useCallback(async (next: LocaleCode) => {
    asked.current = true;
    // The catalog and the faces its words are drawn in, both before the
    // words are committed, so they are drawn once (lib/i18n/client.ts).
    const nextMessages = await loadClientLanguage(next);
    setState({ locale: next, messages: nextMessages });
  }, []);

  const value = useMemo(() => ({ ...state, setLocale }), [state, setLocale]);
  return (
    <MessagesContext.Provider value={value}>
      {/* In the apps, a screen reached before the reader's language is on
          the screen waits for it under the launch slate (LaunchLanguageGate).
          It decides on the device: a flag of the build cannot, in a client
          bundle (Updates 82). */}
      <RouteLanguageHold>{children}</RouteLanguageHold>
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
  const messages = ctx?.messages ?? EMPTY_MESSAGES;
  const locale = (ctx?.locale ?? "en") as LocaleCode;

  // Memoized on the catalog and the locale, which is the only thing either
  // function closes over. The provider value above is already memoized, but
  // this hook threw that away: it rebuilt `t`, `tn` and the returned object on
  // every call, and the calendar alone calls it 42 times per grid. Fresh
  // function identities also silently defeat any consumer that memoizes on
  // them, so this is a correctness fix as much as an allocation one.
  //
  // The `{}` default had to become a module-level constant for the same
  // reason: a fresh empty object every call is a fresh dependency every call.
  return useMemo(() => {
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
  }, [messages, locale]);
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
