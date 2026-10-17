"use client";

// One event on the timeline's line (1.7, the owner's note 20 of 2026-10-16).
//
// A row, not a card: no box, no category chips, no certainty label. Its date
// and place, its title in Lora, a two-line preview in DM Sans, and its drawn
// mark on the one line (components/ui/icons/TimelineNode.tsx). The whole row
// is the tap target.
//
// It is a real link to the event's page, so the website's timeline links
// every account for a search engine and a reader without script. A plain tap
// is caught and handed to the timeline instead: on a phone it opens the
// event's peek sheet (its picture, its summary and the way to the full
// account), on a computer it chooses the event for the rail beside the line.
// A modified click (a new tab) is left to the browser.

import Link from "next/link";
import type { MouseEvent } from "react";

import { TimelineNode } from "@/components/ui/icons/TimelineNode";
import { cn } from "@/lib/cn";
import type { HistoryEventMeta } from "@/lib/history/events";

export function EventRow({
  event,
  selected = false,
  onOpen,
}: {
  event: HistoryEventMeta;
  /** Chosen beside the rail on a computer: its mark is filled (aria-current). */
  selected?: boolean;
  onOpen?: (slug: string) => void;
}) {
  const major = event.importance === 1;

  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    if (!onOpen || e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    onOpen(event.slug);
  }

  return (
    <li
      id={`event-${event.slug}`}
      data-event-slug={event.slug}
      aria-current={selected ? "true" : undefined}
      className="history-cv relative ps-7"
    >
      {/* Level with the date line: the link's 14px of padding and half the
          caption's 18px line, less half the 13px mark. */}
      <span className="history-node absolute start-0 top-4" data-major={major ? "" : undefined}>
        <TimelineNode kind={major ? "major" : "event"} />
      </span>
      <Link
        href={`/history/${event.slug}`}
        onClick={onClick}
        className={cn(
          "tap-press -mx-2 block min-h-16 rounded-[12px] px-2 py-3.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper",
          "hover:bg-paper/[0.03] motion-safe:transition-colors",
        )}
      >
        <p className="font-sans text-caption font-semibold text-paper/60 tabular-nums">
          {event.displayDate}
          {event.region ? <span className="font-normal text-paper/50"> · {event.region}</span> : null}
        </p>
        <h3 className="mt-1 text-lede leading-snug text-paper md:text-title-sm">{event.title}</h3>
        <p className="mt-1 line-clamp-2 font-sans text-detail leading-[1.55] text-paper/65">{event.preview}</p>
      </Link>
    </li>
  );
}
