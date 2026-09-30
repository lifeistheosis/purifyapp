import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { sendPlannerDigest } from "@/lib/admin/plannerDigest";
import { clearMatured, runAmbassadorPayouts } from "@/lib/ambassadors/payouts";
import { runEmailJobs } from "@/lib/email/jobs";
import { sweepAbandonedCheckouts, type SweepReport } from "@/lib/shop/abandonedSweep";
import { sendCartReminders } from "@/lib/shop/cartReminderSweep";

/**
 * Bulk email waits for noon UTC (8 AM Eastern). The daily account-mail job
 * runs at 11:00 UTC and the welcome catch-up spends from the same budget, so
 * the people who just arrived are written to before a long send takes its
 * share of the day.
 */
export const EMAIL_JOBS_FROM_UTC_HOUR = 12;

/** The board's morning email: 13:00 UTC is 9 AM Eastern, the owner's clock. */
export const DIGEST_FROM_UTC_HOUR = 13;

/** Ambassador payouts: 15:00 UTC, 11 AM Eastern, once a day at most. */
export const AMBASSADOR_PAYOUTS_UTC_HOUR = 15;

/** Cart notes go out in the American day: 14:00 to 23:59 UTC is 10 AM to 8 PM Eastern. */
export const CART_NOTES_UTC_HOURS: readonly [number, number] = [14, 23];

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
  // Ambassador commissions (lib/ambassadors/payouts.ts): what has passed its
  // refund window clears hourly; cleared balances are paid once a day at
  // most, and only when the owner has turned automatic payouts on. A month
  // pays once: the payout row for the month is unique.
  report.ambassadorClearing = await every("ambassadorClearing", 55 * 60_000, now, () => clearMatured(admin));
  if (new Date(now).getUTCHours() >= AMBASSADOR_PAYOUTS_UTC_HOUR) {
    report.ambassadorPayouts = await every("ambassadorPayouts", 20 * 3_600_000, now, () => runAmbassadorPayouts(admin, now));
  }
  // Cart notes (lib/shop/cartReminderSweep.ts): hourly in the daytime, and
  // nothing at all until the owner turns a switch on. Send-once keys make a
  // repeated hour harmless.
  const hour = new Date(now).getUTCHours();
  if (hour >= CART_NOTES_UTC_HOURS[0] && hour <= CART_NOTES_UTC_HOURS[1]) {
    report.cartReminders = await every("cartReminders", 55 * 60_000, now, () => sendCartReminders(admin, now));
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
