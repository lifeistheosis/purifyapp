import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { AUTO, logMod, type ModActor, type ModResult } from "@/lib/community/moderation";
import { writeRemovalNotice, type RemovalReason } from "@/lib/community/removal";
import { removeOwnedUpload } from "@/lib/security/uploadOwners";

import { circleNames } from "./circles";
import {
  CAMPAIGN_MOD_ACTIONS,
  isCampaignModAction,
  isOver,
  type CampaignModAction,
  type OpenCampaignReport,
  type ReportReason,
  type WaitingCampaign,
} from "./model";
import { CAMPAIGN_BUCKET, campaignImage } from "./image";
import { reworkAbsent } from "./opening";
import { campaignPart } from "./parts";
import { approvePicture, deletePicturesOf, removePictureAsModerator } from "./pictures";
import { reportsSay } from "./reportsSay";

// Moderating prayer campaigns (the rework of 1.9), once, for everyone who
// moderates: the team's console and readers holding the Moderator badge work
// the same functions, as they do for posts (lib/community/moderation.ts),
// and every decision is written to the same log under who took it.
//
// A campaign waits here twice in its life: when it is started, since every
// campaign is read before it is public (his yes to item 117), and when
// readers' reports hide it again. Nothing here carries a reader's account id
// or email out: a campaign is acted on by its own id, a report by its own.

function excerpt(text: string | null | undefined, max = 80): string {
  const flat = (text ?? "").replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

type Row = {
  id: string;
  creator_id: string;
  title: string;
  status: string;
  ends_at: string | null;
  creator_name: string | null;
  mod_cleared_at: string | null;
  held_reason: string | null;
};

const ROW_COLS = "id, creator_id, title, status, ends_at, creator_name, mod_cleared_at, held_reason";

async function read(admin: SupabaseClient, id: string): Promise<Row | null> {
  const { data, error } = await admin.from("prayer_campaigns").select(ROW_COLS).eq("id", id).maybeSingle();
  if (error) {
    reworkAbsent(error);
    return null;
  }
  return (data as unknown as Row | null) ?? null;
}

const summary = (c: Row) => `${c.creator_name ?? "A reader"}: ${excerpt(c.title)}`;

/**
 * Close a campaign's open reports as acted on or dismissed, by whoever
 * decided. Keeping a campaign answers the reports of the campaign and leaves
 * a report of one of its pictures open, since nobody has decided about the
 * picture; removing it answers every one, since its pictures go with it.
 */
async function closeReports(admin: SupabaseClient, actor: ModActor, campaignId: string, status: "actioned" | "dismissed") {
  let query = admin.from("prayer_campaign_reports").update({ status, closed_at: new Date().toISOString() }).eq("campaign_id", campaignId).eq("status", "open");
  if (status === "dismissed") query = query.eq("target_kind", "campaign");
  const { error } = await query;
  if (error && !reworkAbsent(error)) console.warn("[campaigns] reports not closed", actor.name, error.message);
}

/** Hidden by readers' reports, by the words ./reportsSay.ts's caller writes below. */
const hiddenByReports = (reason: string | null) => /\breports\b/.test(reason ?? "");

/**
 * A moderator has read it and it may be seen: on the board, open to join.
 *
 * READ IS NOT YET CLEARED. Every campaign is read once before it is public,
 * and whoever reads a new one cannot know whether the person it names agreed
 * to be named. So that first reading leaves reports able to hide it: "it is
 * about me" from the person it names still takes it down at once. It is
 * CLEARED, and stays up whatever more reports say until someone removes it
 * by hand, only when a moderator looks at it AFTER reports hid it and keeps
 * it, as a post a moderator has kept is cleared.
 *
 * Until 2026-11-10 the first reading cleared it too, which, with every
 * campaign read first, meant no report could ever hide one. Nothing was open
 * yet. lib/campaigns/__tests__/routes.test.ts walks the whole way now: read,
 * reported and hidden, kept, and then not hidden again.
 */
export async function approveCampaign(admin: SupabaseClient, actor: ModActor, id: string, now: number = Date.now()): Promise<ModResult> {
  const c = await read(admin, id);
  if (!c) return { ok: false, status: 404, error: "That campaign is gone." };
  if (c.status !== "held") return { ok: false, status: 409, error: "That campaign is not waiting." };
  // One whose days ran out while it waited is ended, not put up for an hour.
  const status = isOver({ status: "active", ends_at: c.ends_at }, now) ? "ended" : "active";
  const at = new Date(now).toISOString();
  const { error } = await admin
    .from("prayer_campaigns")
    .update({ status, held_reason: null, ...(hiddenByReports(c.held_reason) ? { mod_cleared_at: at } : {}), updated_at: at })
    .eq("id", id)
    .eq("status", "held");
  if (error) return { ok: false, status: 500, error: error.message };
  await closeReports(admin, actor, id, "dismissed");
  await logMod(admin, actor, { action: "approve_campaign", target: "campaign", targetId: id, summary: summary(c) });
  return { ok: true };
}

/**
 * Take a campaign down. The row is kept, unseen by anyone, for thirty days
 * in case of an appeal or a lawful request, and then deleted by the upkeep
 * (lib/campaigns/upkeep.ts); those who carry it let go of it the next time
 * their app is online.
 *
 * ITS CREATOR IS TOLD WHY, ONCE (the Terms, "What we may remove", his yes of
 * 2026-11-10: "When we remove something you posted, we tell you why";
 * lib/community/removal.ts). `code` is the reason the moderator chose from
 * the list the notice reads from; with none, the notice says the house
 * rules. Only a removal that took the campaign down tells anyone. One that
 * is down already stays as it was taken down, by whom, why and from when, so
 * a second tap writes no second notice and does not start its thirty days
 * again; it only tries once more for what a first try may have left of its
 * pictures' files. And only a moderator's removal: the upkeep's deletes and
 * a creator's own take-down are not this function and tell nobody.
 */
export async function removeCampaign(
  admin: SupabaseClient,
  actor: ModActor,
  id: string,
  reason?: string | null,
  now: number = Date.now(),
  code?: RemovalReason | null,
): Promise<ModResult> {
  const c = await read(admin, id);
  if (!c) return { ok: false, status: 404, error: "That campaign is gone." };
  if (c.status === "removed") {
    // Down already: nothing of its row changes and nobody is told again.
    // What a first try may have left of its pictures' files is tried once more.
    await removePicture(admin, id, c.creator_id);
    await deletePicturesOf(admin, [id], { keepRows: "its campaign was removed" });
    return { ok: true };
  }
  const at = new Date(now).toISOString();
  const { data: taken, error } = await admin
    .from("prayer_campaigns")
    .update({ status: "removed", removed_reason: reason?.trim().slice(0, 300) || null, removed_by_email: actor.email ?? actor.name, updated_at: at })
    .eq("id", id)
    // Two moderators at once: the second finds it down, and is not the one who took it down.
    .neq("status", "removed")
    .select("id");
  if (error) return { ok: false, status: 500, error: error.message };
  if ((taken ?? []).length === 0) return { ok: true };
  await removePicture(admin, id, c.creator_id);
  // Its pictures' files go at once, from wherever they are: a removed
  // campaign leaves nothing at an address. Their rows are kept, marked, as
  // the campaign's is. So one put back comes back without its pictures.
  await deletePicturesOf(admin, [id], { keepRows: "its campaign was removed" });
  await closeReports(admin, actor, id, "actioned");
  await logMod(admin, actor, { action: "remove_campaign", target: "campaign", targetId: id, summary: summary(c) });
  await writeRemovalNotice(admin, { userId: c.creator_id, target: "campaign", reason: code, excerpt: c.title });
  return { ok: true };
}

/**
 * A campaign of July's may carry a picture, and its file is in a public
 * bucket: hiding the row leaves the picture at its address for good. So a
 * removal deletes it, as the team's console always has, and only when it is
 * provably the creator's own upload (lib/security/uploadOwners.ts). The
 * removal has succeeded either way; a picture left behind is logged.
 */
async function removePicture(admin: SupabaseClient, id: string, creatorId: string): Promise<void> {
  try {
    const { data } = await admin.from("prayer_campaigns").select("image_url").eq("id", id).maybeSingle<{ image_url: string | null }>();
    if (!data?.image_url) return;
    const outcome = await removeOwnedUpload(admin, CAMPAIGN_BUCKET, campaignImage(data.image_url, process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""), creatorId);
    if (outcome !== "removed") console.warn("[campaigns] campaign picture not deleted", id, outcome);
  } catch (e) {
    console.warn("[campaigns] campaign picture not deleted", id, e instanceof Error ? e.message : String(e));
  }
}

/** Put back a campaign that was taken down, cleared, unless its days are over. */
export async function restoreCampaign(admin: SupabaseClient, actor: ModActor, id: string, now: number = Date.now()): Promise<ModResult> {
  const c = await read(admin, id);
  if (!c) return { ok: false, status: 404, error: "That campaign is gone." };
  if (c.status !== "removed") return { ok: false, status: 409, error: "That campaign is not removed." };
  const at = new Date(now).toISOString();
  const status = isOver({ status: "active", ends_at: c.ends_at }, now) ? "ended" : "active";
  const { error } = await admin
    .from("prayer_campaigns")
    .update({ status, removed_reason: null, removed_by_email: null, held_reason: null, mod_cleared_at: at, updated_at: at })
    .eq("id", id)
    .eq("status", "removed");
  if (error) return { ok: false, status: 500, error: error.message };
  await logMod(admin, actor, { action: "restore_campaign", target: "campaign", targetId: id, summary: summary(c) });
  return { ok: true };
}

/** One report is set aside. It is recorded, not deleted: reported five times and dismissed five times reads differently from once. */
export async function dismissCampaignReport(admin: SupabaseClient, actor: ModActor, reportId: string): Promise<ModResult> {
  const { data: rep } = await admin.from("prayer_campaign_reports").select("id").eq("id", reportId).maybeSingle();
  if (!rep) return { ok: false, status: 404, error: "That report is gone." };
  const { error } = await admin
    .from("prayer_campaign_reports")
    .update({ status: "dismissed", closed_at: new Date().toISOString() })
    .eq("id", reportId);
  if (error) {
    // Before the rework's SQL a report has no state, and July's console
    // deleted it. That is still what setting it aside means there.
    if (!reworkAbsent(error)) return { ok: false, status: 500, error: error.message };
    const { error: gone } = await admin.from("prayer_campaign_reports").delete().eq("id", reportId);
    if (gone) return { ok: false, status: 500, error: gone.message };
  }
  await logMod(admin, actor, { action: "dismiss_campaign_report", target: "report", targetId: reportId });
  return { ok: true };
}

// The decisions a moderator takes on campaigns, by name, are the model's
// (./model.ts, CAMPAIGN_MOD_ACTIONS), so the moderators' page can name them
// without reaching into this file, which only the server may load.
export { CAMPAIGN_MOD_ACTIONS, isCampaignModAction, type CampaignModAction, type OpenCampaignReport, type WaitingCampaign };

/**
 * Run one of them as `actor`. `id` is the campaign's, or the report's for a
 * dismissal. `code` is why, from the list a removal's notice reads from
 * (lib/community/removal.ts), for the two actions that remove: the creator
 * is told that reason. The moderators' page sends none yet, and the notice
 * then says the house rules.
 */
export async function runCampaignModAction(
  admin: SupabaseClient,
  actor: ModActor,
  action: CampaignModAction,
  id: string,
  reason?: string | null,
  code?: RemovalReason | null,
): Promise<ModResult> {
  switch (action) {
    case "approve_campaign":
      return approveCampaign(admin, actor, id);
    case "remove_campaign":
      return removeCampaign(admin, actor, id, reason, undefined, code);
    case "restore_campaign":
      return restoreCampaign(admin, actor, id);
    case "dismiss_campaign_report":
      return dismissCampaignReport(admin, actor, id);
    // A picture's two. Not actions at all while pictures are switched off,
    // and the team's alone while they are new: nobody else is shown a
    // picture before it is cleared (the notes, 3.4).
    case "approve_picture":
    case "remove_picture":
      if (!campaignPart("pictures") || !actor.admin) return { ok: false, status: 404, error: "Not found." };
      return action === "approve_picture" ? approvePicture(admin, actor, id) : removePictureAsModerator(admin, actor, id, reason, code);
  }
}

// ── Reports ─────────────────────────────────────────────────────────────────

export type Reported = { ok: true; hidden: boolean } | { ok: false; status: number; error: string };

/**
 * A reader reports a campaign: a reason to tick, and words if they have
 * some. One open report a reader for each campaign; a second tap is the same
 * report, not another.
 *
 * Then it may hide itself until a moderator looks:
 *   - at once, for the reason "it is about me or someone in my care", from
 *     an account older than a day: a person named without their blessing
 *     should not wait for two more readers to agree;
 *   - when reports add up as they do for a post (lib/community/trust.ts:
 *     three readers, a new account counting half, a moderator's at once).
 * Never when a moderator has already looked at reports of it and kept it
 * (approveCampaign, above: read is not yet cleared), so that neither rule
 * can be used to silence a campaign twice; and never the team's own. The
 * weighing is ./reportsSay.ts, which a picture's reports share.
 */
export async function reportCampaign(
  admin: SupabaseClient,
  reporter: { id: string; created_at?: string | null },
  campaignId: string,
  reason: ReportReason,
  words: string | null,
  now: number = Date.now(),
): Promise<Reported> {
  const { error } = await admin.from("prayer_campaign_reports").insert({
    campaign_id: campaignId,
    reporter_id: reporter.id,
    target_kind: "campaign",
    reason_code: reason,
    reason: words?.trim().slice(0, 500) || null,
    status: "open",
  });
  // 23505 is the index that holds a reader to one open report: this person
  // has already reported it, which is a success from where they stand.
  if (error && error.code !== "23505") {
    if (reworkAbsent(error)) return { ok: false, status: 404, error: "Not found." };
    console.warn("[campaigns] report failed", error.message);
    return { ok: false, status: 500, error: "Could not send that report." };
  }
  if (error) return { ok: true, hidden: false };
  return { ok: true, hidden: await maybeHideCampaign(admin, campaignId, now) };
}

/** Hide a reported campaign until a moderator looks, when its reports say so. Never throws. */
export async function maybeHideCampaign(admin: SupabaseClient, campaignId: string, now: number = Date.now()): Promise<boolean> {
  try {
    const c = await read(admin, campaignId);
    if (!c || c.status !== "active" || c.mod_cleared_at) return false;

    // The campaign's own reports: one of a picture is weighed for the picture (./pictures.ts).
    const { data: reports } = await admin
      .from("prayer_campaign_reports")
      .select("reporter_id, reason_code")
      .eq("campaign_id", campaignId)
      .eq("target_kind", "campaign")
      .eq("status", "open")
      .limit(50);
    const say = await reportsSay(admin, c.creator_id, (reports ?? []) as { reporter_id: string | null; reason_code: string | null }[], now);
    if (!say.hide) return false;
    const { aboutMe, reporters } = say;

    const detail = aboutMe ? "reports; about_me" : `reports (${reporters})`;
    const { error } = await admin
      .from("prayer_campaigns")
      .update({ status: "held", held_reason: detail, updated_at: new Date(now).toISOString() })
      .eq("id", campaignId)
      .eq("status", "active");
    if (error) return false;
    await logMod(admin, AUTO, {
      action: "auto_hide",
      target: "campaign",
      targetId: campaignId,
      summary: `${aboutMe ? "Hidden on a report that it names someone without their blessing" : `Hidden after ${reporters} reports`}. ${summary(c)}`,
    });
    return true;
  } catch (e) {
    console.warn("[campaigns] auto-hide failed", e instanceof Error ? e.message : String(e));
    return false;
  }
}

// ── The queue ───────────────────────────────────────────────────────────────

const WAITING_COLS = "id, title, intention, for_whom, subject_name, details, days, ends_on, creator_name, creator_handle, held_reason, created_at, audience, circle_id";

/**
 * Every campaign waiting to be read, oldest first, one that may mean its
 * writer is in danger before the rest. `live` is false before the rework's
 * SQL has run, when nothing can wait.
 */
export async function readWaitingCampaigns(admin: SupabaseClient): Promise<{ rows: WaitingCampaign[]; live: boolean }> {
  const { data, error } = await admin
    .from("prayer_campaigns")
    .select(WAITING_COLS)
    .eq("status", "held")
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) {
    if (reworkAbsent(error)) return { rows: [], live: false };
    throw new Error(error.message);
  }
  const read = (data ?? []) as unknown as Record<string, unknown>[];
  // One kept to a circle says which: the moderator reads it knowing who will see it.
  const circles = await circleNames(
    admin,
    read.filter((r) => r.audience === "circle").map((r) => (typeof r.circle_id === "string" ? r.circle_id : null)),
  );
  // Projected, not handed on as read: a row carries whatever a later select
  // adds to it, and this one leaves the server.
  const rows = read.map(
    (r): WaitingCampaign => ({
      id: String(r.id),
      title: String(r.title ?? ""),
      intention: String(r.intention ?? ""),
      for_whom: String(r.for_whom ?? ""),
      subject_name: str(r.subject_name),
      details: str(r.details),
      days: typeof r.days === "number" ? r.days : null,
      ends_on: str(r.ends_on),
      creator_name: str(r.creator_name),
      creator_handle: str(r.creator_handle),
      held_reason: str(r.held_reason),
      created_at: String(r.created_at ?? ""),
      circle: r.audience === "circle" && typeof r.circle_id === "string" ? (circles.get(r.circle_id) ?? "") : null,
    }),
  );
  const urgent = (r: WaitingCampaign) => (r.held_reason ?? "").includes("crisis");
  return { rows: [...rows.filter(urgent), ...rows.filter((r) => !urgent(r))], live: true };
}

const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

/** A campaign's open reports as the queue shows them: the reason ticked, the words, and the campaign. Never who reported. */
export async function readOpenCampaignReports(admin: SupabaseClient): Promise<{ rows: OpenCampaignReport[]; live: boolean }> {
  const { data, error } = await admin
    .from("prayer_campaign_reports")
    .select("id, reason, reason_code, created_at, campaign:prayer_campaigns(id, title, status, intention, subject_name, details, creator_name)")
    .eq("status", "open")
    // A report of one picture is shown with the picture (./pictures.ts,
    // readWaitingPictures), to the team alone, and not here as a report of
    // the campaign.
    .eq("target_kind", "campaign")
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) {
    if (reworkAbsent(error)) return { rows: [], live: false };
    throw new Error(error.message);
  }
  // Projected, as above: never who reported, never whose campaign.
  const rows = ((data ?? []) as unknown as Record<string, unknown>[]).map((r): OpenCampaignReport => {
    const embedded = Array.isArray(r.campaign) ? r.campaign[0] : r.campaign;
    const c = (embedded ?? null) as Record<string, unknown> | null;
    return {
      id: String(r.id),
      reason: str(r.reason),
      reason_code: str(r.reason_code),
      created_at: String(r.created_at ?? ""),
      campaign: c
        ? {
            id: String(c.id),
            title: String(c.title ?? ""),
            status: String(c.status ?? ""),
            intention: String(c.intention ?? ""),
            subject_name: str(c.subject_name),
            details: str(c.details),
            creator_name: str(c.creator_name),
          }
        : null,
    };
  });
  return { rows, live: true };
}
