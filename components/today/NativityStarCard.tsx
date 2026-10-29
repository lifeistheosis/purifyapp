"use client";

import Link from "next/link";
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { useCalendarStyleDefault } from "@/lib/calendar/useCalendarStyleDefault";
import { useToday } from "@/lib/calendar/useToday";
import { cn } from "@/lib/cn";
import { NATIVITY_PATH, nativityFastDay } from "@/lib/reading/nativity";
import { NIGHT_H, NIGHT_STARS, STAR_PX, STAR_X, claimRise, riseFrom, starTop } from "@/lib/reading/nativityStar";
import { claimNativityRow } from "@/lib/reading/useNativityRow";
import { keyOf } from "@/lib/rhythm/dayKey";

/** A day of the path, as Today names it: its first reading's title and author. */
export type NativityDayReading = { title: string; author: string | null } | null;

// On the server there is no layout to read (components/nav/ScrollResetBridge.tsx).
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** The field the night is drawn on, as round 9 drew it: 350 by 196. */
const FIELD_W = 350;

/**
 * The Nativity Fast's day on Today (1.8): the owner's pick C of round 9, "The
 * star rising", animated at his word (Homebase/boards/purify-master/r18/
 * choose/9-nativity-day.png, the motion in 9c-nativity-star-animated.mp4).
 * During the fast only, 15 November to 24 December, thirteen days later on
 * the old calendar (lib/reading/nativity.ts): "Nativity Fast · day N of 40",
 * a short title, the day's reading from the Nativity path, and a small night
 * whose star stands higher each day (lib/reading/nativityStar.ts). A tap opens
 * the path on that day.
 *
 * The rise plays on the first view of Today on the reader's local day; later
 * views find the star up, its halo breathing. The decision is made before the
 * first paint, so the star never shows up and then drops to rise. The motion
 * is CSS (.nat-* in globals.css): transform and opacity only, and under the
 * motion setting the still picture.
 *
 * While it shows it holds the path for Today: the Nativity row in The Church
 * today gives way to it (lib/reading/useNativityRow.ts), one place for the
 * path, not two. A night by design, it stays dark on every palette
 * (`dark-island`).
 */
export function NativityStarCard({ days, className }: { days: readonly NativityDayReading[]; className?: string }) {
  const { t } = useTranslate();
  const today = useToday();
  const [style] = useCalendarStyleDefault();
  // The horizon's gradient, by an id of letters alone, so url(#...) reads it in every engine.
  const edgeId = `nat-edge-${useId().replace(/[^A-Za-z0-9_-]/g, "")}`;
  // nativity.ts reads a wall-clock day; useToday carries the reader's day at
  // UTC noon (lib/rhythm/dayKey.ts), so it is handed over as that day at noon.
  const n = today ? nativityFastDay(new Date(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 12), style) : null;
  const shown = n !== null && n <= days.length;
  const day = today ? keyOf(today) : null;

  // Whether the star rises this time: once per day, decided once per view
  // (kept in a ref, so a second run of the effect asks nothing new).
  const decided = useRef<{ day: string; rise: boolean } | null>(null);
  const [rise, setRise] = useState<boolean | null>(null);
  useIsoLayoutEffect(() => {
    if (!shown || !day) return;
    if (decided.current?.day !== day) decided.current = { day, rise: claimRise(day) };
    // Before the paint, so the first frame drawn is already the right one.
    setRise(decided.current.rise);
    return claimNativityRow();
  }, [shown, day]);

  if (!shown || n === null || rise === null) return null;
  const reading = days[n - 1];
  // Whose it is, after the title, set apart as the app's eyebrows are.
  const byline = reading?.author ? ` · ${reading.author}` : null;
  // Placed from the reading side's start, so in Arabic and Urdu the night is
  // mirrored and the star still stands across from the words.
  const star = {
    insetInlineStart: `calc(${STAR_X * 100}% - ${STAR_PX / 2}px)`,
    top: starTop(n, days.length),
    width: STAR_PX,
    height: STAR_PX,
    "--nat-from": `${riseFrom(n, days.length)}px`,
  } as CSSProperties;

  return (
    <Link
      href={`/reading/paths/${NATIVITY_PATH}#day-${n}`}
      data-nativity-star=""
      className={cn(
        "dark-island tap-press relative block min-h-[196px] overflow-hidden rounded-[22px] border border-paper/12 bg-night-deep",
        rise && "nat-rise",
        className,
      )}
    >
      {/* The night, held to the card's foot, so longer words grow the sky and
          never move the horizon. */}
      <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0" style={{ height: NIGHT_H }}>
        {NIGHT_STARS.map((s, i) => (
          <span
            key={i}
            className="nat-tw absolute rounded-full bg-paper"
            style={
              {
                insetInlineStart: `${(s.x / FIELD_W) * 100}%`,
                top: s.y - s.r,
                width: s.r * 2,
                height: s.r * 2,
                opacity: s.o,
                "--o": s.o,
                animationDuration: `${s.dur}s`,
                animationDelay: `${s.delay}s`,
              } as CSSProperties
            }
          />
        ))}
        {/* The glow along the horizon under the star: a gradient, not a blur. */}
        <span
          className="nat-dawn absolute"
          style={{
            insetInlineStart: "20%",
            width: "103%",
            top: 136,
            height: 84,
            background: "radial-gradient(closest-side, rgb(255 255 255 / 0.15), rgb(255 255 255 / 0.05) 60%, rgb(255 255 255 / 0))",
          }}
        />
        <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${FIELD_W} ${NIGHT_H}`} preserveAspectRatio="none">
          <path d={`M-20 ${NIGHT_H} Q 175 150 370 ${NIGHT_H} Z`} className="fill-night-deep" />
        </svg>
        <span className="nat-edge absolute inset-0">
          {/* Brightest under the star: turned with it in a right-to-left language. */}
          <svg className="h-full w-full rtl:-scale-x-100" viewBox={`0 0 ${FIELD_W} ${NIGHT_H}`} preserveAspectRatio="none">
            <defs>
              <linearGradient id={edgeId} x1="0" x2={FIELD_W} y1="0" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#fff" stopOpacity="0.12" />
                <stop offset="0.72" stopColor="#fff" />
                <stop offset="1" stopColor="#fff" stopOpacity="0.2" />
              </linearGradient>
            </defs>
            <path
              d={`M-20 ${NIGHT_H} Q 175 150 370 ${NIGHT_H}`}
              fill="none"
              stroke={`url(#${edgeId})`}
              strokeWidth={1.2}
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </span>
        <span className="nat-star absolute block" style={star}>
          <span
            className="nat-halo absolute rounded-full"
            style={{
              left: -19,
              top: -19,
              width: 60,
              height: 60,
              background:
                "radial-gradient(circle, rgb(255 255 255 / 0.55) 0%, rgb(255 255 255 / 0.16) 35%, rgb(255 255 255 / 0) 70%)",
            }}
          />
          <svg
            width={STAR_PX}
            height={STAR_PX}
            viewBox="0 0 24 24"
            className="relative"
            style={{ filter: "drop-shadow(0 0 4px rgb(255 255 255 / 0.9))" }}
          >
            <path d="M12 1.5 L13.3 10.7 L22.5 12 L13.3 13.3 L12 22.5 L10.7 13.3 L1.5 12 L10.7 10.7 Z" fill="#fff" />
            <path
              d="M12 6.5 L12.8 11.2 L17.5 12 L12.8 12.8 L12 17.5 L11.2 12.8 L6.5 12 L11.2 11.2 Z"
              fill="#fff"
              opacity={0.8}
              transform="rotate(45 12 12)"
            />
          </svg>
        </span>
      </span>

      {/* The words, clear of the star: it stands three quarters across. */}
      <span className="relative block w-[64%] pb-12 ps-[18px] pt-4">
        <span className="block font-sans text-caption font-semibold text-paper/65">
          {t("today.nativityStar.eyebrow", { n, total: days.length })}
        </span>
        <span className="mt-1.5 block font-serif text-title-sm font-bold leading-[1.2] text-paper">
          {t("today.nativityStar.title")}
        </span>
        {reading ? (
          <span className="mt-2 block font-sans text-detail leading-[1.45] text-paper/70">
            {t("today.nativityStar.today")}{" "}
            {/* The library keeps the works' and the Fathers' English names. */}
            <b lang="en" className="font-semibold text-paper">
              {reading.title}
            </b>
            {byline ? <span lang="en">{byline}</span> : null}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
