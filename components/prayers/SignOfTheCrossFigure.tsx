"use client";

import { useEffect, useRef, useState, type AnimationEvent } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import { getLocale } from "@/lib/i18n/locales";
import { CROSS_FIGURE_KEYS, CROSS_TOUCHES } from "@/lib/prayers/signOfTheCross";

/**
 * How the Sign of the Cross is made, drawn (Learn to pray, 1.7.1): the right
 * hand with three fingers joined and two folded, and the four touches on an
 * upper body, numbered in the lesson's order with the cross traced between
 * them. Every word and the order are the lesson's (lib/prayers/signOfTheCross.ts).
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
 * One SVG in the app's tokens: currentColor is `paper`, and the parts that
 * hide what is behind them are filled with `night`, the page's ground, so it
 * holds on every palette.
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
.sotc-hand { fill: none; stroke: color-mix(in srgb, currentColor 80%, var(--color-night)); stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.sotc-hand .sotc-fine { stroke: color-mix(in srgb, currentColor 45%, var(--color-night)); stroke-width: 1.2; }
.sotc-solid { fill: var(--color-night); }
.sotc-cover { fill: var(--color-night); stroke: none; }
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
          {/* The right hand, palm toward you, thumb on the right: back to front,
              so each nearer part covers what lies behind it. */}
          <g className="sotc-hand" transform="translate(2 4)">
            <path className="sotc-solid" d="M44 252 C43 228 39 204 33.5 182 C29.6 166 28.4 148 29.6 132 C30.2 122 32 116 36 113 C46 108.5 58 107 70 107 C80 107 90 108 96.5 111.5 C101 124 105 136 107.5 149 C106 160 101 170 95 182 C90 194 87.2 212 86.4 252 Z" />
            {/* the little and ring fingers, folded against the palm, nails toward you */}
            <path className="sotc-solid" d="M35.5 113.6 L38.1 139.1 C39 147.2 51.1 146 50.3 137.9 L47.7 112.4 C46.8 104.3 34.7 105.5 35.5 113.6 Z" />
            <path className="sotc-fine" d="M40.5 137.3 C40.5 142.8 47.9 142.8 47.9 137.3" />
            <path className="sotc-solid" d="M49.1 109.1 L52.1 145.5 C52.8 154.2 65.8 153.1 65.1 144.5 L62.1 108.1 C61.4 99.4 48.4 100.5 49.1 109.1 Z" />
            <path className="sotc-fine" d="M54.7 143.7 C54.7 149.5 62.5 149.5 62.5 143.7" />
            {/* the middle finger, the index finger and the thumb, their tips joined */}
            <path className="sotc-cover" d="M59.3 120.7 L73.7 123.3 C78.5 97 82.9 70.6 86.7 44.1 C88.2 36 75.9 33.8 74.5 41.9 C68.9 68.1 63.9 94.4 59.3 120.7 Z" />
            <path d="M75.6 111.4 C79.8 89.1 83.5 66.6 86.7 44.1 C88.2 36 75.9 33.8 74.5 41.9 C69.7 64.2 65.4 86.5 61.6 108.9" />
            <path className="sotc-fine" d="M78.5 78.5 Q74.6 76.6 70.3 77" />
            <path className="sotc-cover" d="M79.2 121.8 L92.8 122.2 C93.8 96.7 94.2 71.1 94.2 45.6 C94.4 37.9 82.8 37.5 82.6 45.2 C81 70.7 79.8 96.2 79.2 121.8 Z" />
            <path d="M93.1 107.7 C93.9 87 94.3 66.3 94.2 45.6 C94.4 37.9 82.8 37.5 82.6 45.2 C81.2 65.9 80.3 86.5 79.8 107.2" />
            <path className="sotc-fine" d="M91.2 79.2 Q87.4 77.9 83.5 79" />
            <path className="sotc-cover" d="M96.6 111.5 C97.4 98 97 84 95.8 72 C95 64.5 93.6 58.5 93 54.4 C92.2 48.8 95.2 45.2 99.2 45.6 C103.2 46 105.8 49.8 107 55.4 C108.6 63 109.8 74 110.2 86 C110.4 92 110.6 96 111.6 100.4 C113.4 108 114.8 118 114 128 C113.2 136 111 143 107.5 149 C104 138 100 124 96.5 111.5 Z" />
            <path d="M96.6 111.5 C97.4 98 97 84 95.8 72 C95 64.5 93.6 58.5 93 54.4 C92.2 48.8 95.2 45.2 99.2 45.6 C103.2 46 105.8 49.8 107 55.4 C108.6 63 109.8 74 110.2 86 C110.4 92 110.6 96 111.6 100.4 C113.4 108 114.8 118 114 128 C113.2 136 111 143 107.5 149" />
            <path className="sotc-fine" d="M96.6 111.5 C98.6 127 102.6 139 107.5 149" />
            <path className="sotc-fine" d="M97.6 76.6 Q102.4 74.4 107.2 75.4" />
            <path className="sotc-fine" d="M102.8 48.2 C104.8 50.2 105.6 53 105.8 56" />
          </g>

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
