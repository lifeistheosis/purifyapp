import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * How many emails Purify may still send today, and how many of those bulk mail
 * may spend.
 *
 * ── Why this exists ─────────────────────────────────────────────────────
 *
 * Resend's plan allows 100 emails a day for the whole account, reset at
 * midnight UTC (lib/email/send.ts). Every bulk sender used to spend until
 * Resend refused: the terms notice drained to the quota on 2026-09-15 and the
 * four sends after it failed with "You have reached your daily email sending
 * quota". Whatever came next that day, an order confirmation or a payment
 * notice, would have failed the same way and never been retried.
 *
 * So the day is a budget. Bulk mail (the terms notice, list campaigns, the
 * welcome catch-up) may spend the day's limit minus a reserve, and the reserve
 * is held back for mail a reader is waiting on: receipts, claims, replies,
 * account notices. Bulk that does not fit today goes on a later day
 * (lib/email/jobs.ts), in the order the owner chose.
 *
 * ── What it counts ──────────────────────────────────────────────────────
 *
 * Rows in email_sends: sent today (UTC), plus rows still pending from today,
 * which are sends in flight. Since this release every Resend send writes a
 * row (sendLoggedEmail in lib/email/ledger.ts), so the count matches what
 * Resend counts. One thing it cannot see: auth email (sign-up confirmations,
 * password resets) is sent by Supabase, and counts against Resend only if
 * Supabase's SMTP is pointed at Resend. The reserve covers that too.
 *
 * Env:
 *   EMAIL_DAILY_LIMIT  the plan's daily limit (default 100, Resend Free)
 *   EMAIL_RESERVE      held back from bulk each day (default 15)
 */

export const DEFAULT_DAILY_LIMIT = 100;
export const DEFAULT_RESERVE = 15;

function positiveInt(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw.trim());
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function emailDailyLimit(env: Record<string, string | undefined> = process.env): number {
  return positiveInt(env.EMAIL_DAILY_LIMIT) ?? DEFAULT_DAILY_LIMIT;
}

/** The reserve, never more than half the limit so bulk always gets some of the day. */
export function emailReserve(env: Record<string, string | undefined> = process.env): number {
  const limit = emailDailyLimit(env);
  const raw = env.EMAIL_RESERVE?.trim() === "0" ? 0 : positiveInt(env.EMAIL_RESERVE);
  return Math.min(raw ?? DEFAULT_RESERVE, Math.floor(limit / 2));
}

export function utcDayStart(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function nextUtcMidnight(now: Date): Date {
  return new Date(utcDayStart(now).getTime() + 86_400_000);
}

export type Budget = {
  limit: number;
  reserve: number;
  /** Sent today (UTC) plus sends in flight. */
  used: number;
  /** What any email may still use today. */
  left: number;
  /** What bulk mail may still use today: `left` minus the reserve. */
  bulkLeft: number;
  /** When the day's count starts again (midnight UTC). */
  resetsAt: string;
  /** False when email_sends could not be read. Bulk then gets nothing. */
  counted: boolean;
};

/** Pure: the numbers, from the limit, the reserve and what is already used. */
export function budgetFrom(opts: {
  limit: number;
  reserve: number;
  used: number;
  now: Date;
  counted?: boolean;
}): Budget {
  const counted = opts.counted ?? true;
  const used = Math.max(0, opts.used);
  const left = Math.max(0, opts.limit - used);
  return {
    limit: opts.limit,
    reserve: opts.reserve,
    used,
    left,
    // With no count there is no way to know what is safe, so bulk waits.
    bulkLeft: counted ? Math.max(0, left - opts.reserve) : 0,
    resetsAt: nextUtcMidnight(opts.now).toISOString(),
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
  const start = utcDayStart(now).toISOString();
  const [sent, pending] = await Promise.all([
    admin.from("email_sends").select("id", { count: "exact", head: true }).eq("status", "sent").gte("sent_at", start),
    admin
      .from("email_sends")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .gte("created_at", start),
  ]);
  const counted = !sent.error && !pending.error;
  return budgetFrom({
    limit: emailDailyLimit(),
    reserve: emailReserve(),
    used: (sent.count ?? 0) + (pending.count ?? 0),
    now,
    counted,
  });
}
