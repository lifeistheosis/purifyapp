import { describe, expect, it } from "vitest";

import {
  columns,
  formatValue,
  hasDigits,
  isMoneyText,
  REEL_ITEMS,
  REEL_REPEATS,
  reelDuration,
  restIndex,
} from "../odometer";

/**
 * The odometer's one real trap is column identity across a change of LENGTH.
 *
 * Everything else about it is visible the moment you open the panel: if a wheel
 * does not spin you see it immediately. This does not fail visibly. Keyed from
 * the left, 999 -> 1,000 hands the units column's DOM node to the thousands
 * digit, every wheel animates toward a digit that was never its neighbour, and
 * the result reads as a scramble that settles on the right answer. It looks
 * like a rendering glitch rather than a bug, so it survives review.
 */
describe("column identity", () => {
  it("keeps the units column when the number gains a digit", () => {
    const before = columns("999");
    const after = columns("1,000");

    const unitsBefore = before.find((c) => c.keyFromRight === 0);
    const unitsAfter = after.find((c) => c.keyFromRight === 0);

    // Same key, so React reuses the same wheel: 9 rolls to 0 in place.
    expect(unitsBefore?.char).toBe("9");
    expect(unitsAfter?.char).toBe("0");
    expect(unitsAfter?.digit).toBe(true);
  });

  it("gives the new leading digit a key nothing held before", () => {
    const before = columns("999");
    const after = columns("1,000");
    const keysBefore = new Set(before.map((c) => c.keyFromRight));
    const leading = after[0];

    expect(leading.char).toBe("1");
    expect(keysBefore.has(leading.keyFromRight)).toBe(false);
  });

  it("keeps every unchanged digit on its own key when the number shrinks", () => {
    // 1,010 -> 1,000: only the tens wheel should have anything to do.
    const before = new Map(columns("1,010").map((c) => [c.keyFromRight, c.char]));
    const after = new Map(columns("1,000").map((c) => [c.keyFromRight, c.char]));
    const moved = [...after.entries()].filter(([k, ch]) => before.get(k) !== ch);

    expect(moved).toEqual([[1, "0"]]);
  });

  it("treats separators and currency marks as static, not as wheels", () => {
    const cols = columns("$1,234.50");
    const statics = cols.filter((c) => !c.digit).map((c) => c.char);
    expect(statics).toEqual(["$", ",", "."]);
    expect(cols.filter((c) => c.digit)).toHaveLength(6);
  });
});

describe("money detection", () => {
  it("recognises the currencies the panel actually formats", () => {
    for (const s of ["$0", "$1,234.56", "£20", "€9", "¥100", "₽50"]) {
      expect(isMoneyText(s), s).toBe(true);
    }
  });

  it("does not hear a register in a plain count or a percentage", () => {
    for (const s of ["1,204", "0", "38%", "12 paid"]) {
      expect(isMoneyText(s), s).toBe(false);
    }
  });
});

describe("values with nothing to roll", () => {
  it("passes through the placeholders the cards actually use", () => {
    // RevenueTab renders "Not recorded" for a donations table with no rows,
    // deliberately, because not measured is not zero. It must not become a
    // wheel showing nothing.
    for (const s of ["Not recorded", "—", "n/a", ""]) {
      expect(hasDigits(s), s).toBe(false);
    }
  });

  it("still rolls a value that mixes digits with words", () => {
    expect(hasDigits("3 pending")).toBe(true);
  });
});

describe("formatting and stagger", () => {
  it("separates thousands for a raw number and leaves a string alone", () => {
    expect(formatValue(1234567)).toBe((1234567).toLocaleString());
    expect(formatValue("$1,234.56")).toBe("$1,234.56");
  });

  it("survives the non-finite values a failed poll can produce", () => {
    expect(formatValue(Number.NaN)).toBe("0");
    expect(formatValue(Number.POSITIVE_INFINITY)).toBe("0");
  });

  it("spins longer the further right a reel sits, and caps", () => {
    // Reels stop LEFT TO RIGHT, the way a fruit machine does, so the last
    // column is the one that decides. Each runs longer rather than starting
    // later: a delay would leave a reel sitting still beside spinning ones,
    // which reads as broken.
    expect(reelDuration(1)).toBeGreaterThan(reelDuration(0));
    expect(reelDuration(3)).toBeGreaterThan(reelDuration(2));
    // Capped, or a long number would still be spinning well after the eye had
    // given up on it.
    expect(reelDuration(20)).toBe(reelDuration(6));
  });
});

describe("the reel itself", () => {
  it("carries enough copies of 0-9 to read as a spin and not a slide", () => {
    // With one copy the furthest a wheel can travel is nine places, which is a
    // slide. That was the odometer this replaced.
    expect(REEL_REPEATS).toBeGreaterThanOrEqual(3);
    expect(REEL_ITEMS).toBe(REEL_REPEATS * 10);
  });

  it("rests on the LAST copy, so the spin runs the full strip", () => {
    // Resting in the first copy would stop the reel in the first tenth of its
    // travel, which is the same slide by another name.
    for (const d of [0, 4, 9]) {
      expect(restIndex(d)).toBe((REEL_REPEATS - 1) * 10 + d);
      expect(restIndex(d)).toBeGreaterThanOrEqual(20);
    }
  });

  it("rests on a position that shows the right digit", () => {
    // The whole safety property: the element's resting transform IS the
    // answer, so a reel whose animation is throttled or skipped still reads
    // correctly. restIndex mod 10 must be the digit.
    for (let d = 0; d <= 9; d++) expect(restIndex(d) % 10).toBe(d);
  });
});
