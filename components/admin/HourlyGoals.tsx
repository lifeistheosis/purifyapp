"use client";

import { useCallback, useState } from "react";

import { Card, Pill, ToolbarButton } from "./primitives";
import { useAdminFetch } from "./adminFetch";
import {
  HOURLY_METRIC_LABEL,
  formatMetric,
  type HourlyEvaluation,
  type HourlyMetric,
} from "@/lib/admin/hourlyGoals";

/**
 * Goals for the hour you are in.
 *
 * Separate from the goal ladder above it, and from insight_goals, because it
 * measures something else: live analytics, which have per-event timestamps.
 * The imported report series that insight_goals grades has one point per day,
 * so it could never answer "how is this hour going".
 *
 * The bar shows PACE as well as progress. Fourteen views at ten past the hour
 * is a different situation from fourteen at five to, and a bar alone cannot
 * tell them apart.
 */

type Goal = {
  id: string;
  metric: HourlyMetric;
  target: number;
  paused?: boolean;
  notify_on_hit?: boolean;
  notify_on_miss?: boolean;
  progress: HourlyEvaluation;
};

type Payload = {
  goals: Goal[];
  metrics: HourlyMetric[];
  minutesIntoHour: number;
  sentThisHour: { goal_id: string; kind: string }[];
  cronConfigured: boolean;
  error?: string;
};

export function HourlyGoals() {
  const { data, error, reload } = useAdminFetch<Payload>("/api/admin/hourly-goals");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const save = useCallback(
    async (metric: HourlyMetric, target: number) => {
      setBusy(metric);
      setNote(null);
      try {
        const r = await fetch("/api/admin/hourly-goals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ metric, target }),
        });
        const body = (await r.json().catch(() => null)) as { error?: string } | null;
        if (!r.ok) {
          setNote(body?.error ?? "That didn't save.");
          return;
        }
        setDrafts((d) => {
          const n = { ...d };
          delete n[metric];
          return n;
        });
        reload();
      } catch {
        setNote("That didn't save.");
      } finally {
        setBusy(null);
      }
    },
    [reload],
  );

  const metrics = data?.metrics ?? [];
  const byMetric = new Map((data?.goals ?? []).map((g) => [g.metric, g]));

  return (
    <Card
      title="This hour"
      subtitle={
        data
          ? `${data.minutesIntoHour} minutes in. Targets are per clock hour, measured from live analytics`
          : "Targets per clock hour, measured from live analytics"
      }
    >
      {(error ?? note) && (
        <p
          role="alert"
          className="mb-3 font-sans text-detail"
          style={{ color: error ? "var(--adm-critical)" : "var(--adm-ink-2)" }}
        >
          {error ?? note}
        </p>
      )}

      {/* A goal that cannot notify is worth saying out loud. The cron is the
          only thing that sends, and it refuses to run without CRON_SECRET. */}
      {data && !data.cronConfigured && (
        <p className="mb-3 font-sans text-detail" style={{ color: "var(--adm-warn)" }}>
          Targets are tracked, but nothing will be sent: CRON_SECRET is not set,
          so the hourly evaluator refuses to run. Set it and add a Render cron
          hitting /api/cron/hourly-goals.
        </p>
      )}

      <ul className="space-y-2.5">
        {metrics.map((m) => {
          const g = byMetric.get(m);
          const p = g?.progress;
          const draft = drafts[m] ?? (g ? String(g.target) : "");
          const sent = (data?.sentThisHour ?? []).filter((s) => s.goal_id === g?.id);
          const pct = p && p.target > 0 ? Math.min(100, Math.round(p.ratio * 100)) : 0;
          return (
            <li
              key={m}
              className="rounded-[var(--adm-radius-sm)] border p-3"
              style={{ borderColor: "var(--adm-line)" }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-sans text-detail text-paper/90">
                  {HOURLY_METRIC_LABEL[m]}
                </span>
                <div className="flex items-center gap-1.5">
                  {p?.hit && <Pill tone="emerald">Hit</Pill>}
                  {p?.behind === true && <Pill tone="gold">Behind pace</Pill>}
                  {sent.map((s) => (
                    <Pill key={s.kind} tone="neutral">sent {s.kind}</Pill>
                  ))}
                </div>
              </div>

              {p && p.target > 0 && (
                <>
                  <div
                    className="mt-2 h-1.5 w-full overflow-hidden rounded-full"
                    style={{ background: "var(--adm-panel-2)" }}
                  >
                    <div
                      className="h-full rounded-full transition-[width] duration-500"
                      style={{
                        width: `${pct}%`,
                        background: p.hit
                          ? "var(--adm-positive, #34d399)"
                          : p.behind
                            ? "var(--adm-warn)"
                            : "var(--adm-accent)",
                      }}
                    />
                  </div>
                  <p className="mt-1.5 font-sans text-[11.5px] text-paper/50 tabular-nums">
                    {formatMetric(m, p.value)} of {formatMetric(m, p.target)}
                    {/* Pace, not just progress: the same number means
                        different things at ten past and at five to. */}
                    {p.pace !== null
                      ? ` · on pace for ${formatMetric(m, Math.round(p.pace))}`
                      : " · too early to project"}
                  </p>
                </>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  step={m === "revenue_cents" ? "0.01" : "1"}
                  inputMode="decimal"
                  value={draft}
                  onChange={(e) => setDrafts((d) => ({ ...d, [m]: e.target.value }))}
                  placeholder={m === "revenue_cents" ? "target $" : "target"}
                  className="h-8 w-[120px] rounded-[var(--adm-radius-sm)] border px-2 font-sans text-[12.5px] tabular-nums outline-none"
                  style={{
                    background: "var(--adm-control)",
                    borderColor: "var(--adm-line)",
                    color: "var(--adm-ink)",
                  }}
                />
                <ToolbarButton
                  variant="primary"
                  loading={busy === m}
                  onClick={() => {
                    const n = Number(draft);
                    if (!draft.trim() || !Number.isFinite(n) || n < 0) {
                      setNote("Enter a number first.");
                      return;
                    }
                    // Revenue is typed in dollars and stored in cents, matching
                    // every other money field in the panel.
                    void save(m, m === "revenue_cents" ? Math.round(n * 100) : Math.round(n));
                  }}
                >
                  {g ? "Update" : "Set"}
                </ToolbarButton>
                {g && (
                  <span className="font-sans text-[11px] text-paper/35">
                    {g.notify_on_hit ? "notifies on hit" : "silent"}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
