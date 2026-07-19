// How grand a gift's casket and ceremony should be.
//
// A week of Plus and a year of Pro should not open the same way. Both axes
// count: the tier carries more weight than any single duration step, but a
// long Plus gift still outranks a short Pro one, so someone gifted a year is
// never handed the plainest box.
//
//   score = tier (Plus 0, Pro 2) + duration (30d 0 … 2y 4)
//
// Level 1 is a plain banded chest that simply opens. Level 5 is a jewelled
// reliquary with finials that strains, cracks its seal, holds, bursts, and
// blooms. Everything in between adds one visible thing at a time, so the
// levels are told apart at a glance rather than by degree.
//
// Pure and separately tested: the visual escalation is the product promise
// here, and a regression that flattens it would be invisible in review.

export type GiftLevel = 1 | 2 | 3 | 4 | 5;

export type GiftPresentation = {
  level: GiftLevel;
  /** Short name, shown in the preview harness (never to the reader). */
  name: string;
  casket: {
    /** Lid shape. The plainest casket is a flat slab; everything above it is
     * a gabled chasse roof, so the SILHOUETTE differs at a glance and not
     * just the surface detail. */
    lid: "slab" | "gable";
    /** Chased bands across the chest. */
    bands: boolean;
    /** Metal mounts at the four corners. */
    mounts: boolean;
    /** Raised feet under the chest. */
    feet: boolean;
    /** Jewel bosses set into the lid. */
    bosses: boolean;
    /** Filigree scrollwork flanking the cross. */
    filigree: boolean;
    /** Finials at the gable ends, and a cross at the apex. */
    finials: boolean;
    /** Edge-stroke opacity: how brightly the metal catches light. Kept high
     * enough to actually read on a near-black surface — the first pass drew
     * everything around 0.2 and every level looked identical. */
    gilt: number;
    /** 0-1: how pale the casket's own material is, graphite through pewter. */
    metal: number;
  };
  motion: {
    /** Does the casket shudder against the seal before it gives? */
    strain: boolean;
    strainMs: number;
    /** Does the wax split into halves, or just leave with the lid? */
    sealBreak: boolean;
    /** Stillness held after the seal gives, before the lid moves. */
    beatMs: number;
    lidMs: number;
    /** When the reveal takes over. */
    openTotalMs: number;
  };
  light: {
    /** Layers of turning rays: none, one, or two counter-turning. */
    rays: 0 | 1 | 2;
    embers: number;
    floodScale: number;
    mandorla: boolean;
    mandorlaScale: number;
  };
};

function durationScore(days: number): number {
  if (days >= 730) return 4;
  if (days >= 365) return 3;
  if (days >= 180) return 2;
  if (days >= 90) return 1;
  return 0;
}

/** score 0-6 → level 1-5 (the top and bottom of the range each absorb two). */
function levelForScore(score: number): GiftLevel {
  if (score <= 0) return 1;
  if (score === 1) return 2;
  if (score === 2) return 3;
  if (score <= 4) return 4;
  return 5;
}

export function giftLevel(tier: "plus" | "pro", days: number): GiftLevel {
  return levelForScore((tier === "pro" ? 2 : 0) + durationScore(days));
}

const LEVELS: Record<GiftLevel, Omit<GiftPresentation, "level">> = {
  1: {
    name: "Plain casket",
    // Flat slab lid: a different silhouette from every level above it.
    casket: {
      lid: "slab", bands: false, mounts: false, feet: false, bosses: false,
      filigree: false, finials: false, gilt: 0.4, metal: 0,
    },
    // Humble: no struggle, the lid simply lifts.
    motion: { strain: false, strainMs: 0, sealBreak: false, beatMs: 0, lidMs: 620, openTotalMs: 900 },
    light: { rays: 0, embers: 5, floodScale: 1.4, mandorla: false, mandorlaScale: 0 },
  },
  2: {
    name: "Banded casket",
    casket: {
      lid: "gable", bands: true, mounts: false, feet: false, bosses: false,
      filigree: false, finials: false, gilt: 0.55, metal: 0.16,
    },
    motion: { strain: true, strainMs: 300, sealBreak: false, beatMs: 60, lidMs: 700, openTotalMs: 1120 },
    light: { rays: 0, embers: 7, floodScale: 1.6, mandorla: false, mandorlaScale: 0 },
  },
  3: {
    name: "Sealed reliquary",
    casket: {
      lid: "gable", bands: true, mounts: true, feet: true, bosses: false,
      filigree: false, finials: false, gilt: 0.68, metal: 0.32,
    },
    // The seal starts mattering here: it visibly cracks.
    motion: { strain: true, strainMs: 420, sealBreak: true, beatMs: 90, lidMs: 780, openTotalMs: 1320 },
    light: { rays: 1, embers: 9, floodScale: 1.75, mandorla: true, mandorlaScale: 0.8 },
  },
  4: {
    name: "Jewelled reliquary",
    casket: {
      lid: "gable", bands: true, mounts: true, feet: true, bosses: true,
      filigree: true, finials: false, gilt: 0.82, metal: 0.5,
    },
    motion: { strain: true, strainMs: 520, sealBreak: true, beatMs: 130, lidMs: 840, openTotalMs: 1520 },
    light: { rays: 1, embers: 12, floodScale: 1.9, mandorla: true, mandorlaScale: 1 },
  },
  5: {
    name: "Great reliquary",
    casket: {
      lid: "gable", bands: true, mounts: true, feet: true, bosses: true,
      filigree: true, finials: true, gilt: 0.95, metal: 0.72,
    },
    // The longest hold, and the only one with two turning ray layers.
    motion: { strain: true, strainMs: 640, sealBreak: true, beatMs: 190, lidMs: 900, openTotalMs: 1820 },
    light: { rays: 2, embers: 16, floodScale: 2.1, mandorla: true, mandorlaScale: 1.18 },
  },
};

export function giftPresentation(
  tier: "plus" | "pro",
  days: number,
): GiftPresentation {
  const level = giftLevel(tier, days);
  return { level, ...LEVELS[level] };
}

/**
 * Ember launch offsets, spread evenly across the casket mouth. Derived rather
 * than hand-listed so a level's ember count is the only thing to change.
 */
export function emberOffsets(count: number): number[] {
  if (count <= 0) return [];
  const spread = 132;
  if (count === 1) return [0];
  return Array.from(
    { length: count },
    (_, i) => Math.round(-spread / 2 + (spread / (count - 1)) * i),
  );
}
