import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * How many emails Purify may still send this month, and how many of those bulk
 * mail may spend.
 *
 * ── Why this exists ─────────────────────────────────────────────────────
 *
 * Resend's Free plan allowed 100 emails a day for the whole account. Every
 * bulk sender used to spend until Resend refused: the terms notice drained to
 * the quota on 2026-09-15 and the four sends after it failed with "You have
 * reached your daily email sending quota". Whatever came next that day, an
 * order confirmation or a payment notice, would have failed the same way and
 * never been retried. So bulk mail was given a budget, and a reserve was held
 * back for mail a reader is waiting on.
 *
 * ── Why the month, and no longer the day ────────────────────────────────
 *
 * The account moved to Resend Pro on 2026-09-27: 50,000 emails a month and no
 * daily cap. The budget stayed a day's all the same, 1,600, the month spread
 * over 31 days, as a brake of our own. On 2026-10-06 that brake cut the 1.5
 * release email at 1,571 of 2,339 accounts with 45,000 of the month unspent,
 * and the owner said so: "there is no daily limit for my recent subscription
 * ... There is a monthly limit", then "start calculating emails monthly
 * rather than daily" and "lift the daily brake". Resend's own Usage page that
 * day read "Monthly limit 4,272 / 50,000, Renews Oct 27" and "Daily limit:
 * Unlimited".
 *
 * So the month is the budget, the same month Resend counts.
 *
 * ── The month is Resend's, not the calendar's ───────────────────────────
 *
 * The plan renews on the day it was bought, the 27th, so the month runs from
 * one 27th to the next. Counting from the 1st would forget what was sent on
 * the 27th to the 31st and call the month emptier than Resend does.
 *
 * ── The reserve ─────────────────────────────────────────────────────────
 *
 * Mail a reader is waiting on (receipts, claims, replies, account notices) is
 * never bulk and is never held to the budget, but it has to fit in what is
 * left. So bulk leaves a little behind for every day the month still has:
 * 15 a day by default. On the last day of the month that is 15, on the first
 * it is about 450.
 *
 * ── What it counts ──────────────────────────────────────────────────────
 *
 * Rows in email_sends: sent since the month began, plus rows still pending
 * from today, which are sends in flight. Every Resend send writes a row
 * (sendLoggedEmail in lib/email/ledger.ts), so the count is what Resend
 * counts. One thing it cannot see: auth email (sign-up confirmations,
 * password resets) is sent by Supabase, and counts against Resend only if
 * Supabase's SMTP is pointed at Resend. The reserve covers that too.
 *
 * A job can still be given a limit of its own for a day ("Most a day" in the
 * panel, lib/email/jobs.ts). That is the owner pacing one send, not a budget.
 *
 * Env:
 *   EMAIL_MONTHLY_LIMIT  the plan's month (default 50,000, Resend Pro)
 *   EMAIL_CYCLE_DAY      the day of the month the plan renews (default 27)
 *   EMAIL_RESERVE        held back from bulk for each day the month has left
 *                        (default 15)
 *
 * EMAIL_DAILY_LIMIT is no longer read. The day is not a limit of the plan.
 */

export const DEFAULT_MONTHLY_LIMIT = 50_000;
export const DEFAULT_CYCLE_DAY = 27;
export const DEFAULT_RESERVE = 15;

const DAY_MS = 86_400_000;

function positiveInt(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw.trim());
  return Number.isInteger(n) && n > 0 ? n : null;
}

type Env = Record<string, string | undefined>;

export function emailMonthlyLimit(env: Env = process.env): number {
  return positiveInt(env.EMAIL_MONTHLY_LIMIT) ?? DEFAULT_MONTHLY_LIMIT;
}

/** The day of the month the plan renews. Held to 1 to 28, so every month has it. */
export function emailCycleDay(env: Env = process.env): number {
  const day = positiveInt(env.EMAIL_CYCLE_DAY);
  return day && day <= 28 ? day : DEFAULT_CYCLE_DAY;
}

/** Held back from bulk for each day the month still has. */
export function emailReservePerDay(env: Env = process.env): number {
  if (env.EMAIL_RESERVE?.trim() === "0") return 0;
  return positiveInt(env.EMAIL_RESERVE) ?? DEFAULT_RESERVE;
}

export function utcDayStart(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function nextUtcMidnight(now: Date): Date {
  return new Date(utcDayStart(now).getTime() + DAY_MS);
}

/** When the month Resend is counting began: the latest renewal day that is not after now. */
export function cycleStart(now: Date, cycleDay: number = DEFAULT_CYCLE_DAY): Date {
  const thisMonth = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), cycleDay);
  return new Date(now.getTime() >= thisMonth ? thisMonth : Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, cycleDay));
}

/** When that month ends and the count starts again. */
export function cycleEnd(now: Date, cycleDay: number = DEFAULT_CYCLE_DAY): Date {
  const start = cycleStart(now, cycleDay);
  return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, cycleDay));
}

/** Days the month still has, today counted. Never less than one. */
export function daysLeftInCycle(now: Date, cycleDay: number = DEFAULT_CYCLE_DAY): number {
  return Math.max(1, Math.ceil((cycleEnd(now, cycleDay).getTime() - utcDayStart(now).getTime()) / DAY_MS));
}

export type Budget = {
  /** The plan's month. */
  limit: number;
  /** Held back from bulk until the month renews: the reserve for each day left. */
  reserve: number;
  /** Sent since the month began, plus sends in flight. */
  used: number;
  /** Of those, sent today (UTC). For the panel; nothing is limited by it. */
  today: number;
  /** What any email may still use this month. */
  left: number;
  /** What bulk mail may still use this month: `left` minus the reserve. */
  bulkLeft: number;
  /** When the month began (UTC). */
  since: string;
  /** When the count starts again: the plan's next renewal (UTC). */
  resetsAt: string;
  /** False when email_sends could not be read. Bulk then gets nothing. */
  counted: boolean;
};

/** Pure: the numbers, from the plan, the reserve and what is already used. */
export function budgetFrom(opts: {
  limit: number;
  /** Held back for each day the month has left. */
  reservePerDay: number;
  /** Sent since the month began, plus sends in flight. */
  used: number;
  /** Of those, sent today. */
  today?: number;
  now: Date;
  cycleDay?: number;
  counted?: boolean;
}): Budget {
  const counted = opts.counted ?? true;
  const cycleDay = opts.cycleDay ?? DEFAULT_CYCLE_DAY;
  const used = Math.max(0, opts.used);
  const left = Math.max(0, opts.limit - used);
  // Never more than half the month, so bulk always has some of it.
  const reserve = Math.min(opts.reservePerDay * daysLeftInCycle(opts.now, cycleDay), Math.floor(opts.limit / 2));
  return {
    limit: opts.limit,
    reserve,
    used,
    today: Math.max(0, opts.today ?? 0),
    left,
    // With no count there is no way to know what is safe, so bulk waits.
    bulkLeft: counted ? Math.max(0, left - reserve) : 0,
    since: cycleStart(opts.now, cycleDay).toISOString(),
    resetsAt: cycleEnd(opts.now, cycleDay).toISOString(),
    counted,
  };
}

/** How many days `remaining` sends take at `perDay`. 0 when nothing remains. */
export function daysToFinish(remaining: number, perDay: number): number | null {
  if (remaining <= 0) return 0;
  if (perDay <= 0) return null;
  return Math.ceil(remaining / perDay);
}

export async function readBudget(admin: SupabaseClient, now: Date = new Date()): Promise<Budget> {
  const cycleDay = emailCycleDay();
  const month = cycleStart(now, cycleDay).toISOString();
  const day = utcDayStart(now).toISOString();
  const count = (status: "sent" | "pending", column: "sent_at" | "created_at", from: string) =>
    admin.from("email_sends").select("id", { count: "exact", head: true }).eq("status", status).gte(column, from);
  const [sent, today, pending] = await Promise.all([
    count("sent", "sent_at", month),
    count("sent", "sent_at", day),
    count("pending", "created_at", day),
  ]);
  const counted = !sent.error && !today.error && !pending.error;
  return budgetFrom({
    limit: emailMonthlyLimit(),
    reservePerDay: emailReservePerDay(),
    used: (sent.count ?? 0) + (pending.count ?? 0),
    today: (today.count ?? 0) + (pending.count ?? 0),
    now,
    cycleDay,
    counted,
  });
}
