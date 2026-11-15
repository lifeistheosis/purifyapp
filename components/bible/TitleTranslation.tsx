"use client";

import { useEffect } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ChevronDown } from "@/components/ui/icons/ChevronDown";
import { openBooks, setConfiguredTranslations } from "@/lib/bible/booksSheet";

import { useTranslationChoice } from "./TranslationList";

/**
 * The translation beside the chapter, on a phone and a tablet (1.9, build 93
 * note 20; the owner: "changing the bibles translation or the version of the
 * Bible should be as easy as switching your chapter"). Under the chapter's
 * title, where "Chapter 1 ⌄" opens the books: the translation the chapter is
 * read in, with the same small chevron, one tap from the page. The computer
 * chooses from the toolbar's pill (TranslationSwitcher), so this stands where
 * the pill does not.
 *
 * From build 98 note 7 (the owner: "incorporate the change Bible version with
 * this screen") it opens the books sheet on its versions (MobileChapterSheet,
 * lib/bible/booksSheet.ts), so the books and the versions are one sheet: the
 * same rows the ••• sheet and the computer's pill show (TranslationList), the
 * one being read checked, downloads with them, and the switch keeps the
 * reader's verse (lib/bible/keepPlace.ts). It hands the sheet the licensed
 * translations its page has keys for, since the pill that holds the sheet is
 * not given them.
 */
export function TitleTranslation({ currentSlug, configuredLicensed = [] }: { currentSlug: string; configuredLicensed?: string[] }) {
  const { t } = useTranslate();
  const { label } = useTranslationChoice(currentSlug, configuredLicensed);
  const configured = configuredLicensed.join();
  useEffect(() => {
    setConfiguredTranslations(configured ? configured.split(",") : []);
  }, [configured]);
  return (
    <div data-reader-chrome className="page-open-sub mt-0.5 flex justify-center md:hidden native-md-flex">
      <button
        type="button"
        data-title-translation=""
        // The 1.9 tour's way to the new Bibles on a phone: the translation beside the chapter.
        data-tour="bibles"
        aria-haspopup="dialog"
        aria-label={t("bible.switchTranslationCurrentAria", { name: label })}
        onClick={() => openBooks("versions")}
        className="tap-press inline-flex min-h-11 items-center gap-[5px] px-3 font-sans text-ui text-paper/55 hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
      >
        <span dir="auto">{label}</span>
        <ChevronDown size={17} aria-hidden className="text-paper/50" />
      </button>
    </div>
  );
}
