import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";

import type { CommunityUser } from "@/lib/community/adminStanding";
import { avatarSrc } from "@/lib/community/avatarSrc";
import { guardWrite, type HoldReason } from "@/lib/community/guard";
import { logMod } from "@/lib/community/moderation";
import { blockedBy } from "@/lib/community/notify";
import { findLinks } from "@/lib/community/spam";
import { censorName, censorPost } from "@/lib/moderation/server";
import { isClergyMark } from "@/lib/profile/clergy";
import { ensureCleanHandle } from "@/lib/profile/server";

import { campaignsInBuild } from "./flags";
import { NOTE_MAX, UPDATES_A_DAY, isJulyRow, isOver, type CampaignNote, type CampaignThread, type NoteKind } from "./model";
import { reworkAbsent } from "./opening";
import type { CampaignRow, Read } from "./server";

// A campaign's updates and comments (the rework, phase 2).
//
// Both are replies in the campaign's own thread: one row of community_posts
// that carries the campaign's id and a state of its own, 'campaign'
// (docs/1.9-build/sql/campaigns-2-threads.sql). A comment is a reply to it,
// and an update is a reply of the creator's marked as one. So the word
// filter, the spam guard, holds, reports, blocks, mutes, the moderators'
// queue, its log and its Undo apply as they stand.
//
// WHY THE THREAD CANNOT LEAK INTO COMMUNITY. Every read of Community asks for
// a post that is 'visible' (the feed, a post's page, its replies, a profile,
// the weekly letter), and so do the row policies of both tables, where a
// reply can be read only when its post is visible. A thread says 'campaign',
// so it is in none of them, and neither it nor one comment under it can be
// read with the public key. Only this file reads one, with the service role,
// for a route that has already asked the campaigns switch and who may read
// the campaign (lib/campaigns/server.ts, mayRead).
//
// WHAT IS NOT HERE, ON PURPOSE. No reactions and no counts under a campaign
// (his yes to item 126): a note is handed on without a count of anything,
// and the routes that take a reaction refuse a reply in a thread
// (isCampaignReply). And nobody is told: notices of an update or a comment
// come in a later phase, asked for by each reader and off until then.

/** The columns of a reply this file reads. user_id is for decisions and is never handed on. */
const NOTE_COLS = "id, post_id, user_id, body, author_name, author_avatar, author_handle, author_clergy, campaign_update, status, created_at";

/** What a thread's own row says in Community's table. Never shown: a thread is read through its campaign. */
const THREAD_BODY = "A prayer campaign's updates and comments.";

type NoteRow = {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  author_name: string;
  author_avatar: string | null;
  author_handle: string | null;
  author_clergy: string | null;
  campaign_update: boolean | null;
  status: string;
  created_at: string;
};

/**
 * Words that ask for money, as far as a pattern can tell (his yes to item
 * 124). A match does not refuse the words, since "we gave to the parish in
 * his memory" asks for nothing: it holds them for a moderator, who decides.
 * English only, which is said plainly here: an ask in another language is
 * caught by a reader's report and by the spam guard's own signals.
 */
const ASKS_MONEY =
  /\b(?:donat(?:e|es|ed|ing|ions?)|fund\s?rais\w*|go\s?fund\s?me|venmo|zelle|cash\s?app|pay\s?pal|send\s+(?:(?:us|me|him|her|them)\s+)?(?:some\s+)?money|wire\s+transfer|bank\s+(?:account|details|transfer)|iban)\b/i;

export function asksForMoney(text: string | null | undefined): boolean {
  return Boolean(text && ASKS_MONEY.test(text));
}

/** The campaign's thread, by the campaign's id, or null when nothing has been written under it yet. */
export async function threadIdOf(admin: SupabaseClient, campaignId: string): Promise<Read<string | null>> {
  const { data, error } = await admin.from("community_posts").select("id").eq("campaign_id", campaignId).maybeSingle();
  if (error) {
    if (reworkAbsent(error)) return { ok: false, why: "absent" };
    console.warn("[campaigns] thread read failed", error.message);
    return { ok: false, why: "failed" };
  }
  return { ok: true, value: (data as { id: string } | null)?.id ?? null };
}

/** The campaign's thread, opened when the first word is written under it. */
async function ensureThread(admin: SupabaseClient, campaign: CampaignRow): Promise<Read<string>> {
  const found = await threadIdOf(admin, campaign.id);
  if (!found.ok) return found;
  if (found.value) return { ok: true, value: found.value };
  const { data, error } = await admin
    .from("community_posts")
    .insert({
      // Its creator's, as the campaign is: deleting the account deletes both.
      user_id: campaign.creator_id,
      kind: "discussion",
      title: String(campaign.title ?? "").slice(0, 200),
      body: THREAD_BODY,
      author_name: typeof campaign.creator_name === "string" && campaign.creator_name ? campaign.creator_name : "Reader",
      status: "campaign",
      campaign_id: campaign.id,
    })
    .select("id")
    .single();
  if (error) {
    // Two first words at once: the index holds a campaign to one thread, and
    // the other writer has just opened it.
    if (error.code === "23505") {
      const again = await threadIdOf(admin, campaign.id);
      if (again.ok && again.value) return { ok: true, value: again.value };
    }
    if (reworkAbsent(error)) return { ok: false, why: "absent" };
    console.warn("[campaigns] thread not opened", error.message);
    return { ok: false, why: "failed" };
  }
  return { ok: true, value: (data as { id: string }).id };
}

/** The note a reader receives: an explicit projection, with no account id and no count. */
function publicNote(row: NoteRow, userId: string | null, muted: ReadonlySet<string>): CampaignNote {
  return {
    id: row.id,
    update: row.campaign_update === true,
    body: row.body,
    author_name: row.author_name,
    author_handle: row.author_handle ?? null,
    // Through our own domain, as Community's replies are (lib/community/avatarSrc.ts).
    author_avatar: avatarSrc(row.author_avatar),
    author_clergy: isClergyMark(row.author_clergy) ? row.author_clergy : null,
    created_at: row.created_at,
    mine: userId !== null && row.user_id === userId,
    muted: muted.has(row.user_id),
  };
}

/** Whether a campaign takes new words: it runs, and it is one of the rework's. */
function takesWords(campaign: CampaignRow, now: number): boolean {
  return campaign.status === "active" && !isOver(campaign, now) && !isJulyRow(campaign);
}

/**
 * A campaign's updates and comments, for a reader who may open the campaign
 * (the route has asked mayRead). The words of someone this reader has
 * blocked are left out, and those of someone they have muted are folded, as
 * in a thread of Community. A held or removed note is in neither list.
 */
export async function readThread(
  admin: SupabaseClient,
  campaign: CampaignRow,
  reader: { id: string } | null,
  hidden: { blocked: readonly string[]; muted: readonly string[] },
  now: number = Date.now(),
): Promise<Read<CampaignThread>> {
  const userId = reader?.id ?? null;
  const commentsOpen = campaign.comments_open !== false;
  const running = takesWords(campaign, now);
  const base: CampaignThread = {
    updates: [],
    comments: [],
    commentsOpen,
    signedIn: userId !== null,
    canUpdate: running && userId !== null && campaign.creator_id === userId,
    canComment: running && commentsOpen && userId !== null,
  };
  const thread = await threadIdOf(admin, campaign.id);
  if (!thread.ok) return thread;
  if (!thread.value) return { ok: true, value: base };

  let query = admin.from("community_post_replies").select(NOTE_COLS).eq("post_id", thread.value).eq("status", "visible");
  if (hidden.blocked.length > 0) query = query.not("user_id", "in", `(${hidden.blocked.join(",")})`);
  const { data, error } = await query.order("created_at", { ascending: true }).limit(300);
  if (error) {
    if (reworkAbsent(error)) return { ok: false, why: "absent" };
    console.warn("[campaigns] thread list failed", error.message);
    return { ok: false, why: "failed" };
  }
  const muted = new Set(hidden.muted);
  const notes = ((data ?? []) as unknown as NoteRow[]).map((r) => publicNote(r, userId, muted));
  return {
    ok: true,
    value: {
      ...base,
      // An update is the creator's own word to those who pray: never folded.
      updates: notes.filter((n) => n.update).reverse(),
      comments: notes.filter((n) => !n.update),
    },
  };
}

export type Wrote =
  | { ok: true; id: string; held: boolean }
  | { ok: false; status: number; error: string; code?: string; preview?: { body: string | null }; limit?: number };

/**
 * Write an update or a comment as `user`.
 *
 * Refused, with a reason the writer can act on: a campaign that is not
 * running; an update from anyone but its creator, or a fourth in a day; a
 * comment where comments are closed, or from someone its creator has blocked;
 * a link anywhere in it, as the campaign itself refuses one. Asked first:
 * words the filter will mask, as a reply asks. Held for a moderator: what the
 * spam guard holds, a new account's first words, and words that ask for
 * money.
 */
export async function writeNote(
  admin: SupabaseClient,
  user: Pick<User, "id" | "email" | "created_at" | "user_metadata"> & CommunityUser,
  campaign: CampaignRow,
  input: { kind: NoteKind; body: string; confirmFiltered?: boolean },
  now: number = Date.now(),
): Promise<Wrote> {
  const creator = campaign.creator_id === user.id;
  if (!takesWords(campaign, now)) {
    return { ok: false, status: 409, error: "That campaign is not running.", code: "not_running" };
  }
  if (input.kind === "update" && !creator) {
    return { ok: false, status: 403, error: "Only the person who started a campaign can post an update." };
  }
  if (input.kind === "comment") {
    if (campaign.comments_open === false) {
      return { ok: false, status: 409, error: "Comments are closed on this campaign.", code: "comments_closed" };
    }
    // A block stops writing too, as under a post (app/api/community/posts/[id]/replies).
    if (!creator && (await blockedBy(admin, [campaign.creator_id], user.id)).has(campaign.creator_id)) {
      return { ok: false, status: 403, error: "You can't comment on this campaign.", code: "blocked" };
    }
  }
  const own = input.body.trim().slice(0, NOTE_MAX);
  if (!own) return { ok: false, status: 400, error: "Write a few words first." };
  if (findLinks([own]).length > 0) {
    return { ok: false, status: 400, error: "A prayer campaign can't carry a link.", code: "campaign_link" };
  }

  const opened = await ensureThread(admin, campaign);
  if (!opened.ok) {
    return opened.why === "absent" ? { ok: false, status: 404, error: "Not found." } : { ok: false, status: 500, error: "Couldn't send that. Please try again." };
  }
  const threadId = opened.value;

  if (input.kind === "update") {
    const since = new Date(now - 86_400_000).toISOString();
    const { data: recent, error } = await admin
      .from("community_post_replies")
      .select("id")
      .eq("post_id", threadId)
      .eq("campaign_update", true)
      .neq("status", "removed")
      .gte("created_at", since)
      .limit(UPDATES_A_DAY + 1);
    if (error) {
      if (reworkAbsent(error)) return { ok: false, status: 404, error: "Not found." };
      return { ok: false, status: 500, error: "Couldn't send that. Please try again." };
    }
    if ((recent ?? []).length >= UPDATES_A_DAY) {
      return { ok: false, status: 429, error: "That is today's updates. Another can go up tomorrow.", code: "updates_today", limit: UPDATES_A_DAY };
    }
  }

  // The word filter (lib/moderation): a listed word is masked, and the
  // writer is asked first, as a reply's writer is.
  const censored = await censorPost(admin, { body: own });
  if (censored.hits > 0 && !input.confirmFiltered) {
    return {
      ok: false,
      status: 409,
      error: "Some words here will be hidden until a moderator reviews them.",
      code: "filtered",
      preview: { body: censored.body },
    };
  }

  // The spam guard and the writer's own limits, as on a reply.
  const guard = await guardWrite(admin, user, { kind: "reply", body: own, postId: threadId }, now);
  if (guard.kind === "refuse") return { ok: false, status: guard.status, error: guard.error, code: guard.code, limit: guard.limit };
  let hold: { reason: HoldReason; detail: string } | null = guard.kind === "hold" ? { reason: guard.reason, detail: guard.detail } : null;
  if (!hold && asksForMoney(own)) hold = { reason: "spam", detail: "money asked under a prayer campaign" };

  await ensureCleanHandle(admin, user.id);
  const meta = (user.user_metadata ?? {}) as { display_name?: string; avatar_url?: string };
  const written = (meta.display_name ?? "").trim() || (user.email ? user.email.split("@")[0] : "") || "Reader";
  const shownName = (await censorName(admin, written)).slice(0, 80);
  const shownBody = censored.body ?? own;

  // author_handle, author_clergy and the rest are set by the table's own
  // triggers from the writer's profile, as for any reply.
  const { data: created, error } = await admin
    .from("community_post_replies")
    .insert({
      post_id: threadId,
      user_id: user.id,
      body: shownBody,
      author_name: shownName,
      author_avatar: meta.avatar_url || null,
      status: hold ? "held" : "visible",
      campaign_update: input.kind === "update",
    })
    .select("id")
    .single();
  if (error || !created) {
    if (reworkAbsent(error)) return { ok: false, status: 404, error: "Not found." };
    console.warn("[campaigns] note failed", error?.message);
    return { ok: false, status: 500, error: "Couldn't send that. Please try again." };
  }
  const id = (created as { id: string }).id;

  // What the moderators' queue reads, as for a reply: why it waits, and the
  // words as written where the filter masked some.
  if (hold) {
    const { error: holdError } = await admin.from("community_text_holds").insert({ reply_id: id, reason: hold.reason, detail: hold.detail.slice(0, 300), hits: 1 });
    if (holdError) console.warn("[campaigns] hold not written", holdError.message);
  }
  if (censored.hits > 0) {
    const { error: holdError } = await admin.from("community_text_holds").insert({ reply_id: id, original_body: own, hits: Math.min(censored.hits, 500) });
    if (holdError) console.warn("[campaigns] filter hold not written", holdError.message);
  }
  return { ok: true, id, held: hold !== null };
}

export type Removed = { ok: true } | { ok: false; status: number; error: string };

/**
 * Take a note off a campaign.
 *
 * Its own writer deletes it: the row goes, which is the way out for someone
 * who wrote more than they meant to. The campaign's creator takes a comment
 * off their own campaign (his yes to item 126): the row is kept, marked
 * removed as a moderator's removal is, and the moderators' log says who took
 * it off, so a creator cannot quietly erase what a moderator may need to
 * read. Nobody else, and never another campaign's note.
 */
export async function removeNote(
  admin: SupabaseClient,
  user: { id: string; email?: string | null; name: string },
  campaign: CampaignRow,
  noteId: string,
): Promise<Removed> {
  const thread = await threadIdOf(admin, campaign.id);
  if (!thread.ok) return thread.why === "absent" ? { ok: false, status: 404, error: "Not found." } : { ok: false, status: 500, error: "Couldn't take that off." };
  if (!thread.value) return { ok: false, status: 404, error: "Not found." };
  const { data, error } = await admin.from("community_post_replies").select(NOTE_COLS).eq("id", noteId).eq("post_id", thread.value).maybeSingle();
  if (error) {
    if (reworkAbsent(error)) return { ok: false, status: 404, error: "Not found." };
    return { ok: false, status: 500, error: "Couldn't take that off." };
  }
  const note = data as unknown as NoteRow | null;
  if (!note || note.status === "removed") return { ok: false, status: 404, error: "Not found." };

  if (note.user_id === user.id) {
    const { error: gone } = await admin.from("community_post_replies").delete().eq("id", noteId);
    if (gone) return { ok: false, status: 500, error: "Couldn't take that off." };
    return { ok: true };
  }
  if (campaign.creator_id !== user.id) {
    return { ok: false, status: 403, error: "Only its writer or the campaign's creator can take that off." };
  }
  const { error: marked } = await admin
    .from("community_post_replies")
    .update({ status: "removed", removed_reason: "Taken off by the campaign's creator", removed_by_email: user.email ?? null })
    .eq("id", noteId);
  if (marked) return { ok: false, status: 500, error: "Couldn't take that off." };
  await logMod(admin, { id: user.id, name: user.name, email: user.email ?? null, admin: false }, {
    action: "creator_remove_comment",
    target: "reply",
    targetId: noteId,
    summary: `${note.author_name}: ${note.body.replace(/\s+/g, " ").trim().slice(0, 120)}`,
  });
  return { ok: true };
}

/**
 * Whether a reply belongs to a campaign's thread. The routes that take a
 * reaction or a response to a reply ask this and refuse one that does, so
 * nothing is counted under a campaign whatever a request says. It reads the
 * post's state, which exists today, so it needs no column of the rework.
 *
 * With campaigns closed there is no thread to belong to, and nothing is read:
 * a reaction in Community then costs exactly what it did.
 */
export async function isCampaignReply(admin: SupabaseClient, replyId: string): Promise<boolean> {
  if (!campaignsInBuild()) return false;
  const { data: reply } = await admin.from("community_post_replies").select("post_id").eq("id", replyId).maybeSingle();
  const postId = (reply as { post_id?: string } | null)?.post_id;
  if (!postId) return false;
  return isCampaignThread(admin, postId);
}

/** Whether a post is a campaign's thread, by its state. Never asked while campaigns are closed. */
export async function isCampaignThread(admin: SupabaseClient, postId: string): Promise<boolean> {
  if (!campaignsInBuild()) return false;
  const { data: post } = await admin.from("community_posts").select("status").eq("id", postId).maybeSingle();
  return (post as { status?: string } | null)?.status === "campaign";
}
