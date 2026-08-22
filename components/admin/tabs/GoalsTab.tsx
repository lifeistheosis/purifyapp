"use client";

import { useState } from "react";
import { Card, DataTable, Pill, Toolbar, ToolbarButton } from "../primitives";
import { GradeBadge, RatioMeter, StandingPill } from "../insights/GradeBadge";
import { ApiLimitBanner, ApiLimitsPanel } from "../insights/ApiLimits";
import { useInsights } from "@/lib/admin/insights/store";
import {
  PERIODS,
  PERIOD_LABEL,
  type Goal,
  type Period,
} from "@/lib/admin/insights/types";

/**
 * Goals management.
 *
 * Create, edit, delete, pause. Every one of those writes to the same store the
 * grades are derived from, so the effect is immediate and total: raise a
 * monthly target above what the data supports and the monthly grade drops in
 * the same render, here and on the dashboard widget, with nothing to refresh.
 * There is no local copy of a grade anywhere for the two to disagree about.
 */

function fmt(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function GoalsTab() {
  const {
    dataset,
    goals,
    grades,
    overall,
    addGoal,
    updateGoal,
    removeGoal,
    toggleGoalPause,
  } = useInsights();

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);

  const rows = goals.map((g) => {
    const result = grades[g.period].results.find((r) => r.goal.id === g.id) ?? null;
    return { goal: g, result };
  });

  return (
    <div className="space-y-5">
      {/* First thing on the page, because a licence breach outranks a KPI. */}
      <ApiLimitBanner />

      <Card
        title="Overall"
        subtitle="Every active goal, weighted towards the longer window."
      >
        <div className="flex flex-wrap items-center gap-5">
          <GradeBadge letter={overall.letter} standing={overall.standing} size="lg" />
          <div className="min-w-[180px]">
            <StandingPill standing={overall.standing} />
            <p className="mt-1.5 font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
              {overall.ratio === null
                ? "Nothing is being measured yet."
                : `${Math.round(overall.ratio * 100)}% of target overall.`}
            </p>
          </div>
          <div className="grid min-w-[240px] flex-1 gap-2.5 sm:grid-cols-3">
            {PERIODS.map((p) => (
              <RatioMeter
                key={p}
                label={PERIOD_LABEL[p]}
                ratio={grades[p].ratio}
                standing={grades[p].standing}
              />
            ))}
          </div>
        </div>
        <p className="mt-4 font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
          Meeting a target is a C. A system that gives an A for hitting the
          number has nothing left to say when something genuinely beats it.
        </p>
      </Card>

      <Card
        title="Goals"
        subtitle={
          dataset
            ? `Measured against ${dataset.label}.`
            : "Import a report before these can be measured."
        }
        action={
          <Toolbar>
            <ToolbarButton
              variant="primary"
              onClick={() => {
                setAdding(true);
                setEditing(null);
              }}
            >
              + Add goal
            </ToolbarButton>
          </Toolbar>
        }
      >
        {adding && dataset && (
          <GoalEditor
            seriesOptions={dataset.series.map((s) => ({ id: s.id, label: s.label }))}
            onCancel={() => setAdding(false)}
            onSave={(g) => {
              addGoal(g);
              setAdding(false);
            }}
          />
        )}
        {adding && !dataset && (
          <p
            className="mb-4 rounded-[var(--adm-radius-sm)] border px-3 py-2 font-sans text-[12px]"
            style={{
              borderColor: "color-mix(in oklab, var(--adm-warn), transparent 60%)",
              background: "color-mix(in oklab, var(--adm-warn), transparent 92%)",
              color: "var(--adm-warn)",
            }}
          >
            A goal has to name a series, and there is no report loaded to pick
            one from. Import a CSV on the Growth tab first.
          </p>
        )}
        {editing && dataset && (
          <GoalEditor
            initial={editing}
            seriesOptions={dataset.series.map((s) => ({ id: s.id, label: s.label }))}
            onCancel={() => setEditing(null)}
            onSave={(patch) => {
              updateGoal(editing.id, patch);
              setEditing(null);
            }}
          />
        )}

        <DataTable
          rows={rows}
          rowKey={(r) => r.goal.id}
          empty="No goals yet. Add one and the grades above start meaning something."
          csvFilename="goals.csv"
          columns={[
            {
              key: "label",
              label: "Goal",
              render: (r) => (
                <div>
                  <p className="font-semibold text-paper">{r.goal.label}</p>
                  <p className="text-eyebrow text-paper/50 mt-0.5">
                    {dataset?.series.find((s) => s.id === r.goal.seriesId)?.label ??
                      "series not in the current report"}
                  </p>
                </div>
              ),
              csv: (r) => r.goal.label,
            },
            {
              key: "period",
              label: "Window",
              render: (r) => PERIOD_LABEL[r.goal.period],
              csv: (r) => r.goal.period,
            },
            {
              key: "target",
              label: "Target",
              align: "right",
              render: (r) => <span className="tabular-nums">{fmt(r.goal.target)}</span>,
              csv: (r) => r.goal.target,
            },
            {
              key: "actual",
              label: "Actual",
              align: "right",
              render: (r) =>
                r.result?.missing ? (
                  <span style={{ color: "var(--adm-ink-3)" }}>no data</span>
                ) : (
                  <span className="tabular-nums">{fmt(r.result?.actual ?? 0)}</span>
                ),
              csv: (r) => r.result?.actual ?? 0,
            },
            {
              key: "grade",
              label: "Grade",
              render: (r) =>
                r.goal.paused ? (
                  <Pill tone="neutral">Paused</Pill>
                ) : r.result?.missing ? (
                  <Pill tone="neutral">Not measured</Pill>
                ) : (
                  <div className="flex items-center gap-2">
                    <GradeBadge
                      letter={r.result?.letter ?? null}
                      standing={r.result?.standing ?? null}
                      size="sm"
                    />
                    <span
                      className="font-sans text-[11.5px] tabular-nums"
                      style={{ color: "var(--adm-ink-3)" }}
                    >
                      {r.result?.ratio === null
                        ? ""
                        : `${Math.round((r.result?.ratio ?? 0) * 100)}%`}
                    </span>
                  </div>
                ),
              csv: (r) => r.result?.letter ?? "",
            },
            {
              key: "actions",
              label: "",
              render: (r) => (
                <Toolbar>
                  <ToolbarButton onClick={() => setEditing(r.goal)}>Edit</ToolbarButton>
                  <ToolbarButton
                    onClick={() => toggleGoalPause(r.goal.id)}
                    title={
                      r.goal.paused
                        ? "Count this goal again"
                        : "Keep the target but stop it affecting any grade"
                    }
                  >
                    {r.goal.paused ? "Resume" : "Pause"}
                  </ToolbarButton>
                  <ToolbarButton variant="danger" onClick={() => removeGoal(r.goal.id)}>
                    Delete
                  </ToolbarButton>
                </Toolbar>
              ),
            },
          ]}
        />
      </Card>

      <ApiLimitsPanel />
    </div>
  );
}

/** Create and edit share one form, because they are the same five fields. */
function GoalEditor({
  initial,
  seriesOptions,
  onSave,
  onCancel,
}: {
  initial?: Goal;
  seriesOptions: { id: string; label: string }[];
  onSave: (goal: Omit<Goal, "id" | "createdAt">) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [seriesId, setSeriesId] = useState(initial?.seriesId ?? seriesOptions[0]?.id ?? "");
  const [period, setPeriod] = useState<Period>(initial?.period ?? "monthly");
  const [target, setTarget] = useState(String(initial?.target ?? ""));
  const [paused, setPaused] = useState(initial?.paused ?? false);

  const targetNum = Number(target);
  const targetValid = target.trim() !== "" && Number.isFinite(targetNum) && targetNum >= 0;

  const fieldCls =
    "h-11 w-full rounded-[var(--adm-radius-sm)] border px-3 font-sans text-[12.5px]";
  const fieldStyle = {
    background: "var(--adm-control)",
    borderColor: "var(--adm-line-strong)",
    color: "var(--adm-ink)",
  } as React.CSSProperties;
  const labelCls = "mb-1 block font-sans text-[11.5px]";
  const labelStyle = { color: "var(--adm-ink-3)" } as React.CSSProperties;

  const chosen = seriesOptions.find((s) => s.id === seriesId);

  return (
    <div
      className="mb-4 grid grid-cols-1 gap-3 rounded-[var(--adm-radius)] border p-4 md:grid-cols-12"
      style={{
        borderColor: "color-mix(in oklab, var(--adm-accent), transparent 65%)",
        background: "color-mix(in oklab, var(--adm-accent), transparent 96%)",
      }}
    >
      <label className="md:col-span-4">
        <span className={labelCls} style={labelStyle}>Name</span>
        <input
          className={fieldCls}
          style={fieldStyle}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={chosen ? `${chosen.label} target` : "Goal name"}
        />
      </label>

      <label className="md:col-span-4">
        <span className={labelCls} style={labelStyle}>Measures</span>
        <select
          className={fieldCls}
          style={fieldStyle}
          value={seriesId}
          onChange={(e) => setSeriesId(e.target.value)}
        >
          {seriesOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      <label className="md:col-span-2">
        <span className={labelCls} style={labelStyle}>Window</span>
        <select
          className={fieldCls}
          style={fieldStyle}
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
        >
          {PERIODS.map((p) => (
            <option key={p} value={p}>
              {PERIOD_LABEL[p]}
            </option>
          ))}
        </select>
      </label>

      <label className="md:col-span-2">
        <span className={labelCls} style={labelStyle}>Target</span>
        <input
          className={`${fieldCls} tabular-nums`}
          style={fieldStyle}
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          inputMode="decimal"
        />
      </label>

      <label
        className="md:col-span-4 inline-flex items-end gap-2 pb-2 font-sans text-[12px]"
        style={{ color: "var(--adm-ink-2)" }}
      >
        <input type="checkbox" checked={paused} onChange={(e) => setPaused(e.target.checked)} />
        Paused, keep the target but do not grade it
      </label>

      <p
        className="md:col-span-4 self-end pb-2 font-sans text-[11.5px]"
        style={{ color: targetValid ? "var(--adm-ink-3)" : "var(--adm-critical)" }}
      >
        {!targetValid
          ? "Enter a plain number."
          : targetNum === 0
            ? "A target of zero counts as met, because asking for none is satisfied by any amount."
            : `Graded on ${PERIOD_LABEL[period].toLowerCase()}.`}
      </p>

      <div className="md:col-span-4 flex items-end justify-end gap-2 pb-1">
        <ToolbarButton onClick={onCancel}>Cancel</ToolbarButton>
        <ToolbarButton
          variant="primary"
          onClick={() => {
            if (!targetValid || !seriesId) return;
            onSave({
              label: label.trim() || chosen?.label || "Goal",
              seriesId,
              period,
              target: targetNum,
              paused,
            });
          }}
        >
          Save
        </ToolbarButton>
      </div>
    </div>
  );
}
