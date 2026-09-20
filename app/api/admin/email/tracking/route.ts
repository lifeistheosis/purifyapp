import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin/access";
import { allAccounts } from "@/lib/admin/users";
import { daysToFinish, readBudget } from "@/lib/email/budget";
import { listJobs, type EmailJob } from "@/lib/email/jobs";
import { readLedger } from "@/lib/email/ledgerRead";
import { mailByPerson, summarizeMailings, type MailingSummary } from "@/lib/email/mailings";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Every mailing Purify has sent, with who got it and who did not.
 *
 * Built from the send log (email_sends), which begins on 2026-09-14: mail
 * before that left no record anywhere Purify can read, and the page says so
 * rather than imply a complete history. For a mailing with a known audience
 * (a job, or the terms notice, which is owed to every account) it also says
 * how many never received it, which is the number the owner asked for.
 */

export type MailingRow = MailingSummary & {
  /** How many were owed it, when that is knowable. */
  audience: number | null;
  /** audience minus the people who have it. */
  neverReceived: number | null;
  job: Pick<EmailJob, "id" | "status" | "audience_order" | "per_day" | "note" | "expires_at" | "last_run_at"> | null;
  /** Days left at the current pace, for a running job. */
  etaDays: number | null;
};

export async function GET() {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const [budget, ledger, accounts, jobs, shop, updates] = await Promise.all([
    readBudget(admin),
    readLedger(admin),
    allAccounts(admin).catch(() => null),
    listJobs(admin).catch(() => null),
    admin.from("email_preferences").select("user_id", { count: "exact", head: true }).eq("shop_offers", true),
    admin.from("email_preferences").select("user_id", { count: "exact", head: true }).eq("product_updates", true),
  ]);

  const accountCount = accounts?.accounts.length ?? null;
  const jobByKey = new Map((jobs ?? []).map((j) => [j.mailing_key, j]));
  const perDay = Math.max(1, budget.limit - budget.reserve);

  const mailings: MailingRow[] = summarizeMailings(ledger.rows).map((m) => {
    const job = jobByKey.get(m.key) ?? null;
    const audience = job ? job.total || null : m.key.startsWith("terms:") ? accountCount : null;
    const neverReceived = audience === null ? null : Math.max(0, audience - m.sent);
    const pace = job?.per_day ? Math.min(job.per_day, perDay) : perDay;
    return {
      ...m,
      audience,
      neverReceived,
      job: job
        ? {
            id: job.id,
            status: job.status,
            audience_order: job.audience_order,
            per_day: job.per_day,
            note: job.note,
            expires_at: job.expires_at,
            last_run_at: job.last_run_at,
          }
        : null,
      etaDays: job?.status === "running" && neverReceived !== null ? daysToFinish(neverReceived, pace) : null,
    };
  });

  // A job that has not sent anything yet has no rows in the log: show it anyway.
  for (const j of jobs ?? []) {
    if (mailings.some((m) => m.key === j.mailing_key)) continue;
    mailings.unshift({
      key: j.mailing_key,
      kind: j.kind,
      label: j.subject,
      subject: j.subject,
      firstAt: j.created_at,
      lastAt: j.created_at,
      sent: 0,
      failed: 0,
      skipped: 0,
      pending: 0,
      people: 0,
      audience: j.total || null,
      neverReceived: j.total || null,
      job: {
        id: j.id,
        status: j.status,
        audience_order: j.audience_order,
        per_day: j.per_day,
        note: j.note,
        expires_at: j.expires_at,
        last_run_at: j.last_run_at,
      },
      etaDays: null,
    });
  }

  const { byUser, byEmail } = mailByPerson(ledger.rows);
  let emailed = 0;
  for (const a of accounts?.accounts ?? []) {
    if ((byUser.get(a.id)?.received ?? 0) > 0 || (byEmail.get(a.email.toLowerCase())?.received ?? 0) > 0) emailed += 1;
  }

  return NextResponse.json({
    budget,
    totals: {
      accounts: accountCount,
      emailed: accounts ? emailed : null,
      neverEmailed: accounts ? accountCount! - emailed : null,
      optedIn: { shop: shop.count ?? 0, updates: updates.count ?? 0 },
      historyStart: ledger.rows[0]?.created_at ?? null,
      rows: ledger.rows.length,
    },
    mailings,
    ready: { ledger: ledger.error === null, jobs: jobs !== null },
    truncated: ledger.truncated,
  });
}
