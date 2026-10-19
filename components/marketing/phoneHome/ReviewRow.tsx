"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import { dateLocale } from "@/lib/i18n/deviceDates";
import {
  ratingText,
  ratingsAsOf,
  type AppReview,
  type StoreId,
  type StoreRatings,
} from "@/lib/marketing/storeRatings";
import { scrollBehavior } from "@/lib/ui/motion";
import { STORE_NAME, Stars } from "../storeBits";

const STORE_ORDER: StoreId[] = ["appStore", "googlePlay"];

/** Short words set larger, so a card with one line does not look empty. */
function quoteSize(quote: string): string {
  if (quote.length <= 60) return "text-[21px] leading-[1.35]";
  if (quote.length <= 120) return "text-[18px] leading-[1.45]";
  return "text-[17px] leading-[1.5]";
}

/** Where a card's start edge is, and the row's, in either writing direction. */
function startOf(el: Element, rtl: boolean): number {
  const r = el.getBoundingClientRect();
  return rtl ? r.right : r.left;
}

/**
 * What readers say: both stores' ratings as facts, then the reviews the Admin
 * chose, in a row a thumb swipes through (the owner, 2026-10-17: "I want
 * someone to be able to scroll through the different reviews that we put").
 *
 * Every review is real and shows what the store shows: the words, the name,
 * the store, the month and the stars the reviewer gave
 * (lib/marketing/storeRatings.ts). The ratings are the page's live numbers,
 * with the day they were read.
 *
 * The row is the browser's own sideways scroll with a snap to each card, so
 * the thumb's own speed carries it and a fling is never fought; the next card
 * shows at the edge to say there is more. The two buttons and the count under
 * it are for anyone without a swipe, and keep up with one.
 */
export function ReviewRow({ ratings, reviews }: { ratings: StoreRatings; reviews: readonly AppReview[] }) {
  const { t, tn, locale } = useTranslate();
  const trackRef = useRef<HTMLUListElement | null>(null);
  const [index, setIndex] = useState(0);
  const total = reviews.length;

  const monthOf = useMemo(() => {
    const f = new Intl.DateTimeFormat(dateLocale(locale), { month: "long", year: "numeric", timeZone: "UTC" });
    return (month: string) => f.format(new Date(`${month}-15T12:00:00Z`));
  }, [locale]);
  const asOf = useMemo(
    () =>
      new Intl.DateTimeFormat(dateLocale(locale), {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${ratingsAsOf(ratings)}T12:00:00Z`)),
    [locale, ratings],
  );

  // Which card stands at the row's start, read from the cards themselves once
  // a frame while the row moves, so the count follows a swipe as well as the
  // buttons. At the very end the last card counts, though it can never reach
  // the start edge.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let frame = 0;
    const read = () => {
      frame = 0;
      const cards = Array.from(track.children);
      if (!cards.length) return;
      const reach = track.scrollWidth - track.clientWidth;
      if (reach > 0 && Math.abs(track.scrollLeft) >= reach - 2) {
        setIndex(cards.length - 1);
        return;
      }
      const style = getComputedStyle(track);
      const rtl = style.direction === "rtl";
      const inset = parseFloat(style.paddingInlineStart) || 0;
      const edge = rtl ? track.getBoundingClientRect().right - inset : track.getBoundingClientRect().left + inset;
      let best = 0;
      let nearest = Infinity;
      cards.forEach((card, i) => {
        const gap = Math.abs(startOf(card, rtl) - edge);
        if (gap < nearest) {
          nearest = gap;
          best = i;
        }
      });
      setIndex(best);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      track.removeEventListener("scroll", onScroll);
    };
  }, []);

  const go = useCallback((to: number) => {
    const track = trackRef.current;
    const card = track?.children[to];
    if (!track || !card) return;
    const style = getComputedStyle(track);
    const rtl = style.direction === "rtl";
    const inset = parseFloat(style.paddingInlineStart) || 0;
    const edge = rtl ? track.getBoundingClientRect().right - inset : track.getBoundingClientRect().left + inset;
    // A distance, not a position: scrollLeft runs the other way in a
    // right-to-left row, and a distance does not care.
    track.scrollBy({ left: startOf(card, rtl) - edge, behavior: scrollBehavior() });
  }, []);

  const rated = STORE_ORDER.filter((id) => ratings[id].count > 0);

  return (
    <section aria-labelledby="phone-reviews-title" className="pt-16">
      <div className="px-5">
        <h2
          id="phone-reviews-title"
          className="text-balance text-[clamp(26px,7vw,30px)] leading-[1.12] tracking-[-0.02em] text-paper"
        >
          {t("home.reviews.title")}
        </h2>
        {rated.length > 0 ? (
          <>
            <ul className="mt-5 flex flex-col items-start gap-2">
              {rated.map((id) => {
                const r = ratings[id];
                const shown = ratingText(r.rating);
                return (
                  <li
                    key={id}
                    className="inline-flex max-w-full items-center gap-2 rounded-pill border border-paper/12 bg-paper/[0.04] py-2 pl-3.5 pr-4"
                  >
                    <Stars label={t("home.apps.outOfFive", { rating: shown })} count={1} size={14} tone="ink" />
                    <span aria-hidden className="font-sans text-ui font-semibold tabular-nums text-paper">
                      {shown}
                    </span>
                    <span className="min-w-0 font-sans text-detail text-paper/68">
                      {tn(id === "appStore" ? "home.apps.ratingsAppStore" : "home.apps.ratingsPlay", r.count)}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 font-sans text-caption text-paper/55">{t("home.apps.asOf", { date: asOf })}</p>
          </>
        ) : null}
      </div>

      {total > 0 ? (
        <div className="mt-7">
          <ul
            ref={trackRef}
            aria-label={t("home.reviews.region")}
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a row that scrolls sideways is scrolled from the keyboard, so it takes focus
            tabIndex={0}
            className="flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto overscroll-x-contain px-5 pb-1 [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper/60 [&::-webkit-scrollbar]:hidden"
          >
            {reviews.map((r) => (
              <li key={r.id} className="w-[86%] max-w-[340px] shrink-0 snap-start">
                <figure className="flex h-full flex-col rounded-2xl border border-paper/10 bg-paper/[0.035] p-5">
                  <Stars
                    label={t("home.apps.outOfFive", { rating: r.stars.toFixed(1) })}
                    count={r.stars}
                    outOf={5}
                    size={14}
                    tone="ink"
                  />
                  {r.title ? (
                    <p className="mt-3 font-sans text-ui font-semibold leading-snug text-paper">{r.title}</p>
                  ) : null}
                  <blockquote className={cn("font-serif text-paper/90", r.title ? "mt-1.5" : "mt-3", quoteSize(r.quote))}>
                    &ldquo;{r.quote}&rdquo;
                  </blockquote>
                  <figcaption className="mt-auto pt-5 font-sans">
                    <span className="block text-ui font-semibold text-paper/85">{r.name}</span>
                    <span className="mt-0.5 block text-detail text-paper/58">
                      {STORE_NAME[r.store]} · {monthOf(r.month)}
                    </span>
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
          {total > 1 ? (
            <div className="mt-4 flex items-center justify-center gap-2 px-5">
              <RowButton label={t("home.reviews.previous")} disabled={index <= 0} onClick={() => go(index - 1)} back />
              <p className="min-w-[5.5rem] text-center font-sans text-detail tabular-nums text-paper/60">
                {t("home.reviews.position", { index: index + 1, total })}
              </p>
              <RowButton label={t("home.reviews.next")} disabled={index >= total - 1} onClick={() => go(index + 1)} />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function RowButton({
  label,
  disabled,
  onClick,
  back,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  back?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-11 w-11 place-items-center rounded-full border border-paper/15 text-paper/80 transition-[background-color,border-color,opacity,transform] duration-150 hover:border-paper/35 hover:bg-paper/[0.06] active:scale-[0.96] disabled:pointer-events-none disabled:opacity-30"
    >
      <svg aria-hidden width={16} height={16} viewBox="0 0 16 16" className="rtl:-scale-x-100">
        <path
          d={back ? "M10 3.5 5.5 8l4.5 4.5" : "M6 3.5 10.5 8 6 12.5"}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
