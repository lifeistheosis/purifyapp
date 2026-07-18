// Gift grant math. This is money-adjacent: a wrong answer here either steals
// paid time from a subscriber or hands out a longer subscription than gifted.

import { describe, it, expect } from "vitest";
import { computeGiftGrant } from "@/lib/gifts/grant";

const NOW = new Date("2026-07-18T00:00:00.000Z");
const iso = (s: string) => new Date(s).toISOString();

describe("computeGiftGrant — a gift extends, never truncates", () => {
  it("grants from now when the reader has nothing", () => {
    const g = computeGiftGrant(null, "plus", 30, NOW);
    expect(g.plusUntil).toBe(iso("2026-08-17T00:00:00Z"));
    expect(g.proUntil).toBeNull();
  });

  it("stacks on top of remaining Plus time instead of overwriting it", () => {
    const g = computeGiftGrant(
      { plus_until: "2027-01-01T00:00:00Z" },
      "plus",
      30,
      NOW,
    );
    expect(g.plusUntil).toBe(iso("2027-01-31T00:00:00Z"));
  });

  it("ignores expired time and grants from now", () => {
    const g = computeGiftGrant(
      { plus_until: "2020-01-01T00:00:00Z" },
      "plus",
      7,
      NOW,
    );
    expect(g.plusUntil).toBe(iso("2026-07-25T00:00:00Z"));
  });

  it("a Plus gift never touches pro_until (no silent demotion)", () => {
    const g = computeGiftGrant(
      { plus_until: null, pro_until: "2027-06-01T00:00:00Z" },
      "plus",
      30,
      NOW,
    );
    expect(g.proUntil).toBe("2027-06-01T00:00:00Z");
  });

  it("a Pro gift stacks on remaining Pro time and carries Plus with it", () => {
    const g = computeGiftGrant(
      { plus_until: "2026-08-01T00:00:00Z", pro_until: "2026-09-01T00:00:00Z" },
      "pro",
      30,
      NOW,
    );
    expect(g.proUntil).toBe(iso("2026-10-01T00:00:00Z"));
    // Plus was shorter than the new Pro window, so it follows Pro up.
    expect(g.plusUntil).toBe(iso("2026-10-01T00:00:00Z"));
  });

  it("a Pro gift never pulls an already-longer Plus window backwards", () => {
    const g = computeGiftGrant(
      { plus_until: "2030-01-01T00:00:00Z", pro_until: null },
      "pro",
      30,
      NOW,
    );
    expect(g.proUntil).toBe(iso("2026-08-17T00:00:00Z"));
    // Carried forward as-is, normalized: the longer Plus window wins.
    expect(g.plusUntil).toBe(iso("2030-01-01T00:00:00Z"));
  });

  it("treats an unparseable stored date as no time left", () => {
    const g = computeGiftGrant({ plus_until: "not-a-date" }, "plus", 10, NOW);
    expect(g.plusUntil).toBe(iso("2026-07-28T00:00:00Z"));
  });

  it("clamps a nonsense length rather than producing an invalid date", () => {
    const g = computeGiftGrant(null, "plus", -5, NOW);
    expect(g.plusUntil).toBe(iso("2026-07-18T00:00:00Z"));
  });
});
