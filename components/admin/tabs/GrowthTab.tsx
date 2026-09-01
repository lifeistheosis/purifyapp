"use client";

import { Card, StatCard } from "../primitives";
import { LineChart } from "../charts";
import { GoalsWidget } from "../insights/GoalsWidget";
import { ApiLimitBanner } from "../insights/ApiLimits";
import { GradeBadge, RatioMeter, StandingPill } from "../insights/GradeBadge";
import { useInsights } from "@/lib/admin/insights/store";
import { windowValue } from "@/lib/admin/insights/ingest";
import { FIT_FLOOR, forecastIsUsable, projectedFor } from "@/lib/admin/insights/forecast";
import { PERIODS, PERIOD_DAYS, PERIOD_LABEL } from "@/lib/admin/insights/types";

/**
 * The imported report, its forecast, and what it means against the goals.
 *
 * Everything on this page is derived from the store during render, so a paste
 * on the import card at the top recalculates the stats, the charts, the
 * projection and the grades below it in the same pass. There is no refresh
 * button because there is nothing that could be stale.
 */

const SERIES_COLOURS = [
  "var(--adm-s1)",
  "var(--adm-s2)",
  "var(--adm-s3)",
  "var(--adm-s4)",
  "var(--adm-s5)",
  "var(--adm-s6)",
];

function fmt(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function GrowthTab({ onOpenGoals }: { onOpenGoals?: () => void }) {
  const { dataset, forecasts, grades, revision } = useInsights();

  return (
    <div className="space-y-5">
      <ApiLimitBanner />
      {/* THE CSV IMPORT WAS HERE, and it is gone deliberately.
          Play Console exports describe days that have already finished, while
          this panel measures live analytics as they happen. Two sources for
          the same questions meant two answers, and the stale one looked just
          as authoritative. Removed 2026-09-01 at the owner's instruction.

          The series below are whatever was imported before that. Nothing
          writes them any more: see the note in this tab's header. */}

      {!dataset ? (
        <Card title="Nothing imported yet" subtitle="Paste a report above to populate this page.">
          <p className="font-sans text-[12.5px]" style={{ color: "var(--adm-ink-2)" }}>
            This page reads whatever CSV you give it. It finds the date column,
            treats every other numeric column as a series, and works out on its
            own whether each one is a running level like an installed audience
            or a daily count like impressions. That distinction decides every
            total on the page: a level is read at its latest value, a count is
            summed.
          </p>
        </Card>
      ) : (
        <>
          {/* key on revision so a fresh import re-runs the entrance animation
              across the whole block. It is the one visible signal that
              everything below recalculated together rather than in pieces. */}
          <div key={revision} className="adm-panel-enter space-y-5">
            <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
              <div className="grid gap-4 sm:grid-cols-3">
                {dataset.series.slice(0, 3).map((s) => {
                  const w = windowValue(s, 30);
                  return (
                    <StatCard
                      key={s.id}
                      label={s.label}
                      value={fmt(w.value)}
                      hint={
                        s.kind === "stock"
                          ? w.change === null
                            ? "latest level"
                            : `${w.change >= 0 ? "up" : "down"} ${fmt(Math.abs(w.change))} in 30 days`
                          : `summed over ${w.covered} day${w.covered === 1 ? "" : "s"}`
                      }
                    />
                  );
                })}
              </div>
              <GoalsWidget onOpen={onOpenGoals} />
            </div>

            <Card
              title="The series"
              subtitle={`${dataset.series.length} from ${dataset.label}. Levels and daily counts are charted separately, because they do not share a scale or a meaning.`}
            >
              <SeriesChart dataset={dataset} kind="stock" title="Levels" />
              <SeriesChart dataset={dataset} kind="flow" title="Daily counts" />
            </Card>

            <Card
              title="Where this is heading"
              subtitle="A straight line through the last 28 days, projected 30 forward."
            >
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {dataset.series.map((s) => {
                  const f = forecasts[s.id];
                  if (!f) return null;
                  const usable = forecastIsUsable(f);
                  const projected = projectedFor(s, f, 30);
                  return (
                    <div
                      key={s.id}
                      className="rounded-[var(--adm-radius-sm)] border p-3"
                      style={{ borderColor: "var(--adm-line)", background: "var(--adm-panel-2)" }}
                    >
                      <p className="font-sans text-[12px] font-medium" style={{ color: "var(--adm-ink)" }}>
                        {s.label}
                      </p>
                      {usable ? (
                        <>
                          <p
                            className="mt-1 font-sans text-[19px] font-semibold tabular-nums"
                            style={{ color: "var(--adm-ink)" }}
                          >
                            {fmt(projected ?? 0)}
                          </p>
                          <p className="font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
                            {s.kind === "stock" ? "projected level in 30 days" : "projected over 30 days"}
                            {" · "}
                            {f.slopePerDay >= 0 ? "+" : ""}
                            {f.slopePerDay.toFixed(1)}/day
                          </p>
                        </>
                      ) : (
                        // The honest refusal. A projection off a line that
                        // explains less than half the movement is decoration,
                        // and this panel's rule is that no number may look
                        // more certain than it is.
                        <p className="mt-1 font-sans text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
                          {f.basisDays < 7
                            ? `Only ${f.basisDays} day${f.basisDays === 1 ? "" : "s"} of data. Too little to project from.`
                            : `Trending ${f.slopePerDay >= 0 ? "up" : "down"}, but the line explains only ${Math.round(f.fit * 100)}% of the movement, under the ${Math.round(FIT_FLOOR * 100)}% floor. No figure is stated.`}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card title="Grades" subtitle="Actual against target, in three windows.">
              <div className="grid gap-4 sm:grid-cols-3">
                {PERIODS.map((p) => {
                  const g = grades[p];
                  return (
                    <div
                      key={p}
                      className="rounded-[var(--adm-radius-sm)] border p-3"
                      style={{ borderColor: "var(--adm-line)", background: "var(--adm-panel-2)" }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-sans text-[12px] font-medium" style={{ color: "var(--adm-ink)" }}>
                          {PERIOD_LABEL[p]}
                        </p>
                        <GradeBadge letter={g.letter} standing={g.standing} size="sm" />
                      </div>
                      <div className="mt-2">
                        <StandingPill standing={g.standing} />
                      </div>
                      <div className="mt-3">
                        <RatioMeter ratio={g.ratio} standing={g.standing} />
                      </div>
                      <p className="mt-2 font-sans text-[11px]" style={{ color: "var(--adm-ink-3)" }}>
                        {g.results.length === 0
                          ? `No goals for this window.`
                          : `${g.results.length} goal${g.results.length === 1 ? "" : "s"} over ${PERIOD_DAYS[p]} day${PERIOD_DAYS[p] === 1 ? "" : "s"}.`}
                      </p>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

/** One chart per kind, because a level and a daily count share no scale. */
function SeriesChart({
  dataset,
  kind,
  title,
}: {
  dataset: NonNullable<ReturnType<typeof useInsights>["dataset"]>;
  kind: "stock" | "flow";
  title: string;
}) {
  const mine = dataset.series.filter((s) => s.kind === kind);
  if (mine.length === 0) return null;

  // Every series in one chart shares the x axis, so the labels come from the
  // longest of them rather than from whichever happens to be first.
  const longest = mine.reduce((a, b) => (b.points.length > a.points.length ? b : a));
  const labels = longest.points.map((p) => p.day.slice(5));

  return (
    <div className="mb-5 last:mb-0">
      <p className="mb-2 font-sans text-[12px] font-medium" style={{ color: "var(--adm-ink-2)" }}>
        {title}
      </p>
      <LineChart
        labels={labels}
        series={mine.map((s, i) => ({
          name: s.label,
          color: SERIES_COLOURS[i % SERIES_COLOURS.length],
          data: s.points.map((p) => p.value ?? 0),
        }))}
      />
    </div>
  );
}
