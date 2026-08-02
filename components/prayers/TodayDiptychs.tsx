"use client";

// Surfaces today's namedays and yearly repose anniversaries from the
// user's diptychs, on /prayers/today. Renders nothing when there's no
// match (and on the server). All data is read straight from
// localStorage; this component never hits the network.
//
// This keeps its box while the rest of the page loses theirs: it appears on
// a handful of days a year and has to read as an interruption when it does.

import Link from "next/link";
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
      className="rounded-lg border border-paper/12 bg-paper/[0.03] p-5"
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
        <TodayHeading id="today-diptych" tone="gold" className="tracking-[1.5px]">
          {heading}
        </TodayHeading>
        <Link
          href="/prayers/personal"
          className="rounded-sm font-sans text-caption text-paper/60 underline decoration-paper/25 underline-offset-2 transition-colors duration-200 hover:text-paper focus-visible:outline-2 focus-visible:outline-paper focus-visible:outline-offset-4"
        >
          {t("prayers.diptychs.manage")} {"→"}
        </Link>
      </div>
      <ul className="space-y-2">
        {namedays.map((e) => (
          <li
            key={`l-${e.id}`}
            className="flex items-baseline gap-2 font-sans text-ui text-paper"
          >
            <span aria-hidden className="text-gold">
              {"✦"}
            </span>
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
            <span aria-hidden className="text-paper/45">
              {"+"}
            </span>
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
