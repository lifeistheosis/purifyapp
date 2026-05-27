"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LOCALES } from "@/lib/i18n/locales";
import { useTranslate } from "./MessagesProvider";

/**
 * Tiny <select> dropdown for switching locales. Writes the
 * `purify_locale` cookie and refreshes the route so server-rendered
 * strings repaint in the new language.
 *
 * The cookie is set client-side (readable, non-sensitive); middleware
 * respects it on subsequent requests.
 */
export function LocaleSwitcher() {
  const router = useRouter();
  const { locale, t } = useTranslate();
  const [pending, startTransition] = useTransition();

  function setLocale(next: string) {
    // 1 year, root path, non-httpOnly so the client can read.
    document.cookie = `purify_locale=${next}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    startTransition(() => {
      router.refresh();
    });
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
