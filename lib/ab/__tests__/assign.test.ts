import { describe, expect, it } from "vitest";

import { armOf, fraction } from "../assign";

// Which version a device shows (1.9): from a seed that never leaves it
// (docs/1.9-build/notes/onboarding-fable.md, 4.1).

const seeds = Array.from({ length: 4000 }, (_, i) => `seed-${i}-${(i * 2654435761) >>> 0}`);
const test = { id: "day1-guided", arms: ["a", "b"], share: 1 };

describe("a device's arm", () => {
  it("is the same every time it is worked out", () => {
    for (const seed of seeds.slice(0, 200)) expect(armOf(test, seed)).toBe(armOf(test, seed));
  });

  it("splits devices evenly between the arms", () => {
    const b = seeds.filter((s) => armOf(test, s) === "b").length;
    expect(b / seeds.length).toBeGreaterThan(0.46);
    expect(b / seeds.length).toBeLessThan(0.54);
    const three = { ...test, arms: ["a", "b", "c"] };
    for (const arm of three.arms) {
      const n = seeds.filter((s) => armOf(three, s) === arm).length / seeds.length;
      expect(n, arm).toBeGreaterThan(0.29);
      expect(n, arm).toBeLessThan(0.38);
    }
  });

  it("in one test says nothing of its arm in another", () => {
    const other = { id: "door-led", arms: ["a", "b"], share: 1 };
    const inB = seeds.filter((s) => armOf(test, s) === "b");
    const alsoB = inB.filter((s) => armOf(other, s) === "b").length;
    expect(alsoB / inB.length).toBeGreaterThan(0.44);
    expect(alsoB / inB.length).toBeLessThan(0.56);
  });

  it("is none for a device outside the test's share, and widening the share moves nobody already in", () => {
    const tenth = { ...test, share: 0.1 };
    const half = { ...test, share: 0.5 };
    const inTenth = seeds.filter((s) => armOf(tenth, s) !== null);
    expect(inTenth.length / seeds.length).toBeGreaterThan(0.07);
    expect(inTenth.length / seeds.length).toBeLessThan(0.13);
    for (const s of inTenth) expect(armOf(half, s)).toBe(armOf(tenth, s));
    for (const s of inTenth) expect(armOf(test, s)).toBe(armOf(tenth, s));
  });

  it("is none for a device that could keep no seed", () => {
    expect(armOf(test, "")).toBeNull();
  });

  it("comes from a number from 0 up to 1", () => {
    for (const s of seeds.slice(0, 500)) {
      const f = fraction(s, "x");
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
    }
  });
});
