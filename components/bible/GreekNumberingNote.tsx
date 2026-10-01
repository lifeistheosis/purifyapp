"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { useInterlinear } from "@/lib/bible/interlinear";

/**
 * Said only to a reader who has the Greek turned on, in an Old Testament
 * chapter where Swete's Septuagint and Brenton's English cannot be paired
 * verse for verse (greekAlignment in lib/bible/greekText.ts): why the Greek
 * is not beside the verses here, so its absence does not read as a fault.
 */
export function GreekNumberingNote() {
  const { t } = useTranslate();
  const { on } = useInterlinear();
  if (!on) return null;
  return (
    <p className="mb-8 rounded-md border border-paper/10 bg-paper/[0.03] px-4 py-3 font-sans text-detail leading-[1.55] text-paper/65">
      {t("bible.greekNumberedApart")}
    </p>
  );
}
