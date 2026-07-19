"use client";

// The chronological spine: era groups and event cards along a vertical rail.
// Deliberately dumb, filtering, search, selection, and scroll restoration
// live in HistoryTimelinePage; this renders whatever it's given, identically
// on every platform. The rail + dot visual language echoes the Today page's
// MobileTimeline.
//
// Keyboard support (desktop): when `onSelect` is provided the list acts as a
// roving listbox, ↑/↓ move the selection between events, Enter opens the
// selected event's page. Hover only ever highlights; nothing essential
// hides behind it.

import { useRouter } from "next/navigation";
import type { CSSProperties, KeyboardEvent } from "react";

import type { EraGroup } from "@/lib/history/filter";
import { EraHeader } from "./EraHeader";
import { ERA_HUE } from "./eraHue";
import { EventCard } from "./EventCard";
import { useTranslate } from "@/components/i18n/MessagesProvider";

export function TimelineCore({
  groups,
  selected,
  cinematic = false,
  onSelect,
}: {
  groups: EraGroup[];
  selected?: string;
  cinematic?: boolean;
  onSelect?: (slug: string) => void;
}) {
  const { t } = useTranslate();
  const router = useRouter();
  const flat = groups.flatMap((g) => g.events);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!onSelect || flat.length === 0) return;
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Enter") return;
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
      e.key === "ArrowDown"
        ? flat[Math.min(idx + 1, flat.length - 1)]
        : flat[Math.max(idx - 1, 0)];
    onSelect(next.slug);
    document
      .getElementById(`event-${next.slug}`)
      ?.scrollIntoView({ block: "nearest" });
  };

  if (flat.length === 0) {
    return (
      <div className="rounded-lg border border-paper/10 bg-night-soft/40 px-5 py-10 text-center">
        <p className="font-serif italic text-body text-paper/60">
          {t("study.history.noEventsMatch")}
        </p>
        <p className="mt-2 font-sans text-detail text-paper/55">
          {t("study.history.tryClearing")}
        </p>
      </div>
    );
  }

  // Not a listbox: the cards contain their own buttons and links, which the
  // ARIA listbox/option pattern forbids (axe: aria-required-children). A
  // labeled, focusable group with a roving keyboard handler gives the same
  // ↑/↓+Enter behavior; the selected card announces via aria-current.
  return (
    <div
      role={onSelect ? "group" : undefined}
      aria-label={onSelect ? "Timeline events, use arrow keys to move, Enter to open" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={onKeyDown}
      className="focus:outline-none focus-visible:ring-1 focus-visible:ring-link/60 rounded-lg"
    >
      {groups.map((g) => (
        <section
          key={g.era.id}
          aria-labelledby={`era-${g.era.id}`}
          className={cinematic ? "cinema-era mb-10" : "mb-10"}
          style={
            cinematic
              ? ({ "--era-hue": ERA_HUE[g.era.id] } as CSSProperties)
              : undefined
          }
        >
          <EraHeader era={g.era} count={g.events.length} />
          {/* The rail. Cards are indented past it; markers sit on it. */}
          <div className="relative mt-4 border-l border-paper/12 pl-6 ml-[5px]">
            <ol className="space-y-4">
              {g.events.map((ev) => (
                <li key={ev.slug} aria-current={onSelect && selected === ev.slug ? "true" : undefined}>
                  <EventCard
                    event={ev}
                    selected={selected === ev.slug}
                    cinematic={cinematic}
                    onSelect={onSelect}
                  />
                </li>
              ))}
            </ol>
          </div>
        </section>
      ))}
    </div>
  );
}
