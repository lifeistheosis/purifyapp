"use client";

import { useEffect, useRef, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { LOCALES, type LocaleCode } from "@/lib/i18n/locales";
import { useTranslate } from "./MessagesProvider";
import { useApplyLocale } from "./useApplyLocale";
import { LanguageSheetList } from "./LanguageSheetList";
import { LocaleMenu } from "./LocaleMenu";
import { useLanguageSheet } from "./useLanguageSheet";

/**
 * Custom locale dropdown for switching languages in the footer. The
 * grouped list itself lives in LocaleMenu (shared with the account
 * settings picker); this owns the themed trigger and popover state. On a
 * phone it opens the house's sheet with the languages as rows instead
 * (1.9, build 93 note 6), as the settings picker does.
 *
 * Why a custom popover instead of a native <select>:
 * The native control renders the OS-default option list, which ignores
 * the app's dark/gold palette and looks foreign in the footer. This
 * builds a small themed menu (trigger + popover) while preserving the
 * switch semantics below.
 *
 * How switching applies (useApplyLocale):
 * Web writes the `purify_locale` cookie and hard-reloads: the root
 * layout mounts a single <MessagesProvider> with the locale read at
 * request time, and Next.js re-uses prefetched RSC payloads across
 * client navigations, so only a full reload makes the choice stick
 * across the whole app shell. Native (the static export has no server)
 * persists to Capacitor Preferences and swaps catalogs in place.
 */
export function LocaleSwitcher() {
  const { locale, t } = useTranslate();
  const applyLocale = useApplyLocale();
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const asSheet = useLanguageSheet();

  const ready = LOCALES.filter((l) => l.ready);
  const current =
    LOCALES.find((l) => l.code === locale && (l.ready || l.editorial)) ??
    ready[0] ??
    LOCALES[0];

  // The dropdown closes on outside click or Escape; the sheet closes itself,
  // and is drawn outside this box, so a tap on its rows is not "outside".
  const menuOpen = open && !asSheet;
  useEffect(() => {
    if (!menuOpen) return;
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
  }, [menuOpen]);

  function setLocale(next: LocaleCode) {
    setOpen(false);
    if (next === locale) return;
    setPending(true);
    void applyLocale(next).finally(() => setPending(false));
  }

  return (
    <div ref={rootRef} className="relative inline-block text-left">
      <span className="sr-only">{t("footer.languageLabel")}</span>
      <button
        type="button"
        aria-label={t("footer.languageLabel")}
        aria-haspopup={asSheet ? "dialog" : "listbox"}
        aria-expanded={open}
        disabled={pending}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-lg border border-paper/15 bg-night-soft px-3 py-1.5 font-sans text-caption text-paper/85 hover:border-paper/35 hover:text-paper focus:outline-none focus-visible:border-gold/55 focus-visible:outline-2 focus-visible:outline-gold/40 focus-visible:outline-offset-1 transition-colors disabled:opacity-50"
      >
        <Globe className="h-3.5 w-3.5 shrink-0 text-paper/50" />
        <span className="min-w-[64px] text-left">{current?.nativeLabel}</span>
        <Chevron
          className={`h-3.5 w-3.5 shrink-0 text-paper/40 transition-transform duration-200 ${
            menuOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {menuOpen && (
        <LocaleMenu
          locale={locale}
          onSelect={setLocale}
          onNavigate={() => setOpen(false)}
          placement="up"
        />
      )}
      <Sheet open={open && asSheet} onClose={() => setOpen(false)} title={t("footer.languageLabel")} openFull>
        <LanguageSheetList locale={locale} onSelect={setLocale} />
      </Sheet>
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
