"use client";

// Surfaces today's namedays and yearly repose anniversaries from the
// user's diptychs, on /prayers/today. Renders nothing when there's no
// match (and on the server). All data is read straight from
// localStorage; this component never hits the network.
//
// It appears on a handful of days a year, so it is set between two hairlines
// with the names in full ink, and needs no box (1.7: no tinted card, no
// sparkle, no arrow drawn as a character).
//
// Memorial days (1.8): the third, ninth and fortieth days after a falling
// asleep, and the Saturdays of the Souls, when the Church prays for all the
// departed and the reader's own are named under it. On the apps' Today too.

import Link from "next/link";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import { intentionsForToday, useIntentions } from "@/lib/prayers/storage";
import { useMounted } from "@/lib/useMounted";
import { TodayHeading } from "@/components/prayers/TodayHeading";

const MEMORIAL_KEY = {
  3: "prayers.today.memorial3",
  9: "prayers.today.memorial9",
  40: "prayers.today.memorial40",
} as const;

export function TodayDiptychs({
  heading,
  namedayLabel,
  className,
}: {
  heading?: string;
  namedayLabel?: string;
  className?: string;
}) {
  const { t, tn } = useTranslate();
  // Subscribe so a change in another tab redraws.
  useIntentions("living");
  useIntentions("departed");
  // The lists are the device's: nothing to show until the page is the reader's.
  const mounted = useMounted();
  const { namedays, anniversaries, memorials, soulSaturday } = intentionsForToday();

  if (!mounted) return null;
  if (namedays.length === 0 && anniversaries.length === 0 && memorials.length === 0 && !soulSaturday) return null;

  return (
    <section
      aria-labelledby="today-diptych"
      className={cn("border-y border-paper/12 py-5", className)}
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
        <TodayHeading id="today-diptych">
          {heading ?? t("prayers.today.diptychHeading")}
        </TodayHeading>
        <Link
          href="/prayers/personal"
          className="inline-flex min-h-11 items-center gap-1 rounded-sm font-sans text-caption text-paper/60 transition-colors duration-200 hover:text-paper focus-visible:outline-2 focus-visible:outline-paper focus-visible:outline-offset-4"
        >
          {t("prayers.diptychs.manage")}
          <ChevronRight size={13} className="shrink-0 rtl:-scale-x-100" />
        </Link>
      </div>
      {soulSaturday ? (
        <p className="mb-3 font-serif text-ui leading-[1.5] text-paper/80">{t("prayers.today.soulSaturday")}</p>
      ) : null}
      <ul className="space-y-2">
        {namedays.map((e) => (
          <li
            key={`l-${e.id}`}
            className="flex items-baseline gap-2 font-sans text-ui text-paper"
          >
            <span className="font-semibold">{e.name}</span>
            <span className="text-caption text-paper/60">
              {"·"} {namedayLabel ?? t("prayers.today.namedayNote")}
            </span>
          </li>
        ))}
        {memorials.map(({ entry, day }) => (
          <li
            key={`m-${entry.id}`}
            className="flex items-baseline gap-2 font-sans text-ui text-paper"
          >
            <span className="font-semibold">{entry.name}</span>
            <span className="text-caption text-paper/60">
              {"·"} {t(MEMORIAL_KEY[day])}
            </span>
          </li>
        ))}
        {anniversaries.map(({ entry, years }) => (
          <li
            key={`d-${entry.id}`}
            className="flex items-baseline gap-2 font-sans text-ui text-paper"
          >
            <span className="font-semibold">{entry.name}</span>
            {/* The ordinal used to be built inline as "st"/"nd"/"rd"/"th",
                in all 21 locales. A plural key says the same thing and
                translates. */}
            <span className="text-caption text-paper/60">
              {"·"} {tn("prayers.today.anniversaryYears", years)}
            </span>
          </li>
        ))}
        {/* On a Saturday of the Souls, every one of the reader's departed
            not already named above. */}
        {soulSaturday
          ? soulSaturday.departed
              .filter((e) => !memorials.some((m) => m.entry.id === e.id) && !anniversaries.some((a) => a.entry.id === e.id))
              .map((e) => (
                <li key={`s-${e.id}`} className="font-sans text-ui font-semibold text-paper">
                  {e.name}
                </li>
              ))
          : null}
      </ul>
    </section>
  );
}
