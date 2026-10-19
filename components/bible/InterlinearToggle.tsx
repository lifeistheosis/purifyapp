"use client";

import { useInterlinear } from "@/lib/bible/interlinear";
import { useTranslate } from "@/components/i18n/MessagesProvider";

import { ReaderPill } from "./ReaderPill";

/**
 * The Greek beside the English, on or off: the reader's pill, filled while
 * it is on. Its name is the word on it, and the pressed state says the rest;
 * the longer "Interlinear Greek" is its tooltip, because in several languages
 * the longer phrase does not contain the pill's own word.
 */
export function InterlinearToggle({ className }: { className?: string }) {
  const { t } = useTranslate();
  const { on, toggle } = useInterlinear();
  return (
    <ReaderPill pressed={on} onClick={toggle} aria-pressed={on} title={t("bible.interlinearGreek")} className={className}>
      {/* Its word ends in an ellipsis only on a narrow phone in a language
          with a long one, after the Book pill has given all it can. */}
      <span className="truncate">{t("bible.interlinear")}</span>
    </ReaderPill>
  );
}
