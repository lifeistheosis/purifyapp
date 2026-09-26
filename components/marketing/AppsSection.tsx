"use client";

import Image from "next/image";
import { useEffect, useRef, type CSSProperties } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import { APP_REVIEWS, STORE_LINKS, STORE_RATINGS, type StoreId } from "@/lib/marketing/storeRatings";
import { setMotionPreference, useReducedMotion } from "@/lib/ui/motion";

/**
 * "Take Purify with you": the front page's word that Purify is an app on
 * iPhone and Android, with both stores, their real ratings, and the app
 * itself rising into view.
 *
 * ── Why (2026-09-25) ─────────────────────────────────────────────────────
 *
 * Both apps were live in both stores and the front page said nothing about
 * either: no store link, no download, no reviews, in 401 lines. Asked for by
 * the owner for 1.4: the stores, the reviews, the phone animating in.
 *
 * ── The motion is driven by the scroll, and it can be switched on ─────────
 *
 * The phones rise and settle as the section comes up the screen, tied to the
 * scroll position rather than a fade that plays once on arrival. The site
 * follows the reader's system setting for motion (lib/ui/motionPreference.ts),
 * and a reader whose system asks for less motion sees the phones already in
 * place. The switch under them is the reader-facing control that module
 * was written to have: "Motion on" writes the explicit preference, which
 * outranks the system for every animation Purify drives, and "Motion off"
 * takes it back. Without it, anyone whose machine asks for reduced motion,
 * the owner's included, would never see this move.
 *
 * ── Honest numbers ───────────────────────────────────────────────────────
 *
 * Ratings come from lib/marketing/storeRatings.ts with the date they were
 * read, printed beside them. Quoted reviews render only when the owner has
 * approved them there; until then the section shows the ratings and nothing
 * pretends to be a review.
 */

const STORE_ORDER: StoreId[] = ["appStore", "googlePlay"];

/** The status bar clock on the drawn phones, Apple's own convention. */
const STATUS_TIME = "9:41";

export function AppsSection({ className }: { className?: string }) {
  const { t, tn, locale } = useTranslate();
  const reduce = useReducedMotion();
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
    if (reduce) {
      stage.style.setProperty("--p", "1");
      return;
    }
    let frame = 0;
    const update = () => {
      frame = 0;
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
  }, [reduce]);

  const asOf = new Intl.DateTimeFormat(locale, {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${STORE_RATINGS.asOf}T12:00:00Z`));

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
    <section ref={sectionRef} aria-labelledby="apps-heading" className={cn(className, "overflow-hidden bg-night-soft")}>
      <div className="mx-auto grid w-full max-w-[1240px] items-center gap-12 md:grid-cols-[minmax(0,1fr)_minmax(0,500px)] md:gap-16">
        <div className="min-w-0">
          <p className="mb-4 font-sans text-detail font-semibold uppercase tracking-[1.5px] text-paper/60">
            {t("home.apps.eyebrow")}
          </p>
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
              <a
                key={id}
                href={STORE_LINKS[id]}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex min-h-[56px] items-center gap-3 rounded-2xl border border-paper/15 bg-paper/[0.05] px-5 py-2.5 transition-colors duration-150 hover:border-paper/35 hover:bg-paper/10"
              >
                <PhoneGlyph android={id === "googlePlay"} />
                <span className="flex flex-col text-left leading-tight">
                  <span className="font-sans text-caption text-paper/60">
                    {t(id === "appStore" ? "home.apps.appStorePre" : "home.apps.playPre")}
                  </span>
                  <span className="font-sans text-ui font-semibold text-paper">
                    {id === "appStore" ? "App Store" : "Google Play"}
                  </span>
                </span>
              </a>
            ))}
          </div>

          <ul className="mt-8 flex flex-wrap gap-2.5">
            {STORE_ORDER.map((id) => {
              const r = STORE_RATINGS[id];
              return (
                <li
                  key={id}
                  className="inline-flex items-center gap-2.5 rounded-pill border border-paper/12 bg-paper/[0.04] px-4 py-2"
                >
                  <Stars label={t("home.apps.outOfFive", { rating: r.rating.toFixed(1) })} />
                  <span className="font-sans text-ui font-semibold tabular-nums text-paper" aria-hidden>
                    {r.rating.toFixed(1)}
                  </span>
                  <span className="font-sans text-caption text-paper/65">
                    {tn(id === "appStore" ? "home.apps.ratingsAppStore" : "home.apps.ratingsPlay", r.count)}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 font-sans text-caption text-paper/45">{t("home.apps.asOf", { date: asOf })}</p>

          {APP_REVIEWS.length > 0 ? (
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {APP_REVIEWS.map((r) => (
                <li key={`${r.store}-${r.name}-${r.date}`} className="rounded-xl border border-paper/12 bg-paper/[0.03] p-4">
                  <Stars label={t("home.apps.outOfFive", { rating: "5.0" })} />
                  <p className="mt-2 font-serif text-body leading-[1.5] text-paper/90">&ldquo;{r.quote}&rdquo;</p>
                  <p className="mt-2 font-sans text-caption text-paper/55">
                    {r.name} · {r.store === "appStore" ? "App Store" : "Google Play"}
                  </p>
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
            <div
              className="absolute right-[2%] top-[2%] w-[200px] will-change-transform md:w-[230px]"
              style={back}
            >
              <PhoneFrame
                android
                src="/marketing/app-bible.webp"
                alt={t("home.apps.phoneAltBible")}
              />
            </div>
            <div
              className="absolute bottom-0 left-[4%] w-[220px] will-change-transform md:w-[256px]"
              style={front}
            >
              <PhoneFrame src="/marketing/app-today.webp" alt={t("home.apps.phoneAltToday")} priority />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMotionPreference(reduce ? "on" : "off")}
            aria-pressed={!reduce}
            className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-pill border border-paper/15 bg-paper/[0.04] px-4 py-2 font-sans text-caption text-paper/75 transition-colors hover:border-paper/35 hover:text-paper"
          >
            <span
              aria-hidden
              className={cn("h-1.5 w-1.5 rounded-full", reduce ? "bg-paper/40" : "bg-emerald-400")}
            />
            {reduce ? t("home.apps.motionOff") : t("home.apps.motionOn")}
          </button>
        </div>
      </div>
    </section>
  );
}

/** A phone drawn in CSS around a real screenshot of the app. */
function PhoneFrame({
  src,
  alt,
  android,
  priority,
}: {
  src: string;
  alt: string;
  android?: boolean;
  priority?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-[#0d0d0f] p-[9px] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.65)] ring-1 ring-white/10",
        android ? "rounded-[34px]" : "rounded-[44px]",
      )}
    >
      {/* The screen: a status bar the camera sits in, as on a real phone,
          then the screenshot whole. The screenshots are taken without one,
          so without this strip the camera covered the app's own header. */}
      <div
        className={cn(
          "relative aspect-[390/891] w-full overflow-hidden bg-[#101013]",
          android ? "rounded-[26px]" : "rounded-[36px]",
        )}
      >
        <div aria-hidden className="absolute inset-x-0 top-0 flex h-[5.3%] items-center justify-between px-[9%] font-sans text-[9px] font-semibold text-white/85">
          <span>{STATUS_TIME}</span>
          <span className="flex items-center gap-1">
            <span className="flex items-end gap-[1.5px]">
              <span className="h-[3px] w-[2px] rounded-[1px] bg-white/85" />
              <span className="h-[5px] w-[2px] rounded-[1px] bg-white/85" />
              <span className="h-[7px] w-[2px] rounded-[1px] bg-white/85" />
            </span>
            <span className="h-[7px] w-[13px] rounded-[2px] border border-white/70 p-[1px]">
              <span className="block h-full w-[75%] rounded-[1px] bg-white/85" />
            </span>
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-0 aspect-[390/844]">
          {/* unoptimized: the screenshots are already pre-sized WebP, 55 and
              76 KB, and the local optimizer's first 256px encode of one of
              them hung and held the page's load event (2026-09-26). */}
          <Image src={src} alt={alt} fill unoptimized sizes="(min-width: 768px) 256px, 220px" className="object-cover object-top" priority={priority} />
        </div>
        {android ? (
          <span aria-hidden className="absolute left-1/2 top-[1.4%] h-[2.6%] w-auto aspect-square -translate-x-1/2 rounded-full bg-black" />
        ) : (
          <span aria-hidden className="absolute left-1/2 top-[1%] h-[3.3%] w-[30%] -translate-x-1/2 rounded-full bg-black" />
        )}
      </div>
    </div>
  );
}

function Stars({ label }: { label: string }) {
  return (
    <span role="img" aria-label={label} className="inline-flex items-center gap-0.5 text-premium">
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} width={13} height={13} viewBox="0 0 24 24" aria-hidden fill="currentColor">
          <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" />
        </svg>
      ))}
    </span>
  );
}

function PhoneGlyph({ android }: { android?: boolean }) {
  return (
    <svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0 text-paper/80"
    >
      <rect x="6" y="2.5" width="12" height="19" rx={android ? 2.5 : 3.2} />
      {android ? <circle cx="12" cy="5.4" r="0.7" fill="currentColor" /> : <path d="M10.4 5h3.2" />}
      <path d="M10 18.5h4" />
    </svg>
  );
}
