import { describe, expect, it } from "vitest";

import { levelOne, NET_PER_MEMBER_CENTS } from "../level";

const base = { costsFrom: "lines" as const, paid: 17, trials: 5, cancelling: 5, newWeek: 142, newPrevWeek: 202 };

describe("levelOne", () => {
  it("measures net Plus against the costs and counts the members to go", () => {
    expect(NET_PER_MEMBER_CENTS).toBe(849);
    const l = levelOne({ ...base, netPlusCents: 14433, costsCents: 34700 });
    expect(l.pct).toBe(42);
    expect(l.reached).toBe(false);
    expect(l.remainingCents).toBe(20267);
    expect(l.membersToGo).toBe(24);
    expect(l.newChangePct).toBe(-30);
  });
  it("is reached at the costs, and caps at 100", () => {
    const l = levelOne({ ...base, netPlusCents: 50000, costsCents: 34700 });
    expect(l).toMatchObject({ pct: 100, reached: true, remainingCents: 0, membersToGo: 0 });
  });
  it("says nothing it cannot know while the costs are not read", () => {
    const l = levelOne({ ...base, netPlusCents: 14433, costsCents: null, costsFrom: null, newPrevWeek: 0 });
    expect(l).toMatchObject({ pct: null, reached: false, remainingCents: null, membersToGo: null, newChangePct: null });
  });
});
