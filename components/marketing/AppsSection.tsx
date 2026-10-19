"use client";

import { useEffect, useRef, type CSSProperties } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import {
  STORE_RATINGS_DEFAULT,
  ratingText,
  ratingsAsOf,
  type AppReview,
  type StoreId,
  type StoreRatings,
} from "@/lib/marketing/storeRatings";
import { PhoneFrame, STORE_NAME, Stars, StoreButton } from "./storeBits";
import { dateLocale } from "@/lib/i18n/deviceDates";

/**
 * "Take Purify with you": the front page's word that Purify is an app on
 * iPhone and Android, with both stores, their real ratings, and the app
 * itself rising into view. The computer's front page, from 768px; a phone
 * has its own (components/marketing/phoneHome, 1.8).
 *
 * ── Why (2026-09-25) ─────────────────────────────────────────────────────
 *
 * Both apps were live in both stores and the front page said nothing about
 * either: no store link, no download, no reviews, in 401 lines. Asked for by
 * the owner for 1.4: the stores, the reviews, the phone animating in.
 *
 * ── The motion is driven by the scroll, and it is always on ──────────────
 *
 * The phones rise and settle as the section comes up the screen, tied to the
 * scroll position rather than a fade that plays once on arrival. Until
 * 2026-09-27 this followed the reader's motion setting, with a Motion switch
 * under the phones, because a machine that asks for reduced motion, the
 * owner's included, would otherwise never see it move. The owner asked for
 * the switch to go and the motion to stay on, so this section no longer reads
 * lib/ui/motion at all: every reader sees the phones rise.
 *
 * ── Honest numbers ───────────────────────────────────────────────────────
 *
 * The page hands over the ratings it read (Apple's live, the Admin's Google
 * Play number; lib/marketing/storeRatingsLive.ts) with the day they were
 * read, printed beside them, and the reviews the Admin chose. This section
 * quotes the first of them; the phone page lets a reader swipe through all.
 */

const STORE_ORDER: StoreId[] = ["appStore", "googlePlay"];

export function AppsSection({
  className,
  ratings = STORE_RATINGS_DEFAULT,
  reviews = [],
}: {
  className?: string;
  ratings?: StoreRatings;
  reviews?: readonly AppReview[];
}) {
  const { t, tn, locale } = useTranslate();
  const sectionRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  // Progress through the section's arrival, 0 as its top reaches the bottom
  // of the screen, 1 once it is most of the way up. Written as a CSS
  // variable, so the phones move on the compositor and React never renders
  // on scroll.
  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      // Hidden on a phone, which has its own front page: nothing to move.
      if (section.offsetParent === null) return;
      const r = section.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const p = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.85)));
      stage.style.setProperty("--p", p.toFixed(4));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const asOf = new Intl.DateTimeFormat(dateLocale(locale), {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${ratingsAsOf(ratings)}T12:00:00Z`));

  const quoted = reviews.slice(0, 1);

  const rest = "calc(1 - var(--p, 1))";
  const front: CSSProperties = {
    transform: `translate3d(0, calc(${rest} * 110px), 0) rotate(calc(-3deg - ${rest} * 7deg))`,
    opacity: `calc(0.3 + var(--p, 1) * 0.7)`,
  };
  const back: CSSProperties = {
    transform: `translate3d(calc(${rest} * -40px), calc(${rest} * 170px), 0) rotate(calc(5deg + ${rest} * 9deg))`,
    opacity: `calc(0.2 + var(--p, 1) * 0.8)`,
  };

  return (
    <section
      ref={sectionRef}
      aria-labelledby="apps-heading"
      className={cn(className, "overflow-hidden md:bg-night-soft")}
    >
      <div className="mx-auto grid w-full max-w-[1240px] items-center gap-12 md:grid-cols-[minmax(0,1fr)_minmax(0,500px)] md:gap-16">
        <div className="min-w-0">
          <p className="mb-4 font-sans text-detail font-semibold text-paper/60">{t("home.apps.eyebrow")}</p>
          <h2
            id="apps-heading"
            className="font-sans text-title font-bold leading-[1.05] tracking-[-0.025em] text-paper md:text-display-sm lg:text-display"
          >
            {t("home.apps.title")}
          </h2>
          <p className="mt-5 max-w-[520px] font-sans text-ui leading-[1.6] text-paper/75 md:text-lede">
            {t("home.apps.body")}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {STORE_ORDER.map((id) => (
              <StoreButton key={id} store={id} className="px-5" />
            ))}
          </div>

          <ul className="mt-8 flex flex-wrap gap-2.5">
            {STORE_ORDER.filter((id) => ratings[id].count > 0).map((id) => {
              const r = ratings[id];
              const shown = ratingText(r.rating);
              return (
                <li
                  key={id}
                  className="inline-flex items-center gap-2.5 rounded-pill border border-paper/12 bg-paper/[0.04] px-4 py-2"
                >
                  <Stars label={t("home.apps.outOfFive", { rating: shown })} value={r.rating} />
                  <span className="font-sans text-ui font-semibold tabular-nums text-paper" aria-hidden>
                    {shown}
                  </span>
                  <span className="font-sans text-caption text-paper/65">
                    {tn(id === "appStore" ? "home.apps.ratingsAppStore" : "home.apps.ratingsPlay", r.count)}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 font-sans text-caption text-paper/45">{t("home.apps.asOf", { date: asOf })}</p>

          {quoted.length > 0 ? (
            <ul className="mt-8 grid max-w-[560px] gap-3">
              {quoted.map((r) => (
                <li key={r.id}>
                  <figure className="rounded-xl border border-paper/12 bg-paper/[0.03] px-5 py-4">
                    <Stars label={t("home.apps.outOfFive", { rating: r.stars.toFixed(1) })} count={r.stars} outOf={5} />
                    {r.title ? <p className="mt-2 font-sans text-ui font-semibold text-paper">{r.title}</p> : null}
                    <blockquote className="mt-1 font-serif text-lede leading-[1.45] text-paper/90">
                      &ldquo;{r.quote}&rdquo;
                    </blockquote>
                    <figcaption className="mt-2.5 font-sans text-caption text-paper/55">
                      {r.name} · {STORE_NAME[r.store]} ·{" "}
                      {new Intl.DateTimeFormat(dateLocale(locale), { month: "long", year: "numeric", timeZone: "UTC" }).format(
                        new Date(`${r.month}-15T12:00:00Z`),
                      )}
                    </figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col items-center">
          <div
            ref={stageRef}
            className="relative h-[480px] w-full max-w-[440px] md:h-[580px]"
            style={{ "--p": 1 } as CSSProperties}
          >
            <div className="absolute right-[2%] top-[2%] w-[200px] will-change-transform md:w-[230px]" style={back}>
              <PhoneFrame android src="/marketing/app-bible.webp" alt={t("home.apps.phoneAltBible")} />
            </div>
            <div className="absolute bottom-0 left-[4%] w-[220px] will-change-transform md:w-[256px]" style={front}>
              <PhoneFrame src="/marketing/app-today.webp" alt={t("home.apps.phoneAltToday")} priority />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
