// How each streak flame is drawn (components/streak/StreakFlame.tsx), one
// design per flame in lib/streak/tiers.ts, all in the same 32 x 40 box so
// every size of every flame lines up.
//
// All red. The owner keeps the streak red ("that's the color for
// retention", 2026-10-17) and has banned yellow and gold from Purify's
// screens, so a higher flame is never a warmer colour. It goes deeper
// instead, and grows:
//
//   1  Spark      the flame the streak has always had (1.5)
//   2  Candle     taller and leaner, with a white-hot core
//   3  Lamp       two tongues, a brighter flame inside the crimson one
//   4  Crown      three tongues, deep red at the foot
//   5  All flame  three tall tongues, and the heart a white-hot crown of its own
//
// __tests__/tiers.test.ts holds every colour here to the red family.

import type { TierLevel } from "./tiers";

/** The flame's outline. The pending, out and ember flames draw it too. */
const SPARK =
  "M16 1.5C17.4 7.4 21.6 10.9 24.9 15.2C27.9 19.1 29.5 22.6 29.5 26.6C29.5 34.1 23.5 39 16 39C8.5 39 2.5 34.1 2.5 26.6C2.5 21.9 4.4 18.3 7.6 15.3C7.9 18.5 9.4 20.6 11.8 21.9C11 14.7 12.6 7.6 16 1.5Z";
const SPARK_CORE =
  "M16.6 17.5C17.5 21 20.8 23.1 20.8 27.6C20.8 31.2 18.6 33.6 16 33.6C13.4 33.6 11.2 31.4 11.2 28.2C11.2 25.8 12.4 24.2 13.9 22.8C14.1 24.3 14.8 25.3 15.9 25.8C15.4 22.9 15.6 20.1 16.6 17.5Z";
const CANDLE =
  "M16 0.6C17.6 6.6 21.3 10.4 24 14.8C26.6 18.9 27.7 22.4 27.7 26.5C27.7 33.9 22.6 39.2 16 39.2C9.4 39.2 4.3 33.9 4.3 26.5C4.3 22 5.9 18.6 8.6 15.6C8.9 18.6 10.2 20.6 12.2 21.8C11.5 14.3 12.9 7 16 0.6Z";
const CANDLE_CORE =
  "M16.5 12.6C17.8 17.6 21.8 20.9 21.8 27C21.8 31.7 19.2 34.9 16 34.9C12.8 34.9 10.2 32 10.2 27.9C10.2 24.9 11.6 22.9 13.4 21.2C13.6 23.1 14.5 24.4 15.8 25C15.1 20.8 15.2 16.5 16.5 12.6Z";
const LAMP =
  "M19.6 1.2C20.8 6.9 24.7 10.7 27.3 15.1C29.4 18.8 29.8 22.6 29.8 26.5C29.8 34.1 23.7 39.2 16 39.2C8.3 39.2 2.2 34.1 2.2 26.5C2.2 20.9 4.4 15.6 8.8 8.6C9.5 13.5 11.2 16.5 13.8 18.3C13.5 11.9 15.5 6 19.6 1.2Z";
const CROWN =
  "M16 0.8C17.7 6.4 19.9 10.6 20.9 16.6C21.7 13.2 23.6 10.6 26 8.6C26.5 13.6 29.8 18.7 29.8 26.4C29.8 34.1 23.7 39.2 16 39.2C8.3 39.2 2.2 34.1 2.2 26.4C2.2 18.7 5.5 13.6 6 8.6C8.4 10.6 10.3 13.2 11.1 16.6C12.1 10.6 14.3 6.4 16 0.8Z";
const ALL_FLAME =
  "M16 0.4C17.6 5.8 19.6 10 20.6 15.6C21.6 11.8 23.8 8 26.8 4.8C27.2 11.2 29.8 17.6 29.8 26.2C29.8 34 23.7 39.2 16 39.2C8.3 39.2 2.2 34 2.2 26.2C2.2 17.6 4.8 11.2 5.2 4.8C8.2 8 10.4 11.8 11.4 15.6C12.4 10 14.4 5.8 16 0.4Z";
/** The heart of the Lamp and the Crown: a tongue of white heat. */
const HEART =
  "M16.6 15.5C17.8 20.2 21.6 22.9 21.6 28C21.6 31.9 19.1 34.8 16 34.8C12.9 34.8 10.4 32.3 10.4 28.7C10.4 26 11.8 24.1 13.6 22.6C13.8 24.3 14.6 25.5 15.9 26.1C15.3 22.6 15.4 19 16.6 15.5Z";

/** A gradient, top to bottom: [offset, colour]. */
export type Stops = readonly (readonly [number, string])[];

export type FlamePaint = {
  outer: string;
  outerStops: Stops;
  /** A brighter flame inside: the outline again, drawn smaller from its foot. */
  mid?: { scale: number; stops: Stops };
  /**
   * The heart, and how much smaller than drawn it stands, from its foot
   * (`footY`, lower in the box when not given).
   */
  core: { d: string; scale?: number; footY?: number; stops: Stops };
};

/** Where an inner layer is scaled from: the flame's foot, so it stands on it. */
export const FOOT = { x: 16, y: 38.4 } as const;

export const FLAMES: Record<TierLevel, FlamePaint> = {
  1: {
    outer: SPARK,
    outerStops: [[0, "#ff6a4d"], [0.55, "#e8322b"], [1, "#a3161d"]],
    core: { d: SPARK_CORE, stops: [[0, "#ffe1d6"], [1, "#ff7a66"]] },
  },
  2: {
    outer: CANDLE,
    outerStops: [[0, "#ff5148"], [0.55, "#dc2430"], [1, "#8f0f1b"]],
    core: { d: CANDLE_CORE, stops: [[0, "#ffffff"], [1, "#ffb0a6"]] },
  },
  3: {
    outer: LAMP,
    outerStops: [[0, "#f5434b"], [0.55, "#c41f2c"], [1, "#6c0b15"]],
    mid: { scale: 0.68, stops: [[0, "#ff6a5e"], [1, "#e1262f"]] },
    core: { d: HEART, stops: [[0, "#ffffff"], [1, "#ffb7ae"]] },
  },
  4: {
    outer: CROWN,
    outerStops: [[0, "#ec3640"], [0.55, "#ad1522"], [1, "#4e0610"]],
    mid: { scale: 0.66, stops: [[0, "#ff5f55"], [1, "#dc2430"]] },
    core: { d: HEART, stops: [[0, "#ffffff"], [1, "#ffc4bd"]] },
  },
  5: {
    outer: ALL_FLAME,
    outerStops: [[0, "#e62f3a"], [0.55, "#9c0f1d"], [1, "#3d040c"]],
    mid: { scale: 0.76, stops: [[0, "#ff5a50"], [1, "#d41e2b"]] },
    core: { d: ALL_FLAME, scale: 0.5, footY: 37.2, stops: [[0, "#ffffff"], [0.7, "#fff1ee"], [1, "#ffc9c2"]] },
  },
};

/** An unlit flame: today not kept yet. Its outline in the streak's red. */
export const PENDING_STOPS: Stops = [[0, "#5e2622"], [1, "#2e1110"]];

/** A day a save held: the first flame, banked low. */
export const EMBER = {
  outerStops: [[0, "#8a3a33"], [0.55, "#6b2420"], [1, "#3f1614"]] as Stops,
  coreStops: [[0, "#c1272d"], [1, "#7a2a26"]] as Stops,
};

/** The SVG transform that scales a layer by `scale` from the flame's foot. */
export function fromFoot(scale: number, y: number = FOOT.y): string {
  return `translate(${FOOT.x} ${y}) scale(${scale}) translate(${-FOOT.x} ${-y})`;
}
