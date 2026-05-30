"use client";

// Surfaces today's namedays and yearly repose anniversaries from the
// user's diptychs, on /prayers/today. Renders nothing when there's no
// match (and on the server). All data is read straight from
// localStorage; this component never hits the network.

import Link from "next/link";
import { intentionsForToday, useIntentions } from "@/lib/prayers/storage";

export function TodayDiptychs({
  heading,
  namedayLabel,
  anniversaryLabel,
}: {
  heading: string;
  namedayLabel: string;
  anniversaryLabel: string;
}) {
  // Subscribe so a change in another tab redraws.
  useIntentions("living");
  useIntentions("departed");
  const { namedays, anniversaries } = intentionsForToday();

  if (namedays.length === 0 && anniversaries.length === 0) return null;

  return (
    <section className="mt-6 rounded-lg border border-paper/12 bg-paper/[0.03] p-5">
      <div className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
        <p className="font-sans text-[11px] uppercase tracking-[1.5px] text-gold/85">
          {heading}
        </p>
        <Link
          href="/prayers/personal"
          className="font-sans text-[12px] text-paper/55 hover:text-paper transition-colors underline underline-offset-2 decoration-paper/20"
        >
          Manage diptychs →
        </Link>
      </div>
      <ul className="space-y-2">
        {namedays.map((e) => (
          <li
            key={`l-${e.id}`}
            className="font-sans text-[14px] text-paper flex items-baseline gap-2"
          >
            <span aria-hidden className="text-gold">
              ✦
            </span>
            <span className="font-semibold">{e.name}</span>
            <span className="text-paper/55 text-[12.5px]">
              · {namedayLabel}
            </span>
          </li>
        ))}
        {anniversaries.map(({ entry, years }) => (
          <li
            key={`d-${entry.id}`}
            className="font-sans text-[14px] text-paper flex items-baseline gap-2"
          >
            <span aria-hidden className="text-paper/45">
              +
            </span>
            <span className="font-semibold">{entry.name}</span>
            <span className="text-paper/55 text-[12.5px]">
              · {years}
              {years === 1 ? "st" : years === 2 ? "nd" : years === 3 ? "rd" : "th"}{" "}
              {anniversaryLabel}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
