// The streak's flames (lib/streak/tiers.ts, lib/streak/flames.ts).
//
// What a reader would notice if this broke: the top bar's flame changing a
// day early or late, the sheet calling a flame lit that the streak has not
// reached, a flame named by its catalog key in some language, or a flame
// drawn in the gold the owner has banned from Purify's screens.

import { describe, expect, it } from "vitest";

import { getMessages } from "@/lib/i18n";
import { LOCALES } from "@/lib/i18n/locales";
import { MILESTONES } from "../compute";
import { EMBER, FLAMES, PENDING_STOPS } from "../flames";
import { TIER_NAME, TIERS, nextTier, tierFor, tierLadder, tierLevel, type TierLevel } from "../tiers";

describe("the flames", () => {
  it("are five, from the first day kept to a year, each further than the last", () => {
    expect(TIERS.map((t) => t.at)).toEqual([1, 7, 40, 100, 365]);
    expect(new Set(TIERS.map((t) => t.id)).size).toBe(TIERS.length);
  });

  it("arrive on the days the streak badges do, so a flame and a badge come together", () => {
    const at = TIERS.map((t) => t.at as number);
    for (const m of MILESTONES) expect(at, `badge at ${m}`).toContain(m);
  });

  it("follow the streak as it stands: nothing before the first day, then the highest reached", () => {
    expect(tierFor(0)).toBeNull();
    const cases: [number, string][] = [
      [1, "spark"],
      [6, "spark"],
      [7, "candle"],
      [39, "candle"],
      [40, "lamp"],
      [99, "lamp"],
      [100, "crown"],
      [364, "crown"],
      [365, "allFlame"],
      [5000, "allFlame"],
    ];
    for (const [days, id] of cases) expect(tierFor(days)?.id, `${days} days`).toBe(id);
  });

  it("draw the first design for no streak, and one design per flame after", () => {
    expect([0, 1, 6, 7, 40, 100, 365, 900].map(tierLevel)).toEqual([1, 1, 1, 2, 3, 4, 5, 5]);
  });

  it("read a count that is not one as no streak", () => {
    for (const odd of [-3, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(tierFor(odd), String(odd)).toBeNull();
      expect(tierLevel(odd), String(odd)).toBe(1);
    }
    // A part of a day is not a day.
    expect(tierFor(6.9)?.id).toBe("spark");
  });

  it("name the next flame and the days left to it, until the last is reached", () => {
    expect(nextTier(0)).toEqual({ tier: TIERS[0], left: 1 });
    expect(nextTier(6)).toEqual({ tier: TIERS[1], left: 1 });
    expect(nextTier(7)).toEqual({ tier: TIERS[2], left: 33 });
    expect(nextTier(364)).toEqual({ tier: TIERS[4], left: 1 });
    expect(nextTier(365)).toBeNull();
  });
});

describe("the ladder in the streak sheet", () => {
  const states = (days: number) => tierLadder(days).map((s) => s.state);

  it("lights what the streak has reached, names the next, and dims the rest", () => {
    expect(states(0)).toEqual(["next", "later", "later", "later", "later"]);
    expect(states(12)).toEqual(["lit", "lit", "next", "later", "later"]);
    expect(states(100)).toEqual(["lit", "lit", "lit", "lit", "next"]);
    expect(states(400)).toEqual(["lit", "lit", "lit", "lit", "lit"]);
  });

  it("gives the days to go on the next flame only", () => {
    const ladder = tierLadder(12);
    expect(ladder.map((s) => s.left)).toEqual([null, null, 28, null, null]);
  });

  it("marks one flame as the streak's own, the highest lit, and none before the first day", () => {
    for (const days of [1, 6, 7, 45, 150, 365, 1000]) {
      const own = tierLadder(days).filter((s) => s.current);
      expect(own, `${days} days`).toHaveLength(1);
      expect(own[0].tier.id).toBe(tierFor(days)?.id);
      expect(own[0].state).toBe("lit");
    }
    expect(tierLadder(0).some((s) => s.current)).toBe(false);
  });

  it("draws each step in its own flame's design, in order", () => {
    expect(tierLadder(12).map((s) => s.level)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("the flames' names", () => {
  it("are in every language, and no two flames share one", () => {
    for (const { code } of LOCALES) {
      const m = getMessages(code);
      const names = TIERS.map((t) => m[TIER_NAME[t.id]]);
      for (const [i, name] of names.entries()) {
        expect(typeof name === "string" && name.trim().length > 0, `${code} ${TIERS[i].id}`).toBe(true);
        expect(name, `${code} ${TIERS[i].id}`).not.toBe(TIER_NAME[TIERS[i].id]);
      }
      expect(new Set(names).size, code).toBe(names.length);
      // The words the sheet sets beside them.
      for (const key of ["streak.tiersTitle", "streak.tierNow", "streak.tierLit"]) {
        expect(m[key], `${code} ${key}`).toBeTruthy();
      }
    }
  });
});

/** Hue in degrees, saturation and lightness (0 to 1) of a #rrggbb colour. */
function hsl(hex: string): { h: number; s: number; l: number } {
  const n = Number.parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return { h, s, l };
}

/** Every colour a flame can be drawn in. */
function colours(): string[] {
  const out: string[] = [];
  for (const level of [1, 2, 3, 4, 5] as TierLevel[]) {
    const f = FLAMES[level];
    for (const stops of [f.outerStops, f.mid?.stops ?? [], f.core.stops]) for (const [, c] of stops) out.push(c);
  }
  for (const stops of [PENDING_STOPS, EMBER.outerStops, EMBER.coreStops]) for (const [, c] of stops) out.push(c);
  return out;
}

describe("the flames' colours", () => {
  it("are all red: no gold, no yellow, no orange, at any flame", () => {
    // The owner keeps the streak red, and has banned yellow and gold from
    // Purify's screens (even the antique #c9a25a was "vibe coded yellow").
    // Near-white hearts and near-black feet carry no hue a reader can see.
    const off = colours().filter((c) => {
      const { h, s, l } = hsl(c);
      if (s < 0.2 || l > 0.88 || l < 0.08) return false;
      return h > 15 && h < 340;
    });
    expect(off).toEqual([]);
  });

  it("carry none of the Premium or festal golds", () => {
    const gold = ["#c9a25a", "#e2c68b", "#efd9a3", "#d6b877", "#d4af37", "#ffd700"];
    for (const c of colours()) expect(gold, c).not.toContain(c.toLowerCase());
  });

  it("give every flame its own outline", () => {
    const outlines = ([1, 2, 3, 4, 5] as TierLevel[]).map((l) => FLAMES[l].outer);
    expect(new Set(outlines).size).toBe(5);
  });

  it("keep the first flame as the streak has always drawn it", () => {
    expect(FLAMES[1].outerStops.map(([, c]) => c)).toEqual(["#ff6a4d", "#e8322b", "#a3161d"]);
    expect(FLAMES[1].core.stops.map(([, c]) => c)).toEqual(["#ffe1d6", "#ff7a66"]);
    expect(FLAMES[1].mid).toBeUndefined();
  });
});
