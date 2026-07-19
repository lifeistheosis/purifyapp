"use client";

import { useEffect, useRef, useState } from "react";
import { LOCALES, type LocaleCode } from "@/lib/i18n/locales";
import { useTranslate } from "./MessagesProvider";
import { useApplyLocale } from "./useApplyLocale";
import { LocaleMenu } from "./LocaleMenu";

/**
 * Language control for the account settings panel. Pill trigger styled
 * like the other settings controls, opening the shared LocaleMenu
 * downward. Switching goes through useApplyLocale, the same path as the
 * footer switcher (cookie + reload on web, in-place swap on native).
 */
export function LanguagePicker() {
  const { locale, t } = useTranslate();
  const applyLocale = useApplyLocale();
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const current =
    LOCALES.find((l) => l.code === locale && (l.ready || l.editorial)) ??
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

  function selectLocale(next: LocaleCode) {
    setOpen(false);
    if (next === locale) return;
    setPending(true);
    void applyLocale(next).finally(() => setPending(false));
  }

  return (
    <div ref={rootRef} className="relative inline-block text-left">
      <button
        type="button"
        aria-label={t("footer.languageLabel")}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={pending}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-[36px] items-center gap-2 rounded-pill border border-paper/15 bg-paper/[0.04] px-4 font-sans text-detail font-medium text-paper/85 hover:border-paper/30 hover:bg-paper/10 transition-colors disabled:opacity-50"
      >
        {current?.nativeLabel}
        <Chevron
          className={`h-3.5 w-3.5 shrink-0 text-paper/40 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <LocaleMenu
          locale={locale}
          onSelect={selectLocale}
          onNavigate={() => setOpen(false)}
          placement="down"
        />
      )}
    </div>
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
