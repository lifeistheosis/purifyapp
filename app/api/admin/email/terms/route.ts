import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { logActivity } from "@/lib/admin/activityLog";
import { allAccounts } from "@/lib/admin/users";
import { JOB_ORDERS } from "@/lib/email/audienceOrder";
import { readBudget } from "@/lib/email/budget";
import { createJob, jobForMailing, runEmailJob } from "@/lib/email/jobs";
import { longDate, termsChangedEmail } from "@/lib/email/templates/account";
import { TERMS_VERSION } from "@/lib/legal/version";
import { rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Tell every account the terms changed.
 *
 * Legally required and, until 2026-09-14, missing: bumping TERMS_VERSION
 * recorded a fresh acceptance at the next sign-in and told nobody, so a reader
 * who never signed in again was never told at all.
 *
 * TO EVERYONE, REGARDLESS OF PREFERENCE. A terms change is not marketing, and
 * an unsubscribe must not be able to hide it.
 *
 * ONCE PER VERSION PER ACCOUNT. Keyed terms:<version>:<user>, so pressing Send
 * again, or after a partial failure, reaches only the people who did not get
 * it. It is safe to press twice, and the preview says how many already have.
 *
 * GET is the preview (the exact email, who it goes to). POST sends, and only
 * with confirm: true and the version the preview showed, so a deploy that
 * changed TERMS_VERSION between the two cannot send the wrong notice.
 *
 * AS A JOB, SINCE 2026-09-19. Every account is twenty days of Resend's Free
 * plan, and "press Send again tomorrow" reached 165 of 2,083 accounts and then
 * nobody. POST now starts an email job (lib/email/jobs.ts): today's share goes
 * at once, inside the day's bulk budget, and the heartbeat sends the rest a
 * share a day, in the order chosen here, until every account has it.
 */

const mailingKey = () => `terms:${TERMS_VERSION}`;

function effectiveDate(): Date {
  return new Date(`${TERMS_VERSION}T00:00:00Z`);
}

async function alreadySent(admin: ReturnType<typeof createAdminClient>): Promise<number | null> {
  const { count, error } = await admin
    .from("email_sends")
    .select("id", { count: "exact", head: true })
    .like("dedupe_key", `terms:${TERMS_VERSION}:%`)
    .eq("status", "sent");
  return error ? null : (count ?? 0);
}

export async function GET() {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const email = termsChangedEmail({ effective: effectiveDate() });
  const [sent, audience, budget, job] = await Promise.all([
    alreadySent(admin),
    allAccounts(admin).catch((e: Error) => ({ error: e.message })),
    readBudget(admin),
    jobForMailing(admin, mailingKey()).catch(() => undefined),
  ]);

  return NextResponse.json({
    version: TERMS_VERSION,
    effective: longDate(effectiveDate()),
    subject: email.subject,
    text: email.text,
    accounts: "accounts" in audience ? audience.accounts.length : null,
    complete: "accounts" in audience ? audience.complete : false,
    audienceError: "error" in audience ? audience.error : null,
    /** Null when email_sends is not applied, which also means Send will refuse. */
    alreadySent: sent,
    budget,
    /** The running job for this version; null when none; undefined when email_jobs is not applied. */
    job: job === undefined ? undefined : job,
    jobsReady: job !== undefined,
  });
}

const Body = z.object({
  confirm: z.literal(true),
  version: z.string(),
  order: z.enum(JOB_ORDERS).default("oldest"),
  /** At most this many a day for this notice; null for "whatever the budget allows". */
  perDay: z.number().int().min(1).max(1000).nullable().default(null),
});

export async function POST(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (await rateLimited(`email-terms:${adminUser.id}`, 300, 3)) {
    return NextResponse.json({ error: "Give it a few minutes between sends." }, { status: 429 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Confirm the send first." }, { status: 400 });
  }
  if (parsed.data.version !== TERMS_VERSION) {
    return NextResponse.json(
      { error: `The terms version is now ${TERMS_VERSION}, not ${parsed.data.version}. Reload and check the notice again.` },
      { status: 409 },
    );
  }

  const admin = createAdminClient();
  if ((await alreadySent(admin)) === null) {
    return NextResponse.json(
      { error: "email_sends is not applied, so there is no way to send each notice once. Nothing was sent." },
      { status: 503 },
    );
  }

  let audience: Awaited<ReturnType<typeof allAccounts>>;
  try {
    audience = await allAccounts(admin);
  } catch (e) {
    return NextResponse.json({ error: `Could not read accounts: ${(e as Error).message}` }, { status: 502 });
  }
  if (!audience.complete) {
    return NextResponse.json(
      { error: "There are more accounts than this can read in one pass. Nothing was sent, because a legal notice that reaches only some accounts is worse than a delay." },
      { status: 409 },
    );
  }

  let started: Awaited<ReturnType<typeof createJob>>;
  try {
    started = await createJob(admin, {
      kind: "terms_changed",
      mailingKey: mailingKey(),
      subject: termsChangedEmail({ effective: effectiveDate() }).subject,
      audience: "all_accounts",
      order: parsed.data.order,
      perDay: parsed.data.perDay,
      payload: { type: "terms", version: TERMS_VERSION, effective: effectiveDate().toISOString() },
      expiresAt: null,
      createdByEmail: adminUser.email ?? null,
    });
  } catch (e) {
    return NextResponse.json(
      { error: `Could not start the send: ${(e as Error).message}. Is supabase/migrations/20260919_ops_board.sql applied?` },
      { status: 503 },
    );
  }
  if (!started.created && started.job.status !== "running") {
    return NextResponse.json(
      { error: `The notice for ${TERMS_VERSION} is already ${started.job.status}. Resume it from Sending.`, job: started.job },
      { status: 409 },
    );
  }

  const budget = await readBudget(admin);
  const run = await runEmailJob(admin, started.job, { allowance: budget.bulkLeft, accounts: audience });

  void logActivity({
    actorEmail: adminUser.email ?? null,
    action: "email.terms_notice",
    entityType: "terms_version",
    entityId: TERMS_VERSION,
    detail: {
      accounts: audience.accounts.length,
      order: parsed.data.order,
      perDay: parsed.data.perDay,
      ...run.counts,
      owed: run.owed,
      note: run.note,
    },
  });

  return NextResponse.json({
    version: TERMS_VERSION,
    accounts: audience.accounts.length,
    ...run.counts,
    owed: run.owed,
    quota: run.note,
    budgetLeft: budget.bulkLeft,
    job: started.job.id,
  });
}
