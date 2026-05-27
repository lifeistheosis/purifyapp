"use client";

import { useState } from "react";
import { LOCALES } from "@/lib/i18n/locales";
import { useTranslate } from "./MessagesProvider";

/**
 * Tiny <select> dropdown for switching locales. Writes the
 * `purify_locale` cookie and does a hard reload so the new language
 * sticks across every subsequent navigation, not just the current
 * page.
 *
 * Why a hard reload instead of router.refresh():
 * The root layout mounts a single <MessagesProvider> with the locale
 * read at request time. Next.js caches the root layout across
 * client-side navigations and re-uses prefetched RSC payloads, so a
 * router.refresh() repaints only the current route, the next
 * <Link> click serves the previous locale's prefetched HTML. A full
 * window.location.reload() invalidates every prefetch and re-renders
 * the root layout from scratch with the new cookie, which is the
 * only way to make the choice sticky across the whole app shell.
 *
 * The cookie itself is non-sensitive (readable by the client) so the
 * middleware can also negotiate it on the next request when needed.
 */
export function LocaleSwitcher() {
  const { locale, t } = useTranslate();
  const [pending, setPending] = useState(false);

  function setLocale(next: string) {
    if (next === locale) return;
    setPending(true);
    // 1 year, root path, non-httpOnly so the client can read.
    document.cookie = `purify_locale=${next}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    // Hard reload so the root layout re-renders with the new cookie
    // and every page subsequently navigated to reads through the new
    // MessagesProvider on first paint.
    window.location.reload();
  }

  return (
    <label className="inline-flex items-center gap-2 font-sans text-[12px] text-paper/55">
      <span className="sr-only">{t("footer.languageLabel")}</span>
      <select
        aria-label={t("footer.languageLabel")}
        className="bg-night-soft border border-paper/15 rounded px-2 py-1 text-paper/80 hover:border-paper/35 focus:outline-none focus:border-gold/55 transition-colors disabled:opacity-50"
        value={locale}
        disabled={pending}
        onChange={(e) => setLocale(e.target.value)}
      >
        {LOCALES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.nativeLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
