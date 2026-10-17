"use client";

import { useId } from "react";

import { cn } from "@/lib/cn";
import { EMBER, FLAMES, PENDING_STOPS, fromFoot, type Stops } from "@/lib/streak/flames";
import type { TierLevel } from "@/lib/streak/tiers";

/**
 * The streak's flame. Red, because the owner asked for red (2026-10-02): a
 * deep liturgical red at the base rising to a hot red tip, with a light core.
 *
 *   lit      a day kept, and the streak itself
 *   ember    a day a save covered: the fire held, banked low
 *   pending  today, not kept yet: the flame unlit, dark red, waiting
 *   out      nothing to keep yet, or a day missed: a grey flame
 *
 * From 1.7.1 a streak grows through five flames (lib/streak/tiers.ts), each
 * its own design and every one red (lib/streak/flames.ts): `tier` picks one.
 * The first is the flame the streak always had, drawn exactly as before, so
 * a place that names no tier looks as it did. An unlit or grey flame keeps
 * its tier's outline, so the reader sees the shape of the flame they carry.
 *
 * Each instance mints its own gradient ids. A shared id breaks when the
 * first copy sits in a hidden subtree (the phone pill's star did exactly
 * that, 2026-10-02).
 */
export type FlameState = "lit" | "ember" | "pending" | "out";

/**
 * A large flame with its glow, in a box as big as the glow.
 *
 * The glow used to hang outside the flame's own box (`absolute inset-[-40%]`),
 * which is fine on a page and wrong in a sheet: a sheet's body scrolls, a
 * scrolling box clips what hangs outside it, and the flame sits at the very
 * top of that body. So a kept streak opened with a hard line across the top
 * of its glow, and the evening pulse, which grows the flame by a tenth,
 * pushed the tip itself under that line (the owner, 2026-10-05: "the flame
 * ... it's kind of cut off at the top"). A grey flame has no glow and stands
 * still, which is why the sheet looked right with no streak.
 *
 * Here the glow is inside the box and fades to nothing at its edge
 * (`closest-side`), so there is nothing left over to clip, and the room
 * around the flame also holds its movement: the pulse (a tenth) and the
 * relight (a seventh). The room under the flame is handed back with a
 * negative margin, so what follows sits as close as it always did.
 */
export function FlameStage({
  size,
  glow,
  strength = 0.32,
  glowClassName,
  children,
}: {
  /** The flame's height in px, the same number StreakFlame is given. */
  size: number;
  /** Whether the glow shows: a kept streak has one, an unlit flame does not. */
  glow: boolean;
  /** The glow's opacity at its centre. */
  strength?: number;
  /** An entrance for the glow (`streak-glow-in`). */
  glowClassName?: string;
  children: React.ReactNode;
}) {
  const room = Math.round(size * 0.24);
  const side = size + room * 2;
  return (
    <div
      className="relative grid shrink-0 place-items-center"
      style={{ width: side, height: side, marginBottom: -room }}
    >
      {glow ? (
        <span
          aria-hidden
          className={cn("pointer-events-none absolute inset-0 rounded-full", glowClassName)}
          style={{
            background: `radial-gradient(circle closest-side, rgb(255 90 79 / ${strength}), transparent)`,
          }}
        />
      ) : null}
      {children}
    </div>
  );
}

function Gradient({ id, stops }: { id: string; stops: Stops }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      {stops.map(([offset, color]) => (
        <stop key={offset} offset={offset} stopColor={color} />
      ))}
    </linearGradient>
  );
}

export function StreakFlame({
  size = 24,
  state = "lit",
  tier = 1,
  flicker = false,
  className,
}: {
  /** Height in px; the width follows the flame's 4:5 shape. */
  size?: number;
  state?: FlameState;
  /** Which of the five flames (lib/streak/tiers.ts). The first when not given. */
  tier?: TierLevel;
  /** The tongue moves, under the motion switch. For the large flames only. */
  flicker?: boolean;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const outer = `so${id}`;
  const mid = `sm${id}`;
  const inner = `si${id}`;
  const width = Math.round((size * 32) / 40);
  const paint = FLAMES[tier] ?? FLAMES[1];

  if (state === "out") {
    return (
      <svg
        width={width}
        height={size}
        viewBox="0 0 32 40"
        aria-hidden="true"
        focusable="false"
        className={cn("shrink-0", className)}
      >
        <path d={paint.outer} fill="currentColor" fillOpacity={0.16} />
      </svg>
    );
  }

  if (state === "pending") {
    // The outline thickens below the week's 22px, so a flame in a top bar
    // still reads as one (1.6 of 40 is under a pixel there).
    const stroke = Math.max(1.6, (1.6 * 22) / size);
    return (
      <svg
        width={width}
        height={size}
        viewBox="0 0 32 40"
        aria-hidden="true"
        focusable="false"
        className={cn("shrink-0 overflow-visible", className)}
      >
        <defs>
          <Gradient id={outer} stops={PENDING_STOPS} />
        </defs>
        <path
          d={paint.outer}
          fill={`url(#${outer})`}
          stroke="var(--color-streak)"
          strokeOpacity={0.75}
          strokeWidth={stroke}
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  const ember = state === "ember";
  const core = paint.core;
  // An ember is the first flame banked low: no brighter flame inside it.
  const layer = ember ? undefined : paint.mid;
  return (
    <svg
      width={width}
      height={size}
      viewBox="0 0 32 40"
      aria-hidden="true"
      focusable="false"
      className={cn("shrink-0 overflow-visible", className)}
    >
      <defs>
        <Gradient id={outer} stops={ember ? EMBER.outerStops : paint.outerStops} />
        {layer ? <Gradient id={mid} stops={layer.stops} /> : null}
        <Gradient id={inner} stops={ember ? EMBER.coreStops : core.stops} />
      </defs>
      <path d={paint.outer} fill={`url(#${outer})`} />
      {/* The fire inside moves together: the brighter flame and the heart. */}
      <g className={flicker && !ember ? "streak-flicker" : undefined}>
        {layer ? <path d={paint.outer} fill={`url(#${mid})`} transform={fromFoot(layer.scale)} /> : null}
        <path
          d={core.d}
          fill={`url(#${inner})`}
          opacity={ember ? 0.7 : 1}
          transform={core.scale ? fromFoot(core.scale, core.footY) : undefined}
        />
      </g>
    </svg>
  );
}
