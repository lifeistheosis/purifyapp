import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { pageAllSettled } from "@/lib/supabase/pageAll";

import { CAMPAIGN_NOTICES } from "./noticesOn";

// Notices for prayer campaigns (1.9, phase 4; the notes, 2.7 and section 34).
// Two, both written into the inbox a reader already has
// (community_notifications), both from "Purify", and neither carries a name
// or a need a stranger could read off a screen:
//
//   a moderator has read your campaign   to its creator, once, the first time
//                                        it is approved and put up. Its title
//                                        is the excerpt: it is their own.
//   a campaign in your prayers has an    to each reader who carries it AND
//   update                               asked to be told, on that campaign.
//                                        Nobody is told by default
//                                        (CONTRIBUTING.md, "Reminders and
//                                        streaks": off until asked). It says
//                                        no title, no name and no words.
//
// The table already allows both: the kinds "approved" and "reply", and the
// target kind "campaign" (supabase/migrations/20261110204814_removal_notices
// .sql). So this needs no SQL. A row carries no campaign id (the table has
// no column for one): the first opens the reader's own campaigns, and the
// second carries the campaign's thread and the update, from which the inbox's
// route reads the campaign.
//
// THE SWITCH (CAMPAIGN_NOTICES, lib/campaigns/noticesOn.ts): on since
// 2026-11-11. The inbox had to say these in their own words before a row
// was written: drawn by the kind alone, the first would have read "approved
// your post" and the second "replied to your post", which is false twice.
// The inbox's two components now ask `target_kind === "campaign"` first, the
// owner approved the two lines they say (call 29), and the admin chat read
// these writers before the switch was turned. Off, nothing is written and
// the screens that offer the choice are not drawn; what a reader already
// chose stays on their own row.
//
// IN THE APP ONLY. These rows are written straight into the inbox's table,
// never through Community's own writer (lib/community/notify.ts), which
// also sends a push: its words for these kinds are "Your post was approved"
// and "Someone replied to your post", and neither belongs on a lock screen
// for a campaign. A push for a campaign would need its own words in
// lib/push/copy.ts, approved by the owner; there is none, so there is no
// push.
//
// Best effort, like every notice: a notice that cannot be written never
// fails the approval or the update that asked for it.

export type NoticeRow = {
  user_id: string;
  kind: "approved" | "reply";
  target_kind: "campaign";
  post_id: string | null;
  reply_id: string | null;
  actor_name: "Purify";
  excerpt: string | null;
};

/**
 * How many readers one update tells at most: far past any campaign today,
 * and a bound on one request's work. They are read a thousand at a time, as
 * the API hands rows out (lib/supabase/pageAll.ts); past this many the walk
 * stops, and says so.
 */
export const UPDATE_NOTICES_MAX = 5000;
const BATCH = 500;

const oneLine = (text: string, max = 140): string => {
  const words = text.replace(/\s+/g, " ").trim();
  return words.length > max ? `${words.slice(0, max - 1).trimEnd()}…` : words;
};

/** The row that tells a creator a moderator has read their campaign. Pure, so the tests can read it. */
export function approvalNoticeRow(creatorId: string, title: string): NoticeRow {
  return { user_id: creatorId, kind: "approved", target_kind: "campaign", post_id: null, reply_id: null, actor_name: "Purify", excerpt: oneLine(title) || null };
}

/** The rows that tell readers of an update: one each, with no word of the campaign in it. Pure. */
export function updateNoticeRows(readers: readonly string[], threadId: string, replyId: string): NoticeRow[] {
  return [...new Set(readers)].map((user_id) => ({ user_id, kind: "reply", target_kind: "campaign", post_id: threadId, reply_id: replyId, actor_name: "Purify", excerpt: null }));
}

/**
 * Who is told of an update: those who carry the campaign, asked to be told,
 * and still carry it (their own last day, when they chose one sooner than
 * the campaign's, has not passed). Never its creator, who wrote it. Pure.
 *
 * `today` is the server's day. A reader's own day can be a day ahead of it or
 * behind, so a last day of yesterday still counts: telling a reader on the
 * evening of their last day is right, and missing them is not.
 */
export function readersToTell(rows: readonly { user_id?: unknown; until_on?: unknown }[], creatorId: string, today: string): string[] {
  const yesterday = new Date(Date.parse(`${today}T12:00:00.000Z`) - 86_400_000).toISOString().slice(0, 10);
  const out: string[] = [];
  for (const r of rows) {
    if (typeof r.user_id !== "string" || r.user_id === creatorId) continue;
    if (typeof r.until_on === "string" && r.until_on < yesterday) continue;
    out.push(r.user_id);
  }
  return [...new Set(out)];
}

let warned = false;
function warnOnce(what: string, detail: string) {
  if (warned) return;
  warned = true;
  console.warn(`[campaigns] ${what}`, detail);
}

async function write(admin: SupabaseClient, rows: NoticeRow[]): Promise<number> {
  let written = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await admin.from("community_notifications").insert(batch);
    if (error) {
      warnOnce("notice not written (is supabase/migrations/20261110204814_removal_notices.sql applied?)", error.message);
      break;
    }
    written += batch.length;
  }
  return written;
}

/**
 * Tell its creator that a moderator has read their campaign and it is up.
 * Called once, at its first approval (lib/campaigns/moderation.ts). Never
 * throws; returns how many rows were written (0 or 1).
 */
export async function tellCreatorItIsUp(admin: SupabaseClient, campaign: { creator_id?: unknown; title?: unknown }): Promise<number> {
  if (!CAMPAIGN_NOTICES) return 0;
  if (typeof campaign.creator_id !== "string" || !campaign.creator_id) return 0;
  try {
    return await write(admin, [approvalNoticeRow(campaign.creator_id, typeof campaign.title === "string" ? campaign.title : "")]);
  } catch (e) {
    warnOnce("notice not written", e instanceof Error ? e.message : String(e));
    return 0;
  }
}

/**
 * Tell the readers who asked that a campaign in their prayers has an update.
 * Called when an update is shown: at once when it is written and not held
 * (lib/campaigns/thread.ts), or when a moderator approves one that was held
 * (lib/community/moderation.ts). Never for a comment. Never throws; returns
 * how many readers were told.
 */
export async function tellOfUpdate(
  admin: SupabaseClient,
  update: { campaignId: string; creatorId: string; threadId: string; replyId: string },
  now: number = Date.now(),
): Promise<number> {
  if (!CAMPAIGN_NOTICES) return 0;
  try {
    // A reader has one row a campaign, so their id orders the pages with no tie.
    const { data, error } = await pageAllSettled<{ user_id?: unknown; until_on?: unknown }>(
      (from, to) =>
        admin
          .from("prayer_campaign_prayers")
          .select("user_id, until_on")
          .eq("campaign_id", update.campaignId)
          .eq("notify_updates", true)
          .order("user_id")
          .range(from, to),
      UPDATE_NOTICES_MAX,
    );
    if (error) {
      warnOnce("readers to tell could not be read", error.message);
      return 0;
    }
    if (data.length >= UPDATE_NOTICES_MAX) console.warn(`[campaigns] an update told the first ${UPDATE_NOTICES_MAX} readers who asked, and no more`);
    const readers = readersToTell(data, update.creatorId, new Date(now).toISOString().slice(0, 10));
    if (readers.length === 0) return 0;
    return await write(admin, updateNoticeRows(readers, update.threadId, update.replyId));
  } catch (e) {
    warnOnce("notice not written", e instanceof Error ? e.message : String(e));
    return 0;
  }
}

/**
 * A held note under a campaign was approved and is now shown
 * (lib/community/moderation.ts, which knows only that its thread is a
 * campaign's). If it is an update, the readers who asked are told; a comment
 * tells nobody. The update's writer is the campaign's creator: only they can
 * write one (./thread.ts). Never throws.
 */
export async function tellOfApprovedNote(admin: SupabaseClient, note: { replyId: string; threadId: string; writerId: string }, now: number = Date.now()): Promise<number> {
  if (!CAMPAIGN_NOTICES) return 0;
  try {
    const [{ data: reply }, { data: thread }] = await Promise.all([
      admin.from("community_post_replies").select("campaign_update").eq("id", note.replyId).maybeSingle(),
      admin.from("community_posts").select("campaign_id").eq("id", note.threadId).maybeSingle(),
    ]);
    const campaignId = (thread as { campaign_id?: unknown } | null)?.campaign_id;
    if ((reply as { campaign_update?: unknown } | null)?.campaign_update !== true || typeof campaignId !== "string") return 0;
    return await tellOfUpdate(admin, { campaignId, creatorId: note.writerId, threadId: note.threadId, replyId: note.replyId }, now);
  } catch (e) {
    warnOnce("notice not written", e instanceof Error ? e.message : String(e));
    return 0;
  }
}
