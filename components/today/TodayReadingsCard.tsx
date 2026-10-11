"use client";

import Link from "next/link";
import type { ReadingRef } from "@/lib/calendar/orthodox";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * Fourth card in the mobile Today timeline: the appointed readings
 * (Epistle + Gospel + OT where present), each linking into the full
 * chapter in the Bible reader.
 *
 * Row layout: small uppercase kind chip sits inline next to the
 * reference text so the two read as one phrase ("GOSPEL · Matthew
 * 11:27-30"). A chevron pushes to the far right of each row to keep
 * the tap affordance.
 *
 * `commemoration` is the reading proper to the day's saint or feast. On a
 * day the official calendar answers, the day's own readings come first and
 * this sits under them with a line saying whose it is (the owner's ruling of
 * 2026-10-10). On every other day it is empty and the card is what it was.
 */
export function TodayReadingsCard({
  readings,
  commemoration = [],
}: {
  readings: ReadingRef[];
  commemoration?: ReadingRef[];
}) {
  const { t } = useTranslate();
  const eyebrow = t("today.readingsEyebrow");
  if (!readings.length) {
    return (
      <div className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-3.5">
        <p className="font-sans text-caption text-paper/55">{eyebrow}</p>
        <p className="mt-2 font-sans text-ui text-paper/55 italic">
          {t("today.readingsEmpty")}
        </p>
      </div>
    );
  }
  const row = (r: ReadingRef, key: string) => {
    const kind =
      r.kind === "epistle"
        ? t("bible.kindEpistle")
        : r.kind === "ot"
          ? t("bible.kindOt")
          : t("bible.kindGospel");
    return (
      <li key={key}>
        <Link
          href={`/bible/${r.book}/${r.chapter}#v${r.from}`}
          className="tap-press flex items-center gap-3 py-2 group"
        >
          <span className="shrink-0 inline-flex items-center rounded-full border border-paper/15 bg-paper/[0.04] px-2 py-[1px] font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/65">
            {kind}
          </span>
          <span className="font-serif text-ui text-paper truncate flex-1 group-hover:text-gold transition-colors">
            {r.label}
          </span>
          <span
            aria-hidden
            className="shrink-0 text-paper/35 text-body group-hover:text-paper transition-colors"
          >
            ›
          </span>
        </Link>
      </li>
    );
  };
  return (
    <div className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-3.5">
      <p className="font-sans text-caption text-paper/55">{eyebrow}</p>
      <ul className="mt-2 divide-y divide-paper/8">{readings.map((r, i) => row(r, `day-${i}`))}</ul>
      {commemoration.length > 0 ? (
        <>
          <p className="mt-2 border-t border-paper/8 pt-2.5 font-sans text-caption text-paper/55">
            {t("bible.readForCommemoration")}
          </p>
          <ul className="mt-1 divide-y divide-paper/8">{commemoration.map((r, i) => row(r, `saint-${i}`))}</ul>
        </>
      ) : null}
    </div>
  );
}
