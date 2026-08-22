import { describe, expect, it } from "vitest";
import { ingestCsv, kindOf, shortLabel, windowValue } from "../ingest";
import { forecastIsUsable, forecastSeries, projectedFor } from "../forecast";
import { evaluateGoal, gradeAll, letterFor, overallGrade, standingFor } from "../grade";
import type { Goal, Series } from "../types";

const STAMP = "2026-08-22T00:00:00.000Z";

/**
 * A reduced Play Console audience export. The numbers are the real ones from
 * the operator's own file for the days shown, so the assertions below are
 * checkable against the source rather than against themselves.
 */
const AUDIENCE = `Date,"Installed audience (All users, Unique users, Per interval, Daily): All countries / regions","Installed audience (All users, Unique users, Per interval, Daily): United States",Notes
"Aug 12, 2026",840,131,
"Aug 13, 2026",848,129,
"Aug 14, 2026",883,136,
"Aug 15, 2026",893,143,Rollout of release: Started rollout of 67 (1.1) at 100%.
"Aug 16, 2026",896,141,
"Aug 17, 2026",937,150,
"Aug 18, 2026",932,151,
`;

const IMPRESSIONS = `Date,"Device impressions (Per interval, Daily): Google Play explore","Device impressions (Per interval, Daily): Paid and direct",Notes
"Aug 12, 2026",119,5,
"Aug 13, 2026",123,7,
"Aug 14, 2026",113,10,
"Aug 15, 2026",139,7,
"Aug 16, 2026",136,12,
"Aug 17, 2026",141,14,
"Aug 18, 2026",106,6,
`;

describe("stock versus flow", () => {
  it("recognises an installed audience as a level", () => {
    expect(kindOf("Installed audience (All users, Unique users, Per interval, Daily): Germany")).toBe("stock");
    expect(kindOf("Device impressions (Per interval, Daily): Google Play explore")).toBe("flow");
  });

  it("takes the latest value for a level and never sums it", () => {
    // THE defect this distinction exists to prevent. Summing seven days of an
    // installed audience gives 6,229 against a real figure of 932, and that
    // number would then be graded against a goal and reported as a triumph.
    const { dataset } = ingestCsv(AUDIENCE, "audience", STAMP);
    const total = dataset!.series[0];
    expect(total.kind).toBe("stock");
    const w = windowValue(total, 7);
    expect(w.value).toBe(932);
    expect(w.value).not.toBe(6229);
  });

  it("reports how far a level moved across the window", () => {
    const { dataset } = ingestCsv(AUDIENCE, "audience", STAMP);
    const total = dataset!.series[0];
    // Only 7 rows exist, so the window covers everything and the change spans
    // from the first measured point.
    expect(windowValue(total, 7).change).toBe(932 - 840);
  });

  it("sums a flow", () => {
    const { dataset } = ingestCsv(IMPRESSIONS, "impressions", STAMP);
    const explore = dataset!.series[0];
    expect(explore.kind).toBe("flow");
    expect(windowValue(explore, 7).value).toBe(119 + 123 + 113 + 139 + 136 + 141 + 106);
  });
});

describe("ingest", () => {
  it("reads every metric column and skips the notes", () => {
    const { dataset, errors } = ingestCsv(AUDIENCE, "audience", STAMP);
    expect(errors).toEqual([]);
    // Two real columns, each of which is a LEVEL and so gains a derived
    // daily-change flow at ingest. A daily goal on a level is met for ever once
    // crossed, so the change is the only thing a daily target can honestly
    // measure. See lib/admin/insights/derive.ts.
    const real = dataset!.series.filter((s) => s.kind === "stock");
    const derived = dataset!.series.filter((s) => s.kind === "flow");
    expect(real.map((s) => s.label)).toEqual(["Installed audience, total", "United States"]);
    expect(derived.map((s) => s.label)).toEqual([
      "Net new installs, total",
      "United States, daily change",
    ]);
  });

  it("derives the daily change from the real numbers", () => {
    const { dataset } = ingestCsv(AUDIENCE, "audience", STAMP);
    const netNew = dataset!.series.find((s) => s.label === "Net new installs, total")!;
    // 937 on the 17th, 932 on the 18th.
    expect(netNew.points[netNew.points.length - 1]).toEqual({ day: "2026-08-18", value: -5 });
  });

  it("dates the range in UTC", () => {
    const { dataset } = ingestCsv(AUDIENCE, "audience", STAMP);
    expect(dataset!.firstDay).toBe("2026-08-12");
    expect(dataset!.lastDay).toBe("2026-08-18");
  });

  it("shortens a Play Console header to something a legend can hold", () => {
    expect(
      shortLabel("Installed audience (All users, Unique users, Per interval, Daily): United States"),
    ).toBe("United States");
    expect(shortLabel("Device impressions (Per interval, Daily): Google Play explore")).toBe(
      "Google Play explore",
    );
  });

  it("refuses a file with no date column, and says what it did find", () => {
    const { dataset, errors } = ingestCsv("Country,Installs\nUS,5\n", "x", STAMP);
    expect(dataset).toBeNull();
    expect(errors[0]).toContain("No date column");
    expect(errors[0]).toContain("Country");
  });

  it("refuses a file with nothing numeric", () => {
    const { dataset, errors } = ingestCsv("Date,Name\n2026-08-12,alpha\n", "x", STAMP);
    expect(dataset).toBeNull();
    expect(errors[0]).toContain("No column held any numbers");
  });

  it("keeps the last row when a day appears twice", () => {
    const { dataset } = ingestCsv("Date,Installs\n2026-08-12,5\n2026-08-12,9\n", "x", STAMP);
    expect(dataset!.series[0].points).toHaveLength(1);
    expect(dataset!.series[0].points[0].value).toBe(9);
  });

  it("is a pure function of its inputs", () => {
    // The import stamp is passed in, not read from the clock, so the same file
    // twice is the same dataset twice.
    const a = ingestCsv(AUDIENCE, "audience", STAMP);
    const b = ingestCsv(AUDIENCE, "audience", STAMP);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe("forecast", () => {
  const rising: Series = {
    id: "r",
    label: "Rising",
    kind: "flow",
    source: "test",
    points: Array.from({ length: 20 }, (_, i) => ({
      day: `2026-08-${String(i + 1).padStart(2, "0")}`,
      value: 10 + i * 2,
    })),
  };

  it("finds a clean trend and calls it usable", () => {
    const f = forecastSeries(rising, 10);
    expect(f.slopePerDay).toBeCloseTo(2, 5);
    expect(f.fit).toBeCloseTo(1, 5);
    expect(forecastIsUsable(f)).toBe(true);
  });

  it("refuses to state a figure when the line explains nothing", () => {
    // The rule that keeps this honest. The operator's real impressions series
    // scores a fit of 0.055, and a projection off that is decoration.
    const noisy: Series = {
      ...rising,
      points: rising.points.map((p, i) => ({ ...p, value: i % 2 === 0 ? 100 : 5 })),
    };
    const f = forecastSeries(noisy, 10);
    expect(f.fit).toBeLessThan(0.5);
    expect(forecastIsUsable(f)).toBe(false);
  });

  it("never projects a negative count", () => {
    const falling: Series = {
      ...rising,
      points: rising.points.map((p, i) => ({ ...p, value: Math.max(0, 40 - i * 4) })),
    };
    const f = forecastSeries(falling, 30);
    expect(f.points.every((p) => (p.value ?? 0) >= 0)).toBe(true);
  });

  it("projects a level to the end of the horizon and a flow across it", () => {
    const f = forecastSeries(rising, 10);
    const asFlow = projectedFor(rising, f, 10);
    const asStock = projectedFor({ ...rising, kind: "stock" }, f, 10);
    expect(asFlow).toBeGreaterThan(asStock!);
  });

  it("treats a perfectly flat series as perfectly described", () => {
    const flat: Series = { ...rising, points: rising.points.map((p) => ({ ...p, value: 7 })) };
    const f = forecastSeries(flat, 5);
    expect(f.fit).toBe(1);
    expect(f.slopePerDay).toBeCloseTo(0, 6);
  });
});

describe("grading", () => {
  const goal = (over: Partial<Goal> = {}): Goal => ({
    id: "g1",
    seriesId: "installs",
    label: "Installs",
    period: "monthly",
    target: 100,
    paused: false,
    createdAt: STAMP,
    ...over,
  });

  const dataset = ingestCsv(
    "Date,installs\n2026-08-12,50\n2026-08-13,50\n",
    "d",
    STAMP,
  ).dataset!;

  it("anchors the scale so meeting the target is a C, not an A", () => {
    // A system that awards an A for hitting the number has nothing left to say
    // when something genuinely beats it.
    expect(letterFor(1)).toBe("C");
    expect(letterFor(1.3)).toBe("A");
    expect(letterFor(0.5)).toBe("F");
    expect(standingFor(1)).toBe("onTrack");
    expect(standingFor(1.2)).toBe("ahead");
    expect(standingFor(0.8)).toBe("behind");
  });

  it("scores a goal against the real window value", () => {
    const r = evaluateGoal(goal({ seriesId: dataset.series[0].id }), dataset);
    expect(r.actual).toBe(100);
    expect(r.ratio).toBe(1);
    expect(r.letter).toBe("C");
  });

  it("marks a goal whose series is absent as missing rather than failed", () => {
    // Failing it would blame the business for a data problem.
    const r = evaluateGoal(goal({ seriesId: "not-here" }), dataset);
    expect(r.missing).toBe(true);
    const g = gradeAll([goal({ seriesId: "not-here" })], dataset);
    expect(g.monthly.ratio).toBeNull();
    expect(g.monthly.letter).toBeNull();
  });

  it("ignores a paused goal entirely", () => {
    const g = gradeAll([goal({ seriesId: dataset.series[0].id, paused: true })], dataset);
    expect(g.monthly.results).toHaveLength(0);
    expect(g.monthly.ratio).toBeNull();
  });

  it("treats a zero target as met rather than dividing by it", () => {
    const r = evaluateGoal(goal({ seriesId: dataset.series[0].id, target: 0 }), dataset);
    expect(r.ratio).toBeNull();
    expect(r.standing).toBe("onTrack");
    expect(Number.isFinite(r.actual)).toBe(true);
  });

  it("averages ratios rather than summing values across goals", () => {
    // Summing would add impressions to installs and let the larger-numbered
    // metric decide the grade on its own.
    const ds = ingestCsv("Date,a,b\n2026-08-12,10,10\n", "d", STAMP).dataset!;
    const ids = ds.series.map((s) => s.id);
    const grades = gradeAll(
      [
        goal({ id: "x", seriesId: ids[0], target: 10 }),
        goal({ id: "y", seriesId: ids[1], target: 10 }),
      ],
      ds,
    );
    expect(grades.monthly.ratio).toBeCloseTo(1, 5);
  });

  it("caps a runaway metric so it cannot carry a failing period", () => {
    const ds = ingestCsv("Date,a,b\n2026-08-12,1000,50\n", "d", STAMP).dataset!;
    const ids = ds.series.map((s) => s.id);
    // Both columns must actually carry a value. With one empty the series is
    // correctly dropped for holding no numbers, only one goal scores, and a
    // single capped ratio is exactly the cap, which tests nothing about the
    // averaging this case exists to check.
    expect(ids).toHaveLength(2);
    const grades = gradeAll(
      [
        goal({ id: "x", seriesId: ids[0], target: 1 }),
        goal({ id: "y", seriesId: ids[1], target: 100000 }),
      ],
      ds,
    );
    // Uncapped the first ratio is 1000 and the mean is 500. Capped at 2 the
    // mean is about 1.005, which still says "one is fine and one is not".
    expect(grades.monthly.ratio!).toBeLessThan(2);
  });

  it("weights the month above the day in the headline", () => {
    const ds = ingestCsv("Date,a\n2026-08-12,100\n", "d", STAMP).dataset!;
    const id = ds.series[0].id;
    const grades = gradeAll(
      [
        goal({ id: "d", seriesId: id, period: "daily", target: 1000 }),
        goal({ id: "m", seriesId: id, period: "monthly", target: 100 }),
      ],
      ds,
    );
    const o = overallGrade(grades);
    // Daily is failing at 0.1, monthly is meeting at 1.0. Weighted 1:3 the
    // headline leans towards the month.
    expect(o.ratio!).toBeGreaterThan(0.55);
  });

  it("returns no grade at all when nothing is being measured", () => {
    const o = overallGrade(gradeAll([], null));
    expect(o.letter).toBeNull();
    expect(o.standing).toBeNull();
  });
});
