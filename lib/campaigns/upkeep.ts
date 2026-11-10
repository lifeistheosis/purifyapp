import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { reworkAbsent } from "./opening";
import { deletePicturesOf } from "./pictures";

// Keeping prayer campaigns only as long as was said (the rework of 1.9),
// once an hour from the maintenance heartbeat (lib/ops/maintenance.ts), and
// only in a build that has campaigns.
//
// His yes to item 125: an ended campaign is kept thirty days for the living
// unless it is renewed, "nobody's illness stays up by neglect"; for the
// reposed, as long as its creator keeps it. And from the notes he said yes to
// (docs/1.9-build/notes/campaigns-fable.md, 4.4 and 4.5): one a moderator
// removed is kept, unseen, for thirty days in case of an appeal or a lawful
// request, then deleted.
//
//   ended      A running campaign past its last day reads "ended". The board
//              and the page already treat it so by its `ends_at` (model.ts,
//              isRunning); this writes the word down.
//   deleted    Thirty days after its last day (or after its creator closed it
//              early): every campaign for the living, and one for the reposed
//              unless its creator keeps it. One still waiting for a moderator
//              that long after its last day was never public, and goes too.
//              One removed, thirty days after it was removed.
//
// A deleted row takes its readers' join rows, its reports, its thread and
// its pictures' rows with it (the tables cascade), and those who carried it
// have long since let go: their own device let go on the day after its last
// day. A cascade deletes rows and never a FILE, so each rule here first asks
// which campaigns it is about to delete, has their pictures' files deleted
// (./pictures.ts, deletePicturesOf, quiet where there are none), and only
// then deletes those same campaigns, by the same rule, so that one whose
// creator chose to keep it in between is kept.
//
// ONLY THE REWORK'S OWN ROWS. A campaign of July's has no `days`, and may
// carry a picture in a public bucket that a bare delete would orphan. Every
// statement here names `days is not null`, so July's rows stay exactly as
// they are until someone decides about them by hand.

/** How long an ended or removed campaign is kept. */
export const KEPT_DAYS = 30;

export type UpkeepCount = number | "absent" | "failed";
export type UpkeepReport = {
  ended: UpkeepCount;
  deleted: { living: UpkeepCount; reposed: UpkeepCount; unread: UpkeepCount; removed: UpkeepCount };
};

type Rows = { data: unknown; error: { code?: string | null; message?: string | null } | null };

async function counted(run: PromiseLike<Rows>, what: string): Promise<UpkeepCount> {
  try {
    const { data, error } = await run;
    if (error) {
      if (reworkAbsent(error)) return "absent";
      console.warn(`[campaigns] upkeep: ${what} failed`, error.message);
      return "failed";
    }
    return Array.isArray(data) ? data.length : 0;
  } catch (e) {
    console.warn(`[campaigns] upkeep: ${what} failed`, e instanceof Error ? e.message : String(e));
    return "failed";
  }
}

const sum = (a: UpkeepCount, b: UpkeepCount): UpkeepCount => (typeof a === "number" && typeof b === "number" ? a + b : typeof a === "number" ? b : a);

/** Closed early by its creator, with one of the two closings. */
const CLOSED = ["answered", "memory_eternal"];
/** Ran to its last day, whether or not the word has been written down yet. */
const RAN = ["active", "ended"];

/** One condition of a rule, as both the asking and the deleting apply it. */
type Cond = readonly ["eq", string, unknown] | readonly ["in", string, readonly string[]] | readonly ["lt", string, string];

/** The filters a rule uses, as a select and a delete both offer them. */
type Narrowed = {
  eq(column: string, value: unknown): Narrowed;
  in(column: string, values: readonly unknown[]): Narrowed;
  lt(column: string, value: string): Narrowed;
  not(column: string, operator: string, value: unknown): Narrowed;
};

/** ONLY THE REWORK'S OWN ROWS, whatever the rule: every query made here names `days is not null`. */
function narrow<Q>(query: Q, rule: readonly Cond[]): Q {
  let q = (query as unknown as Narrowed).not("days", "is", null);
  for (const [how, column, value] of rule) {
    if (how === "eq") q = q.eq(column, value);
    else if (how === "in") q = q.in(column, value);
    else q = q.lt(column, value);
  }
  return q as unknown as Q;
}

/** How many campaigns one rule deletes in one run; the next hour takes the rest. */
const A_RUN = 500;

/** Delete the campaigns a rule names: their pictures' files first, then the rows, by the same rule. */
async function forget(admin: SupabaseClient, rule: readonly Cond[], what: string): Promise<UpkeepCount> {
  try {
    const { data, error } = await narrow(admin.from("prayer_campaigns").select("id"), rule).limit(A_RUN);
    if (error) {
      if (reworkAbsent(error)) return "absent";
      console.warn(`[campaigns] upkeep: ${what} failed`, error.message);
      return "failed";
    }
    const ids = ((data ?? []) as { id: string }[]).map((row) => row.id);
    if (ids.length === 0) return 0;
    await deletePicturesOf(admin, ids);
    return await counted(narrow(admin.from("prayer_campaigns").delete(), rule).in("id", ids).select("id"), what);
  } catch (e) {
    console.warn(`[campaigns] upkeep: ${what} failed`, e instanceof Error ? e.message : String(e));
    return "failed";
  }
}

export async function runCampaignUpkeep(admin: SupabaseClient, now: number = Date.now()): Promise<UpkeepReport> {
  const at = new Date(now).toISOString();
  const cutoff = new Date(now - KEPT_DAYS * 86_400_000).toISOString();

  const ended = await counted(
    admin.from("prayer_campaigns").update({ status: "ended", ended_at: at, updated_at: at }).eq("status", "active").not("days", "is", null).lt("ends_at", at).select("id"),
    "ending",
  );

  // For the living: every one, thirty days on.
  const living = sum(
    await forget(admin, [["eq", "for_whom", "living"], ["in", "status", RAN], ["lt", "ends_at", cutoff]], "deleting the living's"),
    await forget(admin, [["eq", "for_whom", "living"], ["in", "status", CLOSED], ["lt", "ended_at", cutoff]], "deleting the living's, closed early"),
  );
  // For the reposed: unless its creator keeps it.
  const reposed = sum(
    await forget(admin, [["eq", "for_whom", "departed"], ["eq", "keep_after_end", false], ["in", "status", RAN], ["lt", "ends_at", cutoff]], "deleting the reposed's"),
    await forget(
      admin,
      [["eq", "for_whom", "departed"], ["eq", "keep_after_end", false], ["in", "status", CLOSED], ["lt", "ended_at", cutoff]],
      "deleting the reposed's, closed early",
    ),
  );
  // Never read by a moderator, or hidden by reports and never decided: it was not public, and its days are long over.
  const unread = await forget(admin, [["eq", "status", "held"], ["lt", "ends_at", cutoff]], "deleting the unread");
  // Removed by a moderator: kept thirty days from the removal.
  const removed = await forget(admin, [["eq", "status", "removed"], ["lt", "updated_at", cutoff]], "deleting the removed");

  return { ended, deleted: { living, reposed, unread, removed } };
}
