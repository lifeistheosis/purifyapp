"use client";

import { useCallback } from "react";

import { Check } from "@/components/ui/icons/Check";
import { cn } from "@/lib/cn";
import { coverageWords } from "@/lib/i18n/coverage";
import { LOCALES, type LocaleCode } from "@/lib/i18n/locales";
import { textDir } from "@/lib/i18n/textDir";

import { useTranslate } from "./MessagesProvider";

/**
 * The languages as rows in the house's sheet (1.9, build 93 note 6; the
 * owner of Settings, Language: "clear design flaw here", a floating list
 * that opened off the screen). Every language by its own name, its English
 * name beside it and what it covers under it in its own words; the reader's
 * own in the house's fill with its check, as the reader's translation is in
 * its sheet (components/bible/TranslationList.tsx), and in the middle of what
 * the sheet shows when it opens; each row 44px to the touch. The rows keep
 * the page's direction, so in Arabic and Urdu the sheet is mirrored, and each
 * name says itself in its own. A computer's window keeps the dropdown,
 * LocaleMenu.
 */
export function LanguageSheetList({ locale, onSelect }: { locale: LocaleCode; onSelect: (next: LocaleCode) => void }) {
  const { t } = useTranslate();
  const ready = LOCALES.filter((l) => l.ready);
  const editorial = LOCALES.filter((l) => !l.ready && l.editorial);

  // As the sheet opens, the reader's own language in the middle of what it
  // shows: once per opening, when the list is drawn (the sheet's body, its
  // parent, is what scrolls; the books sheet places the open book the same way).
  const placeList = useCallback((el: HTMLUListElement | null) => {
    const scroller = el?.parentElement;
    const row = el?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!scroller || !row) return;
    const s = scroller.getBoundingClientRect();
    const r = row.getBoundingClientRect();
    scroller.scrollTop = Math.max(0, r.top - s.top + scroller.scrollTop - Math.max(0, (s.height - r.height) / 2));
  }, []);

  const row = (l: (typeof LOCALES)[number]) => {
    const active = l.code === locale;
    return (
      <li key={l.code} role="option" aria-selected={active}>
        <button
          type="button"
          onClick={() => onSelect(l.code)}
          className={cn(
            "flex min-h-11 w-full items-center gap-3 rounded-md border px-3 py-3 text-start transition-colors",
            active ? "border-gold/45 bg-gold/15" : "border-transparent hover:bg-paper/[0.04]",
          )}
        >
          {/* Each line is placed by the page's direction, so in Arabic and Urdu
              every row stands at the right; the words in it keep their own
              direction. The gap between the two names is the line's, not a
              margin on either: a margin on words in the other direction lands
              on their far side. */}
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-baseline gap-x-2">
              <span lang={l.code} dir={textDir(l.code)} className="font-sans text-ui font-semibold text-paper">
                {l.nativeLabel}
              </span>
              {l.englishLabel !== l.nativeLabel ? (
                <span lang="en" dir="ltr" className="font-sans text-caption text-paper/60">
                  {l.englishLabel}
                </span>
              ) : null}
            </span>
            {/* What the language covers, in its own words (lib/i18n/coverage.ts). */}
            <span className="mt-0.5 block font-sans text-caption leading-snug text-paper/60">
              <span lang={l.code} dir={textDir(l.code)} data-language-covers={l.code}>
                {coverageWords(l.code)}
              </span>
            </span>
          </span>
          {active ? <Check size={18} className="shrink-0 text-paper" /> : null}
        </button>
      </li>
    );
  };

  return (
    <ul ref={placeList} role="listbox" aria-label={t("footer.languageLabel")} data-language-sheet="" className="space-y-1">
      {ready.map(row)}
      {editorial.length > 0 ? (
        <>
          <li role="presentation" className="px-3 pb-1 pt-4 font-sans text-caption font-semibold text-paper/60">
            {t("footer.localeGroupInProgress")}
          </li>
          {editorial.map(row)}
        </>
      ) : null}
    </ul>
  );
}
