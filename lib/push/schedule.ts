// Shared reminder-scheduling logic for the delivery cron. Pure functions so
// they can be unit-tested and reused across the Web Push (push_subscriptions)
// and native (device_push_tokens) tables.
//
// NO STRINGS LIVE HERE. Every word a reader can see is in lib/push/copy.ts,
// and lib/push/__tests__/doctrine.test.ts fails the build if a title or body
// literal reappears in this file. What stays here is the clock.
//
// ON CADENCE, because the number surprises people. A reader who sets both a
// morning and an evening time receives two notifications a day, fourteen a
// week. That is one opt-in with two hours in it, not fourteen features, and
// CONTRIBUTING's third clause was reworded on 2026-08-22 to say so: the thing
// that clause forbids is per-feature reminders multiplying, which is what
// MAX_CAMPAIGN_REMINDERS_PER_RUN below actually caps.

import { campaignCopy, reminderCopy } from "./copy";

export type ReminderKind = "morning" | "evening";

export type ScheduleRow = {
  morning_time: string | null;
  evening_time: string | null;
  timezone: string | null;
};

/**
 * One reader's opt-in to a daily nudge for one campaign they joined.
 *
 * Kept in the same module as the prayer rules so both are matched by the
 * same clock, in the same hourly pass, against the same timezone. A second
 * scheduler is exactly what CONTRIBUTING's bar warns against: "five weekly
 * reminders landing on five different days is a daily habit loop assembled
 * out of parts that each looked harmless."
 */
export type CampaignReminderRow = {
  campaign_id: string;
  remind_enabled: boolean;
  remind_time: string | null;
  timezone: string | null;
};

/**
 * The campaigns due for this reader in the current local hour.
 *
 * Capped, and that cap is the point. A reader who joins twelve campaigns and
 * turns a reminder on for each would otherwise receive twelve notifications
 * in one hour, which is the multiplication the ethos forbids. One goes out;
 * the rest wait for the app to be opened, which is the pull surface the rule
 * asks for.
 */
export const MAX_CAMPAIGN_REMINDERS_PER_RUN = 1;

export function dueCampaigns(
  rows: readonly CampaignReminderRow[],
  now: Date,
): CampaignReminderRow[] {
  const due: CampaignReminderRow[] = [];
  for (const row of rows) {
    if (!row.remind_enabled || !row.remind_time) continue;
    if (!timeIsDue(row.remind_time, now, row.timezone || "UTC")) continue;
    due.push(row);
    if (due.length >= MAX_CAMPAIGN_REMINDERS_PER_RUN) break;
  }
  return due;
}

/**
 * The step reminders keep to, in minutes: the heartbeat that sends them
 * (/api/cron/hourly-goals) runs every ten minutes, and each run sends the
 * reminders of one ten-minute step. A reminder set for 07:45 comes in the
 * step that begins at 07:40, and the time field in Account, Notifications
 * keeps the same step (lib/push/times.ts, stepTime), so what the reader sees
 * is when it comes. Until 2026-10-31 the run kept to the hour: 07:45 came at
 * about 07:05.
 */
export const STEP_MINUTES = 10;
const STEP_MS = STEP_MINUTES * 60_000;
const DAY_MINUTES = 24 * 60;

/** The start of the ten-minute step `date` falls in, on the UTC clock. */
export function stepStart(date: Date): Date {
  return new Date(Math.floor(date.getTime() / STEP_MS) * STEP_MS);
}

/** An "HH:MM" time as minutes of the day, down to its step; null for one that cannot be read. */
export function reminderStep(time: string): number | null {
  const m = /^(\d{2}):(\d{2})/.exec(time);
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + Math.floor(minute / STEP_MINUTES) * STEP_MINUTES;
}

/**
 * The rule, on numbers, so a test can run it over every step of a year.
 * `cur` is the step the reader's clock is in for this run, `earlier` the
 * steps it showed for the six runs before (ten minutes apart, newest first).
 *
 * On an ordinary day a reminder is due when its step is the clock's. On the
 * two days a year the clocks change that is not enough, because the local
 * clock moves while the runs keep to UTC:
 *
 *   - When the clocks go back, an hour of steps happens twice: 01:00 to 01:59
 *     in New York on the first Sunday of November, 03:00 to 03:59 in Athens
 *     on the last Sunday of October (half an hour on Lord Howe Island). A
 *     reminder set inside it came twice. It now comes the first time only:
 *     a step the clock already showed within the last hour is not due again.
 *   - When the clocks go forward, an hour of steps never happens: 02:00 to
 *     02:59 in New York on the second Sunday of March. A reminder set inside
 *     it did not come that day. It now comes with the first step after.
 *
 * Any other jump (a country moving its clock by more than two hours, about
 * once a decade somewhere) is treated as an ordinary step, never as a
 * reason to send a day's reminders at once.
 */
export function stepIsDue(target: number, cur: number, earlier: readonly number[]): boolean {
  if (earlier.includes(cur)) return false;
  if (target === cur) return true;
  const prev = earlier[0];
  if (prev === undefined) return false;
  const gap = (cur - prev + DAY_MINUTES) % DAY_MINUTES;
  if (gap <= STEP_MINUTES || gap > STEP_MINUTES + 120) return false;
  // The steps the clock jumped over since the last run.
  for (let m = (prev + STEP_MINUTES) % DAY_MINUTES; m !== cur; m = (m + STEP_MINUTES) % DAY_MINUTES) {
    if (m === target) return true;
  }
  return false;
}

/** The wall-clock step in `tz` at `date`, as minutes of the day. */
function localStep(date: Date, tz: string): number {
  // nowInTz encodes the target zone's wall clock into the Date's UTC fields,
  // so read it with getUTC*: correct whatever the server's own zone.
  const wall = nowInTz(date, tz);
  return wall.getUTCHours() * 60 + Math.floor(wall.getUTCMinutes() / STEP_MINUTES) * STEP_MINUTES;
}

/**
 * The reader's clock for one run: the step it is in, and the six before.
 * Read at the start of the run's step, so a zone three quarters of an hour
 * off UTC (Nepal, Chatham) meets each of its own steps exactly once. Kept for
 * the run, since every row in a zone asks the same question.
 */
const clockCache = new Map<string, { cur: number; earlier: number[] }>();
function clockFor(now: Date, tz: string): { cur: number; earlier: number[] } {
  const start = stepStart(now).getTime();
  const key = `${tz}|${start}`;
  const hit = clockCache.get(key);
  if (hit) return hit;
  if (clockCache.size > 512) clockCache.clear();
  const at = (k: number) => localStep(new Date(start - k * STEP_MS), tz);
  const clock = { cur: at(0), earlier: [1, 2, 3, 4, 5, 6].map(at) };
  clockCache.set(key, clock);
  return clock;
}

/**
 * Whether a reminder at the local step `target` (minutes of the day, a
 * multiple of STEP_MINUTES) is due in the run for the step `now` is in.
 */
export function stepDue(target: number, now: Date, tz: string): boolean {
  const { cur, earlier } = clockFor(now, tz);
  return stepIsDue(target, cur, earlier);
}

/** stepDue for an "HH:MM" time as stored. A time that cannot be read is never due. */
function timeIsDue(time: string, now: Date, tz: string): boolean {
  const target = reminderStep(time);
  return target !== null && stepDue(target, now, tz);
}

/**
 * What a campaign reminder says. The words are in lib/push/copy.ts; this is
 * the seam that hands it an id. Kept as a named export because the cron and
 * three tests already import it under this name.
 */
export function campaignReminderPayload(campaignId: string): {
  title: string;
  body: string;
  url: string;
} {
  return campaignCopy(campaignId);
}

/**
 * Whether the row is due in this run, and for which rule: the reader's time
 * down to its ten-minute step, on their own clock, with the change to and
 * from summer time handled by stepIsDue. Null when neither time is due.
 */
export function dueKind(row: ScheduleRow, now: Date): ReminderKind | null {
  const tz = row.timezone || "UTC";
  if (row.morning_time && timeIsDue(row.morning_time, now, tz)) return "morning";
  if (row.evening_time && timeIsDue(row.evening_time, now, tz)) return "evening";
  return null;
}

/** The notification content for a given rule (shared by every transport). */
export function reminderPayload(kind: ReminderKind): {
  title: string;
  body: string;
  url: string;
} {
  return reminderCopy(kind);
}

/** One formatter per zone: making one is the slow part, and a run asks thousands of times. */
const formatters = new Map<string, Intl.DateTimeFormat>();
function formatterFor(tz: string): Intl.DateTimeFormat {
  let fmt = formatters.get(tz);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    if (formatters.size > 512) formatters.clear();
    formatters.set(tz, fmt);
  }
  return fmt;
}

/** A clock reading the wall time in an IANA timezone. */
export function nowInTz(date: Date, tz: string): Date {
  try {
    const fmt = formatterFor(tz);
    const parts = Object.fromEntries(
      fmt.formatToParts(date).map((p) => [p.type, p.value]),
    );
    return new Date(
      Date.UTC(
        Number(parts.year),
        Number(parts.month) - 1,
        Number(parts.day),
        // "24" at midnight in some locales → normalize to 0.
        Number(parts.hour) % 24,
        Number(parts.minute),
      ),
    );
  } catch {
    return date;
  }
}
