import { describe, expect, it } from "vitest";

import { paceAgainstPlan, planAtMonth } from "@/lib/invest/plan";

import { laterTargets, planChart, planSentence, usdShort } from "../planChart";

/**
 * Strategy's one chart, his pick B on r3-17 (2026-10-30): the plan dashed to
 * Year 1 on a log scale, today's counted point lit, the gap between them,
 * and the pace in words. The plan's own figures are lib/invest/plan.ts; the
 * counted figures below are made up.
 */

const NOW = new Date("2026-10-30T12:00:00Z");

describe("the plan chart", () => {
  it("says money short", () => {
    expect(usdShort(3640.4)).toBe("$3,640");
    expect(usdShort(102_000)).toBe("$102K");
    expect(usdShort(-5)).toBe("$0");
  });

  it("draws the plan from the day it was set to Year 1, on a log scale", () => {
    const c = planChart({ now: NOW, actual: 2240, width: 760, height: 300 });
    expect(c.planPath.startsWith(`M${c.start.x} `)).toBe(true);
    expect(c.end.label).toBe("$102K a year, Year 1");
    // Equal distance per power of ten: steady growth is a straight line.
    const ys = c.yTicks.map((t) => t.y);
    expect(c.yTicks.map((t) => t.label)).toEqual(["$1K", "$10K", "$100K"]);
    expect(Math.abs(ys[0] - ys[1] - (ys[1] - ys[2]))).toBeLessThan(0.2);
    // Today sits between launch and Year 1.
    expect(c.today.x).toBeGreaterThan(c.box.left);
    expect(c.today.x).toBeLessThan(c.end.x);
  });

  it("lights today's counted point and measures the gap to the plan", () => {
    const c = planChart({ now: NOW, actual: 2240, width: 760, height: 300 });
    const month = (NOW.getTime() - Date.parse("2026-05-19T00:00:00Z")) / ((365.25 / 12) * 86_400_000);
    expect(c.today.planned).toBeCloseTo(planAtMonth(month).total, 6);
    expect(c.today.gap).toBeCloseTo(2240 - c.today.planned, 6);
    // Below the plan, so lower on the chart (a larger y).
    expect(c.today.actualAt!.y).toBeGreaterThan(c.today.plannedAt.y);
    // One point is not a line: the counted line waits for the months.
    expect(c.countedPath).toBeNull();
  });

  it("draws the counted line once months are kept", () => {
    const c = planChart({ now: NOW, actual: 2240, counted: [{ month: 4, usd: 1439 }], width: 760, height: 300 });
    expect(c.countedPath).toMatch(/^M[\d.]+ [\d.]+ L[\d.]+ [\d.]+$/);
  });

  it("draws no counted point when the live read failed", () => {
    const c = planChart({ now: NOW, actual: null, width: 360, height: 250, compact: true });
    expect(c.today.actualAt).toBeNull();
    expect(c.today.gap).toBeNull();
    expect(c.xTicks.map((t) => t.label)).toEqual(["May", "Today", "Year 1"]);
  });

  it("names the year's turn on the computer's axis", () => {
    const c = planChart({ now: NOW, actual: 2240, width: 760, height: 300 });
    expect(c.xTicks.map((t) => t.label)).toEqual(["Launch, May 2026", "Today", "January", "Year 1, May 2027"]);
  });
});

describe("the pace in words", () => {
  it("says behind, and what Year 1 asks of every month", () => {
    const pace = paceAgainstPlan(1000, NOW);
    expect(planSentence(pace)).toMatch(/^\$[\d,]+ behind\. Year 1 needs \d+% a month for \d+ months\.$/);
  });

  it("says on plan within the band, and ahead above it", () => {
    const planned = planAtMonth((NOW.getTime() - Date.parse("2026-05-19T00:00:00Z")) / ((365.25 / 12) * 86_400_000)).total;
    expect(planSentence(paceAgainstPlan(planned, NOW))).toMatch(/^On plan, within 5% either side\. /);
    expect(planSentence(paceAgainstPlan(planned * 2, NOW))).toMatch(/ ahead\. /);
    expect(planSentence(null)).toContain("did not load");
  });

  it("names Years 2 and 3 at the edge, from the plan's own targets", () => {
    expect(laterTargets()).toBe("Then $250K by Year 2 and $500K by Year 3, the plan's own targets.");
  });
});
