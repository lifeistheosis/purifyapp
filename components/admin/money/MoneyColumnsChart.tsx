"use client";

/**
 * Money's chart, drawn the same wherever it is shown: all the money by day
 * or month, the shop, Plus and the EIKON Box each in its own colour, a plan
 * the product name does not say in the chart's own ink, and refunds under
 * the line (his word, 2026-11-12: "show everything related to money on the
 * timeline"; lib/admin/moneyChart.ts says what each series holds). Money's
 * Overview draws it for its period; Revenue draws it for All time, by month,
 * where a shop-only chart used to be.
 *
 * Handed a reply of /api/admin/money, it draws the chart and says under it
 * what it holds and what it cannot: its net and its one amount, and where
 * subscriptions are not known.
 */

import type { MoneyChart } from "@/lib/admin/moneyChart";
import { SENSITIVE } from "@/lib/admin/streamer";
import { formatPrice } from "@/lib/shop/format";

import { Quiet, StackedColumns, type StackSeries } from "../daily/parts";

/** The parts of a /api/admin/money reply the chart reads. */
export type MoneyChartPayload = {
  period: string;
  label: string;
  beforeLabel: string;
  since: string;
  /** Where the period before starts; `since` itself for All time, which has none. */
  beforeSince: string;
  buckets: "day" | "month";
  cameIn: { plusSource?: "revenuecat" | "events" | "estimate" | null };
  /** Null when the orders could not be read. */
  chart: MoneyChart | null;
};

const usd = (cents: number) => formatPrice(cents, "usd");

/**
 * The chart's series, from the line up, then what went back under it. Each
 * source the chart can tell apart has its own colour; a subscription it
 * cannot (its product names no plan) stays in the chart's own ink, his "all
 * white" (2026-11-12). lib/admin/moneyChart.ts says what each one holds.
 */
const SHOP: StackSeries = { key: "shop", label: "Shop", color: "var(--adm-money-shop)" };
const SUBSCRIPTIONS: StackSeries[] = [
  { key: "plus", label: "Plus", color: "var(--adm-money-plus)" },
  { key: "box", label: "EIKON Box (Pro)", color: "var(--adm-money-box)" },
  { key: "unnamed", label: "Plan not named", color: "var(--adm-money-all)", optional: true },
];
const REFUNDS: StackSeries = { key: "refunds", label: "Refunds", color: "var(--adm-money-back)", below: true, optional: true };

const shortDay = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** One label a bucket, for the pick and the table: "Nov 3", "Nov 2026"; the last is still running. */
function bucketLabels(p: MoneyChartPayload, length: number): string[] {
  const since = new Date(p.since);
  return Array.from({ length }, (_, k) => {
    const s =
      p.buckets === "month"
        ? new Date(Date.UTC(since.getUTCFullYear(), since.getUTCMonth() + k, 1)).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" })
        : new Date(since.getTime() + k * 86_400_000).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    return k === length - 1 ? `${s}, so far` : s;
  });
}

/**
 * What the chart says under itself: its net and the one amount it is drawn
 * in, then whatever it does not hold and why, so a missing source never reads
 * as no money.
 */
function chartNotes(p: MoneyChartPayload, c: MoneyChart): string[] {
  const notes = [`${usd(c.totals.net)} net: what came in less refunds, after the stores' cut and before Stripe's fees.`];
  if (c.subs === "absent") notes.push("Plus and the EIKON Box are not on it: this server does not keep subscription payments yet.");
  else if (c.subs === "unavailable") notes.push("Plus and the EIKON Box are not on it: their payments could not be read just now.");
  else if (c.subsFrom === null) notes.push("No subscription payment has been kept yet. Plus and the EIKON Box join the chart with the first.");
  else {
    if (c.subsFromIndex !== null && c.subsFromIndex > 0) {
      notes.push(`Plus and the EIKON Box are drawn from ${shortDay(c.subsFrom)}, when the first payment was kept; the shaded part before it holds the shop alone.`);
    } else if (p.beforeLabel && c.subsFrom > p.beforeSince.slice(0, 10)) {
      notes.push(`The dashed ${p.beforeLabel} holds Plus and the EIKON Box only from ${shortDay(c.subsFrom)}, when the first payment was kept.`);
    }
    if (p.cameIn.plusSource === "revenuecat") {
      notes.push("Came in takes Plus and the EIKON Box from RevenueCat's own total for the period, which has no days; the chart draws each payment kept, so the two can differ a little.");
    } else if (p.cameIn.plusSource === "estimate") {
      notes.push("Came in estimates Plus and the EIKON Box for the whole period; the chart draws only the payments kept.");
    }
  }
  return notes;
}

/** The marks under the chart: the period's first bucket, its middle, and today. */
function marksFor(p: MoneyChartPayload, length: number): [string, string, string] {
  const since = new Date(p.since);
  if (p.buckets === "month") {
    const at = (k: number) =>
      new Date(Date.UTC(since.getUTCFullYear(), since.getUTCMonth() + k, 1)).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
    return [at(0), at(Math.floor(length / 2)), "now"];
  }
  const at = (k: number) =>
    new Date(since.getTime() + k * 86_400_000).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return [at(0), at(Math.floor(length / 2)), "today"];
}


/** The chart and its notes, or why there is none. */
export function MoneyColumnsChart({ p, height = 150 }: { p: MoneyChartPayload; height?: number }) {
  const c = p.chart;
  if (!c) return <Quiet className="py-6">The orders could not be read just now.</Quiet>;
  const series = c.subs === "kept" ? [SHOP, ...SUBSCRIPTIONS, REFUNDS] : [SHOP, REFUNDS];
  return (
    <div className={SENSITIVE}>
      <StackedColumns
        height={height}
        label={`All the money ${p.buckets === "month" ? "by month" : "by day"}, ${p.label}: ${usd(c.totals.net)} net`}
        series={series}
        values={c.current.map((col) => series.map((s) => col[s.key as keyof typeof col]))}
        before={c.before}
        days={bucketLabels(p, c.current.length)}
        valueText={(v) => (v < 0 ? `\u2212${usd(-v)}` : usd(v))}
        marks={marksFor(p, c.current.length)}
        drawKey={p.period}
        from={c.subs === "kept" ? c.subsFromIndex : null}
        unit={p.buckets}
      />
      <div className="mt-2 space-y-1">
        {chartNotes(p, c).map((note) => (
          <Quiet key={note}>{note}</Quiet>
        ))}
      </div>
    </div>
  );
}
