/**
 * Whether Render's cron still calls the heartbeat, /api/cron/hourly-goals
 * (docs/SCHEDULED-JOBS.md). Edgar's item 84, his yes of 2026-11-10: "a red
 * heartbeat alert if the hourly background job stops. Reminders and emails
 * depend on it." So do the daily deletes the privacy page promises
 * (lib/ops/prune.ts), the abandoned checkouts and the Monday email.
 *
 * HOW IT KNOWS, WITH NO TABLE OF ITS OWN. Every call claims its ten-minute
 * step for the prayer reminders: one row in rate_limits named
 * push-deliver:<step>, written by rate_limit_hit whether the step was free or
 * already taken (lib/push/deliver.ts). The newest such row is the last call.
 * The limiter tidies rows once their hour is over, so a heartbeat silent for
 * longer than that leaves no row at all; either way the answer is "late".
 *
 * Pure: the route reads the keys (app/api/admin/health), this says what they
 * mean. Tested in lib/ops/__tests__/heartbeat.test.ts.
 */

export const HEARTBEAT_KEY_PREFIX = "push-deliver:";

/** The cron calls every ten minutes: three missed calls before it is said. */
export const HEARTBEAT_LATE_MINUTES = 30;

/** A step's own key, "push-deliver:2026-11-10T01:20". The old hourly key ("...T01") is not a call of this code. */
const STEP_KEY = /^push-deliver:(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})$/;

/** The step a claim's key names, or null for any other key. */
export function stepOfKey(key: string): Date | null {
  const m = STEP_KEY.exec(key);
  if (!m) return null;
  const at = new Date(`${m[1]}:00Z`);
  return Number.isNaN(at.getTime()) ? null : at;
}

export type HeartbeatVerdict = {
  late: boolean;
  /** The newest step a call claimed, ISO, or null when no row is left. */
  lastAt: string | null;
  /** Minutes since that step began, or null. */
  minutes: number | null;
  /** One line for Services. */
  line: string;
};

const hhmm = (d: Date) => d.toISOString().slice(11, 16);

export function heartbeatVerdict(keys: readonly string[], now: Date): HeartbeatVerdict {
  const steps = keys.map(stepOfKey).filter((d): d is Date => d !== null && d.getTime() <= now.getTime() + 60_000);
  if (steps.length === 0) {
    return {
      late: true,
      lastAt: null,
      minutes: null,
      line: "No call in the last hour. Render's cron is not calling /api/cron/hourly-goals with CRON_SECRET, so prayer reminders, the email jobs and the daily deletes have stopped.",
    };
  }
  const last = new Date(Math.max(...steps.map((d) => d.getTime())));
  const minutes = Math.max(0, Math.floor((now.getTime() - last.getTime()) / 60_000));
  if (minutes > HEARTBEAT_LATE_MINUTES) {
    return {
      late: true,
      lastAt: last.toISOString(),
      minutes,
      line: `Last call at ${hhmm(last)} UTC, ${minutes} minutes ago. Render's cron calls every ten minutes, so prayer reminders, the email jobs and the daily deletes have stopped.`,
    };
  }
  return {
    late: false,
    lastAt: last.toISOString(),
    minutes,
    line: `Last call at ${hhmm(last)} UTC. Prayer reminders, the email jobs and the daily deletes ride it.`,
  };
}
