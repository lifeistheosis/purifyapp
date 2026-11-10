import { describe, expect, it } from "vitest";

import { readersPerArm } from "../size";
import { SMALLEST_CELL, readable, summarizeTest, type AbRow } from "../summary";
import type { AbTest } from "../tests";

// A test's counts, and how many readers one needs (1.9;
// docs/1.9-build/notes/onboarding-fable.md, 4.2 and 4.3).

const test: AbTest = {
  id: "day1-guided",
  surface: "onboarding",
  arms: ["a", "b"],
  share: 1,
  begins: "2026-12-07",
  ends: "2026-12-27",
  outcome: "back on day 7",
  guard: "back on day 30",
  needs: 100,
};

const rows = (arm: string, exposed: number, returned: number): AbRow[] => [
  ...Array.from({ length: exposed }, () => ({ name: "ab_exposed", props: { test: test.id, arm, platform: "ios" } })),
  ...Array.from({ length: returned }, () => ({ name: "onboarding_returned", props: { day: 7, ab: `${test.id}:${arm}` } })),
];
const back7 = (r: AbRow) => r.name === "onboarding_returned" && r.props.day === 7;

describe("a test's counts", () => {
  it("are each arm's exposures, and of them how many reached the outcome", () => {
    const sum = summarizeTest(test, [...rows("a", 200, 40), ...rows("b", 210, 63)], back7);
    expect(sum).toEqual([
      { arm: "a", exposed: 200, reached: 40, rate: 0.2, enough: true },
      { arm: "b", exposed: 210, reached: 63, rate: 0.3, enough: true },
    ]);
  });

  it("count only this test's rows and only the outcome named", () => {
    const noise: AbRow[] = [
      { name: "ab_exposed", props: { test: "door-led", arm: "a", platform: "ios" } },
      { name: "onboarding_returned", props: { day: 30, ab: `${test.id}:a` } },
      { name: "onboarding_returned", props: { day: 7 } },
      { name: "onboarding_returned", props: { day: 7, ab: "door-led:a" } },
    ];
    const sum = summarizeTest(test, [...rows("a", 100, 25), ...noise], back7);
    expect(sum[0]).toMatchObject({ exposed: 100, reached: 25 });
  });

  it("never show a small cell", () => {
    const few = summarizeTest(test, [...rows("a", SMALLEST_CELL - 1, 3), ...rows("b", 150, SMALLEST_CELL - 1)], back7);
    expect(few[0]).toEqual({ arm: "a", exposed: null, reached: null, rate: null, enough: false });
    // Enough were shown it, too few came back to say how many did.
    expect(few[1]).toEqual({ arm: "b", exposed: 150, reached: null, rate: null, enough: true });
  });

  it("may be read only after its last day, with the readers it said it needs in every arm", () => {
    const full = summarizeTest(test, [...rows("a", 120, 30), ...rows("b", 130, 40)], back7);
    expect(readable(test, full, "2026-12-27")).toBe(false);
    expect(readable(test, full, "2026-12-28")).toBe(true);
    const short = summarizeTest(test, [...rows("a", 120, 30), ...rows("b", 60, 25)], back7);
    expect(readable(test, short, "2027-01-15")).toBe(false);
  });
});

describe("how many readers a test needs", () => {
  it("is about a thousand an arm to see day 7 return move from 20% to 25%", () => {
    expect(readersPerArm(0.2, 0.25)).toBeGreaterThan(1050);
    expect(readersPerArm(0.2, 0.25)).toBeLessThan(1150);
  });

  it("is far more for a small difference, and for a rare outcome", () => {
    expect(readersPerArm(0.2, 0.23)).toBeGreaterThan(2800);
    expect(readersPerArm(0.02, 0.03)).toBeGreaterThan(3700);
    expect(readersPerArm(0.6, 0.7)).toBeLessThan(400);
  });

  it("has no answer for no difference", () => {
    expect(readersPerArm(0.2, 0.2)).toBe(Infinity);
    expect(readersPerArm(0, 0.2)).toBe(Infinity);
  });
});
