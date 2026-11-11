"use client";

import { useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ChevronDown } from "@/components/ui/icons/ChevronDown";
import { Sheet } from "@/components/ui/Sheet";

import { TranslationList, useTranslationChoice } from "./TranslationList";

/**
 * The translation beside the chapter, on a phone and a tablet (1.9, build 93
 * note 20; the owner: "changing the bibles translation or the version of the
 * Bible should be as easy as switching your chapter"). Under the chapter's
 * title, where "Chapter 1 ⌄" opens the books: the translation the chapter is
 * read in, with the same small chevron, one tap from the page. It opens the
 * house's sheet with the translations the reader has and those to download,
 * the one being read checked (TranslationList, the rows the ••• sheet and the
 * computer's pill show), and the switch keeps the reader's verse
 * (lib/bible/keepPlace.ts). A Bible without the book says so in its row, and
 * its chapter in English says why. The computer chooses from the toolbar's
 * pill (TranslationSwitcher), so this stands where the pill does not.
 */
export function TitleTranslation({ currentSlug, configuredLicensed = [] }: { currentSlug: string; configuredLicensed?: string[] }) {
  const { t } = useTranslate();
  const { testament, list, current, choose, shown, chooseBible, label } = useTranslationChoice(currentSlug, configuredLicensed);
  const [open, setOpen] = useState(false);
  return (
    <>
      <div data-reader-chrome className="page-open-sub mt-0.5 flex justify-center md:hidden native-md-flex">
        <button
          type="button"
          data-title-translation=""
          // The 1.9 tour's way to the new Bibles on a phone: the translation beside the chapter.
          data-tour="bibles"
          aria-haspopup="dialog"
          aria-label={t("bible.switchTranslationCurrentAria", { name: label })}
          onClick={() => setOpen(true)}
          className="tap-press inline-flex min-h-11 items-center gap-[5px] px-3 font-sans text-ui text-paper/55 hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
        >
          <span dir="auto">{label}</span>
          <ChevronDown size={17} aria-hidden className="text-paper/50" />
        </button>
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} title={t("bible.translationLabel")}>
        <TranslationList
          testament={testament}
          list={list}
          current={current}
          configured={configuredLicensed}
          onChoose={(tr) => {
            setOpen(false);
            choose(tr);
          }}
          book={currentSlug}
          shown={shown}
          onChooseBible={(bible) => {
            setOpen(false);
            chooseBible(bible);
          }}
        />
      </Sheet>
    </>
  );
}
