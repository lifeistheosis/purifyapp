import { NextResponse } from "next/server";
import { z } from "zod";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { CARE_NOTE_SEND } from "@/lib/campaigns/careOn";
import { CAMPAIGN_MOD_ACTIONS, isCampaignModAction, readOpenCampaignReports, readWaitingCampaigns, runCampaignModAction } from "@/lib/campaigns/moderation";
import { campaignsCaller } from "@/lib/campaigns/opening";
import { campaignPart } from "@/lib/campaigns/parts";
import { readWaitingPictures } from "@/lib/campaigns/pictures";
import { requestStanding } from "@/lib/community/adminStanding";
import { communityEnabled } from "@/lib/community/flags";
import { MOD_ACTIONS, moderatorFor, readModLog, readOpenReports, readPendingHolds, runModAction } from "@/lib/community/moderation";
import { REMOVAL_REASONS } from "@/lib/community/removal";
import { signedInUser } from "@/lib/community/social";
import { rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The moderation queue for readers who hold the Moderator badge (and the
 * team), from any device, the phone apps included: what waits for a
 * decision, the open reports, and the log of who did what.
 *
 * GET              the queue and the log.
 * GET ?summary=1   how many things wait, for the button in Community.
 * POST             one action: remove, restore, dismiss, approve, keep, or
 *                  clear and reset a reported profile. The same actions the
 *                  team's console takes (lib/community/moderation.ts), each
 *                  written to the log under the moderator's name.
 *
 * Words, web addresses, pins and badges stay with the team's console.
 * Nothing here carries a reader's auth id or email.
 *
 * Prayer campaigns (1.9) wait in the same queue: every campaign is read
 * before it is public, and readers' reports can hide one again. They are in
 * the queue, and their four actions are taken, only for a moderator campaigns
 * are open for (lib/campaigns/opening.ts): nobody while the switch is closed,
 * when not one campaign table is read, and the team alone while testers try
 * them. Whoever acts is the same `moderator` below, so an admin's account
 * moderates a campaign only as it moderates a post, the sign-in code and all
 * (lib/community/adminStanding.ts).
 */

async function moderator(req: Request) {
  const user = await signedInUser(req);
  if (!user) return { ok: false as const, response: NextResponse.json({ error: "Sign in first." }, { status: 401 }) };
  const admin = createAdminClient();
  const actor = await moderatorFor(admin, { id: user.id, email: user.email, standing: await requestStanding(req, user) });
  if (!actor) return { ok: false as const, response: NextResponse.json({ error: "Not found." }, { status: 404 }) };
  return { ok: true as const, admin, actor, user };
}

async function handleGET(req: Request) {
  if (!communityEnabled()) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const who = await moderator(req);
  if (!who.ok) return who.response;
  const { admin } = who;

  if (new URL(req.url).searchParams.get("summary") === "1") {
    const head = (table: string) => admin.from(table).select("id", { count: "exact", head: true });
    const [holds, reports, campaigns] = await Promise.all([
      head("community_text_holds").eq("status", "pending"),
      head("community_reports").eq("status", "open"),
      campaignsWaiting(req, admin, who.actor.admin),
    ]);
    return NextResponse.json(
      { waiting: (holds.error ? 0 : (holds.count ?? 0)) + (reports.error ? 0 : (reports.count ?? 0)) + campaigns },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }

  try {
    const [holds, reports, log, campaigns] = await Promise.all([
      readPendingHolds(admin),
      readOpenReports(admin),
      readModLog(admin, { limit: 60 }),
      campaignQueue(req, admin, who.actor.admin),
    ]);
    return NextResponse.json(
      {
        holds: holds.rows,
        reports,
        log: log.rows,
        live: { holds: holds.live, log: log.live },
        me: { name: who.actor.name, admin: who.actor.admin },
        // Absent, not empty, when campaigns are not open for this moderator.
        ...(campaigns ? { campaigns } : {}),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    console.error("[community/moderation] read failed", (e as Error).message);
    // Never an empty queue for a failed read: "nothing waiting" is the
    // sentence that makes a moderator stop looking.
    return NextResponse.json({ error: "The queue could not be read. This is not an empty queue." }, { status: 500 });
  }
}

type Admin = ReturnType<typeof createAdminClient>;

/**
 * The campaigns waiting to be read and their open reports, or null when
 * campaigns are not open for whoever asks. And the pictures waiting to be
 * looked at, only while pictures are switched on (lib/campaigns/parts.ts),
 * and only for the team: nobody else is shown a picture before it is
 * cleared (the notes, 3.4). While they are off the key is absent and the
 * pictures' table is never read.
 *
 * Nor for a build that has no pictures: a store build cut without them says
 * so with `pictures=0` (lib/campaigns/partsHere.ts), and is then sent none
 * and counted none, so its button never shows a number for what its page
 * cannot draw, and no address of a waiting picture goes where it has no use.
 */
async function campaignQueue(req: Request, admin: Admin, team: boolean) {
  if (!(await campaignsCaller(req)).open) return null;
  const [waiting, reports] = await Promise.all([readWaitingCampaigns(admin), readOpenCampaignReports(admin)]);
  // `care`: said only while the care note can be sent (lib/campaigns/careOn.ts), so no screen offers a button the server would refuse.
  const queue = { waiting: waiting.rows, reports: reports.rows, live: waiting.live && reports.live, ...(CARE_NOTE_SEND ? { care: true } : {}) };
  if (!team || !campaignPart("pictures") || new URL(req.url).searchParams.get("pictures") === "0") return queue;
  return { ...queue, pictures: (await readWaitingPictures(admin)).rows };
}

/** How many of them wait, for the button in Community: one for each campaign waiting, one for each open report, one for each picture. */
async function campaignsWaiting(req: Request, admin: Admin, team: boolean): Promise<number> {
  try {
    const queue = await campaignQueue(req, admin, team);
    return queue ? queue.waiting.length + queue.reports.length + ("pictures" in queue ? queue.pictures.length : 0) : 0;
  } catch {
    // The count is a hint on a button; the queue itself says when it could not be read.
    return 0;
  }
}

const schema = z.object({
  action: z.enum([...MOD_ACTIONS, ...CAMPAIGN_MOD_ACTIONS]),
  id: z.string().uuid(),
  reason: z.string().max(300).optional().nullable(),
  // Why, from the list a removal's notice says (lib/community/removal.ts). The
  // moderators' page sends one only where it must be chosen: for words the
  // safety line held (lib/community/dangerHolds.ts).
  reason_code: z.enum(REMOVAL_REASONS).optional().nullable(),
});

async function handlePOST(req: Request) {
  if (!communityEnabled()) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const who = await moderator(req);
  if (!who.ok) return who.response;
  if (await rateLimited(`community-moderate:${who.user.id}`, 3600, 600)) {
    return NextResponse.json({ error: "Too many actions just now." }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  const { action, id, reason, reason_code: code } = parsed.data;
  if (isCampaignModAction(action)) {
    // Not an action at all where campaigns are closed for this moderator.
    if (!(await campaignsCaller(req)).open) return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    // The moderators' page asks no reason for a campaign's removal yet, so none is passed on for one.
    const res = await runCampaignModAction(who.admin, who.actor, action, id, reason);
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
    return NextResponse.json({ ok: true });
  }
  const res = await runModAction(who.admin, who.actor, action, id, reason, code);
  // `code` says what the screen can do about a refusal: "reason_needed" asks for the removal's reason.
  if (!res.ok) return NextResponse.json({ error: res.error, code: res.code }, { status: res.status });
  return NextResponse.json({ ok: true });
}

export const GET = corsRoute(handleGET);
export const POST = corsRoute(handlePOST);
export const OPTIONS = corsPreflight;
