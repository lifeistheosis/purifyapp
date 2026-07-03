"use client";

// The selected-event context pane (tablet-landscape two-pane and desktop
// three-column layouts). Registry metadata only — the full narrative stays
// on the event page; this pane is for scanning and deciding to go deeper.

import Link from "next/link";

import { COUNCILS } from "@/lib/councils/councils";
import { getSaint } from "@/lib/saints/saints";
import {
  categoryById,
  eraById,
  eventBySlug,
} from "@/lib/history/events";
import { CertaintyBadge } from "./CertaintyBadge";

export function EventContextRail({ selected }: { selected?: string }) {
  const event = selected ? eventBySlug(selected) : undefined;

  if (!event) {
    return (
      <div className="rounded-lg border border-paper/10 bg-night-soft/40 px-5 py-8">
        <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/40">
          Context
        </p>
        <p className="mt-3 font-serif italic text-detail text-paper/50 leading-[1.6]">
          Select an event on the timeline to see its context, certainty, and
          connections here.
        </p>
      </div>
    );
  }

  const era = eraById(event.era);
  const saints = (event.rel?.saints ?? [])
    .map((s) => ({ slug: s, saint: getSaint(s) }))
    .filter((x) => x.saint)
    .slice(0, 5);
  const councils = (event.rel?.councils ?? [])
    .map((c) => COUNCILS.find((x) => x.slug === c))
    .filter(Boolean)
    .slice(0, 3);

  return (
    <div className="rounded-lg border border-paper/12 bg-night-soft/50 px-5 py-5">
      <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/40">
        {era.label}
      </p>
      <h3 className="mt-2 font-heading text-title-sm text-paper leading-snug">
        {event.title}
      </h3>
      <p className="mt-1 font-sans text-detail text-paper/55">
        {event.displayDate}
        {event.region ? ` · ${event.region}` : ""}
      </p>
      <CertaintyBadge certainty={event.certainty} withGloss className="mt-3" />
      <p className="mt-4 font-serif text-detail text-paper/75 leading-[1.65]">
        {event.summary}
      </p>
      <p className="mt-3 flex flex-wrap gap-1.5">
        {event.categories.map((c) => (
          <span
            key={c}
            className="rounded-pill bg-paper/[0.06] px-2 py-0.5 font-sans text-eyebrow uppercase tracking-[1px] text-paper/50"
          >
            {categoryById(c).label}
          </span>
        ))}
      </p>

      {saints.length || councils.length ? (
        <div className="mt-5 border-t border-paper/10 pt-4">
          <p className="font-sans text-caption uppercase tracking-[1.4px] text-paper/40">
            Connected
          </p>
          <ul className="mt-2 space-y-1">
            {councils.map((c) => (
              <li key={c!.slug}>
                <Link
                  href={`/councils/${c!.slug}`}
                  className="font-serif text-detail text-link hover:underline underline-offset-4"
                >
                  {c!.name}
                </Link>
              </li>
            ))}
            {saints.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/saints/${s.slug}`}
                  className="font-serif text-detail text-link hover:underline underline-offset-4"
                >
                  {s.saint!.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Link
        href={`/history/${event.slug}`}
        className="tap-press mt-5 inline-flex min-h-[44px] w-full items-center justify-center rounded-md border border-paper/20 px-4 font-sans text-ui font-semibold text-paper hover:border-paper/40"
      >
        Open the full account →
      </Link>
    </div>
  );
}
