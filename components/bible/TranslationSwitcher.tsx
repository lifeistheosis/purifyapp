"use client";

import { useEffect, useRef, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";

import { ReaderPill } from "./ReaderPill";
import { TranslationList, useTranslationChoice } from "./TranslationList";

/**
 * The computer's translation picker: the reader's pill, opening a popover
 * under itself with the rows the phone's sheet shows (TranslationList). On
 * the phone and the tablet the row has MobileTranslationPill, which opens a
 * sheet instead; the website's wide screen keeps a popover, as its book and
 * reader settings do. The list is lib/bible/translations.ts.
 */
export function TranslationSwitcher({
  currentSlug,
  configuredLicensed = [],
}: {
  currentSlug: string;
  /** Licensed translation ids that are actually configured (key + bibleId).
   * Others are not listed, so a choice can never silently fall back. */
  configuredLicensed?: string[];
}) {
  const { t } = useTranslate();
  const { testament, list, current, choose } = useTranslationChoice(currentSlug, configuredLicensed);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
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

  return (
    <div ref={rootRef} className="relative inline-block">
      <ReaderPill
        chevron
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t("bible.switchTranslationCurrentAria", { name: current.shortLabel })}
      >
        {current.shortLabel}
      </ReaderPill>

      {open && (
        <div
          role="dialog"
          aria-label={t("bible.switchTranslation")}
          className="absolute left-0 top-[calc(100%+8px)] z-50 w-[min(360px,calc(100vw-2rem))] rounded-lg border border-paper/15 bg-night p-3 shadow-overlay"
        >
          <div className="max-h-[60vh] overflow-y-auto">
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
          </div>
        </div>
      )}
    </div>
  );
}
