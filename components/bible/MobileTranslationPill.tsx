"use client";

import { useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Sheet } from "@/components/ui/Sheet";

import { ReaderPill } from "./ReaderPill";
import { TranslationList, useTranslationChoice } from "./TranslationList";

/**
 * The phone's and the tablet's translation picker: a pill that names the
 * translation being read ("KJV") and opens the same movable sheet the book
 * and the reader settings open. Until 1.7 it dropped a box of rows with
 * badges under the pill, the one picker on the screen that was not a sheet
 * (the owner's note 1 of 2026-10-16: "Translation pops up floating buttons
 * (wrong). Make it the same scrollable sheet as Book and Reader").
 *
 * It reads the address's ?v=, so it stays inside ChapterScreen beside the
 * computer's TranslationSwitcher, where the route's loading boundary holds
 * it in the static export.
 */
export function MobileTranslationPill({
  currentSlug,
  configuredLicensed = [],
}: {
  currentSlug: string;
  /** Licensed translation ids whose API access is configured. */
  configuredLicensed?: string[];
}) {
  const { t } = useTranslate();
  const [open, setOpen] = useState(false);
  const { testament, list, current, choose } = useTranslationChoice(currentSlug, configuredLicensed);

  return (
    <>
      <ReaderPill
        chevron
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t("bible.switchTranslationCurrentAria", { name: current.shortLabel })}
        className="shrink-0"
      >
        {current.shortLabel}
      </ReaderPill>
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
        />
      </Sheet>
    </>
  );
}
