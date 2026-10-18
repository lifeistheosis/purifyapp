"use client";

import { useEffect, useRef, useState, type AnimationEvent } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import { getLocale } from "@/lib/i18n/locales";
import { CROSS_FIGURE_KEYS, CROSS_TOUCHES } from "@/lib/prayers/signOfTheCross";

/**
 * How the Sign of the Cross is made, drawn (Learn to pray, 1.7.1): the right
 * hand with three fingers joined and two folded (a photograph of the owner's
 * own hand, 2026-10-18), and the four touches on an upper body, numbered in the
 * lesson's order with the cross traced between them. Every word and the
 * order are the lesson's (lib/prayers/signOfTheCross.ts).
 *
 * The body is drawn as the reader sees themself, so their right shoulder is
 * on the right: the line runs right, then left, as the lesson says it. The
 * hand is the reader's own right hand, palm toward them, thumb on the right.
 *
 * Motion: with the app's motion on, the touches play in order once the
 * drawing is on the screen (forehead, abdomen, right shoulder, left shoulder,
 * then the hand lowers) and "Play again" plays them once more. With motion
 * off it is the finished drawing. Only the app's own switch decides
 * (`data-motion` on <html>, app/globals.css), never the OS query. Until the
 * script has run the drawing is whole, so it never waits on JavaScript.
 *
 * One SVG in the app's tokens: currentColor is `paper`, so the body and the
 * cross hold on every palette. The hand is a black and white photograph with
 * its own transparent ground, so it sits on any palette too.
 */

type Play = "still" | "armed" | "on" | "done";

const MOVE = "cubic-bezier(0.45, 0, 0.25, 1)";
const ARRIVE = "var(--ease-house, cubic-bezier(0.22, 1, 0.36, 1))";
const ON = ':where([data-motion="full"]) .sotc-svg[data-play="on"]';
const ARMED = ':where([data-motion="full"]) .sotc-svg[data-play="armed"]';

// One play, 4.6 seconds: the line down from 450 to 1350 ms, across from 2700
// to 3600, each number arriving as the point does.
const CSS = `
.sotc-svg { display: block; width: 100%; height: auto; }
.sotc-body { fill: none; stroke: color-mix(in srgb, currentColor 46%, var(--color-night)); stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
.sotc-body .sotc-fine { stroke: color-mix(in srgb, currentColor 28%, var(--color-night)); stroke-width: 1.25; }
.sotc-line { fill: none; stroke: currentColor; stroke-width: 2.25; stroke-dasharray: 1; stroke-dashoffset: 0; }
.sotc-head { fill: none; stroke: currentColor; stroke-width: 2.25; stroke-linecap: round; stroke-linejoin: round; }
.sotc-badge { transform-box: fill-box; transform-origin: center; }
.sotc-badge circle { fill: currentColor; }
.sotc-badge text { fill: var(--color-night); font: 600 12px/1 var(--font-sans), sans-serif; }
.sotc-point { opacity: 0; fill: currentColor; }
${ARMED} :is(.sotc-badge, .sotc-head) { opacity: 0; }
${ARMED} .sotc-line { stroke-dashoffset: 1; }
${ON} .sotc-badge { animation: sotc-in 420ms ${ARRIVE} backwards; }
${ON} .sotc-badge-2 { animation-delay: 1250ms; }
${ON} .sotc-badge-3 { animation-delay: 2350ms; }
${ON} .sotc-badge-4 { animation-delay: 3500ms; }
${ON} .sotc-line-down { animation: sotc-draw 900ms ${MOVE} 450ms backwards; }
${ON} .sotc-line-across { animation: sotc-draw 900ms ${MOVE} 2700ms backwards; }
${ON} .sotc-head-down { animation: sotc-fade 300ms ease-out 1250ms backwards; }
${ON} .sotc-head-across { animation: sotc-fade 300ms ease-out 3500ms backwards; }
${ON} .sotc-point { animation: sotc-path 4600ms linear both; }
@keyframes sotc-in { from { opacity: 0; transform: scale(0.6); } to { opacity: 1; transform: scale(1); } }
@keyframes sotc-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes sotc-draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
@keyframes sotc-path {
  0% { transform: translate(95px, 38px); opacity: 0; }
  6% { opacity: 1; }
  9.78% { transform: translate(95px, 38px); animation-timing-function: ${MOVE}; }
  29.35% { transform: translate(95px, 200px); }
  34.78% { transform: translate(95px, 200px); opacity: 1; animation-timing-function: ${MOVE}; }
  43.5% { opacity: 0.4; }
  52.17% { transform: translate(146px, 118px); opacity: 1; }
  58.7% { transform: translate(146px, 118px); animation-timing-function: ${MOVE}; }
  78.26% { transform: translate(44px, 118px); }
  82.6% { transform: translate(44px, 118px); opacity: 1; animation-timing-function: cubic-bezier(0.3, 0, 0.2, 1); }
  97.8% { transform: translate(44px, 142px); opacity: 0; }
  100% { transform: translate(44px, 142px); opacity: 0; }
}
`;

/** Where each touch sits on the body, in the body's own units. */
const AT: Record<1 | 2 | 3 | 4, [number, number]> = { 1: [95, 38], 2: [95, 200], 3: [146, 118], 4: [44, 118] };

export function SignOfTheCrossFigure({ className }: { className?: string }) {
  const { t, locale } = useTranslate();
  const dir = getLocale(locale).dir;
  const svg = useRef<SVGSVGElement>(null);
  const [play, setPlay] = useState<Play>("still");
  const [run, setRun] = useState(0);

  // Played once, when most of the drawing is on the screen. Before that it is
  // set back to its start, out of sight, so it never jumps while watched.
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const motionOn = () => document.documentElement.dataset.motion === "full";
    if (typeof IntersectionObserver === "undefined") {
      // Next frame, not inside the effect itself (react-hooks/set-state-in-effect).
      const frame = requestAnimationFrame(() => {
        if (motionOn()) setPlay("on");
      });
      return () => cancelAnimationFrame(frame);
    }
    let started = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (started || !motionOn()) return;
        if (entry.intersectionRatio >= 0.6) {
          started = true;
          setPlay("on");
          io.disconnect();
        } else {
          setPlay("armed");
        }
      },
      { threshold: [0, 0.6] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const onAnimationEnd = (e: AnimationEvent<SVGSVGElement>) => {
    if (e.animationName === "sotc-path") setPlay("done");
  };

  const again = () => {
    setRun((r) => r + 1);
    setPlay("on");
  };

  return (
    <figure data-sotc-figure className={cn("relative my-10", className)}>
      <style>{CSS}</style>
      <svg
        ref={svg}
        viewBox="0 0 360 250"
        role="img"
        aria-label={t(CROSS_FIGURE_KEYS.figure)}
        data-play={play === "still" ? undefined : play}
        onAnimationEnd={onAnimationEnd}
        className="sotc-svg text-paper"
      >
        <defs>
          <linearGradient id="sotc-fade-g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0.74" stopColor="#fff" />
            <stop offset="0.98" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <mask id="sotc-fade" maskUnits="userSpaceOnUse" x="0" y="0" width="360" height="250">
            <rect width="360" height="250" fill="url(#sotc-fade-g)" />
          </mask>
        </defs>

        <g mask="url(#sotc-fade)">
          {/* The right hand, palm toward you, thumb on the right: a photograph
              of the gesture, the owner's own hand (2026-10-18), mirrored to a
              right hand, in black and white and cut from its background. The
              thumb's tip rests on the tips of the index and middle fingers; the
              ring and little fingers fold across the palm toward the ball of
              the thumb, nails toward you. Where it came from:
              docs/licensing/OWN_MEDIA.md. */}
          <image
            href="/learn/sign-of-the-cross-hand.v1.webp"
            x="6"
            y="28"
            width="132"
            height="220"
            preserveAspectRatio="xMidYMin meet"
          />

          {/* An upper body, as you see yourself: your right on the right. */}
          <g className="sotc-body" transform="translate(160 6)">
            <ellipse cx="95" cy="50" rx="25" ry="29" />
            <path d="M85 77 C85 84 84 89 82 93 C70 97 52 99 40 104 C28 109 22 118 20 132 C18 160 18 200 18 248" />
            <path d="M105 77 C105 84 106 89 108 93 C120 97 138 99 150 104 C162 109 168 118 170 132 C172 160 172 200 172 248" />
            <path className="sotc-fine" d="M38 150 C40 180 40 214 40 248" />
            <path className="sotc-fine" d="M152 150 C150 180 150 214 150 248" />
          </g>
        </g>

        {/* The cross traced in order: down from 1 to 2, across from 3 to 4. */}
        <g key={run} transform="translate(160 6)">
          <path className="sotc-line sotc-line-down" pathLength={1} d="M95 38 L95 200" />
          <path className="sotc-line sotc-line-across" pathLength={1} d="M146 118 L44 118" />
          <path className="sotc-head sotc-head-down" d="M89 180 L95 186 L101 180" />
          <path className="sotc-head sotc-head-across" d="M64 112 L58 118 L64 124" />
          <g className="sotc-point">
            <circle r="9" opacity="0.18" />
            <circle r="4.5" />
          </g>
          {CROSS_TOUCHES.map(({ n }) => (
            <g key={n} className={`sotc-badge sotc-badge-${n}`}>
              <circle cx={AT[n][0]} cy={AT[n][1]} r="11" />
              <text x={AT[n][0]} y={AT[n][1]} textAnchor="middle" dominantBaseline="central">
                {n}
              </text>
            </g>
          ))}
        </g>
      </svg>

      {/* The columns stand under the drawing's two parts, which do not turn
          round in Arabic or Urdu; the words inside them do. */}
      <figcaption dir="ltr" className="mt-5 grid grid-cols-[42fr_58fr] gap-x-3 font-sans text-detail leading-[1.45] text-paper/70">
        <div dir={dir} className="text-center">
          <p className="font-semibold text-paper/90">{t(CROSS_FIGURE_KEYS.hand)}</p>
          <p className="mt-1.5">{t(CROSS_FIGURE_KEYS.joined)}</p>
          <p className="mt-1">{t(CROSS_FIGURE_KEYS.folded)}</p>
        </div>
        <ol dir={dir} className="space-y-1.5">
          {CROSS_TOUCHES.map(({ n, key }) => (
            <li key={n} className="flex items-start gap-2">
              <span
                aria-hidden
                className="mt-px inline-flex size-[18px] shrink-0 items-center justify-center rounded-full bg-paper text-[11px] font-semibold leading-none text-night tabular-nums"
              >
                {n}
              </span>
              <span>{t(key)}</span>
            </li>
          ))}
        </ol>
      </figcaption>

      {play === "done" ? (
        <button
          type="button"
          onClick={again}
          className="tap-press absolute end-0 top-0 inline-flex min-h-11 items-center px-3 font-sans text-caption text-paper/60 hover:text-paper motion-reduce:hidden"
        >
          {t(CROSS_FIGURE_KEYS.replay)}
        </button>
      ) : null}
    </figure>
  );
}
