import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { removeOwnedUpload } from "@/lib/security/uploadOwners";
import { isColumnAbsent } from "@/lib/supabase/columnAbsent";
import { pageAllIn, pageAllSettled } from "@/lib/supabase/pageAll";

import { CAMPAIGN_BUCKET, campaignImage } from "./image";
import { isDay } from "./model";

// July's campaign rows, deleted thirty days after 1.9 ships.
//
// His word, 2026-11-10 ("all recs yes", docs/1.9-build/BRAINSTORM.md, and
// docs/1.9-build/OWNER-STEPS.md, R9): July's old campaign rows are deleted
// 30 days after 1.9 ships, for the reason he gave for every campaign (his
// item 125): nobody's illness stays up by neglect.
//
// WHAT JULY'S ROWS ARE. Campaigns were withdrawn on 2026-08-26 and reworked
// for 1.9. The rows made before the withdrawal are still in the table. They
// carry no length (`days` is empty), which is what tells them from a
// reworked campaign everywhere (./model.ts, isJulyRow). Since 1.9 nobody
// sees one but the reader who started it, who finds it among their own as
// ended and can take it down.
//
// WHEN. On and after SHIPPED_ON plus thirty days, once a day, from the
// maintenance heartbeat (lib/ops/maintenance.ts). SHIPPED_ON is written in
// the release commit. While it is null, or is not a real day, or is a day
// before his word was given, NOTHING IS READ AND NOTHING IS DELETED, and the
// report says which.
//
// ONLY JULY'S. A row goes only when BOTH hold: it has no length, and it was
// made before 2026-09-01. No route has made a campaign since the withdrawal
// but the rework's, and the rework's makes none without a length
// (./server.ts). The delete names both again, by id, so a row that was given
// a length in between is kept. A row with no length made after that day is
// not July's: it is left alone and counted as a stray, for someone to look
// at.
//
// WHAT GOES WITH A ROW. The tables' own cascades delete what hangs from it:
// who had joined it and their reminder choice (prayer_campaign_prayers), the
// day log (prayer_campaign_days), its reports (prayer_campaign_reports), and
// any parish group made inside that campaign (prayer_campaign_groups by
// campaign_id) with its members and its private thread (community_posts by
// group_id). None of it has been reachable from a screen since the
// withdrawal. That the groups go was put to him plainly; JULY_GROUPS_GO is
// the one switch if he says they stay, and then a campaign a group hangs
// from stays with it.
//
// A READING CIRCLE IS NEVER DELETED HERE. A circle that follows a path (Read
// together, 1.8) is a row of prayer_campaign_groups too, with no campaign at
// all (app/api/circles/route.ts writes campaign_id null), so no cascade from
// a campaign reaches it. Should one ever hang from one of July's campaigns,
// that campaign is kept and the report says so: the job asks before it
// deletes, and where it cannot ask it deletes nothing.
//
// NOR IS A CAMPAIGN OF 1.9, BY WAY OF A GROUP. A reworked campaign kept to a
// circle names that group (prayer_campaigns.circle_id), and the table's key
// deletes the campaign with the group. So if any campaign is kept to a group
// that hangs from one of July's, deleting July's would take it too: run on a
// scratch PostgreSQL, that is exactly what the cascades do. The job asks
// that as well, and keeps such a campaign of July's, with its group.
//
// A FILE IS NOT A ROW. A campaign of July's may carry one picture, in a
// public bucket, and a cascade deletes rows and never a file. So the picture
// goes first, by the rule a take-down uses: only when it is provably its
// creator's own upload (lib/security/uploadOwners.ts). A picture the storage
// would not delete keeps its row for the next day's run, because the row is
// the only thing that knows where the file is.
//
// IT CAN RUN TWICE. A second run finds no row and changes nothing. When a
// run finds nothing of July's left to delete, it leaves one public mark, a
// name and a time (public.data_moves, the table the psalms' move made for
// such marks), so that it can be seen to have happened without reading a
// campaign.
//
// Not the hourly upkeep (./upkeep.ts): every statement there names "days is
// not null" and touches only the rework's own rows. This is the one place
// that deletes July's.

/** The day 1.9 shipped, in UTC, as "YYYY-MM-DD". Written in the release commit; null until then. */
export const SHIPPED_ON: string | null = null;

/** How long after that day July's rows are kept. */
export const JULY_KEPT_DAYS = 30;

/** His word was given on this day. A shipping day before it is a slip of the hand, and deletes nothing. */
export const NOT_BEFORE = "2026-11-10";

/** Every row of July's was made before this: campaigns were withdrawn on 2026-08-26, and nothing made one after. */
export const JULY_MADE_BEFORE = "2026-09-01T00:00:00.000Z";

/** Whether a parish group made inside one of July's campaigns goes with it. His to say; "all goes" is what was put to him. */
export const JULY_GROUPS_GO = true;

/** The public mark left when nothing of July's is left to delete. */
export const JULY_MARK = "campaigns-july-rows-deleted";

/** How many rows one run takes, oldest first; the next day takes the rest. */
export const A_RUN = 100;

/** The first day July's rows are deleted on, or null while nothing says when. */
export function julyRowsDay(shippedOn: string | null = SHIPPED_ON): string | null {
  if (!isDay(shippedOn) || shippedOn < NOT_BEFORE) return null;
  return new Date(Date.parse(`${shippedOn}T00:00:00.000Z`) + JULY_KEPT_DAYS * 86_400_000).toISOString().slice(0, 10);
}

export type JulyRowsReport =
  /** No day to count from: nothing was read. */
  | { state: "unset"; why: string }
  /** The day has not come: nothing was read. */
  | { state: "waiting"; from: string }
  /** The rework's SQL has not run on this database, so July's rows cannot be told from any other: nothing was deleted. */
  | { state: "absent"; from: string }
  | { state: "failed"; from: string; why: string }
  | {
      state: "ran";
      from: string;
      /** Rows deleted in this run. */
      deleted: number;
      /** Pictures' files deleted in this run. */
      pictures: number;
      /** Pictures left where they are because they were not provably their creator's own upload; their rows went. */
      picturesLeft: number;
      /**
       * Rows this run left where they are, and why. `picture`: its file would
       * not delete, so it waits for the next run. `circle`: a group of it is
       * in use, by a circle on a path or by a campaign of 1.9 kept to it; it
       * stays. `groups`: he said the groups stay.
       */
      kept: { picture: number; circle: number; groups: number };
      /** Rows with no length that are not July's. Never touched. */
      strays: number;
      /** Whether more of July's wait for the next run. */
      left: boolean;
      /** Whether the public mark stands. */
      marked: boolean;
    };

type JulyRow = { id: string; creator_id: string; image_url?: string | null };
type Hung = { id: string; campaign_id: string; path_id?: string | null };
type Failure = { code?: string | null; message: string };

/** July's rows, by both conditions, as every read and the delete here name them. */
function july<Q>(query: Q): Q {
  type Narrowed = { is(column: string, value: null): Narrowed; lt(column: string, value: string): Narrowed };
  return (query as unknown as Narrowed).is("days", null).lt("created_at", JULY_MADE_BEFORE) as unknown as Q;
}

/** The groups that hang from these campaigns, or "failed" when they could not be read. */
async function groupsOf(admin: SupabaseClient, ids: string[]): Promise<Hung[] | "failed"> {
  const read = (cols: string) =>
    pageAllSettled<Hung, Failure>((from, to) => admin.from("prayer_campaign_groups").select(cols).in("campaign_id", ids).order("id", { ascending: true }).range(from, to) as unknown as PromiseLike<{ data: Hung[] | null; error: Failure | null }>);
  let found = await read("id, campaign_id, path_id");
  // Before Read together's SQL a group follows a campaign and nothing else: there is no circle to keep.
  if (found.error && isColumnAbsent(found.error)) found = await read("id, campaign_id");
  if (found.error) {
    if (isTableAbsent(found.error)) return [];
    console.warn("[campaigns] July's rows: the groups could not be read", found.error.message);
    return "failed";
  }
  return found.data;
}

/**
 * Of these groups, the ones some campaign is kept to (prayer_campaigns.circle_id),
 * or "failed" when that could not be read. Deleting such a group deletes the
 * campaign kept to it.
 */
async function groupsInUse(admin: SupabaseClient, groupIds: string[]): Promise<Set<string> | "failed"> {
  try {
    const tied = await pageAllIn<{ id: string; circle_id: string | null }>(groupIds, (some, from, to) =>
      admin.from("prayer_campaigns").select("id, circle_id").in("circle_id", some).order("id", { ascending: true }).range(from, to),
    );
    return new Set(tied.map((row) => row.circle_id).filter((id): id is string => typeof id === "string"));
  } catch (e) {
    console.warn("[campaigns] July's rows: the campaigns kept to their groups could not be read", e instanceof Error ? e.message : String(e));
    return "failed";
  }
}

/** Leave the public mark. Quiet where its table is not there yet; never throws. */
async function mark(admin: SupabaseClient): Promise<boolean> {
  try {
    // The first run's time stays: a mark that is there already is left as it is.
    const { error } = await admin.from("data_moves").upsert({ name: JULY_MARK }, { onConflict: "name", ignoreDuplicates: true });
    if (error) {
      if (!isTableAbsent(error)) console.warn("[campaigns] July's rows: the mark was not written", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[campaigns] July's rows: the mark was not written", e instanceof Error ? e.message : String(e));
    return false;
  }
}

/**
 * Delete July's campaign rows, once their day has come. Never throws: it
 * rides the heartbeat, and says what it did or why it did nothing.
 *
 * `opts` is for the tests and for nothing else; the heartbeat passes none,
 * so what runs is what the constants above say.
 */
export async function forgetJulyRows(
  admin: SupabaseClient,
  now: number = Date.now(),
  opts: { shippedOn?: string | null; groupsGo?: boolean } = {},
): Promise<JulyRowsReport> {
  const shippedOn = opts.shippedOn === undefined ? SHIPPED_ON : opts.shippedOn;
  const groupsGo = opts.groupsGo ?? JULY_GROUPS_GO;
  const from = julyRowsDay(shippedOn);
  if (!from) return { state: "unset", why: shippedOn === null ? "the day 1.9 shipped is not written yet" : "the day written is not one to count from" };
  if (new Date(now).toISOString().slice(0, 10) < from) return { state: "waiting", from };

  try {
    // July's rows, oldest first.
    const read = (cols: string) => july(admin.from("prayer_campaigns").select(cols)).order("created_at", { ascending: true }).limit(A_RUN);
    let { data, error } = await read("id, creator_id, image_url");
    // Before 20260725000000 a campaign carried no picture at all.
    if (error && isColumnAbsent(error) && /image_url/.test(error.message ?? "")) ({ data, error } = await read("id, creator_id"));
    if (error) {
      // No `days` column: the rework's first file has not run here.
      if (isColumnAbsent(error) || isTableAbsent(error)) return { state: "absent", from };
      return { state: "failed", from, why: error.message };
    }
    const rows = (data ?? []) as unknown as JulyRow[];
    const kept = { picture: 0, circle: 0, groups: 0 };

    // What hangs from them that must not go: a reading circle, ever; a parish group, if he says they stay.
    const stay = new Map<string, "circle" | "groups">();
    if (rows.length > 0) {
      const hung = await groupsOf(admin, rows.map((row) => row.id));
      if (hung === "failed") return { state: "failed", from, why: "the groups that hang from them could not be read, so nothing was deleted" };
      // A campaign of 1.9 kept to one of their groups would be deleted with the group.
      const used = hung.length > 0 ? await groupsInUse(admin, hung.map((group) => group.id)) : new Set<string>();
      if (used === "failed") return { state: "failed", from, why: "the campaigns kept to their groups could not be read, so nothing was deleted" };
      for (const group of hung) {
        if (group.path_id || used.has(group.id)) stay.set(group.campaign_id, "circle");
        else if (!groupsGo && !stay.has(group.campaign_id)) stay.set(group.campaign_id, "groups");
      }
    }
    for (const why of stay.values()) kept[why]++;
    if (kept.circle > 0) console.warn(`[campaigns] July's rows: ${kept.circle} kept because a group of theirs is in use (a circle on a path, or a campaign kept to it)`);

    // The picture first: a cascade deletes rows and never a file.
    const go: string[] = [];
    let pictures = 0;
    let picturesLeft = 0;
    for (const row of rows) {
      if (stay.has(row.id)) continue;
      if (row.image_url) {
        const ref = campaignImage(row.image_url, process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
        const outcome = await removeOwnedUpload(admin, CAMPAIGN_BUCKET, ref, row.creator_id);
        if (outcome === "failed") {
          // The row is the only thing that knows where the file is: it waits for the next run.
          kept.picture++;
          continue;
        }
        if (outcome === "removed") pictures++;
        else {
          // Not provably the creator's own upload, so it may be someone else's file: it is not ours to
          // delete, as at a take-down. Its place is said here, since its row is about to go.
          picturesLeft++;
          console.warn("[campaigns] July's rows: a picture was not provably its creator's and was left", ref ? `${CAMPAIGN_BUCKET}/${ref.path}` : "outside the campaigns' bucket");
        }
      }
      go.push(row.id);
    }

    // The rows, by id and by the same two conditions again.
    let deleted = 0;
    if (go.length > 0) {
      const gone = await july(admin.from("prayer_campaigns").delete()).in("id", go).select("id");
      if (gone.error) return { state: "failed", from, why: gone.error.message };
      deleted = (gone.data ?? []).length;
      console.info(`[campaigns] July's rows: ${deleted} deleted, ${pictures} pictures with them`);
    }

    // Is any of July's still to go? Those kept are not: only what a later run may delete.
    const after = await july(admin.from("prayer_campaigns").select("id")).order("created_at", { ascending: true }).limit(A_RUN + stay.size + 1);
    const left = after.error ? true : ((after.data ?? []) as { id: string }[]).some((row) => !stay.has(row.id));

    // A row with no length that is not July's: never touched, and said.
    const odd = await admin.from("prayer_campaigns").select("id").is("days", null).gte("created_at", JULY_MADE_BEFORE).limit(50);
    const strays = odd.error ? 0 : (odd.data ?? []).length;
    if (strays > 0) console.warn(`[campaigns] July's rows: ${strays} with no length were made after July's and were left alone`);

    return { state: "ran", from, deleted, pictures, picturesLeft, kept, strays, left, marked: left ? false : await mark(admin) };
  } catch (e) {
    return { state: "failed", from, why: e instanceof Error ? e.message : String(e) };
  }
}
