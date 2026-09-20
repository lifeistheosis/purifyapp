import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { allAccounts, type AccountRow } from "@/lib/admin/users";

import { planBatch, type Candidate, type JobOrder } from "./audienceOrder";
import { readBudget, utcDayStart } from "./budget";
import { LIBRARY_KINDS, recentLibraryReaders, recordCampaign, type CampaignKind } from "./campaigns";
import { drain, quotaStopMessage, type DrainOutcome } from "./drain";
import { sendEmailOnce } from "./ledger";
import type { MarketingList } from "./lists";
import { postalAddress, renderMarketing, type MarketingBody } from "./marketing";
import { subscribersOf } from "./preferences";
import { termsChangedEmail } from "./templates/account";

/**
 * A bulk email that takes as many days as the budget needs (email_jobs).
 *
 * ── Why this exists ─────────────────────────────────────────────────────
 *
 * The terms notice for 2026-08-14 reached 165 of 2,083 accounts and stopped:
 * Resend's Free plan sends 100 a day, and finishing meant pressing Send again
 * every day, which nobody did. A mailing is now a job. Confirming it once
 * starts it, today's share goes at once, and the hourly heartbeat
 * (lib/ops/maintenance.ts) sends the next share each day until everyone owed
 * it has it, in the order the owner chose (lib/email/audienceOrder.ts), inside
 * the day's bulk budget (lib/email/budget.ts). Pause and Cancel stop it.
 *
 * ── Once, still ─────────────────────────────────────────────────────────
 *
 * A job adds no second lock. Every copy still goes through sendOnce under the
 * same `<mailing>:<user>` key the routes always used, so a job, a manual press
 * and an overlapping heartbeat cannot send anyone the same mailing twice, and
 * the 165 people who got the terms notice before jobs existed are skipped.
 *
 * ── Two audiences, and no third ────────────────────────────────────────
 *
 * `all_accounts` is for account notices only (the terms change), which the
 * privacy page allows to go to everyone. A list job reaches the people who
 * switched that list on, through the unsubscribe footer and the postal
 * address, exactly like sendMarketingTo. There is deliberately no "everyone"
 * option for anything else: the privacy page promises no marketing email
 * without an opt-in.
 */

export type JobAudience = "all_accounts" | MarketingList;
export type JobStatus = "running" | "paused" | "done" | "expired" | "cancelled";

/**
 * How long a list email stays worth sending. A weekly calendar is about its
 * week; sent to a new subscriber a month later it is wrong, not late. So a
 * list job ends on its own after this many days, whoever is still owed it.
 * The terms notice never expires: everyone is owed it until they have it.
 */
export const CAMPAIGN_LIFE_DAYS: Record<CampaignKind, number> = {
  weekly: 6,
  monthly: 14,
  release: 21,
  shop_new: 14,
  shop_feast: 21,
};

export function campaignExpiry(kind: CampaignKind, now: Date): string {
  return new Date(now.getTime() + CAMPAIGN_LIFE_DAYS[kind] * 86_400_000).toISOString();
}

export type JobPayload =
  | { type: "terms"; version: string; effective: string }
  | {
      type: "campaign";
      periodKey: string;
      body: MarketingBody;
      bodyText: string;
      details: Record<string, unknown>;
    };

export type EmailJob = {
  id: string;
  kind: string;
  mailing_key: string;
  subject: string;
  audience: JobAudience;
  audience_order: JobOrder;
  per_day: number | null;
  payload: JobPayload;
  status: JobStatus;
  total: number;
  sent: number;
  failed: number;
  note: string | null;
  expires_at: string | null;
  last_run_at: string | null;
  finished_at: string | null;
  created_by_email: string | null;
  created_at: string;
};

const TABLE = "email_jobs";
const COLUMNS =
  "id, kind, mailing_key, subject, audience, audience_order, per_day, payload, status, total, sent, failed, note, expires_at, last_run_at, finished_at, created_by_email, created_at";
const LIBRARY = new Set<string>(LIBRARY_KINDS);
const CONCURRENCY = 4;

export type JobRunReport = {
  id: string;
  mailing: string;
  /** Per outcome, this run. */
  counts: Record<DrainOutcome, number>;
  /** People still owed it after this run. */
  owed: number;
  /** Owed, but resting under the one-library-email-a-week rule. */
  resting: number;
  finished: boolean;
  /** One line for the panel: why it held, or where the quota stopped it. */
  note: string | null;
  quotaStopped: boolean;
};

function emptyCounts(): Record<DrainOutcome, number> {
  return { sent: 0, skipped: 0, failed: 0, duplicate: 0, unavailable: 0, deferred: 0 };
}

export async function listJobs(admin: SupabaseClient, limit = 50): Promise<EmailJob[]> {
  const { data, error } = await admin.from(TABLE).select(COLUMNS).order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error(`${TABLE}: ${error.message}`);
  return (data ?? []) as EmailJob[];
}

export async function jobForMailing(admin: SupabaseClient, mailingKey: string): Promise<EmailJob | null> {
  const { data, error } = await admin.from(TABLE).select(COLUMNS).eq("mailing_key", mailingKey).maybeSingle();
  if (error) throw new Error(`${TABLE}: ${error.message}`);
  return (data as EmailJob | null) ?? null;
}

/** Start a job, or hand back the one already started for this mailing. */
export async function createJob(
  admin: SupabaseClient,
  job: {
    kind: "terms_changed" | CampaignKind;
    mailingKey: string;
    subject: string;
    audience: JobAudience;
    order: JobOrder;
    perDay: number | null;
    payload: JobPayload;
    expiresAt: string | null;
    createdByEmail: string | null;
  },
): Promise<{ job: EmailJob; created: boolean }> {
  const existing = await jobForMailing(admin, job.mailingKey);
  if (existing) return { job: existing, created: false };
  const { data, error } = await admin
    .from(TABLE)
    .insert({
      kind: job.kind,
      mailing_key: job.mailingKey,
      subject: job.subject,
      audience: job.audience,
      audience_order: job.order,
      per_day: job.perDay,
      payload: job.payload,
      expires_at: job.expiresAt,
      created_by_email: job.createdByEmail,
    })
    .select(COLUMNS)
    .single();
  if (error) {
    // Two presses at once: the second loses the unique key and takes the first's job.
    const raced = error.code === "23505" ? await jobForMailing(admin, job.mailingKey) : null;
    if (raced) return { job: raced, created: false };
    throw new Error(`${TABLE}: ${error.message}`);
  }
  return { job: data as EmailJob, created: true };
}

export async function updateJob(
  admin: SupabaseClient,
  id: string,
  patch: Partial<Pick<EmailJob, "status" | "audience_order" | "per_day">>,
): Promise<EmailJob> {
  const { data, error } = await admin
    .from(TABLE)
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(COLUMNS)
    .single();
  if (error) throw new Error(`${TABLE}: ${error.message}`);
  return data as EmailJob;
}

/** Where one mailing stands in the send log. */
export async function mailingProgress(
  admin: SupabaseClient,
  mailingKey: string,
  now: Date = new Date(),
): Promise<{ done: Set<string>; sent: number; failed: number; sentToday: number }> {
  const prefix = `${mailingKey}:`;
  const start = utcDayStart(now).toISOString();
  const done = new Set<string>();
  let sent = 0;
  let failed = 0;
  let sentToday = 0;
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin
      .from("email_sends")
      .select("dedupe_key, status, sent_at")
      .like("dedupe_key", `${prefix}%`)
      .range(from, from + 999);
    if (error) throw new Error(`email_sends: ${error.message}`);
    const rows = (data ?? []) as { dedupe_key: string; status: string; sent_at: string | null }[];
    for (const r of rows) {
      // `like` treats _ as a wildcard: keep only this mailing's own keys.
      if (!r.dedupe_key.startsWith(prefix)) continue;
      const who = r.dedupe_key.slice(prefix.length);
      if (who.includes(":")) continue;
      if (r.status === "sent" || r.status === "pending") done.add(who);
      if (r.status === "sent") {
        sent += 1;
        if (r.sent_at && r.sent_at >= start) sentToday += 1;
      } else if (r.status === "failed") failed += 1;
    }
    if (rows.length < 1000) break;
  }
  return { done, sent, failed, sentToday };
}

/** Emails sent to each person, all kinds: what "fewest emails first" sorts by. */
async function receivedCounts(admin: SupabaseClient): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin
      .from("email_sends")
      .select("user_id")
      .eq("status", "sent")
      .not("user_id", "is", null)
      .range(from, from + 999);
    if (error) throw new Error(`email_sends: ${error.message}`);
    const rows = (data ?? []) as { user_id: string }[];
    for (const r of rows) out.set(r.user_id, (out.get(r.user_id) ?? 0) + 1);
    if (rows.length < 1000) break;
  }
  return out;
}

type Person = Candidate & { email: string; token?: string };

async function audienceOf(
  admin: SupabaseClient,
  job: EmailJob,
  accounts: AccountRow[],
): Promise<Person[]> {
  const base = (a: AccountRow): Person => ({ ...a, received: 0 });
  if (job.audience === "all_accounts") return accounts.map(base);
  const { subscribers, error } = await subscribersOf(admin, job.audience);
  if (error) throw new Error(`email_preferences: ${error}`);
  const byId = new Map(accounts.map((a) => [a.id, a]));
  return subscribers.flatMap((s) => {
    const a = byId.get(s.userId);
    return a ? [{ ...base(a), token: s.unsubscribeToken }] : [];
  });
}

/**
 * Send one job's share for today: at most `allowance`, and at most what is
 * left of its own per-day limit. Records the outcome on the job either way.
 */
export async function runEmailJob(
  admin: SupabaseClient,
  job: EmailJob,
  opts: { allowance: number; now?: Date; accounts?: { accounts: AccountRow[]; complete: boolean } },
): Promise<JobRunReport> {
  const now = opts.now ?? new Date();
  const report: JobRunReport = {
    id: job.id,
    mailing: job.mailing_key,
    counts: emptyCounts(),
    owed: 0,
    resting: 0,
    finished: false,
    note: null,
    quotaStopped: false,
  };
  if (job.status !== "running") return report;

  if (job.expires_at && now.toISOString() >= job.expires_at) {
    report.note = "Ended on its own: this email was only worth sending in its own window.";
    await admin
      .from(TABLE)
      .update({ status: "expired", note: report.note, finished_at: now.toISOString(), updated_at: now.toISOString() })
      .eq("id", job.id);
    return report;
  }

  const { accounts, complete } = opts.accounts ?? (await allAccounts(admin));
  if (job.audience === "all_accounts" && !complete) {
    report.note = "There are more accounts than one pass reads, so this holds rather than reach only some.";
    await admin.from(TABLE).update({ note: report.note, last_run_at: now.toISOString() }).eq("id", job.id);
    return report;
  }

  const people = await audienceOf(admin, job, accounts);
  if (job.audience_order === "least_emailed") {
    const counts = await receivedCounts(admin);
    for (const p of people) p.received = counts.get(p.id) ?? 0;
  }
  const before = await mailingProgress(admin, job.mailing_key, now);
  const resting = LIBRARY.has(job.kind) ? await recentLibraryReaders(admin, now).catch(() => undefined) : undefined;
  const perDayRoom = job.per_day ? Math.max(0, job.per_day - before.sentToday) : Number.POSITIVE_INFINITY;
  const room = Math.min(opts.allowance, perDayRoom);
  const plan = planBatch({ candidates: people, done: before.done, resting, order: job.audience_order, room });
  report.resting = plan.resting;

  const address = job.payload.type === "campaign" ? postalAddress() : null;
  if (job.payload.type === "campaign" && !address) {
    report.note = "Held: list email needs EMAIL_POSTAL_ADDRESS set on the server.";
  } else if (plan.batch.length > 0) {
    const payload = job.payload;
    const drained = await drain(plan.batch, {
      concurrency: CONCURRENCY,
      cap: { applies: () => true, limit: room },
      send: (p) => {
        if (payload.type === "terms") {
          const email = termsChangedEmail({ effective: new Date(payload.effective) });
          return sendEmailOnce(admin, {
            dedupeKey: `${job.mailing_key}:${p.id}`,
            kind: "terms_changed",
            userId: p.id,
            to: p.email,
            subject: email.subject,
            html: email.html,
            text: email.text,
          });
        }
        const list = job.audience as MarketingList;
        const email = renderMarketing(payload.body, list, p.token ?? "", address!);
        return sendEmailOnce(admin, {
          dedupeKey: `${job.mailing_key}:${p.id}`,
          kind: job.kind,
          userId: p.id,
          to: p.email,
          subject: email.subject,
          html: email.html,
          text: email.text,
          headers: email.headers,
        });
      },
      record: (_, outcome) => {
        report.counts[outcome] += 1;
      },
    });
    report.quotaStopped = drained.quotaStop !== null;
    report.note = quotaStopMessage(drained);
  }

  const after = await mailingProgress(admin, job.mailing_key, now);
  report.owed = people.filter((p) => !after.done.has(p.id)).length;
  report.finished = report.owed === 0 && people.length > 0;
  if (!report.note && !report.finished && plan.batch.length === 0) {
    report.note =
      people.length === 0
        ? job.audience === "all_accounts"
          ? "No accounts to send to."
          : "Nobody has switched this list on yet."
        : room <= 0
          ? "Today's share is spent. The next share goes tomorrow."
          : plan.resting > 0
            ? `${plan.resting} waiting on the one-email-a-week rule.`
            : null;
  }

  await admin
    .from(TABLE)
    .update({
      total: people.length,
      sent: after.sent,
      failed: after.failed,
      note: report.note,
      last_run_at: now.toISOString(),
      updated_at: now.toISOString(),
      ...(report.finished ? { status: "done", finished_at: now.toISOString() } : {}),
    })
    .eq("id", job.id);

  if (job.payload.type === "campaign") {
    await recordCampaign(admin, {
      kind: job.kind as CampaignKind,
      periodKey: job.payload.periodKey,
      subject: job.subject,
      bodyText: job.payload.bodyText,
      details: job.payload.details,
      recipients: people.length,
      sent: after.sent,
      createdByEmail: job.created_by_email,
    }).catch(() => undefined);
  }
  return report;
}

/**
 * The daily share of every running job, oldest job first, inside what the day
 * has left for bulk. Called by the heartbeat; safe to call as often as it
 * likes, because a job whose share is spent sends nothing.
 */
export async function runEmailJobs(
  admin: SupabaseClient,
  now: Date = new Date(),
): Promise<{ running: number; allowance: number; reports: JobRunReport[] }> {
  const { data, error } = await admin
    .from(TABLE)
    .select(COLUMNS)
    .eq("status", "running")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`${TABLE}: ${error.message}`);
  const jobs = (data ?? []) as EmailJob[];
  if (jobs.length === 0) return { running: 0, allowance: 0, reports: [] };

  const budget = await readBudget(admin, now);
  let allowance = budget.bulkLeft;
  const reports: JobRunReport[] = [];
  if (allowance <= 0) return { running: jobs.length, allowance: 0, reports };

  const accounts = await allAccounts(admin);
  for (const job of jobs) {
    if (allowance <= 0) break;
    const r = await runEmailJob(admin, job, { allowance, now, accounts });
    reports.push(r);
    allowance -= r.counts.sent + r.counts.failed;
    if (r.quotaStopped) break;
  }
  return { running: jobs.length, allowance: budget.bulkLeft, reports };
}
