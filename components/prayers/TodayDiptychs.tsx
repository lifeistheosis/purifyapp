"use client";

// Surfaces today's namedays and yearly repose anniversaries from the
// user's diptychs, on /prayers/today. Renders nothing when there's no
// match (and on the server). All data is read straight from
// localStorage; this component never hits the network.
//
// It appears on a handful of days a year, so it is set between two hairlines
// with the names in full ink, and needs no box (1.7: no tinted card, no
// sparkle, no arrow drawn as a character).

import Link from "next/link";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { intentionsForToday, useIntentions } from "@/lib/prayers/storage";
import { TodayHeading } from "@/components/prayers/TodayHeading";

export function TodayDiptychs({
  heading,
  namedayLabel,
}: {
  heading: string;
  namedayLabel: string;
}) {
  const { t, tn } = useTranslate();
  // Subscribe so a change in another tab redraws.
  useIntentions("living");
  useIntentions("departed");
  const { namedays, anniversaries } = intentionsForToday();

  if (namedays.length === 0 && anniversaries.length === 0) return null;

  return (
    <section
      aria-labelledby="today-diptych"
      className="border-y border-paper/12 py-5"
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
        <TodayHeading id="today-diptych">
          {heading}
        </TodayHeading>
        <Link
          href="/prayers/personal"
          className="inline-flex min-h-11 items-center gap-1 rounded-sm font-sans text-caption text-paper/60 transition-colors duration-200 hover:text-paper focus-visible:outline-2 focus-visible:outline-paper focus-visible:outline-offset-4"
        >
          {t("prayers.diptychs.manage")}
          <ChevronRight size={13} className="shrink-0 rtl:-scale-x-100" />
        </Link>
      </div>
      <ul className="space-y-2">
        {namedays.map((e) => (
          <li
            key={`l-${e.id}`}
            className="flex items-baseline gap-2 font-sans text-ui text-paper"
          >
            <span className="font-semibold">{e.name}</span>
            <span className="text-caption text-paper/60">
              {"·"} {namedayLabel}
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
      </ul>
    </section>
  );
}
