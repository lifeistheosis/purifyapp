"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import { WorkCover } from "@/components/covers/WorkCover";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { ScrollRail } from "@/components/ui/ScrollRail";
import { cn } from "@/lib/cn";
import { cardHref, type Card, type TileCard } from "@/lib/reading/select";

type T = (key: string, replacements?: Record<string, string | number>) => string;

/** "12 min", "2 h 15 min": the house's 180 words a minute. */
export function readingTime(minutes: number, t: T): string {
  if (minutes < 60) return t("today.minRead", { count: minutes });
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? t("reading.work.hours", { h }) : t("reading.work.hoursMinutes", { h, m });
}

/** A card's quiet line: how long, and "Selections" for an excerpt. */
export function cardMeta(card: Pick<Card, "minutes" | "selections">, t: T): string {
  return [card.selections ? t("reading.work.selections") : null, readingTime(card.minutes, t)].filter(Boolean).join(" · ");
}

/** Whether a row is about to be seen, so its covers load before they are swiped to. */
const RowNear = createContext(false);

/**
 * One row of the reading room (1.7, the owner's note 18: "browsing by
 * swiping through rows"): its name, a See all where the row is a cut of a
 * longer list, and the covers sideways (components/ui/ScrollRail.tsx: no
 * scrollbar, the row fades where it goes on, arrows for a mouse). On a
 * 390px phone three covers and the edge of a fourth show, so the row reads
 * as one to swipe. The heading is the row's h2 (set in Lora by the global
 * heading rule).
 *
 * Its covers' pictures are asked for once the row comes within a screen of
 * being seen, all of them and not only the three on screen (1.7.1: the owner
 * saw pictures arrive "sporadically" in the app). Chromium already loads a
 * lazy picture sideways in a row near the screen; this is for a web view
 * that waits until it is scrolled to. `eager` is a row at the top of the
 * room, whose pictures load with the page.
 */
export function CoverRow({
  id,
  title,
  seeAll,
  eager = false,
  children,
  className,
}: {
  id: string;
  title: ReactNode;
  /** Where the whole list is: the room's search, filtered. */
  seeAll?: string;
  /** A row the room opens on: its pictures load at once. */
  eager?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const { t } = useTranslate();
  const section = useRef<HTMLElement>(null);
  const [near, setNear] = useState(eager);
  useEffect(() => {
    const el = section.current;
    if (near || !el || typeof IntersectionObserver === "undefined") return;
    const watch = new IntersectionObserver(
      (seen) => {
        if (seen.some((e) => e.isIntersecting)) {
          setNear(true);
          watch.disconnect();
        }
      },
      { rootMargin: "100% 0px" },
    );
    watch.observe(el);
    return () => watch.disconnect();
  }, [near]);
  return (
    <RowNear.Provider value={near}>
      <section ref={section} aria-labelledby={`row-${id}`} data-reading-row={id} data-near={near ? "" : undefined} className={cn("mt-9 md:mt-11", className)}>
        <div className="flex items-baseline justify-between gap-4">
          <h2 id={`row-${id}`} className="min-w-0 text-[19px] font-semibold leading-tight tracking-[-0.01em] text-paper md:text-title-sm">
            {title}
          </h2>
          {seeAll ? (
            <Link
              href={seeAll}
              prefetch={false}
              className="tap-press hit-44 inline-flex shrink-0 items-center gap-0.5 font-sans text-detail font-medium text-paper/60 hover:text-paper"
            >
              {t("common.seeAll")}
              <ChevronRight size={14} className="rtl:-scale-x-100" />
            </Link>
          ) : null}
        </div>
        <ScrollRail
          as="ul"
          label={typeof title === "string" ? title : undefined}
          snap
          className="-mx-5 mt-3.5 md:-mx-8"
          trackClassName="gap-2.5 px-5 scroll-px-5 pb-1 md:gap-3.5 md:px-8 md:scroll-px-8"
        >
          {children}
        </ScrollRail>
      </section>
    </RowNear.Provider>
  );
}

/**
 * A book on a row: its cover, then one or two quiet lines (what the row
 * names it, how long it is). The whole tile is the link, named by the title
 * and the author; the cover itself is hidden from assistive technology.
 *
 * The cover waits for its picture in the page's own colour and arrives whole
 * (1.8, the owner's note 13 of build 80: the room's pictures popped in), so a
 * row fills with posters and never with grey boxes that pictures land on
 * (components/covers/WorkCover.tsx, `hold`).
 */
export function CoverTile({
  card,
  href,
  label,
  meta,
  progress,
  priority,
}: {
  card: TileCard;
  href?: string;
  /** The row's name for it: a passion, "Book 8". */
  label?: string;
  meta?: string;
  /** How far the reader is, from 0 to 1, drawn as a thin track under the cover. */
  progress?: number;
  priority?: boolean;
}) {
  const { t } = useTranslate();
  const near = useContext(RowNear);
  const author = card.author ?? t("reading.work.anonymous");
  // The link's name: the cover that carries the words is hidden from assistive technology.
  const name = [card.title, author].join(", ");
  return (
    <li className="w-[112px] md:w-[148px]">
      {/* No prefetch: a row scrolled past would fetch every work, and on the
          website a work's page carries its whole text. */}
      <Link href={href ?? cardHref(card)} prefetch={false} className="press-card group block rounded-[6px]">
        <span className="sr-only">{name}</span>
        <WorkCover
          title={card.title}
          author={author}
          iconUrl={card.cover?.src}
          focusY={card.cover?.focusY}
          size="row"
          priority={priority}
          eager={near}
          hold="self"
        />
        {progress !== undefined ? (
          <span aria-hidden className="mt-2 block h-[2px] overflow-hidden rounded-full bg-paper/15">
            <span className="block h-full rounded-full bg-paper/80" style={{ width: `${Math.max(4, Math.round(progress * 100))}%` }} />
          </span>
        ) : null}
        {label ? (
          <span data-tile-label="" className="mt-2 block truncate font-sans text-detail font-semibold text-paper/90">
            {label}
          </span>
        ) : null}
        {meta ? (
          <span className={cn("block truncate font-sans text-caption text-paper/55", label ? "mt-0.5" : "mt-2")}>{meta}</span>
        ) : null}
      </Link>
    </li>
  );
}
