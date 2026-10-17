"use client";

// The timeline itself (1.7, the owner's note 20 of 2026-10-16): one quiet
// line in the page's own ink, down the whole of the Church's history, a drawn
// mark on it for each event, and each era's name pinned under the bar while
// its events pass. No colour per era and no box around an event.
//
// Deliberately dumb: filtering, search, choosing and the scroll restore live
// in HistoryTimelinePage; this draws what it is given, the same on every
// platform.
//
// Keyboard (a computer): when `onSelect` is given the list is a roving group,
// the up and down arrows move the choice between events and Enter opens the
// chosen one's page.

import { useRouter } from "next/navigation";
import type { KeyboardEvent } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import type { EraGroup } from "@/lib/history/filter";

import { EraHeader } from "./EraHeader";
import { EventRow } from "./EventRow";

export function TimelineCore({
  groups,
  selected,
  onOpen,
  onSelect,
  onOpenEras,
  onClearFilters,
}: {
  groups: EraGroup[];
  /** The event chosen for the rail (a computer). */
  selected?: string;
  /** A row's plain tap: the peek sheet on a phone, the rail on a computer. */
  onOpen?: (slug: string) => void;
  /** Arrow keys on a computer. */
  onSelect?: (slug: string) => void;
  onOpenEras?: () => void;
  onClearFilters?: () => void;
}) {
  const { t } = useTranslate();
  const router = useRouter();
  const flat = groups.flatMap((g) => g.events);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!onSelect || flat.length === 0) return;
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Enter") return;
    // Enter on a row's own link is the link's.
    if (e.key === "Enter" && e.target !== e.currentTarget) return;
    const idx = flat.findIndex((ev) => ev.slug === selected);
    if (e.key === "Enter") {
      if (idx >= 0) {
        e.preventDefault();
        router.push(`/history/${flat[idx].slug}`);
      }
      return;
    }
    e.preventDefault();
    const next =
      e.key === "ArrowDown" ? flat[Math.min(idx + 1, flat.length - 1)] : flat[Math.max(idx - 1, 0)];
    onSelect(next.slug);
    document.getElementById(`event-${next.slug}`)?.scrollIntoView({ block: "nearest" });
  };

  if (flat.length === 0) {
    return (
      <div className="py-12">
        <p className="font-sans text-body text-paper/75">{t("study.history.noEventsMatch")}</p>
        <p className="mt-1 font-sans text-detail text-paper/55">{t("study.history.tryClearing")}</p>
        {onClearFilters ? (
          <button
            type="button"
            onClick={onClearFilters}
            className="tap-press mt-5 inline-flex min-h-11 items-center rounded-pill border border-paper/20 px-5 font-sans text-ui font-semibold text-paper hover:border-paper/40"
          >
            {t("study.history.clearAll")}
          </button>
        ) : null}
      </div>
    );
  }

  // A labelled, focusable group with a roving handler, not a listbox: each
  // row holds its own link, which the listbox pattern forbids.
  return (
    <div
      role={onSelect ? "group" : undefined}
      aria-label={onSelect ? t("study.history.timelineLabel") : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={onKeyDown}
      className="relative rounded-[12px] focus:outline-none focus-visible:ring-1 focus-visible:ring-link/60"
    >
      {/* The one line, from the first era to the last. An era's pinned name
          is solid night and stands over it. */}
      <span aria-hidden className="absolute inset-y-0 start-[6px] w-px bg-paper/12" />
      {groups.map((g) => (
        <section key={g.era.id} aria-labelledby={`era-${g.era.id}`} className="history-era relative pb-6">
          <EraHeader era={g.era} count={g.events.length} onOpenEras={onOpenEras} />
          <ol>
            {g.events.map((ev) => (
              <EventRow key={ev.slug} event={ev} selected={selected === ev.slug} onOpen={onOpen} />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
