"use client";

import { useEffect, useRef, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { ChevronDown } from "@/components/ui/icons/ChevronDown";
import { LOCALES, type LocaleCode } from "@/lib/i18n/locales";
import { textDir } from "@/lib/i18n/textDir";
import { useTranslate } from "./MessagesProvider";
import { useApplyLocale } from "./useApplyLocale";
import { LanguageSheetList } from "./LanguageSheetList";
import { LocaleMenu } from "./LocaleMenu";
import { useLanguageSheet } from "./useLanguageSheet";

/**
 * Language control for the account settings panel. Pill trigger styled
 * like the other settings controls. On a phone, and in the apps at every
 * width, it opens the house's sheet from the foot of the screen with the
 * languages as rows (1.9, build 93 note 6: the floating list opened off the
 * screen); a computer's window keeps the shared LocaleMenu, opening
 * downward. Switching goes through useApplyLocale, the same path as the
 * footer switcher (cookie + reload on web, in-place swap on native).
 */
export function LanguagePicker() {
  const { locale, t } = useTranslate();
  const applyLocale = useApplyLocale();
  const asSheet = useLanguageSheet();
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const current =
    LOCALES.find((l) => l.code === locale && (l.ready || l.editorial)) ??
    LOCALES[0];

  // The dropdown closes on a tap outside it or Escape. The sheet closes
  // itself (its scrim, Escape, Android back, its close button), and it is
  // drawn outside this box, so a tap on one of its rows is not "outside".
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

  function selectLocale(next: LocaleCode) {
    setOpen(false);
    if (next === locale) return;
    setPending(true);
    void applyLocale(next).finally(() => setPending(false));
  }

  return (
    <div ref={rootRef} className="relative inline-block text-start">
      <button
        type="button"
        aria-label={t("footer.languageLabel")}
        aria-haspopup={asSheet ? "dialog" : "listbox"}
        aria-expanded={open}
        disabled={pending}
        data-language-picker=""
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-11 items-center gap-2 rounded-pill border border-paper/15 bg-paper/[0.04] px-4 font-sans text-detail font-medium text-paper/85 hover:border-paper/30 hover:bg-paper/10 transition-colors disabled:opacity-50"
      >
        <span lang={current.code} dir={textDir(current.code)}>
          {current.nativeLabel}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-paper/40 transition-transform duration-200 ${
            menuOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {menuOpen && (
        <LocaleMenu
          locale={locale}
          onSelect={selectLocale}
          onNavigate={() => setOpen(false)}
          placement="down"
        />
      )}
      <Sheet open={open && asSheet} onClose={() => setOpen(false)} title={t("footer.languageLabel")} openFull>
        <LanguageSheetList locale={locale} onSelect={selectLocale} />
      </Sheet>
    </div>
  );
}
