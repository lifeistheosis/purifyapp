"use client";

import type { CSSProperties } from "react";

import { cn } from "@/lib/cn";
import { isEffect, type Effect } from "@/lib/profile/cosmetics";

/**
 * Profile effects, a Purify Plus cosmetic, after Discord's: a layer of light
 * over the whole profile card, behind the words. Incense rising, gold dust
 * drifting down, the warm breath of candlelight, snow, and by their seasons
 * the light of Pascha rising and the waters of the Jordan falling.
 *
 * Redrawn in 1.8 as the owner's sheet r3-28b draws them (notes 75 and 81):
 * near and far, larger and softer particles in front (`n`), small sharp ones
 * behind, so the card has depth; and on a profile (`quiet`) the falling and
 * rising ones thin out below the name and the status, so the words stay
 * clean (app/globals.css, .pfx-quiet). The colours are the stylesheet's
 * ("Profile effects"), where the Plus cosmetics keep their gold.
 *
 * Built from a handful of spans moved by CSS: transform and opacity only,
 * behind the content and catching no pointer. Under the motion switch every
 * particle holds still where it rests, so the effect stays as decoration
 * and nothing moves.
 *
 * Positions come from a fixed table rather than Math.random, so a card looks
 * the same on every render and in every screenshot.
 */

type Particle = {
  left: number;
  top?: number;
  /** Seconds a pass takes, and the negative delay that has it already under way. */
  d: number;
  delay: number;
  dx?: number;
  /** The peak opacity of a wisp. */
  o?: number;
  /** Its size in px, or a wisp's scale. */
  s?: number;
  /** Near: larger and softer, in front. */
  n?: 1;
  /** The other colour of two (Pascha's gold beside its red). */
  c?: 1;
  /** Held where it is: the faint ground under the candlelight. */
  still?: 1;
};

// Hand-placed, not generated: spread across the width, staggered in time
// with negative delays so the card opens with the effect already under way.
// The counts and the times are the sheet's.
const LAYOUT: Record<Effect, Particle[]> = {
  // Six soft wisps rise from the foot, widening and thinning, 7 to 9 s each.
  incense: [
    { left: 8, d: 8.5, delay: -1, dx: 14, o: 0.6, s: 1.2 },
    { left: 22, d: 7.2, delay: -4.5, dx: -10, o: 0.48, s: 1.6, n: 1 },
    { left: 38, d: 9, delay: -2.6, dx: 18, o: 0.56, s: 1.35 },
    { left: 55, d: 8, delay: -6.2, dx: -14, o: 0.44, s: 1.8, n: 1 },
    { left: 70, d: 7.6, delay: -0.4, dx: 12, o: 0.6, s: 1.4 },
    { left: 86, d: 8.8, delay: -3.4, dx: -16, o: 0.52, s: 1.15 },
  ],
  // Ten specks drift down the card, 9 to 12.5 s each, each with its own small light.
  "gold-dust": [
    { left: 6, top: 4, d: 9, delay: -2, dx: 10, s: 3, n: 1 },
    { left: 15, top: 30, d: 11, delay: -7, dx: -8, s: 2 },
    { left: 27, top: 12, d: 10, delay: -4, dx: 6, s: 3, n: 1 },
    { left: 36, top: 52, d: 12, delay: -9, dx: -6, s: 1.6 },
    { left: 47, top: 8, d: 9.5, delay: -1, dx: 8, s: 2.5 },
    { left: 58, top: 38, d: 11.5, delay: -5.5, dx: -10, s: 1.6 },
    { left: 66, top: 18, d: 10, delay: -3, dx: 6, s: 3, n: 1 },
    { left: 77, top: 46, d: 12.5, delay: -8, dx: -4, s: 2 },
    { left: 85, top: 6, d: 9, delay: -6, dx: 8, s: 2.5 },
    { left: 94, top: 28, d: 11, delay: -2.5, dx: -8, s: 1.6 },
  ],
  // Two pools of warm light breathe at the foot, every 3.4 and 4.1 s, over a faint still ground.
  candlelight: [
    { left: 20, d: 0, delay: 0, still: 1 },
    { left: -12, d: 3.4, delay: -0.6 },
    { left: 62, d: 4.1, delay: -1.9, c: 1 },
  ],
  // Eleven sparks of red and gold rise from the foot, 6 to 8 s each.
  "paschal-embers": [
    { left: 6, d: 6.5, delay: -1, dx: 16, s: 4, n: 1 },
    { left: 15, d: 7.5, delay: -4, dx: -12, s: 3, c: 1 },
    { left: 24, d: 6, delay: -2.5, dx: 10, s: 2 },
    { left: 33, d: 8, delay: -6, dx: -14, s: 4, c: 1, n: 1 },
    { left: 42, d: 7, delay: -0.5, dx: 12, s: 3 },
    { left: 51, d: 6.5, delay: -3.5, dx: -10, s: 2, c: 1 },
    { left: 60, d: 7.5, delay: -5, dx: 14, s: 3 },
    { left: 69, d: 6, delay: -1.5, dx: -12, s: 4, c: 1, n: 1 },
    { left: 78, d: 8, delay: -4.5, dx: 10, s: 2 },
    { left: 87, d: 7, delay: -2, dx: -14, s: 4, c: 1, n: 1 },
    { left: 95, d: 6.5, delay: -5.5, dx: 8, s: 3 },
  ],
  // Eleven bright drops fall quickly, 3 to 4 s each.
  "theophany-drops": [
    { left: 5, top: 4, d: 3.2, delay: -0.4, n: 1 },
    { left: 14, top: 30, d: 3.8, delay: -2.2 },
    { left: 23, top: 12, d: 3, delay: -1.1 },
    { left: 32, top: 48, d: 4, delay: -3, n: 1 },
    { left: 41, top: 8, d: 3.4, delay: -0.9 },
    { left: 50, top: 36, d: 3.6, delay: -2.6 },
    { left: 59, top: 20, d: 3.1, delay: -1.6, n: 1 },
    { left: 68, top: 52, d: 3.9, delay: -3.4 },
    { left: 77, top: 6, d: 3.3, delay: -0.2 },
    { left: 86, top: 28, d: 3.7, delay: -2.9, n: 1 },
    { left: 95, top: 16, d: 3.2, delay: -1.3 },
  ],
  // Ten flakes fall slowly and lean, 11 to 15 s each.
  snowfall: [
    { left: 4, top: 6, d: 12, delay: -3, dx: 12, s: 4 },
    { left: 13, top: 40, d: 14, delay: -9, dx: -10, s: 3 },
    { left: 24, top: 18, d: 11, delay: -6, dx: 14, s: 5, n: 1 },
    { left: 33, top: 58, d: 15, delay: -12, dx: -8, s: 3 },
    { left: 44, top: 10, d: 12.5, delay: -1.5, dx: 10, s: 4 },
    { left: 55, top: 34, d: 13.5, delay: -7.5, dx: -12, s: 2 },
    { left: 64, top: 22, d: 11.5, delay: -4.5, dx: 8, s: 5, n: 1 },
    { left: 75, top: 50, d: 14.5, delay: -10.5, dx: -6, s: 3 },
    { left: 84, top: 8, d: 12, delay: -2, dx: 12, s: 4 },
    { left: 93, top: 30, d: 13, delay: -8, dx: -10, s: 2 },
  ],
};

/** Effects whose particles cross the whole card, and so thin out behind the words on a profile. */
const CROSSING: readonly Effect[] = ["gold-dust", "snowfall", "theophany-drops", "paschal-embers"];

export function ProfileEffect({
  effect,
  quiet = false,
}: {
  effect: string | null | undefined;
  /** On a profile: thin out behind the name, the status and what follows. */
  quiet?: boolean;
}) {
  if (!isEffect(effect)) return null;
  return (
    <div
      aria-hidden="true"
      className={cn("pfx", `pfx-${effect}`, quiet && CROSSING.includes(effect) && "pfx-quiet")}
      data-effect={effect}
      // Said to the guardrails' measure (scripts/mock-check.mjs), which reads only what the page says.
      data-mock-allow="gold mirror"
      data-mock-why="a Plus profile effect: gold is allowed on a Plus member's profile (noGold.test.ts), and its specks, placed from the start, drift as decoration, so two measures never find them in one place"
    >
      {LAYOUT[effect].map((p, i) => (
        <span
          key={i}
          className={cn("pfx-p", p.n && "pfx-near", p.c && "pfx-alt", p.still && "pfx-still")}
          style={
            {
              insetInlineStart: `${p.left}%`,
              ...(p.top !== undefined ? { top: `${p.top}%` } : {}),
              ...(p.s !== undefined && effect !== "incense" ? { width: p.s, height: p.s } : {}),
              "--d": `${p.d}s`,
              "--delay": `${p.delay}s`,
              "--dx": `${p.dx ?? 0}px`,
              "--o": p.o ?? 0.3,
              ...(effect === "incense" ? { "--s": p.s ?? 1 } : {}),
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
