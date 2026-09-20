import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { sendPlannerDigest } from "@/lib/admin/plannerDigest";
import { runEmailJobs } from "@/lib/email/jobs";
import { sweepAbandonedCheckouts, type SweepReport } from "@/lib/shop/abandonedSweep";

/**
 * Bulk email waits for noon UTC (8 AM Eastern). The daily account-mail job
 * runs at 11:00 UTC and the welcome catch-up spends from the same budget, so
 * the people who just arrived are written to before a long send takes its
 * share of the day.
 */
export const EMAIL_JOBS_FROM_UTC_HOUR = 12;

/** The board's morning email: 13:00 UTC is 9 AM Eastern, the owner's clock. */
export const DIGEST_FROM_UTC_HOUR = 13;

/**
 * Housekeeping that has to happen on a clock, run from the one clock this
 * deployment reliably has.
 *
 * WHY IT RIDES THE HOURLY-GOALS CRON. Render's cron job calls
 * /api/cron/hourly-goals every ten minutes, and GitHub Actions schedules have
 * not been dependable since billing stopped in August (see the header of
 * app/api/cron/lifecycle/route.ts). A new Render job is dashboard work outside
 * this repo, so jobs that need a heartbeat hang off the one already beating.
 *
 * Each job keeps its own interval, so a ten-minute heartbeat does not mean
 * ten-minute work. The last-run times live in this module: after a restart a
 * job runs once early, which every job here tolerates by design (each is
 * idempotent). Nothing here can fail the goals run that carries it: every job
 * is caught and reported in the response instead.
 */

type JobResult = { ran: boolean; ok?: boolean; detail?: unknown; error?: string };

const lastRun = new Map<string, number>();

async function every(
  name: string,
  intervalMs: number,
  now: number,
  job: () => Promise<unknown>,
): Promise<JobResult> {
  const last = lastRun.get(name) ?? 0;
  if (now - last < intervalMs) return { ran: false };
  lastRun.set(name, now);
  try {
    return { ran: true, ok: true, detail: await job() };
  } catch (e) {
    return { ran: true, ok: false, error: (e as Error).message };
  }
}

export type MaintenanceReport = Record<string, JobResult>;

export async function runMaintenance(admin: SupabaseClient, now: number = Date.now()): Promise<MaintenanceReport> {
  const report: MaintenanceReport = {};
  // Abandoned checkouts: hourly. Stale means past Stripe's 24 hour session
  // life, so an hour of lag changes nothing a buyer can see.
  report.abandonedCheckouts = await every(
    "abandonedCheckouts",
    55 * 60_000,
    now,
    (): Promise<SweepReport> => sweepAbandonedCheckouts(admin, now),
  );
  // Email jobs (lib/email/jobs.ts): each running send's share of the day.
  // Hourly from noon UTC; a share already spent sends nothing, so the later
  // runs of the day only pick up budget the day has not used.
  if (new Date(now).getUTCHours() >= EMAIL_JOBS_FROM_UTC_HOUR) {
    report.emailJobs = await every("emailJobs", 55 * 60_000, now, async () => {
      const r = await runEmailJobs(admin, new Date(now));
      return {
        running: r.running,
        allowance: r.allowance,
        sent: r.reports.reduce((n, x) => n + x.counts.sent, 0),
        notes: r.reports.flatMap((x) => (x.note ? [`${x.mailing}: ${x.note}`] : [])),
      };
    });
  }
  // The board's daily reminder. Twenty hours between runs makes it one a
  // day whatever the heartbeat does, and a day with nothing due sends nothing.
  if (new Date(now).getUTCHours() >= DIGEST_FROM_UTC_HOUR) {
    report.plannerDigest = await every("plannerDigest", 20 * 3_600_000, now, () =>
      sendPlannerDigest(admin, new Date(now)),
    );
  }
  return report;
}
