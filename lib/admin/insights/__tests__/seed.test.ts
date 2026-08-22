import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { ingestCsv } from "../ingest";
import { alreadySeeded, seedGoals, seedRevenueGoals } from "../seed";
import type { Goal } from "../types";

const STAMP = "2026-08-22T00:00:00.000Z";

/**
 * Read against the owner's REAL export where it is present.
 *
 * Skipped rather than failed when the file is absent, because it lives in a
 * Downloads folder on one machine and CI has never seen it. The synthetic tests
 * below carry the contract; this one carries the reality check.
 */
const REAL_PATH =
  "C:/Users/Edgar/Downloads/All countries _ regions, United States, Philippines, Germany, South Africa.csv";

function realCsv(): string | null {
  try {
    return readFileSync(REAL_PATH, "utf8");
  } catch {
    return null;
  }
}

describe("seedGoals", () => {
  it("puts daily goals on flows, never on levels", () => {
    // The whole reason derive.ts exists. A daily target on a level is met for
    // ever once crossed, so a daily goal must land on the derived change.
    const { dataset } = ingestCsv(
      "Date,Installed audience (Daily): X\n" +
        Array.from({ length: 20 }, (_, i) => `2026-08-${String(i + 1).padStart(2, "0")},${100 + i * 5}`).join("\n"),
      "x",
      STAMP,
    );
    const goals = seedGoals(dataset);
    const stock = dataset!.series.find((s) => s.kind === "stock")!;
    const flow = dataset!.series.find((s) => s.kind === "flow")!;

    const daily = goals.filter((g) => g.period === "daily");
    expect(daily.length).toBeGreaterThan(0);
    for (const g of daily) expect(g.seriesId).toBe(flow.id);
    for (const g of daily) expect(g.seriesId).not.toBe(stock.id);
  });

  it("keeps the three windows in step at 1x, 7x and 30x", () => {
    const { dataset } = ingestCsv(
      "Date,Impressions (Daily): X\n" +
        Array.from({ length: 30 }, (_, i) => `2026-08-${String(i + 1).padStart(2, "0")},${50 + (i % 7) * 10}`).join("\n"),
      "x",
      STAMP,
    );
    const goals = seedGoals(dataset);
    const d = goals.find((g) => g.period === "daily")!;
    const w = goals.find((g) => g.period === "weekly")!;
    const m = goals.find((g) => g.period === "monthly")!;
    expect(w.target).toBe(d.target * 7);
    expect(m.target).toBe(d.target * 30);
  });

  it("refuses to place a target on too little history", () => {
    const { dataset } = ingestCsv(
      "Date,Impressions (Daily): X\n2026-08-01,5\n2026-08-02,6\n2026-08-03,7\n",
      "x",
      STAMP,
    );
    // Three days cannot tell you what a normal day looks like, and a target
    // guessed from them would be a number wearing authority it has not earned.
    expect(seedGoals(dataset).filter((g) => g.period === "daily")).toHaveLength(0);
  });

  it("carries the derivation on every proposal", () => {
    const { dataset } = ingestCsv(
      "Date,Impressions (Daily): X\n" +
        Array.from({ length: 20 }, (_, i) => `2026-08-${String(i + 1).padStart(2, "0")},${20 + i}`).join("\n"),
      "x",
      STAMP,
    );
    for (const g of seedGoals(dataset)) {
      expect(g.derivation.length).toBeGreaterThan(10);
    }
  });

  it("proposes nothing at all without a dataset", () => {
    expect(seedGoals(null)).toEqual([]);
  });
});

describe("seedRevenueGoals", () => {
  it("creates them PAUSED and at zero", () => {
    // A target set before there is any revenue grades the shop as failing every
    // day for reasons that have nothing to do with the shop, and a meter that
    // is red from birth teaches you to ignore the colour everywhere else.
    const goals = seedRevenueGoals("shop-revenue-daily");
    expect(goals).toHaveLength(3);
    for (const g of goals) {
      expect(g.paused).toBe(true);
      expect(g.target).toBe(0);
      expect(g.derivation).toContain("no order has been paid yet");
    }
  });
});

describe("alreadySeeded", () => {
  const proposal = { seriesId: "a", label: "A daily", period: "daily" as const, target: 10, paused: false, derivation: "" };
  const goal = (over: Partial<Goal> = {}): Goal => ({
    id: "g", seriesId: "a", label: "renamed by hand", period: "daily", target: 10,
    paused: false, createdAt: STAMP, ...over,
  });

  it("matches on series, period and target, ignoring the label", () => {
    // The label is the part an operator renames, so matching on it would let
    // seeding duplicate a goal they had simply retitled.
    expect(alreadySeeded([goal()], proposal)).toBe(true);
  });

  it("does not match a different period or target", () => {
    expect(alreadySeeded([goal({ period: "weekly" })], proposal)).toBe(false);
    expect(alreadySeeded([goal({ target: 11 })], proposal)).toBe(false);
  });
});

describe("against the owner's real export", () => {
  const csv = realCsv();
  const maybe = csv ? it : it.skip;

  maybe("derives a daily target on net new installs, not on the level", () => {
    const { dataset } = ingestCsv(csv!, "audience", STAMP);
    const goals = seedGoals(dataset);
    const daily = goals.filter((g) => g.period === "daily");
    expect(daily.length).toBeGreaterThan(0);
    for (const g of daily) {
      const s = dataset!.series.find((x) => x.id === g.seriesId)!;
      expect(s.kind).toBe("flow");
    }
  });

  maybe("places the total's daily target in the range the data supports", () => {
    const { dataset } = ingestCsv(csv!, "audience", STAMP);
    const netNew = dataset!.series.find((s) => s.label === "Net new installs, total")!;
    const g = seedGoals(dataset).find((x) => x.seriesId === netNew.id && x.period === "daily")!;

    // Measured: median gain +6 across the days since launch, +17 across the
    // last thirty. A target outside that band would be either free or
    // unreachable, and both make the streak meaningless.
    expect(g.target).toBeGreaterThanOrEqual(5);
    expect(g.target).toBeLessThanOrEqual(20);

    const values = netNew.points.filter((p) => p.value !== null).map((p) => p.value as number);
    const hit = values.filter((v) => v >= g.target).length / values.length;
    expect(hit).toBeGreaterThan(0.2);
    expect(hit).toBeLessThan(0.6);
  });

  maybe("proposes a reachable level goal above where the audience stands", () => {
    const { dataset } = ingestCsv(csv!, "audience", STAMP);
    const total = dataset!.series.find((s) => s.label === "Installed audience, total")!;
    const now = total.points[total.points.length - 1].value as number;
    const levels = seedGoals(dataset).filter((g) => g.seriesId === total.id);
    expect(levels.length).toBe(2);
    for (const g of levels) expect(g.target).toBeGreaterThan(now);
  });
});
