"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { startOfDayLocal } from "@/lib/calendar/orthodox";
import { useCalendarStyleDefault } from "@/lib/calendar/useCalendarStyleDefault";
import { citeOf, HOUR_IDS, metanyFor, WORDS, type HourId } from "@/lib/prayers/metanies";

export const METANY_GUIDE_HREF = "/prayers/bows";

const quoted = (text: string) => `\u201c${text}\u201d`;

const noop = () => () => {};

/**
 * Under an Hour's title: what the Church's year says of bowing today, in the
 * words of its source and beside its citation (1.9, lib/prayers/metanies.ts).
 * On a day no rule there speaks to, the plain sentence. The day is the
 * reader's own, so nothing is drawn until the page is on the device.
 */
export function MetanyLine({ hour }: { hour: string }) {
  const { t } = useTranslate();
  const [style] = useCalendarStyleDefault();
  const onDevice = useSyncExternalStore(noop, () => true, () => false);
  if (!onDevice || !(HOUR_IDS as readonly string[]).includes(hour)) return null;

  const today = metanyFor(hour as HourId, startOfDayLocal(new Date()), style);
  const quotes = today.rule ? [today.quote, ...(today.also ? [today.also] : [])] : [];

  return (
    <aside data-metany={today.rule ?? "ask"} aria-label={t(WORDS.title.key)} className="mx-auto mt-6 max-w-[52ch] text-center">
      <p className="font-sans text-ui leading-[1.6] text-paper/80">{t(today.line.key)}</p>
      {quotes.map((q) => (
        <figure key={q.text} className="mt-3">
          <blockquote lang="en" dir="ltr" className="font-serif text-ui italic leading-[1.65] text-paper/85">
            {quoted(q.text)}
          </blockquote>
          <figcaption lang="en" dir="ltr" className="mt-1 font-sans text-caption leading-[1.5] text-paper/65">
            {citeOf(q)}
          </figcaption>
        </figure>
      ))}
      <Link
        href={METANY_GUIDE_HREF}
        className="tap-press mt-1 inline-flex min-h-11 items-center gap-1 font-sans text-ui font-semibold text-paper hover:underline hover:underline-offset-4"
      >
        {t(WORDS.open.key)}
        <ChevronRight size={15} className="text-paper/60 rtl:-scale-x-100" />
      </Link>
    </aside>
  );
}
