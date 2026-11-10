import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { NOT_BEFORE, SHIPPED_ON } from "@/lib/campaigns/julyRows";
import { isDay } from "@/lib/campaigns/model";
import { AUTO, logMod } from "@/lib/community/moderation";
import { isColumnAbsent } from "@/lib/supabase/columnAbsent";

// The requests that stood on the prayer wall when 1.9 shipped, cleared
// fourteen days on.
//
// His word, 2026-11-10 ("wall B", docs/1.9-build/BRAINSTORM.md): asking for
// prayers goes everywhere, the wall, the line on a profile and its switch, I
// prayed and its notice. And what the arbiter put to him with it, which he
// said yes to: the old requests are shown to no one from 1.9, and cleared
// fourteen days after it ships.
//
// WHY FOURTEEN DAYS. A request always ended by itself fourteen days after it
// was made (lib/profile/server.ts, PRAYER_REQUEST_MS), so fourteen days
// after the last day one could be made, every one of them has run the whole
// of what its writer was told it would. Nothing is cut short, and nothing is
// migrated: from 1.9 no route serves a request to anyone
// (app/api/community/prayer-wall, lib/profile/server.ts).
//
// WHAT IT CLEARS, AND ONLY THIS:
//
//   profiles.prayer_request_at          Set to empty on every profile that
//                                       has one. The profile itself is not
//                                       touched.
//   profiles.prayer_request_intention   The words of a request, set to
//                                       empty. Until 1.9 a lapsed request's
//                                       words stayed here, unseen, until the
//                                       next request wrote over them: this
//                                       clears those too.
//   community_text_holds                A hold on a request's words that
//                                       still waited for a moderator
//                                       (profile_id is set on those holds
//                                       and on no other): deleted, as it
//                                       always was when a request came down.
//   community_text_holds.original_body  A hold a moderator had already
//                                       decided keeps its record, who
//                                       decided and when, and loses the
//                                       reader's own words: the wall ends so
//                                       that nobody's illness stays written
//                                       down by neglect, and the moderators'
//                                       history is a place it would (Admin's
//                                       find on the second read, and the
//                                       arbiter's yes, 2026-11-10).
//   community_mod_log.summary           The moderators' log quoted the
//                                       words too: each time a moderator
//                                       decided a hold on a request's words
//                                       it wrote the reader's handle and the
//                                       first eighty characters of what they
//                                       had asked (lib/community/moderation.ts,
//                                       the profile hold's decision). Those
//                                       lines keep who decided, what and
//                                       when, and lose the quotation. Only
//                                       those: the same three actions are
//                                       also written for a post's or a
//                                       reply's hold, under another target,
//                                       and are not touched (Admin's find on
//                                       the read of the fifth statement,
//                                       2026-11-10).
//   profile_prayers                     Who said "I prayed" for whose
//                                       request: every row deleted. Nothing
//                                       reads it since 1.9.
//
// What it leaves: the "prayed for you" notices already in a reader's own
// inbox, which are theirs; the names a reader carried from the wall into
// their own prayers, which are on their device and leave after their week;
// and the two columns and the table themselves, which a later SQL file of
// his signing drops.
//
// NOTHING IS HELD BACK FOR A REPORT. What was ever reported to the
// authorities has to be kept, by US law, and that was asked of him before
// this could run. His answer, 2026-11-10 about 20:12 UTC: "I don't know what
// you're talking about to the authorities. Like, no, we didn't do that." No
// request was ever reported, so every one is cleared.
//
// A LINE IN THE MODERATORS' LOG, for a run that changed something: how many
// of each, and no words and no names, so a moderator who saw a hold
// yesterday can see why it went (as auto-moderation says what it hid).
//
// WHEN. On and after SHIPPED_ON plus fourteen days, once a day, from the
// maintenance heartbeat (lib/ops/maintenance.ts). SHIPPED_ON is the one line
// the release commit writes for July's campaign rows too
// (lib/campaigns/julyRows.ts): while it is null, or is not a real day, or is
// a day before his word was given, NOTHING IS READ AND NOTHING IS CLEARED,
// and the report says which.
//
// IT CAN RUN TWICE. A second run finds nothing set and changes nothing. When
// a run finds nothing left, it leaves one public mark, a name and a time
// (public.data_moves), so that it can be seen to have happened with the
// public key.
//
// A part of the database that is not there yet (the words' column before
// docs/1.8-build/sql/prayer-request-intention.sql, a table before its
// migration) is said as "absent" and is nothing to clear. Any other failure
// leaves the rest to be tried, is said, and holds the mark back until a run
// goes through whole.

/**
 * How long after 1.9 ships the old requests are kept: as long as a request
 * ever lasted (lib/profile/server.ts, PRAYER_REQUEST_MS; the test holds the
 * two together).
 */
export const REQUESTS_KEPT_DAYS = 14;

/** The public mark left when nothing of them is left. */
export const REQUESTS_MARK = "prayer-requests-cleared";

/** The first day the old requests are cleared on, or null while nothing says when. */
export function requestsEndDay(shippedOn: string | null = SHIPPED_ON): string | null {
  if (!isDay(shippedOn) || shippedOn < NOT_BEFORE) return null;
  return new Date(Date.parse(`${shippedOn}T00:00:00.000Z`) + REQUESTS_KEPT_DAYS * 86_400_000).toISOString().slice(0, 10);
}

/** How many rows a step changed, or why it changed none. */
export type Cleared = number | "absent" | "failed";

export type RequestsEndReport =
  /** No day to count from: nothing was read. */
  | { state: "unset"; why: string }
  /** The day has not come: nothing was read. */
  | { state: "waiting"; from: string }
  | {
      state: "ran";
      from: string;
      /** Profiles whose request's time was cleared. */
      requests: Cleared;
      /** Profiles whose request's words were cleared. */
      words: Cleared;
      /** Holds on a request's words that still waited, deleted. */
      holds: Cleared;
      /** Holds a moderator had decided, kept as records and emptied of the reader's words. */
      emptied: Cleared;
      /** Lines of the moderators' log that quoted a request's words, kept as records and emptied of the quotation. */
      logged: Cleared;
      /** "I prayed" rows deleted. */
      prayers: Cleared;
      /** Whether the public mark stands: only once a run has gone through with nothing failed. */
      marked: boolean;
    };

/**
 * The three things a moderator could decide of a hold on a request's words,
 * as the log names them (lib/community/moderation.ts). With the target
 * "profile" they are a request's and nothing else's.
 */
const REQUEST_WORDS_ACTIONS = ["approve_words", "keep_masked", "remove_request_words"];

type Changed = { data: unknown; error: { code?: string | null; message?: string | null } | null };

async function step(run: PromiseLike<Changed>, what: string): Promise<Cleared> {
  try {
    const { data, error } = await run;
    if (error) {
      if (isColumnAbsent(error) || isTableAbsent(error)) return "absent";
      console.warn(`[community] old prayer requests: ${what} failed`, error.message);
      return "failed";
    }
    return Array.isArray(data) ? data.length : 0;
  } catch (e) {
    console.warn(`[community] old prayer requests: ${what} failed`, e instanceof Error ? e.message : String(e));
    return "failed";
  }
}

/** Leave the public mark. Quiet where its table is not there yet; never throws. */
async function mark(admin: SupabaseClient): Promise<boolean> {
  try {
    // The first run's time stays: a mark that is there already is left as it is.
    const { error } = await admin.from("data_moves").upsert({ name: REQUESTS_MARK }, { onConflict: "name", ignoreDuplicates: true });
    if (error) {
      if (!isTableAbsent(error)) console.warn("[community] old prayer requests: the mark was not written", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[community] old prayer requests: the mark was not written", e instanceof Error ? e.message : String(e));
    return false;
  }
}

/**
 * Clear what is left of asking for prayers, once its day has come. Never
 * throws: it rides the heartbeat, and says what it did or why it did nothing.
 *
 * `opts` is for the tests and for nothing else; the heartbeat passes none, so
 * what runs is what the constants say.
 */
export async function endPrayerRequests(admin: SupabaseClient, now: number = Date.now(), opts: { shippedOn?: string | null } = {}): Promise<RequestsEndReport> {
  const shippedOn = opts.shippedOn === undefined ? SHIPPED_ON : opts.shippedOn;
  const from = requestsEndDay(shippedOn);
  if (!from) return { state: "unset", why: shippedOn === null ? "the day 1.9 shipped is not written yet" : "the day written is not one to count from" };
  if (new Date(now).toISOString().slice(0, 10) < from) return { state: "waiting", from };

  // Each names only rows that still hold something, so a second run changes nothing.
  const requests = await step(admin.from("profiles").update({ prayer_request_at: null }).not("prayer_request_at", "is", null).select("id"), "clearing the requests");
  const words = await step(admin.from("profiles").update({ prayer_request_intention: null }).not("prayer_request_intention", "is", null).select("id"), "clearing their words");
  // profile_id is set on a hold of a request's words and on no other hold.
  const holds = await step(admin.from("community_text_holds").delete().not("profile_id", "is", null).eq("status", "pending").select("id"), "deleting the holds on their words");
  // What is left with profile_id set was decided by a moderator: the record stays, the reader's words do not.
  const emptied = await step(
    admin.from("community_text_holds").update({ original_body: null }).not("profile_id", "is", null).not("original_body", "is", null).select("id"),
    "emptying the decided holds of their words",
  );
  // The moderators' log quoted those words when a hold on them was decided. The line stays; the quotation does not.
  // Both halves of the filter matter: the three actions are also a post's and a reply's, under another target.
  const logged = await step(
    admin.from("community_mod_log").update({ summary: null }).eq("target_kind", "profile").in("action", REQUEST_WORDS_ACTIONS).not("summary", "is", null).select("id"),
    "emptying the moderators' log of the words it quoted",
  );
  const prayers = await step(admin.from("profile_prayers").delete().not("owner_id", "is", null).select("owner_id"), "deleting who prayed");

  const all = [requests, words, holds, emptied, logged, prayers];
  const failed = all.includes("failed");
  const changed = all.reduce<number>((sum, n) => sum + (typeof n === "number" ? n : 0), 0);
  if (changed > 0) {
    // Counts only: no words, and nobody's name.
    const summary = `Asking for prayers ended with the prayer wall: ${requests} requests cleared, ${words} with words, ${holds} waiting holds deleted, ${emptied} decided holds emptied of their words, ${logged} log lines emptied of the words they quoted, ${prayers} prayers deleted.`;
    console.info(`[community] ${summary}`);
    await logMod(admin, AUTO, { action: "requests_ended", target: "hold", summary });
  }
  return { state: "ran", from, requests, words, holds, emptied, logged, prayers, marked: failed ? false : await mark(admin) };
}
