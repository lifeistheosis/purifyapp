import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { logActivity } from "@/lib/admin/activityLog";
import { JOB_ORDERS } from "@/lib/email/audienceOrder";
import { readBudget } from "@/lib/email/budget";
import { draftCampaign, isCampaignKind } from "@/lib/email/campaignDrafts";
import { findCampaign, LIBRARY_KINDS, recentLibraryReaders } from "@/lib/email/campaigns";
import { campaignExpiry, createJob, jobForMailing, runEmailJob } from "@/lib/email/jobs";
import { checkEmailCopy } from "@/lib/email/doctrine";
import { explainViolations } from "@/lib/push/doctrine";
import { LIST_LABEL } from "@/lib/email/lists";
import { postalAddress } from "@/lib/email/marketing";
import { subscribersOf } from "@/lib/email/preferences";
import { rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The review-and-send route for the two email lists.
 *
 * GET ?kind=weekly|monthly|release|shop_new|shop_feast builds the draft from the
 * app's own data and says everything that decides whether it can go: who is
 * subscribed, how many the cadence rule will skip, whether this period already
 * went, whether the postal address is set, and whether the words pass the
 * email doctrine.
 *
 * POST sends. It rebuilds the draft here rather than trusting the preview, and
 * needs the period key the preview showed, so a draft that changed underneath
 * (a new week began, a note was edited) cannot go out unseen. A send held for
 * the postal address is NOT recorded, so it can go once the address is set.
 *
 * A send is an email job (lib/email/jobs.ts) since 2026-09-19: today's share
 * goes at once inside the day's bulk budget, in the order the owner picked,
 * and the rest go a share a day until the list has it or the email's window
 * closes (CAMPAIGN_LIFE_DAYS), so a list larger than a day's budget is not
 * cut off at the budget.
 */

const LIBRARY = new Set<string>(LIBRARY_KINDS);

function bodyText(body: { subject: string; paragraphs: string[] }): string {
  return [body.subject, ...body.paragraphs].join("\n\n");
}

export async function GET(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const kind = new URL(req.url).searchParams.get("kind");
  if (!isCampaignKind(kind)) return NextResponse.json({ error: "Unknown kind." }, { status: 400 });

  const admin = createAdminClient();
  try {
    const draft = await draftCampaign(admin, kind);
    const [already, subs, recent, budget, job] = await Promise.all([
      findCampaign(admin, kind, draft.periodKey).catch(() => null),
      subscribersOf(admin, draft.list),
      LIBRARY.has(kind) ? recentLibraryReaders(admin).catch(() => new Set<string>()) : Promise.resolve(new Set<string>()),
      readBudget(admin),
      jobForMailing(admin, `${kind}:${draft.periodKey}`).catch(() => undefined),
    ]);
    const cadenceSkips = subs.subscribers.filter((s) => recent.has(s.userId)).length;
    const violations = draft.body
      ? checkEmailCopy({ subject: draft.body.subject, body: bodyText(draft.body) })
      : [];

    return NextResponse.json({
      kind,
      list: draft.list,
      listLabel: LIST_LABEL[draft.list],
      periodKey: draft.periodKey,
      subject: draft.body?.subject ?? null,
      text: draft.body ? bodyText(draft.body) : null,
      reason: draft.reason,
      subscribers: subs.subscribers.length,
      subscribersError: subs.error,
      cadenceSkips,
      alreadySent: already ? { at: already.created_at, sent: already.sent } : null,
      postalAddressSet: postalAddress() !== null,
      violations: violations.map((v) => `${v.clause}: ${v.reason}`),
      budget,
      job: job ?? null,
      jobsReady: job !== undefined,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 503 });
  }
}

const Body = z.object({
  kind: z.string(),
  periodKey: z.string().min(1).max(40),
  confirm: z.literal(true),
  order: z.enum(JOB_ORDERS).default("oldest"),
  perDay: z.number().int().min(1).max(1000).nullable().default(null),
});

export async function POST(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (await rateLimited(`email-campaign:${adminUser.id}`, 300, 5)) {
    return NextResponse.json({ error: "Give it a few minutes between sends." }, { status: 429 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isCampaignKind(parsed.data.kind)) {
    return NextResponse.json({ error: "Confirm the send first." }, { status: 400 });
  }
  const kind = parsed.data.kind;
  const admin = createAdminClient();

  const draft = await draftCampaign(admin, kind).catch((e: Error) => e);
  if (draft instanceof Error) return NextResponse.json({ error: draft.message }, { status: 503 });
  if (draft.periodKey !== parsed.data.periodKey) {
    return NextResponse.json(
      { error: `This is now the draft for ${draft.periodKey}, not ${parsed.data.periodKey}. Reload and check it again.` },
      { status: 409 },
    );
  }
  if (!draft.body) return NextResponse.json({ error: draft.reason ?? "Nothing to send." }, { status: 409 });

  const violations = checkEmailCopy({ subject: draft.body.subject, body: bodyText(draft.body) });
  if (violations.length) {
    return NextResponse.json({ error: `The words do not pass: ${explainViolations(violations)}` }, { status: 422 });
  }

  const mailingKey = `${kind}:${draft.periodKey}`;
  const existing = await jobForMailing(admin, mailingKey).catch(() => null);
  if (existing || (await findCampaign(admin, kind, draft.periodKey).catch(() => null))) {
    return NextResponse.json(
      {
        error: existing
          ? `The ${kind} email for ${draft.periodKey} is already ${existing.status === "running" ? "going out, a share a day" : existing.status}.`
          : `The ${kind} email for ${draft.periodKey} already went out.`,
      },
      { status: 409 },
    );
  }

  if (!postalAddress()) {
    return NextResponse.json(
      { error: "Held: marketing email needs EMAIL_POSTAL_ADDRESS set on the server first. Nothing was sent." },
      { status: 409 },
    );
  }

  const body = draft.body;
  const now = new Date();
  let started: Awaited<ReturnType<typeof createJob>>;
  try {
    started = await createJob(admin, {
      kind,
      mailingKey,
      subject: body.subject,
      audience: draft.list,
      order: parsed.data.order,
      perDay: parsed.data.perDay,
      payload: {
        type: "campaign",
        periodKey: draft.periodKey,
        body,
        bodyText: bodyText(body),
        details: draft.details,
      },
      expiresAt: campaignExpiry(kind, now),
      createdByEmail: adminUser.email ?? null,
    });
  } catch (e) {
    return NextResponse.json(
      { error: `Could not start the send: ${(e as Error).message}. Is supabase/migrations/20260919_ops_board.sql applied?` },
      { status: 503 },
    );
  }

  const budget = await readBudget(admin, now);
  const run = await runEmailJob(admin, started.job, { allowance: budget.bulkLeft, now });

  void logActivity({
    actorEmail: adminUser.email ?? null,
    action: "email.campaign_send",
    entityType: "email_campaign",
    entityId: mailingKey,
    detail: { order: parsed.data.order, perDay: parsed.data.perDay, ...run.counts, owed: run.owed, note: run.note },
  });

  return NextResponse.json({ ok: true, periodKey: draft.periodKey, run, job: started.job.id });
}
