"use client";

// One event on the timeline rail. Collapsed: date, title, one-line preview,
// category + certainty labels. Tap expands an animated preview (summary +
// "Read the full account"); the expansion is a pure-CSS grid-rows
// transition, so no layout is measured in JS and reduced-motion swaps it
// for an instant toggle.
//
// mode="navigate" (phones): the expanded card's CTA opens the event page.
// mode="select" (tablet landscape / desktop): tapping the card also feeds
// the context rail; Enter or the CTA opens the full page.
//
// Cinematic (Plus): when `cinematic` is set and the event carries
// rights-verified artwork, the card opens with a slow Ken Burns hero and
// prints the work's attribution and license on the image. Free users never
// receive this layer; the card below it is identical either way.

import Link from "next/link";
import { useId, useState } from "react";

import {
  categoryById,
  certaintyById,
  type HistoryEventMeta,
} from "@/lib/history/events";
import { cn } from "@/lib/cn";

export function EventCard({
  event,
  selected = false,
  cinematic = false,
  onSelect,
}: {
  event: HistoryEventMeta;
  selected?: boolean;
  cinematic?: boolean;
  onSelect?: (slug: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const regionId = useId();
  const certainty = certaintyById(event.certainty);
  const showHero = cinematic && Boolean(event.media);

  return (
    <div
      id={`event-${event.slug}`}
      data-event-slug={event.slug}
      className={cn(
        "history-cv relative scroll-mt-36 rounded-lg border bg-night-soft/60 transition-colors",
        selected ? "border-paper/35" : "border-paper/10",
        showHero && "cinema-card overflow-hidden",
      )}
    >
      {/* Marker dot sits on the rail drawn by TimelineCore. */}
      <span
        aria-hidden
        className={cn(
          "history-marker-in absolute -left-[23px] top-6 h-[11px] w-[11px] rounded-full",
          event.importance === 1
            ? "bg-crimson"
            : "border border-paper/35 bg-night",
        )}
      />

      {showHero && event.media ? (
        <div className="relative h-44 overflow-hidden md:h-56">
          {/* eslint-disable-next-line @next/next/no-img-element -- bundled
              asset in a static-export (Android) route; next/image's
              optimizer is unavailable there and these load lazily. */}
          <img
            src={event.media.hero}
            alt={event.media.alt}
            loading="lazy"
            decoding="async"
            className="cinema-kenburns absolute inset-0 h-full w-full object-cover"
          />
          {/* Scrim so the card text below never fights the artwork. */}
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-night-soft via-night/25 to-night/10"
          />
          <p className="absolute bottom-2 right-3 max-w-[85%] truncate text-right font-sans text-[10px] leading-tight text-paper/75">
            {event.media.work} · {event.media.artist} · {event.media.license}
          </p>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          onSelect?.(event.slug);
        }}
        aria-expanded={open}
        aria-controls={regionId}
        className={cn(
          "press-card block w-full min-h-[48px] px-4 py-4 text-left",
          showHero ? "rounded-b-lg" : "rounded-lg",
        )}
      >
        <p className="font-sans text-caption font-semibold uppercase tracking-[1.4px] text-paper/60">
          {event.displayDate}
          {event.region ? (
            <span className="normal-case tracking-normal text-paper/55"> · {event.region}</span>
          ) : null}
        </p>
        <h3 className="mt-1.5 font-heading text-title-sm text-paper leading-snug">
          {event.title}
        </h3>
        <p className="mt-1.5 font-serif text-detail text-paper/65 leading-[1.6]">
          {event.preview}
        </p>
        <p className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          {event.categories.slice(0, 3).map((c) => (
            <span
              key={c}
              className="rounded-pill bg-paper/[0.06] px-2 py-0.5 font-sans text-eyebrow uppercase tracking-[1px] text-paper/60"
            >
              {categoryById(c).label}
            </span>
          ))}
          <span className="font-sans text-eyebrow uppercase tracking-[1px] text-paper/55">
            {certainty.label}
          </span>
        </p>
      </button>

      <div id={regionId} className="history-expand" data-open={open} aria-hidden={!open}>
        <div>
          <div className="px-4 pb-4">
            <p className="border-t border-paper/10 pt-3 font-serif text-ui text-paper/80 leading-[1.7]">
              {event.summary}
            </p>
            <Link
              href={`/history/${event.slug}`}
              tabIndex={open ? 0 : -1}
              className="tap-press mt-3 inline-flex min-h-[44px] items-center gap-1.5 rounded-md border border-paper/20 px-4 font-sans text-ui font-semibold text-paper hover:border-paper/40"
            >
              Read the full account
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
