"use client";

// The rail beside the line on a tablet held sideways and a computer: the
// chosen event's picture, its date and place, how sure the account is, its
// summary and the saints and councils it touches, and the way to the full
// account. The registry alone; the account itself is on the event's page.
// No box (1.7): a column of its own, parted from the line by space.

import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { COUNCILS } from "@/lib/councils/councils";
import { eventBySlug } from "@/lib/history/events";
import { certaintyGloss, certaintyLabel, eraLabel } from "@/lib/history/labels";
import { eventPicture } from "@/lib/history/media";
import { isNativeClient } from "@/lib/platform/native";
import { getSaint } from "@/lib/saints/saints";

import { EventPlate } from "./EventPlate";

export function EventContextRail({ selected }: { selected?: string }) {
  const { t } = useTranslate();
  const event = selected ? eventBySlug(selected) : undefined;

  if (!event) {
    return (
      <div className="pt-2">
        <p className="font-sans text-caption font-semibold text-paper/60">{t("study.context")}</p>
        <p className="mt-2 font-sans text-detail leading-[1.6] text-paper/60">{t("study.selectAnEventOnThe")}</p>
      </div>
    );
  }

  const picture = eventPicture(event, isNativeClient());
  const saints = (event.rel?.saints ?? [])
    .map((s) => ({ slug: s, saint: getSaint(s) }))
    .filter((x) => x.saint)
    .slice(0, 5);
  const councils = (event.rel?.councils ?? [])
    .map((c) => COUNCILS.find((x) => x.slug === c))
    .filter((c): c is (typeof COUNCILS)[number] => Boolean(c))
    .slice(0, 3);

  return (
    <div className="pt-2">
      {picture ? <EventPlate key={event.slug} picture={picture} className="mb-5" /> : null}
      <p className="font-sans text-caption font-semibold text-paper/60">{eraLabel(t, event.era)}</p>
      <h3 className="mt-1.5 text-title-sm leading-snug text-paper">{event.title}</h3>
      <p className="mt-1 font-sans text-detail text-paper/60 tabular-nums">
        {event.displayDate}
        {event.region ? ` · ${event.region}` : ""}
      </p>
      <p className="mt-3 font-sans text-caption leading-[1.5] text-paper/60">
        <span className="font-semibold text-paper/80">{certaintyLabel(t, event.certainty)}.</span>{" "}
        {certaintyGloss(t, event.certainty)}
      </p>
      <p className="mt-4 font-sans text-detail leading-[1.65] text-paper/80">{event.summary}</p>

      {saints.length || councils.length ? (
        <div className="mt-5 border-t border-paper/10 pt-4">
          <p className="font-sans text-caption font-semibold text-paper/60">{t("study.connected")}</p>
          <ul className="mt-2 space-y-1.5">
            {councils.map((c) => (
              <li key={c.slug}>
                <Link href={`/councils/${c.slug}`} className="font-sans text-detail text-link underline-offset-4 hover:underline">
                  {c.name}
                </Link>
              </li>
            ))}
            {saints.map((s) => (
              <li key={s.slug}>
                <Link href={`/saints/${s.slug}`} className="font-sans text-detail text-link underline-offset-4 hover:underline">
                  {s.saint!.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Link
        href={`/history/${event.slug}`}
        className="tap-press mt-6 flex min-h-12 w-full items-center justify-center gap-1.5 rounded-pill bg-paper px-5 font-sans text-ui font-semibold text-night focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
      >
        {t("study.history.readFullAccount")}
        <ChevronRight size={15} className="shrink-0 rtl:-scale-x-100" />
      </Link>
    </div>
  );
}
