// The finger that opened a pill must not be the one that closes it. The why
// is in ../liftGuard.ts.

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { LIFT_MS, createLiftGuard } from "../liftGuard";

describe("a tap that is really a finger lifting", () => {
  it("is ignored for a moment after the lift, and no longer", () => {
    const g = createLiftGuard();
    g.noteLift(1000);
    expect(g.isLift(1000)).toBe(true);
    expect(g.isLift(1000 + LIFT_MS - 1)).toBe(true);
    expect(g.isLift(1000 + LIFT_MS)).toBe(false);
  });

  it("is not claimed before any finger has lifted: a mouse click is a click", () => {
    const g = createLiftGuard();
    expect(g.isLift(5000)).toBe(false);
  });

  it("counts only the first lift, so later taps are never mistaken for it", () => {
    const g = createLiftGuard();
    g.noteLift(1000);
    // The reader taps the backdrop a second later: its own touchend is not a new lift.
    g.noteLift(2000);
    expect(g.isLift(2001)).toBe(false);
  });

  it("starts over for the next pill", () => {
    const g = createLiftGuard();
    g.noteLift(1000);
    g.reset();
    expect(g.isLift(1001)).toBe(false);
    g.noteLift(3000);
    expect(g.isLift(3001)).toBe(true);
  });
});

describe("the pills that open under a held finger", () => {
  const toolbar = readFileSync("components/bible/MobileVerseToolbar.tsx", "utf8");
  const copyPill = readFileSync("components/native/PressToCopy.tsx", "utf8");

  it("both listen for the lift", () => {
    for (const [name, src] of [["the verse pill", toolbar], ["the Copy pill", copyPill]] as const) {
      // One guard for the life of the component: handed to useState to make once.
      expect(src, name).toMatch(/useState\(createLiftGuard\)/);
      expect(src, name).toMatch(/noteLift\(\)/);
      expect(src, name).toMatch(/isLift\(\)/);
    }
  });

  it("the verse pill's backdrop no longer closes on a bare onClose", () => {
    expect(toolbar).not.toMatch(/onClick=\{onClose\}/);
  });
});
