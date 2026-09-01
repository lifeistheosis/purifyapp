import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { logActivity } from "@/lib/admin/activityLog";
import { createAdminClient } from "@/lib/supabase/admin";
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

async function measure(
  supa: ReturnType<typeof createAdminClient>,
  metric: HourlyMetric,
  fromIso: string,
  toIso: string,
): Promise<number> {
  if (metric === "pageviews") {
    const { count } = await supa
      .from("analytics_pageviews")
      .select("id", { count: "exact", head: true })
      .gte("ts", fromIso)
      .lt("ts", toIso);
    return count ?? 0;
  }
  if (metric === "visitors") {
    const { count } = await supa
      .from("analytics_sessions")
      .select("session_id", { count: "exact", head: true })
      .gte("first_seen", fromIso)
      .lt("first_seen", toIso);
    return count ?? 0;
  }
  if (metric === "signups") {
    const { count } = await supa
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", fromIso)
      .lt("created_at", toIso);
    return count ?? 0;
  }
  const { data } = await supa
    .from("shop_orders")
    .select("total_cents")
    .eq("payment_status", "paid")
    .gte("created_at", fromIso)
    .lt("created_at", toIso);
  return (data ?? []).reduce(
    (s, o) => s + ((o as { total_cents: number }).total_cents ?? 0),
    0,
  );
}

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

  const goals = await Promise.all(
    rows.map(async (r) => {
      const value = await measure(
        supa,
        r.metric,
        hourStart.toISOString(),
        now.toISOString(),
      );
      return { ...r, progress: evaluateHourly(r, value, mins) };
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

const upsertSchema = z.object({
  metric: z.enum(["visitors", "pageviews", "signups", "revenue_cents"]),
  target: z.number().int().min(0).max(100_000_000),
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
    target: p.target,
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
    detail: { target: p.target },
  });

  return NextResponse.json({ ok: true });
}
