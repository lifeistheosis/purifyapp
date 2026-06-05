"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LOCALES } from "@/lib/i18n/locales";
import { useTranslate } from "./MessagesProvider";

/**
 * Custom locale dropdown for switching languages. Writes the
 * `purify_locale` cookie and does a hard reload so the new language
 * sticks across every subsequent navigation, not just the current
 * page.
 *
 * Why a custom popover instead of a native <select>:
 * The native control renders the OS-default option list, which ignores
 * the app's dark/gold palette and looks foreign in the footer. This
 * builds a small themed menu (trigger + popover) while preserving the
 * cookie + hard-reload semantics described below.
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
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Show every locale in the menu; the not-yet-translated ones render as
  // disabled "Coming soon" rows (ready ones first, then the rest).
  const options = [...LOCALES].sort(
    (a, b) => Number(b.ready) - Number(a.ready),
  );
  const current =
    LOCALES.find((l) => l.code === locale && l.ready) ??
    LOCALES.find((l) => l.ready) ??
    LOCALES[0];

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function setLocale(next: string) {
    setOpen(false);
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
    <div ref={rootRef} className="relative inline-block text-left">
      <span className="sr-only">{t("footer.languageLabel")}</span>
      <button
        type="button"
        aria-label={t("footer.languageLabel")}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={pending}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-lg border border-paper/15 bg-night-soft px-3 py-1.5 font-sans text-caption text-paper/85 hover:border-paper/35 hover:text-paper focus:outline-none focus-visible:border-gold/55 focus-visible:outline-2 focus-visible:outline-gold/40 focus-visible:outline-offset-1 transition-colors disabled:opacity-50"
      >
        <Globe className="h-3.5 w-3.5 shrink-0 text-paper/50" />
        <span className="min-w-[64px] text-left">{current?.nativeLabel}</span>
        <Chevron
          className={`h-3.5 w-3.5 shrink-0 text-paper/40 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t("footer.languageLabel")}
          className="absolute bottom-full left-0 z-50 mb-2 w-max min-w-full max-w-[min(85vw,18rem)] overflow-hidden rounded-lg border border-paper/12 bg-night-soft py-1 shadow-xl shadow-black/40"
        >
          {options.map((l) => {
            const active = l.code === locale;
            if (!l.ready) {
              // Not-yet-translated languages route to the "become a language
              // editor" page (personalized by ?lang=) instead of switching.
              return (
                <li key={l.code} role="option" aria-selected={false}>
                  <Link
                    href={`/language-editor?lang=${l.code}`}
                    onClick={() => setOpen(false)}
                    dir={l.dir}
                    className="flex w-full items-center justify-between gap-3 whitespace-nowrap px-3 py-2 text-left font-sans text-caption text-paper/55 transition-colors hover:bg-paper/[0.06] hover:text-paper"
                  >
                    <span>{l.nativeLabel}</span>
                    <span className="shrink-0 rounded-full border border-paper/15 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.04em] text-paper/45">
                      {l.comingSoon}
                    </span>
                  </Link>
                </li>
              );
            }
            return (
              <li key={l.code} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => setLocale(l.code)}
                  dir={l.dir}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left font-sans text-caption transition-colors ${
                    active
                      ? "text-gold"
                      : "text-paper/75 hover:bg-paper/[0.06] hover:text-paper"
                  }`}
                >
                  <span>{l.nativeLabel}</span>
                  {active ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Globe({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12 H21" />
      <path d="M12 3 C15 6.5 15 17.5 12 21 C9 17.5 9 6.5 12 3 Z" />
    </svg>
  );
}

function Chevron({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M6 9 L12 15 L18 9" />
    </svg>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M5 12.5 L10 17.5 L19 6.5" />
    </svg>
  );
}
