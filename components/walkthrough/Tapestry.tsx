"use client";

// The Living Tapestry (the owner's specification, 3.3): progress "resolves
// elements of a book-specific visual artifact (e.g. bringing geographical
// clarity to the Land of Uz) coupled with exploration totals."
//
// For Job it is a road across the land in forty-two stations, six rows of
// seven, winding up the page. A finished chapter's station fills with gold,
// the road between two finished stations is drawn in, and the landmarks of
// the book draw themselves as their chapter is walked: the tents of the
// first chapter, the ash heap, the stump that sprouts at chapter fourteen,
// the gate, the whirlwind, and the sunrise over restored tents at the end.
// The next chapter to walk breathes. Every station is a link.

import { useRouter } from "next/navigation";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";

const XS = [36, 84, 132, 180, 228, 276, 324];
const YS = [404, 340, 276, 212, 148, 84];

export function station(n: number): { x: number; y: number } {
  const k = Math.floor((n - 1) / 7);
  const i = (n - 1) % 7;
  return { x: k % 2 === 0 ? XS[i] : XS[6 - i], y: YS[k] };
}

/** The road from station n to n + 1: a gentle wave along a row, a turn at its end. */
function segment(n: number): string {
  const a = station(n);
  const b = station(n + 1);
  if (a.y === b.y) {
    const mx = (a.x + b.x) / 2;
    const lift = n % 2 === 0 ? -6 : 6;
    return `M${a.x} ${a.y} Q${mx} ${a.y + lift} ${b.x} ${b.y}`;
  }
  const out = a.x > 180 ? 30 : -30;
  return `M${a.x} ${a.y} C${a.x + out} ${a.y} ${b.x + out} ${b.y} ${b.x} ${b.y}`;
}

type Landmark = { chapter: number; paths: string[] };

/** Small drawings, placed by their station, revealed when it is walked. */
function landmarks(): Landmark[] {
  const at = (n: number, dx: number, dy: number) => {
    const s = station(n);
    return { x: s.x + dx, y: s.y + dy };
  };
  const tents = (x: number, y: number) => [
    `M${x - 14} ${y} L${x - 6} ${y - 12} L${x + 2} ${y} Z`,
    `M${x + 4} ${y} L${x + 10} ${y - 9} L${x + 16} ${y} Z`,
  ];
  const t1 = at(1, 8, -26);
  const t2 = at(2, 4, -24);
  const t3 = at(3, 0, -34);
  const t14 = at(14, 10, -24);
  const t19 = at(19, 0, -26);
  const t28 = at(28, 12, -24);
  const t29 = at(29, 4, -26);
  const t31 = at(31, 0, -26);
  const t38 = at(38, 0, -36);
  const t41 = at(41, 0, -28);
  const t42 = at(42, 6, -34);
  return [
    { chapter: 1, paths: tents(t1.x, t1.y) },
    {
      chapter: 2,
      paths: [`M${t2.x - 14} ${t2.y} C${t2.x - 8} ${t2.y - 12} ${t2.x + 8} ${t2.y - 12} ${t2.x + 14} ${t2.y}`, `M${t2.x - 2} ${t2.y - 12} C${t2.x - 6} ${t2.y - 18} ${t2.x + 2} ${t2.y - 20} ${t2.x - 2} ${t2.y - 26}`],
    },
    {
      chapter: 3,
      paths: [`M${t3.x - 16} ${t3.y + 4} l2 -2 l2 2 l-2 2 Z`, `M${t3.x} ${t3.y - 4} l2 -2 l2 2 l-2 2 Z`, `M${t3.x + 16} ${t3.y + 6} l2 -2 l2 2 l-2 2 Z`],
    },
    {
      chapter: 14,
      paths: [
        `M${t14.x - 8} ${t14.y} L${t14.x - 6} ${t14.y - 10} L${t14.x + 6} ${t14.y - 10} L${t14.x + 8} ${t14.y}`,
        `M${t14.x} ${t14.y - 10} C${t14.x} ${t14.y - 18} ${t14.x + 4} ${t14.y - 22} ${t14.x + 8} ${t14.y - 26}`,
        `M${t14.x + 5} ${t14.y - 20} c4 -2 7 0 6 3 c-3 0 -5 -1 -6 -3 Z`,
      ],
    },
    {
      chapter: 19,
      paths: [
        `M${t19.x - 16} ${t19.y} C${t19.x - 12} ${t19.y - 22} ${t19.x + 10} ${t19.y - 24} ${t19.x + 16} ${t19.y}`,
        `M${t19.x - 4} ${t19.y} L${t19.x - 4} ${t19.y - 8} C${t19.x - 4} ${t19.y - 14} ${t19.x + 6} ${t19.y - 14} ${t19.x + 6} ${t19.y - 8} L${t19.x + 6} ${t19.y}`,
        `M${t19.x + 20} ${t19.y - 20} l0 -6 M${t19.x + 14} ${t19.y - 16} l-4 -4 M${t19.x + 26} ${t19.y - 16} l4 -4`,
      ],
    },
    {
      chapter: 28,
      paths: [
        `M${t28.x - 18} ${t28.y} L${t28.x - 6} ${t28.y - 16} L${t28.x + 6} ${t28.y - 6} L${t28.x + 16} ${t28.y}`,
        `M${t28.x - 4} ${t28.y - 4} L${t28.x - 4} ${t28.y + 6} M${t28.x + 2} ${t28.y - 4} L${t28.x + 2} ${t28.y + 6}`,
      ],
    },
    {
      chapter: 29,
      paths: [
        `M${t29.x - 12} ${t29.y} L${t29.x - 12} ${t29.y - 18} L${t29.x - 6} ${t29.y - 18} L${t29.x - 6} ${t29.y}`,
        `M${t29.x + 6} ${t29.y} L${t29.x + 6} ${t29.y - 18} L${t29.x + 12} ${t29.y - 18} L${t29.x + 12} ${t29.y}`,
        `M${t29.x - 6} ${t29.y} L${t29.x - 6} ${t29.y - 8} C${t29.x - 6} ${t29.y - 14} ${t29.x + 6} ${t29.y - 14} ${t29.x + 6} ${t29.y - 8} L${t29.x + 6} ${t29.y}`,
      ],
    },
    {
      chapter: 31,
      paths: [
        `M${t31.x} ${t31.y} L${t31.x} ${t31.y - 20} M${t31.x - 12} ${t31.y - 18} L${t31.x + 12} ${t31.y - 18}`,
        `M${t31.x - 16} ${t31.y - 8} C${t31.x - 14} ${t31.y - 4} ${t31.x - 10} ${t31.y - 4} ${t31.x - 8} ${t31.y - 8}`,
        `M${t31.x + 8} ${t31.y - 8} C${t31.x + 10} ${t31.y - 4} ${t31.x + 14} ${t31.y - 4} ${t31.x + 16} ${t31.y - 8}`,
      ],
    },
    {
      chapter: 38,
      paths: [
        `M${t38.x - 16} ${t38.y} C${t38.x - 16} ${t38.y - 5} ${t38.x + 16} ${t38.y - 5} ${t38.x + 16} ${t38.y}`,
        `M${t38.x - 11} ${t38.y + 7} C${t38.x - 11} ${t38.y + 3} ${t38.x + 11} ${t38.y + 3} ${t38.x + 11} ${t38.y + 7}`,
        `M${t38.x - 6} ${t38.y + 13} C${t38.x - 6} ${t38.y + 10} ${t38.x + 6} ${t38.y + 10} ${t38.x + 6} ${t38.y + 13}`,
        `M${t38.x} ${t38.y + 16} L${t38.x + 1} ${t38.y + 21}`,
      ],
    },
    {
      chapter: 41,
      paths: [
        `M${t41.x - 20} ${t41.y} c5 -4 10 4 15 0 c5 -4 10 4 15 0 c5 -4 10 4 15 0`,
        `M${t41.x - 6} ${t41.y - 2} C${t41.x - 2} ${t41.y - 14} ${t41.x + 8} ${t41.y - 14} ${t41.x + 10} ${t41.y - 4}`,
      ],
    },
    {
      chapter: 42,
      paths: [
        `M${t42.x - 12} ${t42.y} C${t42.x - 12} ${t42.y - 14} ${t42.x + 12} ${t42.y - 14} ${t42.x + 12} ${t42.y}`,
        `M${t42.x} ${t42.y - 18} l0 -6 M${t42.x - 14} ${t42.y - 12} l-5 -4 M${t42.x + 14} ${t42.y - 12} l5 -4`,
        ...tents(t42.x + 34, t42.y + 16),
      ],
    },
  ];
}

const LANDMARKS = landmarks();

export function Tapestry({
  book,
  total,
  written,
  done,
  next,
}: {
  book: string;
  total: number;
  /** Chapters that exist yet (all of them once the walk is live). */
  written: number;
  done: ReadonlySet<number>;
  next: number | null;
}) {
  const { t } = useTranslate();
  const router = useRouter();
  const go = (n: number) => router.push(`/walkthroughs/${book}/${n}`);

  return (
    <svg
      viewBox="0 0 360 436"
      className="walk-tapestry block h-auto w-full"
      role="group"
      aria-label={t("walk.tapestryLabel")}
    >
      {/* The road, faint, then the walked stretches in gold. */}
      <g fill="none" strokeLinecap="round">
        {Array.from({ length: total - 1 }, (_, i) => i + 1).map((n) => (
          <path
            key={`r${n}`}
            d={segment(n)}
            className={cn(
              done.has(n) && done.has(n + 1) ? "walk-road-lit stroke-premium" : "stroke-paper/15",
            )}
            strokeWidth={done.has(n) && done.has(n + 1) ? 2 : 1.2}
            strokeDasharray={done.has(n) && done.has(n + 1) ? undefined : "2 5"}
            pathLength={done.has(n) && done.has(n + 1) ? 1 : undefined}
          />
        ))}
      </g>

      {/* Landmarks: ghosted until walked, then drawn in. */}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {LANDMARKS.map((l) => (
          <g
            key={`l${l.chapter}`}
            className={cn(done.has(l.chapter) ? "walk-landmark-lit text-paper/80" : "text-paper/[0.12]")}
            stroke="currentColor"
            strokeWidth={1.3}
          >
            {l.paths.map((d, i) => (
              <path key={i} d={d} pathLength={1} className="walk-stroke" />
            ))}
          </g>
        ))}
      </g>

      {/* Stations. */}
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => {
        const s = station(n);
        const isDone = done.has(n);
        const isNext = next === n;
        const open = n <= written;
        const label = t(isDone ? "walk.stationDone" : "walk.station", { n });
        return (
          <g
            key={`s${n}`}
            role={open ? "link" : undefined}
            tabIndex={open ? 0 : undefined}
            aria-label={open ? label : undefined}
            onClick={open ? () => go(n) : undefined}
            onKeyDown={
              open
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      go(n);
                    }
                  }
                : undefined
            }
            className={cn("walk-station", open && "cursor-pointer")}
          >
            <circle cx={s.x} cy={s.y} r={22} fill="transparent" />
            {isNext ? <circle cx={s.x} cy={s.y} r={9} className="walk-next fill-none stroke-premium" strokeWidth={1.4} /> : null}
            {isDone ? (
              <>
                <circle cx={s.x} cy={s.y} r={6} className="walk-station-lit fill-premium" />
                <circle cx={s.x} cy={s.y} r={1.8} className="fill-night" />
              </>
            ) : (
              <circle
                cx={s.x}
                cy={s.y}
                r={3.6}
                className={cn("fill-none", open ? "stroke-paper/45" : "stroke-paper/15")}
                strokeWidth={1.2}
                strokeDasharray={open ? undefined : "1.5 2"}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
