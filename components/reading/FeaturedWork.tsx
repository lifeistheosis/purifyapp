"use client";

import Link from "next/link";

import { WorkCover } from "@/components/covers/WorkCover";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import { eraKey, traditionKey } from "@/lib/reading/catalog";
import { cardHref, type Card } from "@/lib/reading/select";

import { readingTime } from "./CoverRow";

/**
 * The book at the top of the room (1.7, the owner's note 18): its cover
 * held up, its title in Lora, the saint with his icon, one line of facts,
 * what it is, and Start reading. Chosen on the device for the reader's own
 * day (lib/reading/select.ts, featuredFor): the book of the saint the Church
 * keeps today, else one for the season, else one for the week.
 *
 * Until the day is known the box keeps its size and shows nothing, so the
 * rows under it never move and no other book flashes in its place first.
 * On a tablet and a computer the cover stands beside the words.
 */
export function FeaturedWork({
  card,
  blurb,
  first,
  feast,
}: {
  /** Null until the reader's day is known. */
  card: Card | null;
  blurb: string;
  /** The work's first section, where Start reading opens. */
  first: number;
  /** Chosen for the saint kept today. */
  feast: boolean;
}) {
  const { t } = useTranslate();
  const author = card?.author ?? t("reading.work.anonymous");
  const facts = card
    ? [
        card.selections ? t("reading.work.selections") : null,
        readingTime(card.minutes, t),
        card.era ? t(eraKey(card.era)) : null,
        card.traditions[0] ? t(traditionKey(card.traditions[0])) : null,
      ].filter(Boolean)
    : [];

  return (
    <section
      aria-labelledby={card ? "featured-title" : undefined}
      data-featured={card ? card.key : "pending"}
      className={cn(
        "mt-6 flex min-h-[476px] flex-col items-center text-center md:mt-8 md:min-h-[330px] md:flex-row md:items-start md:gap-9 md:text-start",
        !card && "invisible",
      )}
    >
      {card ? (
        <>
          <Link href={cardHref(card)} prefetch={false} tabIndex={-1} aria-hidden className="press-card shrink-0 rounded-[8px]">
            <WorkCover
              title={card.title}
              author={author}
              iconUrl={card.cover?.src}
              focusY={card.cover?.focusY}
              size="hero"
              priority
              className="shadow-[0_24px_60px_-24px_rgba(0,0,0,0.75)]"
            />
          </Link>
          <div className="mt-5 flex min-w-0 max-w-[520px] flex-col items-center md:mt-1 md:items-start">
            {feast ? <p className="font-sans text-caption font-medium text-paper/55">{t("reading.featured.feast")}</p> : null}
            <h2 id="featured-title" className={cn("text-title-sm font-semibold leading-[1.15] tracking-[-0.01em] text-paper text-balance md:text-title", feast && "mt-1.5")}>
              <Link href={cardHref(card)} prefetch={false} className="hover:underline hover:underline-offset-4">
                {card.title}
              </Link>
            </h2>
            <p className="mt-2 flex items-center gap-2 font-sans text-ui text-paper/75">
              {card.cover ? <RoundIcon src={card.cover.src} focusY={card.cover.focusY} /> : null}
              <span className="min-w-0 truncate">{author}</span>
            </p>
            <p className="mt-1.5 font-sans text-caption text-paper/50">{facts.join(" · ")}</p>
            {blurb ? (
              <p lang="en" className="mt-3 line-clamp-3 max-w-[46ch] font-sans text-detail leading-[1.55] text-paper/70">
                {blurb}
              </p>
            ) : null}
            <Link
              href={`${cardHref(card)}#s${first}`}
              prefetch={false}
              className="tap-press mt-5 inline-flex h-12 items-center rounded-pill bg-paper px-7 font-sans text-ui font-semibold text-night hover:bg-paper/90"
            >
              {t("reading.work.start")}
            </Link>
          </div>
        </>
      ) : null}
    </section>
  );
}

/**
 * The saint beside his name: the cover's own picture, small and round. A
 * picture that cannot load (the apps with no signal) is taken away rather
 * than drawn broken.
 */
export function RoundIcon({ src, focusY, className }: { src: string; focusY: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- the same picture the cover shows, round.
    <img
      src={src}
      alt=""
      aria-hidden
      decoding="async"
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
      className={cn("size-6 shrink-0 rounded-full object-cover ring-1 ring-paper/15", className)}
      style={{ objectPosition: `50% ${focusY}%` }}
    />
  );
}
