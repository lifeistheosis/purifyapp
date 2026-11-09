"use client";

import Link from "next/link";

import type { HistoryEventMeta } from "@/lib/history/events";
import { eventPicture } from "@/lib/history/media";
import { isNativeClient } from "@/lib/platform/native";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ArrivingImage } from "@/components/ui/ArrivingImage";

/**
 * This day in Church history (1.9, U9; his yes of 2026-11-09 to "one card
 * under the day's saints, with the event's picture, on the days an event
 * falls on exactly"): a band in the Church's day, the saint's band's own
 * shape, with the event's picture where the saint's face stands. The day is
 * found by lib/history/onThisDay.ts; on most days there is none, and nothing
 * is drawn.
 *
 * The date line says "commemorated today" for a day the Church keeps (the
 * Prayers page's card has always said so), and the picture carries its
 * credit, as the Seven Councils' pictures do on Theology; the event's page
 * prints it whole under its plate.
 */
export function HistoryDayBand({ event }: { event: HistoryEventMeta }) {
  const { t } = useTranslate();
  const picture = eventPicture(event, isNativeClient());
  const kept = event.calendar && event.calendar.basis !== "gregorian";
  return (
    <Link
      href={`/history/${event.slug}`}
      data-today-band="history"
      className="press-card relative block min-h-[124px] w-full overflow-hidden rounded-[18px] bg-night-deep text-start"
    >
      {picture ? (
        <>
          <span aria-hidden className="pointer-events-none absolute inset-y-0 end-0 w-[54%] overflow-hidden">
            {picture.preview ? (
              <span className="absolute inset-0 scale-110 bg-cover bg-center blur-md" style={{ backgroundImage: `url(${picture.preview})` }} />
            ) : null}
            <ArrivingImage
              src={picture.src}
              title={picture.credit}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition: picture.focus ?? "50% 35%" }}
            />
          </span>
          <span aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-r from-night-deep from-[46%] to-transparent to-[76%] rtl:bg-gradient-to-l" />
        </>
      ) : null}
      <span className={picture ? "relative block max-w-[64%] px-4 py-3.5" : "relative block px-4 py-3.5"}>
        <span className="block font-sans text-caption font-semibold text-paper/55">{t("study.history.onThisDay")}</span>
        <span className="mt-0.5 block font-heading text-lede font-bold leading-tight text-paper">{event.title}</span>
        <span className="mt-1 block font-sans text-caption leading-snug text-paper/55">
          {event.displayDate}
          {kept ? ` ${t("study.commemoratedToday")}` : null}
        </span>
      </span>
    </Link>
  );
}
