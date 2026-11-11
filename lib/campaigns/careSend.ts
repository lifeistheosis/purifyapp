import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { CARE_KIND } from "@/lib/community/careNote";
import { logMod, type ModActor, type ModResult } from "@/lib/community/moderation";

import { CARE_NOTE_SEND } from "./careOn";
import { saysDanger } from "./safety";

// The care note's one writer (his yes to call 26, 2026-11-11): "the short
// private safety note, sent only after a moderator has read the words".
//
// A moderator reads words the safety line marked (lib/campaigns/safety.ts): a
// waiting campaign, or an update or a comment that waits. If they judge the
// writer may be in danger, one tap sends that writer a note in their own
// inbox, from Purify, with where to find help (lib/community/careNote.ts has
// its words and the three places it names). This file is what that tap runs.
//
// What it holds to, whatever a screen sends:
//
//   by hand, never by itself   nothing here is called by a filter, a timer or
//                              the safety line. Only a moderator's action
//                              reaches it (./moderation.ts, the two names).
//   never to a named account   the request names what the moderator read, by
//                              its own id. The writer is found here, from
//                              that row. No account id is ever taken from a
//                              screen, so the note cannot be aimed at anyone.
//   only for marked words      refused unless the thing still carries the
//                              line's mark. A campaign carries it only while
//                              it waits; a hold keeps it for good.
//   one a day                  a writer is sent one at most in a day, however
//                              many moderators tap and however many of their
//                              words were marked.
//   never their words          the row quotes nothing (its excerpt is always
//                              empty), and the moderators' log says a note
//                              was sent and not what was written.
//   in the app only            the row goes straight into the inbox's table,
//                              never through Community's own writer
//                              (lib/community/notify.ts), which also sends a
//                              push. A care note must never light a lock
//                              screen.
//
// THE SWITCH (./careOn.ts): off until the database takes the note's kind.
// Off, this is not an action at all.

/** What a moderator read: a waiting campaign, or a hold on an update or a comment. Each by its own id. */
export type CareTarget = { kind: "campaign" | "hold"; id: string };

/** A writer is sent one care note at most in this long. */
export const CARE_WINDOW_MS = 86_400_000;

export const CARE_ALREADY = "A care note was already sent to this writer today.";
export const CARE_NOT_MARKED = "A care note is only for words the safety line marked.";
export const CARE_GONE = "That is no longer here.";
export const CARE_FAILED = "The care note could not be sent.";
/** What the moderators' log says: that one was sent, and nothing of what was written. */
export const CARE_LOGGED = "care note sent to the writer; nothing they wrote is quoted";

export type CareNoteRow = {
  user_id: string;
  kind: typeof CARE_KIND;
  actor_name: "Purify";
  excerpt: null;
  post_id: null;
  reply_id: null;
  target_kind: null;
};

/** The row, as the inbox reads it (the admin chat's, 2026-11-11). Pure, so the tests can read it. */
export function careNoteRow(writerId: string): CareNoteRow {
  return { user_id: writerId, kind: CARE_KIND, actor_name: "Purify", excerpt: null, post_id: null, reply_id: null, target_kind: null };
}

type Refused = Extract<ModResult, { ok: false }>;
const refuse = (status: number, error: string): Refused => ({ ok: false, status, error });

/** Who wrote what the moderator read, found from the row itself; refused where it is gone or the line never marked it. */
async function writerOf(admin: SupabaseClient, target: CareTarget): Promise<{ ok: true; writerId: string } | Refused> {
  if (target.kind === "campaign") {
    const { data, error } = await admin.from("prayer_campaigns").select("id, creator_id, status, held_reason").eq("id", target.id).maybeSingle();
    const c = data as { creator_id?: unknown; status?: unknown; held_reason?: unknown } | null;
    if (error || !c) return refuse(404, CARE_GONE);
    // A campaign carries why it waits only while it waits: once it is decided the mark is gone with the rest.
    if (c.status !== "held" || typeof c.held_reason !== "string" || !saysDanger(c.held_reason)) return refuse(409, CARE_NOT_MARKED);
    if (typeof c.creator_id !== "string" || !c.creator_id) return refuse(404, CARE_GONE);
    return { ok: true, writerId: c.creator_id };
  }
  const { data, error } = await admin.from("community_text_holds").select("id, reply_id, detail").eq("id", target.id).maybeSingle();
  const hold = data as { reply_id?: unknown; detail?: unknown } | null;
  if (error || !hold) return refuse(404, CARE_GONE);
  if (typeof hold.detail !== "string" || !saysDanger(hold.detail) || typeof hold.reply_id !== "string") return refuse(409, CARE_NOT_MARKED);
  const { data: reply } = await admin.from("community_post_replies").select("id, user_id").eq("id", hold.reply_id).maybeSingle();
  const writer = (reply as { user_id?: unknown } | null)?.user_id;
  if (typeof writer !== "string" || !writer) return refuse(404, CARE_GONE);
  return { ok: true, writerId: writer };
}

type Sent = { id: string; created_at: string };

/** The care notes this writer was sent since `since`, oldest first; a tie in time goes by id, so two askers agree. */
async function sentSince(admin: SupabaseClient, writerId: string, since: string): Promise<{ rows: Sent[]; failed: boolean }> {
  const { data, error } = await admin
    .from("community_notifications")
    .select("id, created_at")
    .eq("user_id", writerId)
    .eq("kind", CARE_KIND)
    .gte("created_at", since)
    .order("created_at")
    .limit(20);
  if (error) return { rows: [], failed: true };
  const rows = ((data ?? []) as Partial<Sent>[]).filter((r): r is Sent => typeof r.id === "string" && typeof r.created_at === "string");
  rows.sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  return { rows, failed: false };
}

/**
 * Send the care note to whoever wrote what this moderator read. Never
 * throws. Says "already sent" where the writer has one from the last day,
 * and refuses anything the safety line did not mark.
 */
export async function sendCareNote(admin: SupabaseClient, actor: ModActor, target: CareTarget, now: number = Date.now()): Promise<ModResult> {
  if (!CARE_NOTE_SEND) return refuse(404, "Not found.");
  try {
    const who = await writerOf(admin, target);
    if (!who.ok) return who;
    const since = new Date(now - CARE_WINDOW_MS).toISOString();
    const before = await sentSince(admin, who.writerId, since);
    // If what was sent cannot be read, nothing is sent: a second note in a day is worse than a tap that has to be made again.
    if (before.failed) return refuse(503, CARE_FAILED);
    if (before.rows.length > 0) return refuse(409, CARE_ALREADY);

    const { data, error } = await admin.from("community_notifications").insert(careNoteRow(who.writerId)).select("id, created_at");
    if (error) {
      console.warn("[campaigns] care note not written (is the care note's SQL applied?)", error.message);
      return refuse(503, CARE_FAILED);
    }
    // Two moderators in the same moment: each looked before the other wrote. Whichever row is not the first goes, so the writer has one.
    const mine = ((data ?? []) as Partial<Sent>[])[0]?.id;
    if (typeof mine === "string") {
      const after = await sentSince(admin, who.writerId, since);
      if (!after.failed && after.rows.length > 1 && after.rows[0].id !== mine) {
        await admin.from("community_notifications").delete().eq("id", mine);
        return refuse(409, CARE_ALREADY);
      }
    }
    await logMod(admin, actor, { action: "care_note", target: target.kind, targetId: target.id, summary: CARE_LOGGED });
    return { ok: true };
  } catch (e) {
    console.warn("[campaigns] care note not written", e instanceof Error ? e.message : String(e));
    return refuse(503, CARE_FAILED);
  }
}
