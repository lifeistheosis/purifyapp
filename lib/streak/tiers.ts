// The streak's flames: what a streak grows into as it goes on.
//
// The owner, 2026-10-17: "different designs for the fire, maybe different
// colors too, but usually you would want to stick with red because that's
// the color for retention ... just add like progression to the streak
// system." So a streak carries a flame, and the flame changes as the days add
// up: five of them, every one red (lib/streak/flames.ts draws them).
//
//   1 day      Spark       the first day kept
//   7 days     Candle      a week, the candle lit before an icon
//   40 days    Lamp        the forty days of a Fast, the lamp kept burning
//   100 days   Crown       "be thou faithful unto death, and I will give thee
//                           a crown of life" (Revelation 2:10)
//   365 days   All flame   a year; Abba Joseph's word to Abba Lot, that a
//                           monk can become all flame
//
// Seven, forty and a hundred are the streak badges (MILESTONES in ./compute),
// so a new flame and a badge arrive on the same day.
//
// A flame follows the streak as it stands now (`current`), as the count does:
// a streak that ends starts again at the Spark. The badges on a profile are
// the ones kept for good. Nothing here touches the saves or any rule of the
// streak: it only reads the count. Pure, so __tests__/tiers.test.ts holds it.

export const TIERS = [
  { id: "spark", at: 1 },
  { id: "candle", at: 7 },
  { id: "lamp", at: 40 },
  { id: "crown", at: 100 },
  { id: "allFlame", at: 365 },
] as const;

export type Tier = (typeof TIERS)[number];
export type TierId = Tier["id"];
/** A flame's design, 1 to 5, in TIERS order (lib/streak/flames.ts). */
export type TierLevel = 1 | 2 | 3 | 4 | 5;

/**
 * Each flame's name in the catalogs. A closed map rather than a key built
 * from the id, so every name is a literal the catalogs can be checked for.
 */
export const TIER_NAME: Record<TierId, string> = {
  spark: "streak.tier.spark",
  candle: "streak.tier.candle",
  lamp: "streak.tier.lamp",
  crown: "streak.tier.crown",
  allFlame: "streak.tier.allFlame",
};

/** A whole count of days, never below 0. */
function days(count: number): number {
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
}

/** The flame a streak of `count` days carries, or null before the first day. */
export function tierFor(count: number): Tier | null {
  const n = days(count);
  let found: Tier | null = null;
  for (const tier of TIERS) if (n >= tier.at) found = tier;
  return found;
}

/**
 * The design to draw for a streak of `count` days: its flame's, or the
 * first one's before there is any, so an unlit flame keeps the first shape.
 */
export function tierLevel(count: number): TierLevel {
  const tier = tierFor(count);
  return (tier ? TIERS.indexOf(tier) + 1 : 1) as TierLevel;
}

/** The next flame above `count`, and how many days are left to it. */
export function nextTier(count: number): { tier: Tier; left: number } | null {
  const n = days(count);
  for (const tier of TIERS) if (n < tier.at) return { tier, left: tier.at - n };
  return null;
}

export type LadderStep = {
  tier: Tier;
  level: TierLevel;
  /** lit: reached by the streak now. next: the one it is going for. later: past that. */
  state: "lit" | "next" | "later";
  /** The highest lit flame: the one the streak carries. */
  current: boolean;
  /** Days to go, for the next flame only. */
  left: number | null;
};

/** Every flame, lowest first, as the streak sheet lists them. */
export function tierLadder(count: number): LadderStep[] {
  const n = days(count);
  const now = tierFor(n);
  const next = nextTier(n);
  return TIERS.map((tier, i) => ({
    tier,
    level: (i + 1) as TierLevel,
    state: n >= tier.at ? "lit" : next?.tier.id === tier.id ? "next" : "later",
    current: now?.id === tier.id,
    left: next?.tier.id === tier.id ? next.left : null,
  }));
}
