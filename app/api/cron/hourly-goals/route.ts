import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { computeAutoTarget, measure } from "@/lib/admin/hourlyMeasure";
import { notifyOwner } from "@/lib/admin/ownerAlert";
import {
  evaluateHourly,
  hourKeyUtc,
  minutesIntoHour,
  shouldNotify,
  type HourlyGoal,
  type HourlyMetric,
  type NotifyKind,
} from "@/lib/admin/hourlyGoals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Evaluate the hourly goals and notify the owner about what changed.
 *
 * Wire as a Render cron hitting this every 10 to 15 minutes. It is safe at any
 * interval: the dedupe is a unique index on
 * (goal_id, hour_key, kind), so extra runs cost a query and send nothing.
 *
 * ── Degrades CLOSED ────────────────────────────────────────────────────
 *
 * Same shape as app/api/cron/bmc-snapshot: with CRON_SECRET unset this
 * refuses rather than running the handler under the service role for any
 * anonymous caller. That route's own comment records that the earlier
 * `if (secret) { ...403... }` form skipped the check entirely when the secret
 * was missing, and that production answered a caller with no credentials at
 * all. Not repeated here.
 *
 * ── Two hours are considered, not one ──────────────────────────────────
 *
 * The current hour, for hits, which are worth saying as they happen. And the
 * hour just finished, for misses, which are only a fact once the hour is over.
 * A cron cannot land exactly on the hour boundary, so a miss check that only
 * looked at "now" would either never fire or fire against an hour still in
 * progress.
 */

/** How far past the hour a run may be and still close out the previous one. */
const CLOSEOUT_WINDOW_MIN = 20;

type GoalRow = {
  id: string;
  metric: HourlyMetric;
  target: number;
  paused: boolean;
  notify_on_hit: boolean;
  notify_on_miss: boolean;
  quiet_from_hour: number;
  quiet_to_hour: number;
  timezone: string;
};

const toGoal = (r: GoalRow): HourlyGoal => ({
  id: r.id,
  metric: r.metric,
  target: r.target,
  paused: r.paused,
  notifyOnHit: r.notify_on_hit,
  notifyOnMiss: r.notify_on_miss,
  quietFromHour: r.quiet_from_hour,
  quietToHour: r.quiet_to_hour,
});

/** The hour of day in the goal's own zone, for the quiet window. */
function localHourIn(timezone: string, at: Date): number {
  try {
    const h = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    }).format(at);
    const n = Number(h);
    return Number.isFinite(n) ? n % 24 : at.getUTCHours();
  } catch {
    // An invalid zone must not silence notifications. UTC is the wrong hour
    // but it is an hour, and the alternative is throwing inside a cron.
    return at.getUTCHours();
  }
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supa = createAdminClient();
  const { data, error } = await supa
    .from("hourly_goals")
    .select(
      "id, metric, target, paused, notify_on_hit, notify_on_miss, quiet_from_hour, quiet_to_hour, timezone",
    )
    .eq("paused", false);

  if (error) {
    const missing = error.code === "42P01";
    return NextResponse.json(
      {
        error: missing
          ? "hourly_goals is not on this database. 20260901_hourly_goals.sql has not been applied."
          : "Could not read goals.",
        detail: error.message,
      },
      { status: missing ? 501 : 500 },
    );
  }

  const goals = (data ?? []) as GoalRow[];
  const now = new Date();
  const mins = minutesIntoHour(now);

  const hourStart = new Date(now);
  hourStart.setUTCMinutes(0, 0, 0);
  const prevStart = new Date(hourStart.getTime() - 3_600_000);

  const sent: { metric: string; kind: NotifyKind }[] = [];
  const skipped: { metric: string; reason: string }[] = [];

  for (const row of goals) {
    const g = toGoal(row);
    const localHour = localHourIn(row.timezone, now);

    // Which hours this run is responsible for. The current one always, for
    // hits. The previous one only while a run is close enough behind the
    // boundary that "just finished" is still true.
    const windows: { start: Date; end: Date; ended: boolean }[] = [
      { start: hourStart, end: now, ended: false },
    ];
    if (mins <= CLOSEOUT_WINDOW_MIN) {
      windows.push({ start: prevStart, end: hourStart, ended: true });
    }

    for (const w of windows) {
      const key = hourKeyUtc(w.start);
      const value = await measure(
        supa,
        g.metric,
        w.start.toISOString(),
        w.end.toISOString(),
      );
      const elapsed = w.ended ? 60 : mins;

      // THE TARGET IS DERIVED, NOT STORED. It comes from what this weekday and
      // hour have actually done over the previous weeks, so it tracks the site
      // as it grows and nobody maintains 168 numbers by hand. Persisted onto
      // the row afterwards purely so the panel can show the same figure the
      // cron judged against.
      const auto = await computeAutoTarget(supa, g.metric, w.start);
      if (auto.target === null) {
        skipped.push({ metric: g.metric, reason: "no baseline yet" });
        continue;
      }
      const goalForHour = { ...g, target: auto.target };
      if (!w.ended && row.target !== auto.target) {
        await supa
          .from("hourly_goals")
          .update({ target: auto.target, updated_at: new Date().toISOString() })
          .eq("id", g.id);
      }

      const evaluation = evaluateHourly(goalForHour, value, elapsed);

      const { data: already } = await supa
        .from("hourly_goal_notifications")
        .select("kind")
        .eq("goal_id", g.id)
        .eq("hour_key", key);
      const alreadySent = ((already ?? []) as { kind: NotifyKind }[]).map(
        (a) => a.kind,
      );

      const decision = shouldNotify(goalForHour, evaluation, {
        localHour,
        alreadySent,
        hourEnded: w.ended,
      });
      if (!decision.notify) {
        skipped.push({ metric: g.metric, reason: decision.reason });
        continue;
      }

      // CLAIM THE SLOT FIRST. The unique index is what makes a concurrent run
      // lose rather than double-send, so the row is written BEFORE the push.
      // The other order would send twice and record once.
      const { error: claimErr } = await supa
        .from("hourly_goal_notifications")
        .insert({
          goal_id: g.id,
          hour_key: key,
          kind: decision.kind,
          value: Math.round(evaluation.value),
          target: auto.target,
        });
      if (claimErr) {
        // 23505 is the other run getting there first, which is the dedupe
        // working rather than a failure.
        skipped.push({
          metric: g.metric,
          reason: claimErr.code === "23505" ? "already claimed" : claimErr.message,
        });
        continue;
      }

      await notifyOwner({
        title: decision.title,
        body: decision.body,
        url: "/admin#goals",
        kind: `hourly-${decision.kind}`,
      });
      sent.push({ metric: g.metric, kind: decision.kind });
    }
  }

  return NextResponse.json(
    { ok: true, goals: goals.length, sent, skipped },
    { headers: { "Cache-Control": "no-store" } },
  );
}
