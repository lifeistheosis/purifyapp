import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { isAdminEmail } from "@/lib/admin/access";
import { AUTO, logMod, type ModActor, type ModResult } from "@/lib/community/moderation";
import { AUTO_HIDE_WEIGHT, NEW_ACCOUNT_MS, reportWeight } from "@/lib/community/trust";
import { staffAmong } from "@/lib/community/trustServer";
import { removeOwnedUpload } from "@/lib/security/uploadOwners";

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

/** Close a campaign's open reports as acted on or dismissed, by whoever decided. */
async function closeReports(admin: SupabaseClient, actor: ModActor, campaignId: string, status: "actioned" | "dismissed") {
  const { error } = await admin
    .from("prayer_campaign_reports")
    .update({ status, closed_at: new Date().toISOString() })
    .eq("campaign_id", campaignId)
    .eq("status", "open");
  if (error && !reworkAbsent(error)) console.warn("[campaigns] reports not closed", actor.name, error.message);
}

/**
 * A moderator has read it and it may be seen: on the board, open to join.
 * It stays up after this whatever more reports say, until someone removes it
 * by hand, as a post a moderator has cleared does.
 */
export async function approveCampaign(admin: SupabaseClient, actor: ModActor, id: string, now: number = Date.now()): Promise<ModResult> {
  const c = await read(admin, id);
  if (!c) return { ok: false, status: 404, error: "That campaign is gone." };
  if (c.status !== "held") return { ok: false, status: 409, error: "That campaign is not waiting." };
  // One whose days ran out while it waited is ended, not put up for an hour.
  const status = isOver({ status: "active", ends_at: c.ends_at }, now) ? "ended" : "active";
  const { error } = await admin
    .from("prayer_campaigns")
    .update({ status, held_reason: null, mod_cleared_at: new Date(now).toISOString(), updated_at: new Date(now).toISOString() })
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
 */
export async function removeCampaign(admin: SupabaseClient, actor: ModActor, id: string, reason?: string | null, now: number = Date.now()): Promise<ModResult> {
  const c = await read(admin, id);
  if (!c) return { ok: false, status: 404, error: "That campaign is gone." };
  const at = new Date(now).toISOString();
  const { error } = await admin
    .from("prayer_campaigns")
    .update({ status: "removed", removed_reason: reason?.trim().slice(0, 300) || null, removed_by_email: actor.email ?? actor.name, updated_at: at })
    .eq("id", id);
  if (error) return { ok: false, status: 500, error: error.message };
  await removePicture(admin, id, c.creator_id);
  await closeReports(admin, actor, id, "actioned");
  await logMod(admin, actor, { action: "remove_campaign", target: "campaign", targetId: id, summary: summary(c) });
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

/** Run one of them as `actor`. `id` is the campaign's, or the report's for a dismissal. */
export async function runCampaignModAction(
  admin: SupabaseClient,
  actor: ModActor,
  action: CampaignModAction,
  id: string,
  reason?: string | null,
): Promise<ModResult> {
  switch (action) {
    case "approve_campaign":
      return approveCampaign(admin, actor, id);
    case "remove_campaign":
      return removeCampaign(admin, actor, id, reason);
    case "restore_campaign":
      return restoreCampaign(admin, actor, id);
    case "dismiss_campaign_report":
      return dismissCampaignReport(admin, actor, id);
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
 * Never when a moderator has already cleared it, so that neither rule can be
 * used to silence a campaign that has been read and kept; and never the
 * team's own.
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

    const { data: reports } = await admin
      .from("prayer_campaign_reports")
      .select("reporter_id, reason_code")
      .eq("campaign_id", campaignId)
      .eq("status", "open")
      .limit(50);
    const rows = ((reports ?? []) as { reporter_id: string | null; reason_code: string | null }[]).filter((r) => r.reporter_id);
    const reporters = [...new Set(rows.map((r) => r.reporter_id as string))];
    if (reporters.length === 0) return false;

    const [staffSet, profiles] = await Promise.all([
      staffAmong(admin, [...reporters, c.creator_id]),
      admin.from("profiles").select("id, joined_at").in("id", reporters),
    ]);
    if (staffSet.has(c.creator_id)) return false;
    const joined = new Map(
      ((profiles.data ?? []) as { id: string; joined_at: string | null }[]).map((p) => [p.id, p.joined_at ? new Date(p.joined_at).getTime() : NaN]),
    );
    const ageOf = (id: string) => {
      const at = joined.get(id);
      return at !== undefined && Number.isFinite(at) ? now - at : Number.MAX_SAFE_INTEGER;
    };
    let weight = 0;
    for (const r of reporters) weight += reportWeight(ageOf(r), staffSet.has(r));
    const aboutMe = rows.some((r) => r.reason_code === "about_me" && ageOf(r.reporter_id as string) >= NEW_ACCOUNT_MS);
    if (!aboutMe && weight < AUTO_HIDE_WEIGHT) return false;

    // The team's own, by email and with no badge, is asked last, only when it matters.
    const { data: author } = await admin.auth.admin.getUserById(c.creator_id);
    if (isAdminEmail(author?.user?.email)) return false;

    const detail = aboutMe ? "reports; about_me" : `reports (${reporters.length})`;
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
      summary: `${aboutMe ? "Hidden on a report that it names someone without their blessing" : `Hidden after ${reporters.length} reports`}. ${summary(c)}`,
    });
    return true;
  } catch (e) {
    console.warn("[campaigns] auto-hide failed", e instanceof Error ? e.message : String(e));
    return false;
  }
}

// ── The queue ───────────────────────────────────────────────────────────────

const WAITING_COLS = "id, title, intention, for_whom, subject_name, details, days, ends_on, creator_name, creator_handle, held_reason, created_at";

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
  // Projected, not handed on as read: a row carries whatever a later select
  // adds to it, and this one leaves the server.
  const rows = ((data ?? []) as unknown as Record<string, unknown>[]).map(
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
