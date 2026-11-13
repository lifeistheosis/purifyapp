"use client";

import { useId, useState, type SVGProps } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Book } from "@/components/ui/icons/Book";
import { Church } from "@/components/ui/icons/Church";
import { Hourglass } from "@/components/ui/icons/Hourglass";
import { Lyre } from "@/components/ui/icons/Lyre";
import { Octogram } from "@/components/ui/icons/Octogram";
import { Quill } from "@/components/ui/icons/Quill";
import { Scroll } from "@/components/ui/icons/Scroll";
import { Seal } from "@/components/ui/icons/Seal";
import { Search } from "@/components/ui/icons/Search";
import { Shield } from "@/components/ui/icons/Shield";
import { Sun } from "@/components/ui/icons/Sun";
import { PurifyMark } from "@/components/ui/PurifyMark";
import { cn } from "@/lib/cn";
import { STANDING_BADGES, type BadgeId, type EarnedBadge } from "@/lib/profile/badges";
import { recordDate } from "@/lib/profile/dates";

/**
 * Profile badges as a case of medals (1.8, r3-28 A, the owner's pick for
 * notes 75 and 81): each struck in silver round an enamel field, the badge's
 * own glyph engraved on it in the app's line set, so no badge is an emoji, a
 * typed symbol or a coloured icon in a pill (his photo of build 86 showed
 * nine icons in one pill, two of them red).
 *
 * The standing badges, which say who someone is to the community (team,
 * moderator, clergy, verified), have a silver field and a dark glyph; the
 * rest an enamel field and a white glyph with its own light. The streak's
 * three, Seven, Forty and a Hundred Days, are a prayer rope: seven, forty or
 * a hundred knots round a loop with the cross beneath, and no number (his
 * default, not refused: "on prayer, no figures"). Black, white and silver on
 * every profile, Plus or not; a medal is never gold.
 *
 * The drawing is the sheet's (Homebase/boards/purify-master/variants/
 * r3-28-kit.js, medal and ropeLoop), in a 100 box.
 */

/** The silver of the rim, lit and shaded round. */
const RIM: readonly [number, string][] = [
  [0, "#eeeef2"],
  [0.25, "#b9b9c0"],
  [0.5, "#6f6f78"],
  [0.74, "#c9c9cf"],
  [1, "#55555d"],
];

const f2 = (n: number) => n.toFixed(2);

/** The punched dots round the field. */
const DOTS = Array.from({ length: 44 }, (_, i) => {
  const a = (Math.PI * 2 * i) / 44;
  return { x: f2(50 + 41.2 * Math.cos(a)), y: f2(50 + 41.2 * Math.sin(a)) };
});

/** A prayer rope's knots round its loop: seven, forty or a hundred, the seven turned so none sits at the top. */
const ROPES = Object.fromEntries(
  ([7, 40, 100] as const).map((n) => {
    const r = n === 7 ? 17 : 19;
    const knot = n === 7 ? 3.7 : n === 40 ? 1.75 : 1.02;
    const turn = n === 7 ? Math.PI / 7 : 0;
    const knots = Array.from({ length: n }, (_, i) => {
      const a = -Math.PI / 2 + (Math.PI * 2 * i) / n + turn;
      return { x: f2(50 + r * Math.cos(a)), y: f2(45 + r * Math.sin(a)) };
    });
    return [n, { r, knot, knots }];
  }),
) as Record<7 | 40 | 100, { r: number; knot: number; knots: { x: string; y: string }[] }>;

const ROPE_OF: Partial<Record<BadgeId, 7 | 40 | 100>> = { streak_7: 7, streak_40: 40, streak_100: 100 };

/** Two speech bubbles, one behind the other: a word carried across. */
function Bubbles({ size = 20, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>
      <path d="M4 5.5h9a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H8.5L5.5 16v-2.5H4A1.5 1.5 0 0 1 2.5 12V7A1.5 1.5 0 0 1 4 5.5Z" />
      <path d="M17.5 9.5H20a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5h-1.5V20l-3-2.5h-3.5a1.5 1.5 0 0 1-1.5-1.5v-.5" />
    </svg>
  );
}

/** A flask with a level in it: tried before anyone else. */
function Flask({ size = 20, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>
      <path d="M9.5 3.5h5" />
      <path d="M10.5 3.5v5.2L5.2 18a1.7 1.7 0 0 0 1.5 2.5h10.6a1.7 1.7 0 0 0 1.5-2.5l-5.3-9.3V3.5" />
      <path d="M7.6 14.5h8.8" />
    </svg>
  );
}

/** The supporter's cross: plain for Plus, in a ring for Pro. */
function SupportCross({ pro, size = 20, ...props }: SVGProps<SVGSVGElement> & { size?: number; pro: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" aria-hidden="true" focusable="false" {...props}>
      {pro ? <circle cx="12" cy="12" r="10.75" strokeWidth="1.3" /> : null}
      <path d={pro ? "M12 6.2v11.6M8.4 9.6h7.2" : "M12 3.6v16.8M6.8 8.6h10.4"} strokeWidth={pro ? 2.2 : 2.4} />
    </svg>
  );
}

/** The engraving: the badge's glyph in the field's middle, the line set's 24 box at 2.3 times. */
function Engraving({ id }: { id: BadgeId }) {
  const rope = ROPE_OF[id];
  if (rope) {
    const { r, knot, knots } = ROPES[rope];
    const k = 15 / 176;
    const crossY = 45 + r + 13.5;
    return (
      <>
        <circle cx="50" cy="45" r={r} fill="none" stroke="currentColor" strokeWidth="1.3" opacity="0.42" />
        {knots.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={knot} fill="currentColor" />
        ))}
        <path d={`M50 ${f2(45 + r + knot)} V${f2(45 + r + 5)}`} stroke="currentColor" strokeWidth="1.6" opacity="0.7" />
        <g transform={`translate(${f2(50 - 50 * k)} ${f2(crossY - 88 * k)}) scale(${f2(k)})`} fill="currentColor">
          <rect x="41" y="2" width="18" height="172" rx="2" />
          <rect x="22" y="20" width="56" height="15" rx="2" />
          <rect x="0" y="55" width="100" height="16" rx="2" />
          <rect x="22" y="131" width="56" height="15" rx="2" transform="rotate(18 50 138)" />
        </g>
      </>
    );
  }
  if (id === "team") return <PurifyMark size={46} x={37} y={27} />;
  const at = { size: 55.2, x: 22.4, y: 22.4, strokeWidth: 1.3 } as const;
  switch (id) {
    case "moderator":
      return <Shield {...at} />;
    case "clergy":
      return <Church {...at} />;
    case "verified":
      return <Seal {...at} />;
    case "pro":
      return <SupportCross pro size={55.2} x={22.4} y={22.4} />;
    case "plus":
      return <SupportCross pro={false} size={55.2} x={22.4} y={22.4} />;
    case "psalter":
      return <Lyre {...at} />;
    case "gospels":
      return <Book {...at} />;
    case "lent":
      return <Hourglass {...at} />;
    case "first_share":
      return <Scroll {...at} />;
    case "early_reader":
      return <Sun {...at} />;
    case "beta_tester":
      return <Flask {...at} />;
    case "bug_hunter":
      return <Search {...at} />;
    case "ambassador":
      return <Octogram {...at} />;
    case "translator":
      return <Bubbles {...at} />;
    case "contributor":
      return <Quill {...at} />;
    default:
      return null;
  }
}

/** One medal. `lit`: the one tapped, ringed white with a soft light. */
export function Medal({ id, size = 56, lit = false, className }: { id: BadgeId; size?: number; lit?: boolean; className?: string }) {
  const raw = useId();
  const u = `md${raw.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const standing = STANDING_BADGES.includes(id);
  const ink = standing ? "#16161a" : "#ffffff";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
      className={cn("profile-medal shrink-0 overflow-visible", className)}
      data-lit={lit ? "" : undefined}
      data-medal={id}
      data-mock-allow="palette"
      data-mock-why="a medal struck in silver round an enamel field, its glyph engraved dark or white on its own field: black, white and silver on every profile and every palette, by design"
    >
      <defs>
        <linearGradient id={`${u}r`} x1="0" y1="0" x2="1" y2="1">
          {RIM.map(([o, c]) => (
            <stop key={o} offset={o} stopColor={c} />
          ))}
        </linearGradient>
        <radialGradient id={`${u}f`} cx="0.42" cy="0.34" r="0.78">
          {standing ? (
            <>
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="0.55" stopColor="#d9d9de" />
              <stop offset="1" stopColor="#9c9ca4" />
            </>
          ) : (
            <>
              <stop offset="0" stopColor="#34343b" />
              <stop offset="0.6" stopColor="#1b1b20" />
              <stop offset="1" stopColor="#0e0e11" />
            </>
          )}
        </radialGradient>
        <linearGradient id={`${u}h`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity={standing ? 0.5 : 0.16} />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        {standing ? null : (
          <filter id={`${u}g`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
        )}
      </defs>
      <circle cx="50" cy="50" r="48.5" fill={`url(#${u}r)`} />
      <circle cx="50" cy="50" r="45.2" fill="#0a0a0c" opacity="0.55" />
      <circle cx="50" cy="50" r="44.4" fill={`url(#${u}f)`} />
      <circle cx="50" cy="50" r="37.6" fill="none" stroke={standing ? "#7b7b83" : "#ffffff"} strokeWidth="0.7" opacity={standing ? 0.5 : 0.16} />
      {DOTS.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="0.85" fill={standing ? "#5e5e66" : "#ffffff"} opacity={standing ? 0.55 : 0.32} />
      ))}
      <g style={{ color: ink }}>
        {/* The white glyph's own light: the same glyph, blurred, under it. */}
        {standing ? null : (
          <g filter={`url(#${u}g)`} opacity="0.5">
            <Engraving id={id} />
          </g>
        )}
        <Engraving id={id} />
      </g>
      <ellipse cx="50" cy="27" rx="33" ry="17" fill={`url(#${u}h)`} />
      {lit ? <circle cx="50" cy="50" r="49.3" fill="none" stroke="#fff" strokeWidth="1.6" /> : null}
    </svg>
  );
}

/**
 * The Badges door: a case of medals, three to a row, each with its name and
 * since when. The one tapped is lit, and what it means is said under the
 * case; until one is tapped, the first (or the one asked for) is.
 *
 * The card under the case holds every badge's words in one cell, the lit
 * one's shown, so it is as tall as its longest badge whichever is lit, as the
 * doors keep the tallest door's room (ProfileDoors.tsx). It used to hold the
 * lit one's words alone: Verified's two lines and Bug Hunter's three, with
 * its "Since October 2026", changed the card's height, and the sheet, pinned
 * to the foot of a phone, jumped by a line at each tap (build 95 note 12).
 * With motion on, the words hand over as the house's pieces do (the mini
 * player's card and pill, app/globals.css): the old fade, the new follow.
 */
export function MedalCase({ badges, initial = null }: { badges: EarnedBadge[]; initial?: BadgeId | null }) {
  const { t, locale } = useTranslate();
  const [picked, setPicked] = useState<BadgeId | null>(null);
  if (badges.length === 0) {
    return <p className="py-6 text-center font-sans text-detail text-paper/50">{t("profile.noBadges")}</p>;
  }
  const held = (id: BadgeId | null) => (id && badges.some((b) => b.id === id) ? id : null);
  const lit = held(picked) ?? held(initial) ?? badges[0].id;
  const shown = badges.find((b) => b.id === lit) ?? badges[0];
  return (
    <div>
      <ul aria-label={t("profile.badgesLabel")} className="grid grid-cols-3 gap-x-2 gap-y-1">
        {badges.map((b) => {
          const on = b.id === lit;
          return (
            <li key={b.id} id={`badge-${b.id}`} className="min-w-0">
              <button
                type="button"
                aria-pressed={on}
                onClick={() => setPicked(b.id)}
                className={cn(
                  "tap-press flex w-full flex-col items-center rounded-[18px] px-1 pb-2 pt-2.5 text-center motion-safe:transition-[background-color,box-shadow]",
                  on
                    ? "bg-paper/[0.07] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.22),0_0_24px_rgb(255_255_255/0.08)]"
                    : "hover:bg-paper/[0.04]",
                )}
              >
                <Medal id={b.id} size={58} lit={on} />
                <span className="mt-[7px] line-clamp-2 w-full text-balance break-words font-sans text-[12.5px] font-semibold leading-tight text-paper/90">
                  {t(`profile.badge.${b.id}`)}
                </span>
                {b.since ? (
                  // At /45 its words fell to 4.50:1 on Black once the medal was lit (the lit
                  // ground is lighter): a control's words at 4.5:1 or better (build 95 note 12).
                  <span className="mt-[3px] w-full truncate font-sans text-[10.5px] leading-tight text-paper/50">
                    {t("profile.badgeSince", { date: recordDate(b.since, locale, { month: "short", year: "numeric" }) })}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
      <div
        aria-live="polite"
        className="mt-2.5 flex items-center gap-3 rounded-2xl border border-paper/15 bg-paper/[0.06] px-3.5 py-3 shadow-[0_0_22px_rgb(255_255_255/0.06)]"
      >
        <Medal id={shown.id} size={40} lit />
        <span className="grid min-w-0 flex-1">
          {badges.map((b) => {
            const on = b.id === shown.id;
            return (
              <span
                key={b.id}
                data-badge-words={b.id}
                aria-hidden={on ? undefined : true}
                className={cn(
                  "col-start-1 row-start-1 min-w-0 self-center",
                  on
                    ? "visible opacity-100 motion-safe:[transition:opacity_var(--duration-fast)_var(--ease-house)_120ms,visibility_0s]"
                    : "invisible opacity-0 motion-safe:[transition:opacity_var(--duration-fast)_var(--ease-house),visibility_0s_linear_var(--duration-fast)]",
                )}
              >
                <span className="block font-serif text-[16px] font-semibold leading-snug text-paper">{t(`profile.badge.${b.id}`)}</span>
                <span className="mt-0.5 block font-sans text-detail leading-snug text-paper/72">{t(`profile.badgeAbout.${b.id}`)}</span>
                {b.since ? (
                  <span className="mt-0.5 block font-sans text-caption text-paper/50">
                    {t("profile.badgeSince", { date: recordDate(b.since, locale, { month: "long", year: "numeric" }) })}
                  </span>
                ) : null}
              </span>
            );
          })}
        </span>
      </div>
    </div>
  );
}
