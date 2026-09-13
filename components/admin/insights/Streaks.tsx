"use client";

import { Card, Pill } from "../primitives";
import { toneFor } from "./GradeBadge";
import { recordsFor } from "@/lib/admin/insights/records";
import { shortDayLabel } from "@/lib/admin/insights/calendar";
import type { Goal, Series } from "@/lib/admin/insights/types";

/**
 * Streaks and records for the daily goals.
 *
 * WHAT IS DELIBERATELY ABSENT: badges, points, levels, and any word implying a
 * rank. Two reasons. The narrow one is that "level" already means
 * stock-versus-flow in this module and overloading it would make the codebase
 * harder to read. The real one is that an invented score is exactly the failure
 * calendar.ts names, "making a projection look like an achievement", and a
 * points total is that failure with a trophy on it. Everything here is a fact
 * with a date attached.
 *
 * The copy carries no urgency either. No "don't lose your streak", no
 * exclamation marks. voice.md bans that construction outright and it would be
 * wrong here anyway: a number that nags is a number people stop reading.
 */

export function Streaks({
  dataset,
  goals,
}: {
  dataset: { series: Series[] } | null;
  goals: Goal[];
}) {
  const daily = goals.filter((g) => g.period === "daily" && !g.paused);
  if (!dataset || daily.length === 0) return null;

  const rows = daily
    .map((g) => {
      const series = dataset.series.find((s) => s.id === g.seriesId) ?? null;
      return { goal: g, series, records: recordsFor(series, g) };
    })
    .filter((r) => r.records.measured > 0)
    // Longest live run first, so the thing going well is the thing you see.
    .sort((a, b) => b.records.streak - a.records.streak || b.records.bestRun - a.records.bestRun);

  if (rows.length === 0) return null;

  const asOf = rows[0].records.asOf;

  return (
    <Card
      title="Runs and records"
      subtitle={
        asOf
          ? `Read from the last day the report covers, ${shortDayLabel(asOf)}. Not from today, because a gap between the export and now is not a run of missed days.`
          : undefined
      }
    >
      <div className="space-y-3">
        {rows.map(({ goal, records }) => (
          <div
            key={goal.id}
            className="rounded-[var(--adm-radius-sm)] border p-3"
            style={{ borderColor: "var(--adm-line)", background: "var(--adm-panel-2)" }}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-sans text-[12.5px] font-medium" style={{ color: "var(--adm-ink)" }}>
                {goal.label}
              </p>
              <p className="font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
                {records.met} of {records.measured} days met
              </p>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-4">
              <Run streak={records.streak} best={records.bestRun} />
              <RhythmStrip marks={records.rhythm} />
            </div>

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {records.bestDay ? (
                <Fact label="Best day" value={fmt(records.bestDay.value)} when={shortDayLabel(records.bestDay.day)} />
              ) : null}
              {records.bestWeek ? (
                <Fact label="Best week" value={fmt(records.bestWeek.value)} when={`from ${shortDayLabel(records.bestWeek.from)}`} />
              ) : null}
              {records.bestMonth ? (
                <Fact label="Best month" value={fmt(records.bestMonth.value)} when={records.bestMonth.month} />
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Run({ streak, best }: { streak: number; best: number }) {
  const live = streak > 0;
  return (
    <div className="flex items-baseline gap-2">
      <span
        className="font-sans text-[24px] font-semibold tabular-nums leading-none"
        style={{ color: live ? toneFor("ahead") : "var(--adm-ink-3)" }}
      >
        {streak}
      </span>
      <span className="font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
        {streak === 1 ? "day running" : "days running"}
        {/* The history is shown beside a zero on purpose. A run of nothing is
            true and it is also the least interesting fact available; the best
            run is what stops it reading as "you have never done well". */}
        {best > streak ? ` · best ${best}` : ""}
      </span>
    </div>
  );
}

/**
 * Fourteen marks, oldest left.
 *
 * The shape this repo settled on when it retired the prayer-rule streak, on the
 * reasoning that a strip shows a rhythm where a counter only shows a verdict.
 * It survives one bad day, which matters when the underlying number goes
 * negative about one day in five.
 */
function RhythmStrip({ marks }: { marks: { key: string; kept: boolean }[] }) {
  if (marks.length === 0) return null;
  return (
    <div
      className="flex items-center gap-1"
      role="img"
      aria-label={`${marks.filter((m) => m.kept).length} of the last ${marks.length} days met the target`}
    >
      {marks.map((m) => (
        <span
          key={m.key}
          title={`${m.key}: ${m.kept ? "met" : "missed"}`}
          className="inline-block rounded-[2px]"
          style={{
            width: 7,
            height: 14,
            background: m.kept ? toneFor("ahead") : "var(--adm-line-strong)",
          }}
        />
      ))}
    </div>
  );
}

function Fact({ label, value, when }: { label: string; value: string; when: string }) {
  return (
    <p className="font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
      {label}{" "}
      <span className="tabular-nums font-medium" style={{ color: "var(--adm-ink-2)" }}>
        {value}
      </span>{" "}
      <span style={{ color: "var(--adm-ink-3)" }}>{when}</span>
    </p>
  );
}

const fmt = (n: number) =>
  n.toLocaleString("en-US", { maximumFractionDigits: 0, signDisplay: "auto" });

/** The compact form, for the dashboard widget. */
export function StreakLine({
  dataset,
  goals,
}: {
  dataset: { series: Series[] } | null;
  goals: Goal[];
}) {
  const daily = goals.filter((g) => g.period === "daily" && !g.paused);
  if (!dataset || daily.length === 0) return null;

  const best = daily
    .map((g) => recordsFor(dataset.series.find((s) => s.id === g.seriesId) ?? null, g))
    .filter((r) => r.measured > 0)
    .sort((a, b) => b.streak - a.streak)[0];

  if (!best) return null;

  return (
    <p className="mt-3 font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
      {best.streak > 0 ? (
        <>
          <Pill tone="emerald">{best.streak} day run</Pill>{" "}
          {best.bestRun > best.streak ? `best ${best.bestRun}` : "a personal best"}
        </>
      ) : (
        <>No run open. Best was {best.bestRun}.</>
      )}
    </p>
  );
}
