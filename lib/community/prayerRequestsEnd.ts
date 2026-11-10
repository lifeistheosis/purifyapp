import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { NOT_BEFORE, SHIPPED_ON } from "@/lib/campaigns/julyRows";
import { isDay } from "@/lib/campaigns/model";
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
      /** Holds on a request's words that were deleted. */
      holds: Cleared;
      /** "I prayed" rows deleted. */
      prayers: Cleared;
      /** Whether the public mark stands: only once a run has gone through with nothing failed. */
      marked: boolean;
    };

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
  const prayers = await step(admin.from("profile_prayers").delete().not("owner_id", "is", null).select("owner_id"), "deleting who prayed");

  const failed = [requests, words, holds, prayers].includes("failed");
  const changed = [requests, words, holds, prayers].reduce<number>((sum, n) => sum + (typeof n === "number" ? n : 0), 0);
  if (changed > 0) console.info(`[community] old prayer requests cleared: ${requests} requests, ${words} with words, ${holds} holds, ${prayers} prayers`);
  return { state: "ran", from, requests, words, holds, prayers, marked: failed ? false : await mark(admin) };
}
