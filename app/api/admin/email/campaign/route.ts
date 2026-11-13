import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { logActivity } from "@/lib/admin/activityLog";
import { JOB_ORDERS } from "@/lib/email/audienceOrder";
import { readBudget } from "@/lib/email/budget";
import { draftCampaign, isCampaignKind } from "@/lib/email/campaignDrafts";
import { campaignBodyText, campaignCopyViolations, startCampaign } from "@/lib/email/campaignStart";
import { findCampaign, LIBRARY_KINDS, recentLibraryReaders } from "@/lib/email/campaigns";
import { jobForMailing } from "@/lib/email/jobs";
import { LIST_LABEL, RELEASE_NEWS } from "@/lib/email/lists";
import { postalAddress } from "@/lib/email/marketing";
import { heldForApple } from "@/lib/email/appleRelay";
import { releaseNewsReaders, subscribersOf } from "@/lib/email/preferences";
import { rateLimited } from "@/lib/security/ratelimit";
import { allAccounts } from "@/lib/admin/users";
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
 * POST sends, through startCampaign (lib/email/campaignStart.ts), the one
 * start the owner's desk also sends by (his word of 2026-11-13: the Sunday
 * email, the monthly note and the feast shop email send themselves unless
 * held). It rebuilds the draft there rather than trusting the preview, and
 * needs the period key the preview showed, so a draft that changed underneath
 * (a new week began, a note was edited) cannot go out unseen. A send held for
 * the postal address is NOT recorded, so it can go once the address is set.
 *
 * THE RELEASE EMAIL GOES TO EVERY ACCOUNT that has not said stop, since 1.5
 * (lib/email/jobs.ts says why). So its count is accounts, not subscribers,
 * and its job is given `all_accounts`. No other kind is: the lists still
 * reach only the readers who turned them on.
 *
 * A send is an email job (lib/email/jobs.ts) since 2026-09-19: the first
 * share goes at once inside the month's bulk budget, in the order the owner
 * picked, and the rest go on the hour, or sooner when he presses for the next
 * share, until the list has it or the email's window closes
 * (CAMPAIGN_LIFE_DAYS). A press sends a share and not the whole list because
 * a request has about 100 seconds before the proxy gives up on it.
 */

const LIBRARY = new Set<string>(LIBRARY_KINDS);

/**
 * Who a draft would reach. For a release that is every account still taking
 * release news, and `appleHeld` says how many of them are at one of Apple's
 * hidden addresses: owed it, and not tried until Apple accepts our mail
 * (lib/email/appleRelay.ts).
 */
async function readersOf(admin: ReturnType<typeof createAdminClient>, list: Parameters<typeof subscribersOf>[1]) {
  if (list !== RELEASE_NEWS) return { ...(await subscribersOf(admin, list)), appleHeld: 0 };
  const { accounts, complete } = await allAccounts(admin);
  if (!complete) {
    return { subscribers: [], error: "There are more accounts than one pass reads, so the release email holds rather than reach only some.", appleHeld: 0 };
  }
  const readers = await releaseNewsReaders(admin, accounts.map((a) => a.id));
  const going = new Set(readers.subscribers.map((s) => s.userId));
  return { ...readers, appleHeld: heldForApple(accounts.filter((a) => going.has(a.id))).size };
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
      readersOf(admin, draft.list),
      LIBRARY.has(kind) ? recentLibraryReaders(admin).catch(() => new Set<string>()) : Promise.resolve(new Set<string>()),
      readBudget(admin),
      jobForMailing(admin, `${kind}:${draft.periodKey}`).catch(() => undefined),
    ]);
    const cadenceSkips = subs.subscribers.filter((s) => recent.has(s.userId)).length;
    const violations = draft.body
      ? campaignCopyViolations(kind, draft.body)
      : [];

    return NextResponse.json({
      kind,
      list: draft.list,
      listLabel: LIST_LABEL[draft.list],
      periodKey: draft.periodKey,
      subject: draft.body?.subject ?? null,
      text: draft.body ? campaignBodyText(draft.body) : null,
      reason: draft.reason,
      subscribers: subs.subscribers.length,
      subscribersError: subs.error,
      cadenceSkips,
      appleHeld: subs.appleHeld,
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

  const started = await startCampaign(admin, {
    kind,
    periodKey: parsed.data.periodKey,
    order: parsed.data.order,
    perDay: parsed.data.perDay,
    createdByEmail: adminUser.email ?? null,
  });
  if (!started.ok) return NextResponse.json({ error: started.error }, { status: started.status });
  const { mailingKey, run } = started;

  void logActivity({
    actorEmail: adminUser.email ?? null,
    action: "email.campaign_send",
    entityType: "email_campaign",
    entityId: mailingKey,
    detail: { order: parsed.data.order, perDay: parsed.data.perDay, ...run.counts, owed: run.owed, note: run.note },
  });

  return NextResponse.json({ ok: true, periodKey: started.periodKey, run, job: started.jobId });
}
