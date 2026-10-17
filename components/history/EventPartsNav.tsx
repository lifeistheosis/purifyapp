"use client";

// The row of an event's parts (1.7, the owner's note 20: "it needs better
// structure"). Every event page is in the same four parts, What happened,
// Why it matters, The people and Sources, and this row, pinned under the bar,
// names them: a tap goes to a part, and the part being read is filled. The
// whole account stays one page to read down, as history is read; the row
// is a way through it, not a switch that hides the rest.
//
// The look is the app's segmented switch (components/ui/SegmentedSwitch.tsx),
// in short words so four fit a phone. It is a list of links, not tabs: every
// part is always there. A tap moves the page and never the history, so Back
// still leaves the page. Solid, never blurred (a blurred layer over moving
// text is repainted on every frame on Android).

import { useEffect, useState, type MouseEvent } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";

export type EventPart = { id: string; labelKey: string };

export function EventPartsNav({ parts }: { parts: EventPart[] }) {
  const { t } = useTranslate();
  const [current, setCurrent] = useState(parts[0]?.id);
  const key = parts.map((p) => p.id).join(" ");

  // The part whose top has passed the foot of this row is the one being read.
  // One observer on the parts, a band one pixel tall at that line: it speaks
  // only when a part's edge crosses it, never on each frame.
  useEffect(() => {
    const ids = key.split(" ");
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    const row = document.querySelector<HTMLElement>("[data-event-parts]");
    if (!sections.length || !row || typeof IntersectionObserver === "undefined") return;
    const line = Math.round(row.getBoundingClientRect().height + (parseFloat(getComputedStyle(row).top) || 0)) + 1;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setCurrent((entry.target as HTMLElement).id);
        }
      },
      { rootMargin: `-${line}px 0px -${Math.max(0, window.innerHeight - line - 1)}px 0px`, threshold: 0 },
    );
    for (const s of sections) observer.observe(s);
    return () => observer.disconnect();
  }, [key]);

  function go(e: MouseEvent<HTMLAnchorElement>, id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    // The part's own scroll margin lands it under this row (globals.css).
    el.scrollIntoView({ block: "start" });
    setCurrent(id);
  }

  if (parts.length < 2) return null;

  return (
    <nav
      data-event-parts
      aria-label={t("study.history.partsNav")}
      className="history-era-head -mx-5 px-5 py-2 md:-mx-8 md:px-8"
    >
      <ul className="mx-auto grid max-w-[460px] grid-flow-col auto-cols-fr gap-1 rounded-pill border border-paper/10 p-1 md:mx-0">
        {parts.map((part) => {
          const on = part.id === current;
          return (
            <li key={part.id} className="min-w-0">
              <a
                href={`#${part.id}`}
                onClick={(e) => go(e, part.id)}
                aria-current={on ? "location" : undefined}
                className={cn(
                  "tap-press flex min-h-11 min-w-0 items-center justify-center truncate rounded-pill px-2 font-sans text-detail font-semibold motion-safe:transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper",
                  on ? "bg-paper text-night" : "text-paper/65 hover:text-paper",
                )}
              >
                <span className="truncate">{t(part.labelKey)}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
