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
  /** Derived from this hour's own history. Null until there is enough of it. */
  target: number | null;
  explanation: string;
  basis: "weekday-hour" | "hour-any-day" | "none";
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
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  /**
   * Watch a metric, or stop watching it.
   *
   * NO TARGET IS SENT. It is derived per hour from that hour's own history,
   * which is what makes this maintenance-free: a typed number is wrong within
   * a month, and one per hour of the week is 168 nobody will keep current.
   */
  const setWatched = useCallback(
    async (metric: HourlyMetric, watched: boolean) => {
      setBusy(metric);
      setNote(null);
      try {
        const r = await fetch("/api/admin/hourly-goals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ metric, paused: !watched, notifyOnHit: true }),
        });
        const body = (await r.json().catch(() => null)) as { error?: string } | null;
        if (!r.ok) {
          setNote(body?.error ?? "That didn't save.");
          return;
        }
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
          ? `${data.minutesIntoHour} minutes in. Targets set themselves from what this hour, on this weekday, normally does`
          : "Targets set themselves from each hour's own history"
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

              {p && g?.target !== null && p.target > 0 && (
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
                          // --adm-good: --adm-positive is undefined, and the
                          // #34d399 fallback is 1.85:1 on the light theme
                          // against a 3:1 floor for non-text UI.
                          ? "var(--adm-good)"
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

              {/* The number is never unexplained. A derived target that
                  appears from nowhere is one the operator cannot argue with
                  or trust, so the basis travels with it. */}
              <p className="mt-1.5 font-sans text-[11px] text-paper/40">
                {g ? g.explanation : "Not watched."}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <ToolbarButton
                  variant={g && !g.paused ? "default" : "primary"}
                  loading={busy === m}
                  onClick={() => void setWatched(m, !(g && !g.paused))}
                >
                  {g && !g.paused ? "Stop watching" : "Watch"}
                </ToolbarButton>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
