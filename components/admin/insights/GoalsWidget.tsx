"use client";

import { GradeBadge, RatioMeter, StandingPill } from "./GradeBadge";
import { StreakLine } from "./Streaks";
import { useInsights } from "@/lib/admin/insights/store";
import { PERIODS, PERIOD_LABEL } from "@/lib/admin/insights/types";

/**
 * The compact, high-density summary for the dashboard.
 *
 * Reads the same engine the full Goals page does, so the two can never
 * disagree: there is one grade calculation and both render it. That is the
 * whole point of putting the maths in the store rather than in a page.
 */
export function GoalsWidget({ onOpen }: { onOpen?: () => void }) {
  const { overall, grades, goals, dataset, hydrated } = useInsights();

  const active = goals.filter((g) => !g.paused).length;

  return (
    <div
      className="flex min-w-0 flex-col rounded-[var(--adm-radius)] border p-4"
      style={{
        background: "var(--adm-panel)",
        borderColor: "var(--adm-line)",
        boxShadow: "var(--adm-shadow-card)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-sans text-[11px] uppercase tracking-[0.08em]" style={{ color: "var(--adm-ink-3)" }}>
            Performance
          </p>
          <p className="mt-0.5 font-sans text-[15px] font-semibold" style={{ color: "var(--adm-ink)" }}>
            Against goals
          </p>
        </div>
        <GradeBadge letter={overall.letter} standing={overall.standing} size="lg" />
      </div>

      <div className="mt-3">
        <StandingPill standing={overall.standing} />
      </div>

      {/* The three windows, always all three, even when one has no goals. A
          row that vanishes when nothing measures it makes the panel look like
          it is working when it is simply not looking. */}
      <div className="mt-4 space-y-2.5">
        {PERIODS.map((p) => (
          <RatioMeter
            key={p}
            label={PERIOD_LABEL[p]}
            ratio={grades[p].ratio}
            standing={grades[p].standing}
          />
        ))}
      </div>

      <p className="mt-4 font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
        {!hydrated
          ? "Reading saved goals"
          : !dataset
            ? "No report imported yet, so nothing can be graded."
            : active === 0
              ? "No active goals, so there is nothing to grade against."
              : `${active} active goal${active === 1 ? "" : "s"} against ${dataset.series.length} series.`}
      </p>

      <StreakLine dataset={dataset} goals={goals} />

      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          className="adm-control mt-3 w-full rounded-[var(--adm-radius-sm)] border px-3 py-2 font-sans text-[12px] font-medium"
          style={
            {
              borderColor: "var(--adm-line-strong)",
              color: "var(--adm-ink-2)",
              "--_bg": "var(--adm-control)",
              "--_bg-hover": "var(--adm-hover)",
            } as React.CSSProperties
          }
        >
          Manage goals
        </button>
      ) : null}
    </div>
  );
}
