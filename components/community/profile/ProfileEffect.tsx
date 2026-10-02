"use client";

import type { CSSProperties } from "react";

import { isEffect, type Effect } from "@/lib/profile/cosmetics";

/**
 * Profile effects, a Purify Plus cosmetic, after Discord's: a layer of light
 * over the whole profile card. Incense rising, gold dust settling, the warm
 * breath of candlelight, snow for the winter feasts.
 *
 * Built from a handful of spans moved by CSS (app/globals.css, "Profile
 * effects"): transform and opacity only, behind the content and catching no
 * pointer. Under the motion switch every particle holds still where it
 * rests, so the effect is still there as decoration and nothing moves.
 *
 * Positions come from a fixed table rather than Math.random, so a card looks
 * the same on every render and in every screenshot.
 */

type Particle = { left: number; top?: number; d: number; delay: number; dx?: number; o?: number; s?: number; c?: 0 | 1 };

// Hand-placed, not generated: spread across the width, staggered in time
// with negative delays so the card opens with the effect already under way.
const LAYOUT: Record<Effect, Particle[]> = {
  incense: [
    { left: 8, d: 8.5, delay: -1, dx: 14, o: 0.3 },
    { left: 22, d: 7.2, delay: -4.5, dx: -10, o: 0.24 },
    { left: 38, d: 9.4, delay: -2.6, dx: 18, o: 0.28 },
    { left: 55, d: 8, delay: -6.2, dx: -14, o: 0.22 },
    { left: 70, d: 7.6, delay: -0.4, dx: 12, o: 0.3 },
    { left: 86, d: 9, delay: -3.4, dx: -16, o: 0.26 },
  ],
  "gold-dust": [
    { left: 6, top: 4, d: 9, delay: -2, dx: 10, s: 3 },
    { left: 15, top: 30, d: 11, delay: -7, dx: -8, s: 2 },
    { left: 27, top: 12, d: 10, delay: -4, dx: 6, s: 3 },
    { left: 36, top: 52, d: 12, delay: -9, dx: -6, s: 2 },
    { left: 47, top: 8, d: 9.5, delay: -1, dx: 8, s: 2.5 },
    { left: 58, top: 38, d: 11.5, delay: -5.5, dx: -10, s: 2 },
    { left: 66, top: 18, d: 10, delay: -3, dx: 6, s: 3 },
    { left: 77, top: 46, d: 12.5, delay: -8, dx: -4, s: 2 },
    { left: 85, top: 6, d: 9, delay: -6, dx: 8, s: 2.5 },
    { left: 94, top: 28, d: 11, delay: -2.5, dx: -8, s: 2 },
  ],
  candlelight: [
    { left: -12, d: 3.4, delay: -0.6 },
    { left: 62, d: 4.1, delay: -1.9 },
  ],
  // Pascha: sparks of red and gold rising, the light of the Resurrection.
  "paschal-embers": [
    { left: 6, d: 6.5, delay: -1, dx: 16, s: 4, c: 0 },
    { left: 15, d: 7.5, delay: -4, dx: -12, s: 3, c: 1 },
    { left: 24, d: 6, delay: -2.5, dx: 10, s: 3, c: 0 },
    { left: 33, d: 8, delay: -6, dx: -14, s: 4, c: 1 },
    { left: 42, d: 7, delay: -0.5, dx: 12, s: 3, c: 0 },
    { left: 51, d: 6.5, delay: -3.5, dx: -10, s: 4, c: 1 },
    { left: 60, d: 7.5, delay: -5, dx: 14, s: 3, c: 0 },
    { left: 69, d: 6, delay: -1.5, dx: -12, s: 4, c: 1 },
    { left: 78, d: 8, delay: -4.5, dx: 10, s: 3, c: 0 },
    { left: 87, d: 7, delay: -2, dx: -14, s: 4, c: 1 },
    { left: 95, d: 6.5, delay: -5.5, dx: 8, s: 3, c: 0 },
  ],
  // Theophany: the waters of the Jordan, falling bright.
  "theophany-drops": [
    { left: 5, top: 4, d: 3.2, delay: -0.4, dx: 0 },
    { left: 14, top: 30, d: 3.8, delay: -2.2, dx: 0 },
    { left: 23, top: 12, d: 3, delay: -1.1, dx: 0 },
    { left: 32, top: 48, d: 4, delay: -3, dx: 0 },
    { left: 41, top: 8, d: 3.4, delay: -0.9, dx: 0 },
    { left: 50, top: 36, d: 3.6, delay: -2.6, dx: 0 },
    { left: 59, top: 20, d: 3.1, delay: -1.6, dx: 0 },
    { left: 68, top: 52, d: 3.9, delay: -3.4, dx: 0 },
    { left: 77, top: 6, d: 3.3, delay: -0.2, dx: 0 },
    { left: 86, top: 28, d: 3.7, delay: -2.9, dx: 0 },
    { left: 95, top: 16, d: 3.2, delay: -1.3, dx: 0 },
  ],
  snowfall: [
    { left: 4, top: 6, d: 12, delay: -3, dx: 12, s: 4 },
    { left: 13, top: 40, d: 14, delay: -9, dx: -10, s: 3 },
    { left: 24, top: 18, d: 11, delay: -6, dx: 14, s: 5 },
    { left: 33, top: 58, d: 15, delay: -12, dx: -8, s: 3 },
    { left: 44, top: 10, d: 12.5, delay: -1.5, dx: 10, s: 4 },
    { left: 55, top: 34, d: 13.5, delay: -7.5, dx: -12, s: 3 },
    { left: 64, top: 22, d: 11.5, delay: -4.5, dx: 8, s: 5 },
    { left: 75, top: 50, d: 14.5, delay: -10.5, dx: -6, s: 3 },
    { left: 84, top: 8, d: 12, delay: -2, dx: 12, s: 4 },
    { left: 93, top: 30, d: 13, delay: -8, dx: -10, s: 3 },
  ],
};

export function ProfileEffect({ effect }: { effect: string | null | undefined }) {
  if (!isEffect(effect)) return null;
  return (
    <div aria-hidden="true" className={`pfx pfx-${effect}`} data-effect={effect}>
      {LAYOUT[effect].map((p, i) => (
        <span
          key={i}
          className={p.c === 1 ? "pfx-p pfx-alt" : "pfx-p"}
          style={
            {
              left: `${p.left}%`,
              ...(p.top !== undefined ? { top: `${p.top}%` } : {}),
              ...(p.s !== undefined ? { width: p.s, height: p.s } : {}),
              "--d": `${p.d}s`,
              "--delay": `${p.delay}s`,
              "--dx": `${p.dx ?? 0}px`,
              "--o": p.o ?? 0.3,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
