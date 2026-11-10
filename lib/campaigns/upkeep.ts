import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { reworkAbsent } from "./opening";

// Keeping prayer campaigns only as long as was said (the rework of 1.9.1),
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
// A deleted row takes its readers' join rows and its reports with it (the
// tables cascade), and those who carried it have long since let go: their
// own device let go on the day after its last day.
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

export async function runCampaignUpkeep(admin: SupabaseClient, now: number = Date.now()): Promise<UpkeepReport> {
  const at = new Date(now).toISOString();
  const cutoff = new Date(now - KEPT_DAYS * 86_400_000).toISOString();
  const ours = () => admin.from("prayer_campaigns");

  const ended = await counted(
    ours().update({ status: "ended", ended_at: at, updated_at: at }).eq("status", "active").not("days", "is", null).lt("ends_at", at).select("id"),
    "ending",
  );

  // For the living: every one, thirty days on.
  const living = sum(
    await counted(ours().delete().eq("for_whom", "living").in("status", RAN).not("days", "is", null).lt("ends_at", cutoff).select("id"), "deleting the living's"),
    await counted(ours().delete().eq("for_whom", "living").in("status", CLOSED).not("days", "is", null).lt("ended_at", cutoff).select("id"), "deleting the living's, closed early"),
  );
  // For the reposed: unless its creator keeps it.
  const reposed = sum(
    await counted(
      ours().delete().eq("for_whom", "departed").eq("keep_after_end", false).in("status", RAN).not("days", "is", null).lt("ends_at", cutoff).select("id"),
      "deleting the reposed's",
    ),
    await counted(
      ours().delete().eq("for_whom", "departed").eq("keep_after_end", false).in("status", CLOSED).not("days", "is", null).lt("ended_at", cutoff).select("id"),
      "deleting the reposed's, closed early",
    ),
  );
  // Never read by a moderator, or hidden by reports and never decided: it was not public, and its days are long over.
  const unread = await counted(ours().delete().eq("status", "held").not("days", "is", null).lt("ends_at", cutoff).select("id"), "deleting the unread");
  // Removed by a moderator: kept thirty days from the removal.
  const removed = await counted(ours().delete().eq("status", "removed").not("days", "is", null).lt("updated_at", cutoff).select("id"), "deleting the removed");

  return { ended, deleted: { living, reposed, unread, removed } };
}
