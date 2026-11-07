"use client";

// A line from the reader's own florilegium on Today (1.9, s5-07 of
// docs/1.9-build/ideas.json): one of the lines they have gathered, a different
// one each day and the same all day (lib/florilegium/todayLine.ts), with the
// gathering it is in, where it comes from, and their note under it. In the
// quiet card of the name day (NameDayCard), under the verse to say from
// memory, both of them the reader's own. Nothing while they have gathered
// nothing, and nothing until the day is known on the device.
//
// Their own words and gatherings, so shown whatever their Plus: a reader's
// gathered text is never at risk from a billing state (lib/florilegium).

import Link from "next/link";
import { useMemo } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { useToday } from "@/lib/calendar/useToday";
import { cn } from "@/lib/cn";
import { useFlorilegia } from "@/lib/florilegium/florilegium";
import { gatheringHref } from "@/lib/florilegium/href";
import { lineForDay } from "@/lib/florilegium/todayLine";
import { todayKey } from "@/lib/rhythm/dayKey";

export function FlorilegiumLineCard({ className }: { className?: string }) {
  const { t } = useTranslate();
  const today = useToday();
  const { florilegia } = useFlorilegia();
  const line = useMemo(() => (today ? lineForDay(florilegia, todayKey(today)) : null), [florilegia, today]);
  if (!line) return null;
  const { item, florilegium } = line;
  const source =
    item.kind === "scripture"
      ? { text: item.reference, href: `/bible/${item.book}/${item.chapter}#v${item.verse}` }
      : { text: item.work ? `${item.author}, ${item.work}` : item.author, href: item.href };

  return (
    <article data-florilegium-line="" className={cn("rounded-2xl border border-paper/10 bg-paper/[0.03] p-3.5", className)}>
      <h2 className="font-heading text-ui font-semibold leading-tight text-paper">{t("community.yourFlorilegium")}</h2>
      <Link
        href={gatheringHref(florilegium.id)}
        className="mt-0.5 block font-sans text-caption text-paper/60 underline-offset-4 hover:underline"
      >
        {florilegium.title}
      </Link>
      <blockquote className="mt-3 line-clamp-6 font-serif text-ui leading-[1.5] text-paper/85">{item.text}</blockquote>
      <p className="mt-2 font-sans text-caption text-paper/55">
        {source.href ? (
          <Link href={source.href} className="underline-offset-4 hover:underline">
            {source.text}
          </Link>
        ) : (
          source.text
        )}
      </p>
      {item.note ? <p className="mt-2 font-serif text-detail italic leading-[1.5] text-paper/65">{item.note}</p> : null}
    </article>
  );
}
