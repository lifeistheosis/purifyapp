"use client";

import { Fragment } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { useInterlinear } from "@/lib/bible/interlinear";

/**
 * What the reader is told about the Hebrew beside the Old Testament (1.9,
 * lib/bible/hebrewText.ts), said only with the interlinear on, as the
 * Greek's own note is (GreekNumberingNote.tsx), so its absence never reads as
 * a fault and its presence never as the Church's text.
 */

/** Why the Hebrew does not stand beside this chapter. */
export function HebrewChapterNote({ state }: { state: "book" | "chapter" | "apart" }) {
  const { t } = useTranslate();
  const { on } = useInterlinear();
  if (!on) return null;
  const key = state === "book" ? "bible.hebrew.notInBook" : state === "chapter" ? "bible.hebrew.notInChapter" : "bible.hebrew.apart";
  return (
    <p data-hebrew-note={state} className="mb-8 rounded-md border border-paper/10 bg-paper/[0.03] px-4 py-3 font-sans text-detail leading-[1.55] text-paper/65">
      {t(key)}
    </p>
  );
}

/**
 * Over a chapter the Hebrew stands beside: what it is, what its brackets mean
 * where it has them, and whose mappings place its verses (the Copenhagen
 * Alliance's, CC BY-SA 4.0, credited in Compare's own words).
 */
export function HebrewHeadNote({ written }: { written: boolean }) {
  const { t } = useTranslate();
  return (
    <div data-hebrew-head="" className="mb-6 font-sans">
      <p className="text-detail leading-[1.55] text-paper/65">
        {t("bible.hebrew.head")}
        {written ? <> {t("bible.hebrew.written")}</> : null}
      </p>
      <p className="mt-1 text-caption leading-[1.5] text-paper/60">{t("bible.compareCredit")}</p>
    </div>
  );
}

/** A word written in the Hebrew and read as the next one stands in brackets before it, quieter than the words read. */
export function HebrewWords({ text }: { text: string }) {
  const parts = text.split(/(\([^()]+\))/);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("(") && p.endsWith(")") ? (
          <span key={i} data-hebrew-written="" className="text-paper/60">
            {p}
          </span>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}
