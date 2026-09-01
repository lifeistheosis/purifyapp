import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { logActivity } from "@/lib/admin/activityLog";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeAutoTarget, measure } from "@/lib/admin/hourlyMeasure";
import {
  evaluateHourly,
  hourKeyUtc,
  minutesIntoHour,
  type HourlyMetric,
} from "@/lib/admin/hourlyGoals";

export const dynamic = "force-dynamic";

/**
 * Read and set the hourly goals, with this hour's progress attached.
 *
 * The evaluation duplicated from app/api/cron/hourly-goals is only the
 * MEASUREMENT: both call the same pure evaluateHourly, and the notification
 * decision lives solely in the cron. A panel that could send notifications
 * would give the dedupe a second door.
 */

const METRICS: HourlyMetric[] = ["visitors", "pageviews", "signups", "revenue_cents"];

export async function GET() {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supa = createAdminClient();
  const { data, error } = await supa
    .from("hourly_goals")
    .select("*")
    .order("metric", { ascending: true });

  if (error) {
    const missing = error.code === "42P01";
    return NextResponse.json(
      {
        error: missing
          ? "hourly_goals is not on this database. 20260901_hourly_goals.sql has not been applied."
          : "Could not read hourly goals.",
        detail: error.message,
        missing,
      },
      { status: missing ? 501 : 500 },
    );
  }

  const now = new Date();
  const hourStart = new Date(now);
  hourStart.setUTCMinutes(0, 0, 0);
  const mins = minutesIntoHour(now);

  const rows = (data ?? []) as {
    id: string;
    metric: HourlyMetric;
    target: number;
  }[];

  // The same derivation the cron judges against, so the panel can never show
  // a target the notification used a different number for.
  const goals = await Promise.all(
    rows.map(async (r) => {
      const [value, auto] = await Promise.all([
        measure(supa, r.metric, hourStart.toISOString(), now.toISOString()),
        computeAutoTarget(supa, r.metric, hourStart),
      ]);
      return {
        ...r,
        target: auto.target,
        explanation: auto.explanation,
        basis: auto.baseline.basis,
        progress: evaluateHourly({ target: auto.target ?? 0 }, value, mins),
      };
    }),
  );

  // What was sent this hour, so the panel can show it rather than implying
  // nothing happened.
  const { data: sentRows } = await supa
    .from("hourly_goal_notifications")
    .select("goal_id, kind, value, sent_at")
    .eq("hour_key", hourKeyUtc(hourStart));

  return NextResponse.json(
    {
      goals,
      metrics: METRICS,
      hourStartedAt: hourStart.toISOString(),
      minutesIntoHour: Math.round(mins),
      sentThisHour: sentRows ?? [],
      // The cron is what actually notifies, and it is inert without this.
      cronConfigured: Boolean(process.env.CRON_SECRET),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * NO TARGET FIELD. Targets are derived from each hour's own history in
 * lib/admin/hourlyBaseline.ts, which is the whole point of the feature: a
 * number typed in once is wrong within the month, and a number per hour of the
 * week is 168 of them that nobody will maintain. This only says which metrics
 * are watched and how loudly.
 */
const upsertSchema = z.object({
  metric: z.enum(["visitors", "pageviews", "signups", "revenue_cents"]),
  paused: z.boolean().optional(),
  notifyOnHit: z.boolean().optional(),
  notifyOnMiss: z.boolean().optional(),
  quietFromHour: z.number().int().min(0).max(23).optional(),
  quietToHour: z.number().int().min(0).max(23).optional(),
  timezone: z.string().max(64).optional(),
});

export async function POST(req: NextRequest) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid goal." },
      { status: 400 },
    );
  }
  const p = parsed.data;

  const patch: Record<string, unknown> = {
    metric: p.metric,
    // The column is NOT NULL, so a new row needs something. The cron
    // overwrites it with the derived value on its next pass; nothing reads
    // this as authoritative in between.
    target: 0,
    updated_at: new Date().toISOString(),
  };
  if (p.paused !== undefined) patch.paused = p.paused;
  if (p.notifyOnHit !== undefined) patch.notify_on_hit = p.notifyOnHit;
  if (p.notifyOnMiss !== undefined) patch.notify_on_miss = p.notifyOnMiss;
  if (p.quietFromHour !== undefined) patch.quiet_from_hour = p.quietFromHour;
  if (p.quietToHour !== undefined) patch.quiet_to_hour = p.quietToHour;
  if (p.timezone !== undefined) patch.timezone = p.timezone;

  const supa = createAdminClient();
  // onConflict metric, backed by the unique index: setting a target twice
  // corrects it rather than creating a rival goal for the same number.
  const { error } = await supa
    .from("hourly_goals")
    .upsert(patch, { onConflict: "metric" });

  if (error) {
    const missing = error.code === "42P01";
    return NextResponse.json(
      {
        error: missing
          ? "hourly_goals is not on this database. 20260901_hourly_goals.sql has not been applied."
          : "Could not save that goal.",
        detail: error.message,
      },
      { status: missing ? 501 : 500 },
    );
  }

  void logActivity({
    actorEmail: adminUser.email ?? null,
    action: "goals.hourly_set",
    entityType: "hourly_goals",
    entityId: p.metric,
    detail: { paused: p.paused ?? false },
  });

  return NextResponse.json({ ok: true });
}
