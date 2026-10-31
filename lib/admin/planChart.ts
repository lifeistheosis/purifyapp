/**
 * Strategy's one chart: the plan against what happened. His pick B on r3-17
 * (2026-10-30): "One chart answers how we are doing: the plan's curve to the
 * next milestone (dashed), revenue as counted (solid), today lit, the gap
 * between them, and the pace Year 1 needs in words; Years 2 and 3 are named
 * at its edge."
 *
 * Revenue a year on a LOG scale from launch to Year 1, because the plan
 * compounds (lib/invest/plan.ts): on a log scale steady growth is a straight
 * line, so a month that falls behind shows as a bend, and $1K and $100K both
 * fit one card.
 *
 * WHAT THE COUNTED LINE CAN SAY TODAY. Nothing keeps revenue a month by
 * month yet, so the counted line is today's point alone (the live run rate,
 * lib/invest/live.ts). Its past needs one figure a month kept from now on:
 * the table for it is proposed, not added (boards/purify-master/r18/
 * admin-sql/strategy-monthly-revenue.sql waits on his OK). When it exists,
 * `counted` takes those months and the solid line draws itself.
 *
 * Pure geometry and words: the plan, today's figure and a size in, an SVG's
 * worth of coordinates out. components/owner/InvestorPanel.tsx draws it.
 */

import { INVESTOR_PLAN, monthsSinceLaunch, planAtMonth, planYears, type Pace } from "@/lib/invest/plan";

export type ChartPoint = { x: number; y: number };

export type PlanChart = {
  width: number;
  height: number;
  /** The plot's box inside the SVG. */
  box: { left: number; right: number; top: number; bottom: number };
  /** The plan, dashed: from the day it was set to Year 1. */
  planPath: string;
  /** Months counted so far, solid. Today's point alone until monthly figures are kept. */
  countedPath: string | null;
  start: ChartPoint & { label: string };
  end: ChartPoint & { target: number; label: string };
  today: {
    x: number;
    planned: number;
    plannedAt: ChartPoint;
    /** Null when the live read failed: there is nothing counted to draw. */
    actual: number | null;
    actualAt: ChartPoint | null;
    /** actual minus planned; null without an actual. */
    gap: number | null;
  };
  yTicks: { usd: number; y: number; label: string }[];
  xTicks: { month: number; x: number; label: string }[];
};

/** "$3,640" under ten thousand, "$102K" above. */
export function usdShort(n: number): string {
  const v = Math.max(0, n);
  if (v >= 10_000) return `$${Math.round(v / 1000).toLocaleString("en-US")}K`;
  return `$${Math.round(v).toLocaleString("en-US")}`;
}

const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Months after launch at the first of the next January, the year's turn on the axis. */
function nextJanuary(now: Date): number {
  return monthsSinceLaunch(new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1)));
}

export function planChart(opts: {
  now: Date;
  /** Revenue a year counted today; null when it could not be read. */
  actual: number | null;
  /** Revenue a year counted at the end of each past month, oldest first, once they are kept. */
  counted?: { month: number; usd: number }[];
  width: number;
  height: number;
  /** A phone's chart: fewer words on the axis. */
  compact?: boolean;
}): PlanChart {
  const { now, actual, width, height, compact = false } = opts;
  const year1 = planYears()[0];
  const startMonth = INVESTOR_PLAN.start.month;
  const startUsd = INVESTOR_PLAN.start.subscriptions + INVESTOR_PLAN.start.shop;
  const todayMonth = Math.min(year1.month, Math.max(0, monthsSinceLaunch(now)));
  const planned = planAtMonth(todayMonth).total;

  // The y domain: a power of ten under the smallest figure drawn, and a
  // little room over Year 1's target.
  const smallest = Math.min(startUsd, planned, ...(actual && actual > 0 ? [actual] : []), ...(opts.counted ?? []).map((c) => c.usd).filter((u) => u > 0));
  const lo = Math.pow(10, Math.floor(Math.log10(Math.max(1, smallest))));
  const hi = year1.total * 1.35;

  const box = compact
    ? { left: 38, right: width - 12, top: 16, bottom: height - 26 }
    : { left: 52, right: width - 96, top: 22, bottom: height - 30 };
  const x = (month: number) => box.left + (month / year1.month) * (box.right - box.left);
  const y = (usd: number) => {
    const v = Math.min(hi, Math.max(lo, usd));
    return box.bottom - ((Math.log10(v) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo))) * (box.bottom - box.top);
  };
  const r = (n: number) => Math.round(n * 10) / 10;

  // The plan, sampled every tenth of a month from the day it was set.
  const steps: string[] = [];
  for (let m = startMonth; m <= year1.month + 1e-9; m += 0.1) {
    steps.push(`${steps.length ? "L" : "M"}${r(x(m))} ${r(y(planAtMonth(m).total))}`);
  }

  const months = [...(opts.counted ?? []).filter((c) => c.month < todayMonth)].sort((a, b) => a.month - b.month);
  const countedPoints = [...months.map((c) => ({ x: x(c.month), y: y(c.usd) })), ...(actual !== null ? [{ x: x(todayMonth), y: y(actual) }] : [])];
  const countedPath =
    countedPoints.length > 1 ? countedPoints.map((p, i) => `${i ? "L" : "M"}${r(p.x)} ${r(p.y)}`).join(" ") : null;

  const yTicks: PlanChart["yTicks"] = [];
  const tick = (usd: number) => (usd >= 1e6 ? `$${usd / 1e6}M` : usd >= 1000 ? `$${usd / 1000}K` : `$${usd}`);
  for (let p = Math.log10(lo); Math.pow(10, p) <= hi; p++) {
    const usd = Math.pow(10, p);
    yTicks.push({ usd, y: r(y(usd)), label: tick(usd) });
  }

  const launch = new Date(`${INVESTOR_PLAN.launch}T12:00:00Z`);
  const end = new Date(`${year1.ends}T12:00:00Z`);
  const january = nextJanuary(now);
  const xTicks: PlanChart["xTicks"] = [
    { month: 0, x: r(x(0)), label: compact ? MONTH[launch.getUTCMonth()] : `Launch, ${MONTH[launch.getUTCMonth()]} ${launch.getUTCFullYear()}` },
    { month: todayMonth, x: r(x(todayMonth)), label: "Today" },
    ...(!compact && january < year1.month && Math.abs(january - todayMonth) > 1.2 && year1.month - january > 1.2
      ? [{ month: january, x: r(x(january)), label: "January" }]
      : []),
    { month: year1.month, x: r(x(year1.month)), label: compact ? "Year 1" : `Year 1, ${MONTH[end.getUTCMonth()]} ${end.getUTCFullYear()}` },
  ];

  return {
    width,
    height,
    box,
    planPath: steps.join(" "),
    countedPath,
    start: { x: r(x(startMonth)), y: r(y(startUsd)), label: "the plan set" },
    end: { x: r(x(year1.month)), y: r(y(year1.total)), target: year1.total, label: `${usdShort(year1.total)} a year, ${year1.label}` },
    today: {
      x: r(x(todayMonth)),
      planned,
      plannedAt: { x: r(x(todayMonth)), y: r(y(planned)) },
      actual,
      actualAt: actual !== null ? { x: r(x(todayMonth)), y: r(y(actual)) } : null,
      gap: actual !== null ? actual - planned : null,
    },
    yTicks,
    xTicks,
  };
}

/** "$1,400 behind. Year 1 needs 74% a month for 7 months." */
export function planSentence(pace: Pace | null): string {
  if (!pace) return "The live figures did not load, so today's place against the plan is not known.";
  const where =
    pace.status === "on plan"
      ? "On plan, within 5% either side."
      : `${usdShort(Math.abs(pace.gap))} ${pace.status === "behind" ? "behind" : "ahead"}.`;
  if (!pace.next) return `${where} The plan's last year is reached.`;
  if (pace.next.monthlyGrowthNeeded === null) return `${where} With nothing counted yet, there is no pace to grow from.`;
  const months = Math.max(1, Math.ceil(pace.next.monthsLeft));
  return `${where} ${pace.next.label} needs ${Math.round(pace.next.monthlyGrowthNeeded * 100)}% a month for ${months} ${months === 1 ? "month" : "months"}.`;
}

/** The plan's own targets after the chart's edge: "Then $250K by Year 2 and $500K by Year 3." */
export function laterTargets(): string {
  const [, ...later] = planYears();
  if (later.length === 0) return "";
  const said = later.map((y) => `${usdShort(y.total)} by ${y.label}`);
  return `Then ${said.length > 1 ? `${said.slice(0, -1).join(", ")} and ${said[said.length - 1]}` : said[0]}, the plan's own targets.`;
}
