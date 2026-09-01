import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import type { HourlyMetric } from "./hourlyGoals";
import {
  autoTarget,
  baselineFor,
  sampleSlots,
  type AutoTarget,
  type HourSample,
} from "./hourlyBaseline";

/**
 * Measuring a metric over a window, and working out what this hour should hit.
 *
 * ── One implementation, two callers ────────────────────────────────────
 *
 * The cron evaluates and notifies; the panel shows the same numbers. When both
 * had their own copy of the measurement, they could disagree, and the way that
 * shows up is the panel saying an hour was met while the phone never buzzed.
 * The notification DECISION stays in the cron alone, so the dedupe has one
 * door, but the arithmetic lives here.
 *
 * ── Nobody types a target ──────────────────────────────────────────────
 *
 * The target for an hour is derived from what the same hour on the same
 * weekday has actually done, most recently, plus a stretch. That is the whole
 * point: a number typed in once is wrong by the following month, and a number
 * typed in per hour of the week is 168 numbers nobody will ever maintain.
 */

type Supa = ReturnType<typeof createAdminClient>;

/** One metric's value in [from, to). */
export async function measure(
  supa: Supa,
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
    // Sessions that STARTED in the window. Counting sessions merely active in
    // it would count one long visit in every hour it spans, which answers a
    // different and much less useful question than "how many people arrived".
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
  // revenue_cents. Paid only: a pending checkout is not revenue, and counting
  // it would announce money that may never arrive.
  const { data } = await supa
    .from("shop_orders")
    .select("total_cents")
    .eq("payment_status", "paid")
    .gte("created_at", fromIso)
    .lt("created_at", toIso);
  return (data ?? []).reduce(
    (sum, o) => sum + ((o as { total_cents: number }).total_cents ?? 0),
    0,
  );
}

/**
 * What this hour should be aiming for, derived from its own history.
 *
 * Samples the same weekday and hour over the previous weeks. Four count
 * queries per metric, which is why they are HEAD counts rather than row
 * fetches: a month of pageviews is tens of thousands of rows and none of them
 * is needed, only how many there are.
 */
export async function computeAutoTarget(
  supa: Supa,
  metric: HourlyMetric,
  hourStart: Date,
): Promise<AutoTarget> {
  const slots = sampleSlots(hourStart);
  const samples: HourSample[] = await Promise.all(
    slots.map(async (slot) => ({
      weekday: slot.start.getUTCDay(),
      hour: slot.start.getUTCHours(),
      value: await measure(
        supa,
        metric,
        slot.start.toISOString(),
        slot.end.toISOString(),
      ),
    })),
  );

  const baseline = baselineFor(
    samples,
    hourStart.getUTCDay(),
    hourStart.getUTCHours(),
  );
  return autoTarget(baseline, undefined, { isMoney: metric === "revenue_cents" });
}
