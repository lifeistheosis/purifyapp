import { describe, expect, it } from "vitest";

import { PERIODS } from "@/components/admin/hero";
import { HERO_LABELS, HERO_PERIODS, HERO_WINDOW } from "../heroPeriods";

/**
 * One rule, and it fails silently without a test.
 *
 * HeroRow resolves its window as `WINDOW[period] ?? 30`. A chip offered with no
 * matching entry does not throw and does not look broken: it falls back to
 * thirty days, so the control reads "Today" while the card shows a month. The
 * number is wrong and nothing says so, which is the worst shape a dashboard bug
 * can take.
 *
 * That fallback is worth keeping, because a missing window should degrade to a
 * sensible view rather than a crash in front of the operator. So the guard
 * belongs here instead.
 */
describe("every chip the hero offers means something", () => {
  it("has a window for each option, so none can fall back to thirty days", () => {
    const missing = HERO_PERIODS.filter((id) => HERO_WINDOW[id] === undefined);
    expect(
      missing,
      `offered with no window, so these would silently show 30 days: ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("offers no window it does not also show", () => {
    // The other direction. A window with no chip is dead config, and the next
    // person reads it as a supported option that is merely hidden.
    const orphans = Object.keys(HERO_WINDOW).filter(
      (id) => !HERO_PERIODS.includes(id as (typeof HERO_PERIODS)[number]),
    );
    expect(orphans).toEqual([]);
  });

  it("only offers ids that PERIODS actually defines", () => {
    // PeriodChips filters PERIODS by these ids. A typo would not error, it
    // would render one fewer chip than intended.
    const known = new Set(PERIODS.map((p) => p.id));
    for (const id of HERO_PERIODS) expect(known.has(id), id).toBe(true);
  });

  it("keeps the chips in PERIODS order, shortest window first", () => {
    const order = PERIODS.map((p) => p.id).filter((id) => HERO_PERIODS.includes(id));
    expect(HERO_PERIODS).toEqual(order);
    const days = HERO_PERIODS.map((id) => HERO_WINDOW[id]!);
    expect([...days].sort((a, b) => a - b)).toEqual(days);
  });

  it("relabels only ids it offers", () => {
    for (const id of Object.keys(HERO_LABELS)) {
      expect(
        HERO_PERIODS.includes(id as (typeof HERO_PERIODS)[number]),
        `${id} is relabelled but never shown`,
      ).toBe(true);
    }
  });

  it("calls the one day window Today, because the buckets are calendar days", () => {
    expect(HERO_WINDOW["24h"]).toBe(1);
    expect(HERO_LABELS["24h"]).toBe("Today");
  });
});
