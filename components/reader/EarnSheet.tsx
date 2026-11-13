"use client";

// What is left to read for a palette earned by reading (build 95 note 27):
// a tap on its card opens this, and each thing still to read is a door to it.
// Until then the card opened one long line under its row.
//
// The house sheet. The councils' names come with the sheet, not with every
// screen that shows the card: lib/councils/councils.ts is asked for only once
// the Councils sheet is open.

import Link from "next/link";
import { useEffect, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { EarnMarks } from "@/components/reader/EarnMarks";
import { useEarnedPalettes, useEarnedSoFar } from "@/components/reader/useEarnedPalettes";
import { Check } from "@/components/ui/icons/Check";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { Sheet } from "@/components/ui/Sheet";
import { CAPPADOCIANS, CAPPADOCIAN_FACES, COUNCIL_PAGES, type EarnedPalettes } from "@/lib/reader/earned";

type CouncilName = { slug: string; byname: string; year: number };

const FATHER_NAMES: Record<(typeof CAPPADOCIANS)[number], string> = {
  "basil-the-great": "earn.basil",
  "gregory-theologian": "earn.gregoryTheologian",
  "gregory-of-nyssa": "earn.gregoryOfNyssa",
};

export function EarnSheet({ goal, locked, onClose }: { goal: keyof EarnedPalettes | null; locked: boolean; onClose: () => void }) {
  const { t } = useTranslate();
  const earned = useEarnedPalettes();
  const sofar = useEarnedSoFar();
  const [councils, setCouncils] = useState<readonly CouncilName[] | null>(null);
  const wanted = goal === "councils" && !councils;
  useEffect(() => {
    if (!wanted) return;
    let live = true;
    void import("@/lib/councils/councils").then(({ COUNCILS }) => {
      if (!live) return;
      const by = new Map(COUNCILS.map((c) => [c.slug, c]));
      setCouncils(COUNCIL_PAGES.flatMap((slug) => (by.get(slug) ? [{ slug, byname: by.get(slug)!.byname, year: by.get(slug)!.year }] : [])));
    });
    return () => {
      live = false;
    };
  }, [wanted]);

  if (!goal) return null;
  const progress = earned[goal];
  const title = t(goal === "councils" ? "settings.paletteCouncils" : "settings.paletteCappadocian");
  return (
    <Sheet open onClose={onClose} title={title} desktop bodyClassName="earn-sheet">
      <div className="earn-sheet-head">
        <p className="earn-sheet-line">{t(goal === "councils" ? "earn.councilsLine" : "earn.cappadocianLine")}</p>
        <div className="earn-sheet-marks" data-goal={goal}>
          <EarnMarks goal={goal} progress={progress} />
          <span className="earn-sheet-count">{t("earn.readCount", { count: progress.read, total: progress.of })}</span>
        </div>
      </div>
      <ul className="earn-doors" data-earn-doors={goal}>
        {goal === "councils"
          ? (councils ?? []).map((c) => {
              const read = sofar.councils.includes(c.slug);
              // "Read", or the year, unless the council's name already says it ("Council of Antioch (268)").
              const year = String(c.year);
              const line = read ? t("earn.read") : c.byname.includes(year) ? null : year;
              return (
                <li key={c.slug}>
                  <Link href={`/councils/${c.slug}/`} onClick={onClose} className="earn-door" data-read={read ? "" : undefined}>
                    <span className="earn-door-words">
                      <span lang="en" dir="ltr" className="earn-door-name">{c.byname}</span>
                      {line ? <span className="earn-door-line">{line}</span> : null}
                    </span>
                    {read ? <Check size={18} className="earn-door-mark" /> : <ChevronRight size={18} className="earn-door-mark rtl:-scale-x-100" />}
                  </Link>
                </li>
              );
            })
          : CAPPADOCIANS.map((saint) => {
              const read = sofar.fathers.includes(saint);
              return (
                <li key={saint}>
                  <Link href={`/saints/${saint}/`} onClick={onClose} className="earn-door" data-read={read ? "" : undefined}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- a 44px face the apps carry */}
                    <img src={CAPPADOCIAN_FACES[saint]} alt="" decoding="async" className="earn-door-face" />
                    <span className="earn-door-words">
                      <span className="earn-door-name">{t(FATHER_NAMES[saint])}</span>
                      <span className="earn-door-line">{read ? t("earn.read") : t("earn.oneWork")}</span>
                    </span>
                    {read ? <Check size={18} className="earn-door-mark" /> : <ChevronRight size={18} className="earn-door-mark rtl:-scale-x-100" />}
                  </Link>
                </li>
              );
            })}
      </ul>
      {/* Plus is never promised to every reader: a reader without it is told before they read for it. */}
      {locked ? <p className="earn-sheet-plus">{t("settings.palettePlusNote")}</p> : null}
    </Sheet>
  );
}
