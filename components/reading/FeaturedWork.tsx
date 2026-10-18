"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type RefObject } from "react";

import { WorkCover } from "@/components/covers/WorkCover";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import { eraKey } from "@/lib/reading/catalog";
import { cardHref, type Card } from "@/lib/reading/select";

import { readingTime } from "./CoverRow";
import styles from "./room.module.css";

/**
 * The book at the top of the room (1.7, the owner's note 18), made a stage in
 * 1.8 (his note of 2026-10-17: "so it looks more cinematic"): the day's book
 * held up large on its own picture, drained of colour and dimmed behind it and
 * lit from above, then one line of facts, what it is, and Read. Chosen on the
 * device for the reader's own day (lib/reading/select.ts, featuredFor): the
 * book of the saint the Church keeps today, else one for the season, else one
 * for the week.
 *
 * As the room scrolls up over it, the book recedes and dims, the scroll
 * driving it (components/reading/room.module.css), with the app's motion
 * switch on.
 *
 * On a phone the stage is the screen's width and the poster carries the
 * title, so the heading is there for a screen reader and drawn from a
 * tablet's width up, where the poster stands beside the words. Until the day
 * is known the stage keeps its size and shows nothing, so the rows under it
 * never move and no other book flashes in its place first.
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
  /** The work's first section, where Read opens. */
  first: number;
  /** Chosen for the saint kept today. */
  feast: boolean;
}) {
  const { t } = useTranslate();
  const stage = useRef<HTMLElement>(null);
  // The backdrop picture, until it fails: the apps with no signal ask the
  // website for it in vain, and a broken picture is taken away, never drawn.
  const [gone, setGone] = useState<string | null>(null);
  useStageDepth(stage, Boolean(card));

  const author = card?.author ?? t("reading.work.anonymous");
  const facts = card
    ? [
        feast ? t("reading.featured.feast") : null,
        card.selections ? t("reading.work.selections") : null,
        readingTime(card.minutes, t),
        card.era ? t(eraKey(card.era)) : null,
      ].filter(Boolean)
    : [];
  const art = card?.cover && gone !== card.cover.src ? card.cover : null;

  return (
    <section
      ref={stage}
      aria-labelledby={card ? "featured-title" : undefined}
      data-featured={card ? card.key : "pending"}
      className={cn(
        styles.hero,
        "relative -mx-5 mt-1 md:mx-0 md:mt-8 md:rounded-[16px]",
        !card && "invisible",
      )}
    >
      <div aria-hidden data-stage-part="backdrop" className={styles.heroBackdrop}>
        {art ? (
          // eslint-disable-next-line @next/next/no-img-element -- the cover's own picture, the same address the poster loads.
          <img
            src={art.src}
            alt=""
            decoding="async"
            onError={() => setGone(art.src)}
            className={styles.heroArt}
            style={{ objectPosition: `50% ${art.focusY}%` }}
          />
        ) : null}
        <div className={styles.heroShade} />
      </div>

      <div className="flex min-h-[480px] flex-col items-center px-5 pb-2 pt-5 text-center md:min-h-[400px] md:flex-row md:items-center md:gap-10 md:px-10 md:py-12 md:text-start">
        {card ? (
          <>
            <div data-stage-part="poster" className={styles.heroPoster}>
              <Link href={cardHref(card)} prefetch={false} tabIndex={-1} aria-hidden className="press-card block rounded-[8px]">
                <WorkCover
                  title={card.title}
                  author={author}
                  iconUrl={card.cover?.src}
                  focusY={card.cover?.focusY}
                  size="hero"
                  priority
                  className="w-[200px] shadow-[0_32px_70px_-26px_rgba(0,0,0,0.9)] md:w-[220px]"
                />
              </Link>
            </div>
            <div data-stage-part="words" className={cn(styles.heroWords, "mt-5 flex min-w-0 max-w-[520px] flex-col items-center md:mt-0 md:items-start")}>
              <h2
                id="featured-title"
                className="sr-only text-title font-semibold leading-[1.1] tracking-[-0.015em] text-paper text-balance md:not-sr-only"
              >
                <Link href={cardHref(card)} prefetch={false} className="hover:underline hover:underline-offset-4">
                  {card.title}
                </Link>
              </h2>
              <p className="hidden font-sans text-ui text-paper/75 md:mt-2 md:block">{author}</p>
              <p className="font-sans text-caption text-paper/60 md:mt-2">{facts.join(" · ")}</p>
              {blurb ? (
                <p lang="en" className="mt-2 line-clamp-2 max-w-[40ch] font-sans text-detail leading-[1.55] text-paper/75 md:line-clamp-3 md:max-w-[46ch]">
                  {blurb}
                </p>
              ) : null}
              <Link
                href={`${cardHref(card)}#s${first}`}
                prefetch={false}
                className="tap-press mt-5 inline-flex h-12 min-w-[148px] items-center justify-center rounded-pill bg-paper px-8 font-sans text-ui font-semibold text-night hover:bg-paper/90"
              >
                {t("reading.featured.read")}
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}

/** How far the room scrolls, as a share of the screen, while the stage recedes (room.module.css). */
const AWAY = 0.75;

/**
 * The stage's depth where the browser has no scroll timelines: the same three
 * moves room.module.css makes, written from the scroll once a frame, straight
 * to the elements, with no React render and no CSS transition
 * (lib/ui/useScrollFill.ts). The backdrop and the poster recede over the
 * first three quarters of a screen; the words only as they leave the top, so
 * they are never dimmed while they are read, their place on the page measured
 * with nothing moved. Only with the motion switch on; with it off the
 * elements are handed back as they were.
 */
function useStageDepth(stage: RefObject<HTMLElement | null>, ready: boolean) {
  useEffect(() => {
    const el = stage.current;
    if (!el || !ready || typeof window === "undefined") return;
    if (typeof CSS !== "undefined" && CSS.supports?.("animation-timeline: scroll()")) return;
    const part = (name: string) => el.querySelector<HTMLElement>(`[data-stage-part="${name}"]`);
    const backdrop = part("backdrop");
    const poster = part("poster");
    const words = part("words");
    const parts = [backdrop, poster, words];
    let frame = 0;
    let ticking = false;
    let moved = false;
    let last = "";
    // Where the words stand on the page, read with nothing moved.
    let wordsTop = 0;
    let wordsHeight = 1;
    const clear = () => {
      for (const p of parts) {
        if (!p) continue;
        p.style.transform = "";
        p.style.opacity = "";
      }
      moved = false;
      last = "";
    };
    const measure = () => {
      clear();
      if (!words) return;
      const r = words.getBoundingClientRect();
      wordsTop = r.top + window.scrollY;
      wordsHeight = Math.max(1, r.height);
    };
    const draw = () => {
      ticking = false;
      if (document.documentElement.getAttribute("data-motion") !== "full") {
        if (moved) clear();
        return;
      }
      const h = window.innerHeight || 1;
      const y = Math.max(0, window.scrollY);
      const p = Math.min(1, y / (h * AWAY));
      const q = Math.min(1, Math.max(0, (y - wordsTop) / wordsHeight));
      // Nothing changes past the stage: no writes while the rows scroll.
      const key = `${p.toFixed(4)}|${q.toFixed(4)}`;
      if (key === last) return;
      last = key;
      if (backdrop) {
        backdrop.style.transform = `translate3d(0, ${(26 * p).toFixed(2)}%, 0)`;
        backdrop.style.opacity = (1 - p).toFixed(3);
      }
      if (poster) {
        poster.style.transform = `translate3d(0, ${(8 * p).toFixed(2)}%, 0) scale(${(1 - 0.12 * p).toFixed(4)})`;
        poster.style.opacity = (1 - 0.7 * p).toFixed(3);
      }
      if (words) {
        words.style.transform = `translate3d(0, ${(12 * q).toFixed(2)}%, 0)`;
        words.style.opacity = (1 - q).toFixed(3);
      }
      moved = true;
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      frame = requestAnimationFrame(draw);
    };
    const onResize = () => {
      measure();
      onScroll();
    };
    measure();
    draw();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      clear();
    };
  }, [stage, ready]);
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
