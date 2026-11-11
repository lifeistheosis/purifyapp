import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";

import type { CommunityUser } from "@/lib/community/adminStanding";
import { findLinks, spamSignals } from "@/lib/community/spam";
import { NEW_ACCOUNT_MS } from "@/lib/community/trust";
import { readTrust } from "@/lib/community/trustServer";
import { censorName, censorPost } from "@/lib/moderation/server";
import { isCountry } from "@/lib/onboarding/clergy";
import { handleProblem, normalizeHandle } from "@/lib/profile/handle";
import { ensureCleanHandle } from "@/lib/profile/server";
import { rateLimited } from "@/lib/security/ratelimit";
import { pageAllSettled } from "@/lib/supabase/pageAll";

import {
  CAMPAIGN_COLS,
  MANY_FLOOR,
  MANY_SHOWN,
  MANY_SPAN_DAYS,
  RUNNING_CAP,
  STARTED_A_DAY,
  campaignPrayer,
  cleanTown,
  endsAtOf,
  isJulyRow,
  isOver,
  lastDayOf,
  publicCampaign,
  startsNow,
  type CampaignKind,
  type ConsentKind,
  type ForWhom,
  type ManySpan,
  type PrayerRef,
  type PublicCampaign,
} from "./model";
import { circleNames, circlesHolding, mayKeepTo, readerCircles, type ReaderCircle } from "./circles";
import { reworkAbsent } from "./opening";
import { DANGER_MARK, maySpeakOfDanger, saysDanger } from "./safety";

// Prayer campaigns on the server (the rework of 1.9): every read and every
// write a route makes. Service role throughout, because the table answers no
// one else: the SQL of the rework drops July's public policy
// (docs/1.9-build/notes/campaigns-fable.md, 5.2), which let anyone holding
// the public key read every campaign whole, its creator's account id and its
// counters included.
//
// A read names CAMPAIGN_COLS and what this file needs to decide who may see
// a row (SERVER_COLS). The account id is used here and never handed on: every
// row leaves through publicCampaign(), an explicit projection.

/** A row as this file reads it: the public columns, and what decides who may see it. */
export type CampaignRow = Record<string, unknown> & {
  id: string;
  creator_id: string;
  status: string;
  audience?: string | null;
  circle_id?: string | null;
  ends_at?: string | null;
  mod_cleared_at?: string | null;
};

const SERVER_COLS = `${CAMPAIGN_COLS}, creator_id, audience, circle_id, held_reason, mod_cleared_at, keep_after_end, comments_open, listed`;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Read<T> = { ok: true; value: T } | { ok: false; why: "absent" | "failed" };

/** One campaign, whole, for the server's own decisions. Null when there is none. */
export async function readCampaignRow(admin: SupabaseClient, id: string): Promise<Read<CampaignRow | null>> {
  if (!UUID.test(id)) return { ok: true, value: null };
  const { data, error } = await admin.from("prayer_campaigns").select(SERVER_COLS).eq("id", id).maybeSingle();
  if (error) {
    if (reworkAbsent(error)) return { ok: false, why: "absent" };
    console.warn("[campaigns] read failed", error.message);
    return { ok: false, why: "failed" };
  }
  return { ok: true, value: (data as unknown as CampaignRow | null) ?? null };
}

/**
 * Who may open a campaign's page.
 *
 *   removed            nobody: it is kept unseen for an appeal, then deleted.
 *   one of July's      its creator, who can take it down. It has no length,
 *                      was never read by a moderator and runs for nobody
 *                      (lib/campaigns/model.ts, isJulyRow).
 *   held               its creator, who is told it waits for a moderator.
 *   kept to a circle   its creator, and the members of that circle
 *                      (`inCircles`: the circles this reader is known to be
 *                      in, which only a route can find out; with none
 *                      given, its creator alone). Never anyone else: to a
 *                      reader outside the circle it is as a campaign that
 *                      does not exist.
 *   anything else      everyone campaigns are open for.
 */
export function mayRead(row: CampaignRow, userId: string | null, inCircles: ReadonlySet<string> = NO_CIRCLES): boolean {
  if (row.status === "removed") return false;
  const mine = userId !== null && row.creator_id === userId;
  if (row.status === "held" || isJulyRow(row)) return mine;
  if (row.audience === "circle") return mine || (userId !== null && typeof row.circle_id === "string" && inCircles.has(row.circle_id));
  // A row that names a circle and does not say so (the table's check allows
  // none) is still nobody's but its circle's.
  if (row.circle_id) return mine;
  return true;
}

const NO_CIRCLES: ReadonlySet<string> = new Set();

/**
 * mayRead for a route, which finds out for itself whether the reader is in
 * the circle a campaign is kept to (lib/campaigns/circles.ts): one read, and
 * only for a campaign that is kept to one and is not the reader's own.
 */
export async function mayOpen(admin: SupabaseClient, row: CampaignRow, userId: string | null): Promise<boolean> {
  if (row.audience !== "circle" || userId === null || row.creator_id === userId) return mayRead(row, userId);
  return mayRead(row, userId, await circlesHolding(admin, userId, [row.circle_id]));
}

/**
 * The name of the circle a campaign is kept to, for a reader who may open
 * it, or null: for the line on its page that says who can see it.
 */
export async function circleOf(admin: SupabaseClient, row: CampaignRow): Promise<string | null> {
  if (row.audience !== "circle" || !row.circle_id) return null;
  return (await circleNames(admin, [row.circle_id])).get(row.circle_id) ?? null;
}

/**
 * Everyone this reader has blocked or muted, as lib/community/blocks.ts reads
 * them, for a route that already knows who is asking. The ids go into a
 * WHERE clause and nowhere else. Never throws: a lookup that breaks leaves
 * the list unfiltered, which is the softer of the two failures.
 */
export async function hiddenFor(admin: SupabaseClient, userId: string | null): Promise<string[]> {
  const { blocked, muted } = await hiddenLists(admin, userId);
  return [...blocked, ...muted];
}

/**
 * The same two lists, kept apart, for a campaign's comments: the words of
 * someone blocked are left out, and those of someone muted are folded, as in
 * a thread of Community.
 */
export async function hiddenLists(admin: SupabaseClient, userId: string | null): Promise<{ blocked: string[]; muted: string[] }> {
  if (!userId) return { blocked: [], muted: [] };
  try {
    const [blocks, mutes] = await Promise.all([
      admin.from("community_blocks").select("blocked_id").eq("blocker_id", userId).limit(500),
      admin.from("community_mutes").select("muted_id").eq("muter_id", userId).limit(500),
    ]);
    if (blocks.error) console.warn("[campaigns] block lookup failed", blocks.error.message);
    return {
      blocked: ((blocks.error ? [] : (blocks.data ?? [])) as { blocked_id: string }[]).map((r) => r.blocked_id),
      muted: ((mutes.error ? [] : (mutes.data ?? [])) as { muted_id: string }[]).map((r) => r.muted_id),
    };
  } catch {
    return { blocked: [], muted: [] };
  }
}

/** The row as its reader receives it, saying whether they started it. */
export function forReader(row: CampaignRow, userId: string | null, circle: string | null = null): PublicCampaign {
  const mine = userId !== null && row.creator_id === userId;
  // Whether it is kept after its last day, and whether it may stand in
  // "Prayed by many", are its creator's own settings, and told to nobody else.
  return {
    ...publicCampaign(row),
    mine,
    ...(mine ? { keep_after_end: row.keep_after_end === true, listed: row.listed !== false } : {}),
    // Its own words may mean someone is in danger, and it still waits for
    // the moderator who reads such a campaign first: its creator is shown
    // the safety line (./safety.ts). Told to its creator and to nobody else,
    // and no longer once a moderator has read it.
    ...(mine && row.status === "held" && typeof row.held_reason === "string" && saysDanger(row.held_reason) ? { safety: true } : {}),
    // Its words can still be changed: no moderator has read them yet (mayChange, below).
    ...(mine && mayChange(row) ? { changeable: true } : {}),
    // Kept to a circle: its name, for the line that says who can see it.
    // Only a caller that has already decided this reader may open it hands
    // a name in.
    ...(row.audience === "circle" && circle ? { circle: { name: circle } } : {}),
  };
}

/**
 * The board, "Newly asked": campaigns that are running, public, newest first,
 * and only those with a length: one of July's is never on it (isJulyRow).
 * A reader's own blocked and muted authors are left out, by the account id
 * the query filters on and never selects. Ordered by when each was asked and
 * by nothing else: no list is ordered by how many carry it (his rule of
 * 2026-08-22; item 118 is for later).
 */
export async function listBoard(
  admin: SupabaseClient,
  opts: { userId: string | null; limit?: number; now?: number },
): Promise<Read<{ campaigns: PublicCampaign[]; personalised: boolean }>> {
  const now = opts.now ?? Date.now();
  const hidden = await hiddenFor(admin, opts.userId);
  let query = admin
    .from("prayer_campaigns")
    .select(SERVER_COLS)
    .eq("status", "active")
    .eq("audience", "public")
    .order("created_at", { ascending: false })
    .limit(Math.min(opts.limit ?? 30, 60));
  // One of July's is never on the board (isJulyRow).
  query = query.not("days", "is", null);
  if (hidden.length > 0) query = query.not("creator_id", "in", `(${hidden.join(",")})`);
  const { data, error } = await query;
  if (error) {
    if (reworkAbsent(error)) return { ok: false, why: "absent" };
    console.warn("[campaigns] board failed", error.message);
    return { ok: false, why: "failed" };
  }
  const rows = ((data ?? []) as unknown as CampaignRow[]).filter((r) => !isOver(r, now));
  return { ok: true, value: { campaigns: rows.map((r) => forReader(r, opts.userId)), personalised: hidden.length > 0 } };
}

/** How many of one reader's campaigns their profile shows at most. */
export const PROFILE_CAMPAIGNS_MAX = 12;

/**
 * A reader's campaigns as their profile shows them (the Campaigns door on a
 * profile; the notes, 2.10 and section 35), newest first: those that run now
 * for everyone in Community, and those for the reposed that their creator
 * chose to keep after the last day (keep_after_end; his yes to item 125).
 *
 * Never one kept to a circle, one that waits for a moderator, one that was
 * taken down, or one of July's. Never one for the living once it is over:
 * nobody's illness stays up by neglect (the notes, 4.5).
 *
 * And nothing at all for a private profile, which shows a name, a picture
 * and standing badges only; for a reader the asker has blocked or muted; or
 * for a handle nobody holds. Each of those answers with the same empty list,
 * so this tells nobody which it was.
 */
export async function listByCreator(admin: SupabaseClient, opts: { handle: string; userId: string | null; now?: number }): Promise<Read<PublicCampaign[]>> {
  const now = opts.now ?? Date.now();
  const handle = normalizeHandle(opts.handle);
  const problem = handleProblem(handle);
  if (problem && problem !== "reserved") return { ok: true, value: [] };
  const { data: found } = await admin.from("profiles").select("id, profile_private").eq("handle", handle).maybeSingle();
  const profile = found as { id?: unknown; profile_private?: unknown } | null;
  // A profile whose privacy cannot be read is treated as private.
  if (!profile || typeof profile.id !== "string" || profile.profile_private !== false) return { ok: true, value: [] };
  const creatorId = profile.id;
  if (opts.userId && opts.userId !== creatorId && (await hiddenFor(admin, opts.userId)).includes(creatorId)) return { ok: true, value: [] };

  const { data, error } = await admin
    .from("prayer_campaigns")
    .select(SERVER_COLS)
    .eq("creator_id", creatorId)
    .eq("audience", "public")
    .in("status", ["active", "ended", "answered", "memory_eternal"])
    // One of July's is on nobody's profile (isJulyRow).
    .not("days", "is", null)
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) {
    if (reworkAbsent(error)) return { ok: false, why: "absent" };
    console.warn("[campaigns] profile list failed", error.message);
    return { ok: false, why: "failed" };
  }
  const rows = ((data ?? []) as unknown as CampaignRow[]).filter(
    (r) => (r.status === "active" && !isOver(r, now)) || (r.for_whom === "departed" && r.keep_after_end === true && isOver(r, now)),
  );
  return { ok: true, value: rows.slice(0, PROFILE_CAMPAIGNS_MAX).map((r) => forReader(r, opts.userId)) };
}

/** How many join rows one tally reads at most: fifty requests, once a minute for each span. */
const MANY_ROWS_READ = 50_000;

/** The order of "Prayed by many" for each span, kept for a minute: the ids alone, and never a figure. */
const manyKept = new Map<ManySpan, { at: number; ids: string[] }>();
const MANY_KEPT_MS = 60_000;

/** Test seam: forget the kept orders. */
export function __forgetMany(): void {
  manyKept.clear();
}

/**
 * "Prayed by many" (his item 118; lib/campaigns/model.ts says the form it is
 * held to): running public campaigns ordered by how many readers with an
 * account added them to their prayers in the span, most first.
 *
 * What leaves this function is an order of campaigns and nothing else: the
 * tally is made here, used to sort, and dropped. A campaign under the floor
 * is not listed at all, so the list never says of a small campaign who
 * carries it. One whose creator chose to stay out (`listed`), one kept to a
 * circle, one of July's, one that waits or is over, and one by someone this
 * reader has blocked or muted are never in it.
 *
 * Only a reader with an account is counted, since only they have a row: one
 * who carries a campaign on the device alone tells the server nothing, and
 * that is kept so.
 */
export async function listMany(
  admin: SupabaseClient,
  opts: { userId: string | null; span: ManySpan; now?: number },
): Promise<Read<{ campaigns: PublicCampaign[] }>> {
  const now = opts.now ?? Date.now();
  let ids: string[];
  const kept = manyKept.get(opts.span);
  if (kept && now - kept.at < MANY_KEPT_MS && now >= kept.at) {
    ids = kept.ids;
  } else {
    const since = new Date(now - MANY_SPAN_DAYS[opts.span] * 86_400_000).toISOString();
    // Every join row of the span, read in pages: one request returns a
    // thousand rows at most and says nothing when it stops, and a tally cut
    // there would order the board wrongly without a sign
    // (lib/supabase/pageAll.ts). Newest first, then by the row's own key, so
    // the pages are pages of one list. The stop is a cost limit, said aloud
    // when it is met: past it a table of sums by day is the answer (the
    // notes, 2.8), not a bigger number here.
    const { data, error } = await pageAllSettled<{ campaign_id: string }, { message: string; code?: string | null }>(
      (from, to) =>
        admin
          .from("prayer_campaign_prayers")
          .select("campaign_id")
          .gte("joined_at", since)
          .order("joined_at", { ascending: false })
          .order("campaign_id", { ascending: true })
          .order("user_id", { ascending: true })
          .range(from, to),
      MANY_ROWS_READ,
    );
    if (error) {
      if (reworkAbsent(error)) return { ok: false, why: "absent" };
      console.warn("[campaigns] many failed", error.message);
      return { ok: false, why: "failed" };
    }
    if (data.length >= MANY_ROWS_READ) console.warn(`[campaigns] many: the tally stopped at ${MANY_ROWS_READ} join rows for "${opts.span}"; it wants a table of sums by day now`);
    // One row a reader a campaign, so the rows of a campaign are its readers.
    const tally = new Map<string, number>();
    for (const r of data) tally.set(r.campaign_id, (tally.get(r.campaign_id) ?? 0) + 1);
    ids = [...tally.entries()]
      .filter(([, n]) => n >= MANY_FLOOR)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
      .slice(0, MANY_SHOWN * 3)
      .map(([id]) => id);
    manyKept.set(opts.span, { at: now, ids });
  }
  if (ids.length === 0) return { ok: true, value: { campaigns: [] } };

  const hidden = await hiddenFor(admin, opts.userId);
  let query = admin.from("prayer_campaigns").select(SERVER_COLS).in("id", ids).eq("status", "active").eq("audience", "public").eq("listed", true);
  query = query.not("days", "is", null);
  if (hidden.length > 0) query = query.not("creator_id", "in", `(${hidden.join(",")})`);
  const { data: found, error: readError } = await query;
  if (readError) {
    if (reworkAbsent(readError)) return { ok: false, why: "absent" };
    console.warn("[campaigns] many read failed", readError.message);
    return { ok: false, why: "failed" };
  }
  const byId = new Map(((found ?? []) as unknown as CampaignRow[]).filter((r) => !isOver(r, now)).map((r) => [r.id, r]));
  const campaigns = ids
    .map((id) => byId.get(id))
    .filter((r): r is CampaignRow => Boolean(r))
    .slice(0, MANY_SHOWN)
    .map((r) => forReader(r, opts.userId));
  return { ok: true, value: { campaigns } };
}

/** The campaigns a reader started, newest first, the held and the ended among them. */
export async function listStarted(admin: SupabaseClient, userId: string): Promise<Read<PublicCampaign[]>> {
  const { data, error } = await admin
    .from("prayer_campaigns")
    .select(SERVER_COLS)
    .eq("creator_id", userId)
    .neq("status", "removed")
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) {
    if (reworkAbsent(error)) return { ok: false, why: "absent" };
    console.warn("[campaigns] started failed", error.message);
    return { ok: false, why: "failed" };
  }
  const rows = (data ?? []) as unknown as CampaignRow[];
  // Its creator is told which circle each of theirs is kept to.
  const names = await circleNames(admin, rows.filter((r) => r.audience === "circle").map((r) => r.circle_id));
  return { ok: true, value: rows.map((r) => forReader(r, userId, r.circle_id ? (names.get(r.circle_id) ?? null) : null)) };
}

/**
 * A reader's circles, and the campaigns running in them: the choice on the
 * start screen, and "In your circles" in Pray together. Their own circles
 * and nobody else's, by their own id; a campaign by someone they have
 * blocked or muted is left out, as on the board. Newest first.
 */
export async function listCircles(
  admin: SupabaseClient,
  opts: { userId: string; now?: number },
): Promise<Read<{ circles: ReaderCircle[]; campaigns: PublicCampaign[] }>> {
  const now = opts.now ?? Date.now();
  const circles = await readerCircles(admin, opts.userId);
  if (circles.length === 0) return { ok: true, value: { circles: [], campaigns: [] } };
  const hidden = await hiddenFor(admin, opts.userId);
  let query = admin
    .from("prayer_campaigns")
    .select(SERVER_COLS)
    .eq("status", "active")
    .eq("audience", "circle")
    .in(
      "circle_id",
      circles.map((c) => c.id),
    )
    .order("created_at", { ascending: false })
    .limit(30);
  query = query.not("days", "is", null);
  if (hidden.length > 0) query = query.not("creator_id", "in", `(${hidden.join(",")})`);
  const { data, error } = await query;
  if (error) {
    if (reworkAbsent(error)) return { ok: false, why: "absent" };
    console.warn("[campaigns] circles failed", error.message);
    return { ok: false, why: "failed" };
  }
  const nameOf = new Map(circles.map((c) => [c.id, c.name]));
  const rows = ((data ?? []) as unknown as CampaignRow[]).filter((r) => !isOver(r, now) && typeof r.circle_id === "string" && nameOf.has(r.circle_id));
  return { ok: true, value: { circles, campaigns: rows.map((r) => forReader(r, opts.userId, nameOf.get(r.circle_id as string) ?? null)) } };
}

export type CarriedRow = { campaign: PublicCampaign; places: string[]; until_on: string | null };

/**
 * The campaigns a signed-in reader carries, with their own choice of prayers
 * and of days: their own join rows and nobody else's. This is how the choice
 * follows them to another device.
 */
export async function listCarried(admin: SupabaseClient, userId: string, now: number = Date.now()): Promise<Read<CarriedRow[]>> {
  const { data: joins, error } = await admin
    .from("prayer_campaign_prayers")
    .select("campaign_id, places, until_on")
    .eq("user_id", userId)
    .order("joined_at", { ascending: false })
    .limit(40);
  if (error) {
    if (reworkAbsent(error)) return { ok: false, why: "absent" };
    console.warn("[campaigns] carried failed", error.message);
    return { ok: false, why: "failed" };
  }
  const rows = (joins ?? []) as { campaign_id: string; places: string[] | null; until_on: string | null }[];
  if (rows.length === 0) return { ok: true, value: [] };
  const { data: found, error: readError } = await admin
    .from("prayer_campaigns")
    .select(SERVER_COLS)
    .in(
      "id",
      rows.map((r) => r.campaign_id),
    );
  if (readError) {
    if (reworkAbsent(readError)) return { ok: false, why: "absent" };
    return { ok: false, why: "failed" };
  }
  const campaigns = (found ?? []) as unknown as CampaignRow[];
  const byId = new Map(campaigns.map((c) => [c.id, c]));
  // One kept to a circle is carried only while its reader is still in that circle.
  const kept = campaigns.filter((c) => c.audience === "circle").map((c) => c.circle_id);
  const inCircles = kept.length > 0 ? await circlesHolding(admin, userId, kept) : NO_CIRCLES;
  const names = kept.length > 0 ? await circleNames(admin, kept) : new Map<string, string>();
  const out: CarriedRow[] = [];
  for (const j of rows) {
    const c = byId.get(j.campaign_id);
    // What has ended or been taken down is no longer carried: the device
    // hears that from the state route and lets go by itself. A row of July's
    // "prayed" taps is no choice to carry anything: one of July's is never
    // carried.
    if (!c || isJulyRow(c) || !mayRead(c, userId, inCircles) || c.status === "held" || isOver(c, now)) continue;
    out.push({ campaign: forReader(c, userId, c.circle_id ? (names.get(c.circle_id) ?? null) : null), places: j.places ?? [], until_on: j.until_on });
  }
  return { ok: true, value: out };
}

// ── Starting one ────────────────────────────────────────────────────────────

export type CampaignInput = {
  forWhom: ForWhom;
  kind: CampaignKind;
  title: string;
  name: string;
  words?: string | null;
  days: number;
  startsOn: string;
  prayer?: PrayerRef | null;
  consent: ConsentKind;
  confirmFiltered?: boolean;
  /** Kept to this circle, one of the reader's own on a reading path; none for everyone in Community. */
  circleId?: string | null;
  /** Where it is, if its creator says: a country of the app's list, and a town or region as typed. */
  place?: { country: string; town?: string | null } | null;
};

export type Started =
  | { ok: true; id: string }
  | { ok: false; status: number; error: string; code?: string; preview?: { title: string | null; name: string | null; words: string | null }; limit?: number };

/** A street address, as far as a pattern can tell one: a number, a few words, a street word. */
const STREET = /\b\d{1,5}\s+(?:[\p{L}'.-]+\s+){1,4}(?:street|st\.?|avenue|ave\.?|road|rd\.?|boulevard|blvd\.?|lane|ln\.?|drive|dr\.?|strasse|straße|rue|calle|ulica|ulitsa)\b/iu;

/**
 * What a moderator should know before reading it: the reasons it was held,
 * in a few plain words. Every campaign is held while campaigns are new (his
 * yes to item 117), so "new" always stands; the rest say what the filters
 * saw.
 */
export function heldReasons(texts: readonly (string | null | undefined)[], filterHits: number): string {
  const all = texts.filter(Boolean).join("\n");
  const reasons: string[] = [];
  // Words that may mean someone is in danger (./safety.ts): read first, and its writer is shown the safety line.
  if (maySpeakOfDanger(texts)) reasons.push(DANGER_MARK);
  if (filterHits > 0) reasons.push(`words (${Math.min(filterHits, 99)} masked)`);
  const { signals } = spamSignals(texts);
  const asks = signals.filter((s) => s === "money" || s === "phone" || s === "email" || s === "contact");
  if (asks.length > 0) reasons.push(asks.join(", "));
  if (STREET.test(all)) reasons.push("address");
  return ["new", ...reasons].join("; ").slice(0, 300);
}

/**
 * Start a campaign as `user`. It is written held: nobody but its creator
 * sees it until a moderator has read it.
 *
 * Refused, with a reason the writer can act on: a link anywhere in it (as a
 * prayer request refuses one), a kind, a prayer or a blessing that does not
 * fit, a first day that is not today anywhere, and one campaign too many.
 * Asked first: words the filter will mask, as a post asks.
 */
export async function startCampaign(
  admin: SupabaseClient,
  user: Pick<User, "id" | "email" | "created_at" | "user_metadata"> & CommunityUser,
  input: CampaignInput,
  now: number = Date.now(),
): Promise<Started> {
  if (!startsNow(input.startsOn, now)) return { ok: false, status: 400, error: "That first day is not today.", code: "bad_day" };
  const prayer = input.forWhom === "living" && input.prayer ? campaignPrayer(input.prayer) : null;
  if (input.prayer && !prayer) return { ok: false, status: 400, error: "That prayer is not one a campaign can carry.", code: "bad_prayer" };

  // A place, if one was given: a country of the app's own list, and a town
  // that is letters. A town that is not (a number, a street, an address) is
  // refused and never trimmed into something else. A campaign a parent or
  // guardian makes for a child keeps the country alone (the notes, 3.6).
  let place: { country: string; town: string | null } | null = null;
  if (input.place) {
    const typed = (input.place.town ?? "").trim();
    const town = typed ? cleanTown(typed) : null;
    if (!isCountry(input.place.country) || (typed && !town)) {
      return { ok: false, status: 400, error: "That place could not be read. A town or region is letters only.", code: "bad_place" };
    }
    place = { country: input.place.country, town: input.consent === "guardian" ? null : town };
  }

  // The place is read with the rest: no link in it, and what the filters see in it counts.
  const texts = [input.title, input.name, input.words ?? null, place?.town ?? null];
  if (findLinks(texts).length > 0) {
    return { ok: false, status: 400, error: "A prayer campaign can't carry a link.", code: "campaign_link" };
  }
  // Kept to a circle: only one the writer is in, on a reading path, asked
  // with their own id. One answer for a circle that is not theirs, one of
  // July's groups and one that does not exist.
  const circleId = input.circleId ?? null;
  if (circleId !== null && !(await mayKeepTo(admin, user.id, circleId))) {
    return { ok: false, status: 400, error: "That circle was not found.", code: "bad_circle" };
  }

  const trust = await readTrust(admin, user, now);
  const staff = trust.level === "staff";
  if (!staff) {
    // How many, per account: one running or waiting while the account is a
    // day old, three after; and three started in a day at most.
    if (await rateLimited(`campaign-start-user:${user.id}`, 86_400, STARTED_A_DAY)) {
      return { ok: false, status: 429, error: "You have started a few campaigns today. Please come back tomorrow.", code: "campaigns_today", limit: STARTED_A_DAY };
    }
    const cap = trust.facts.accountAgeMs < NEW_ACCOUNT_MS ? RUNNING_CAP.fresh : RUNNING_CAP.settled;
    const { data: running, error } = await admin
      .from("prayer_campaigns")
      .select("id, status, ends_at")
      .eq("creator_id", user.id)
      .in("status", ["held", "active"])
      // One of July's still says active and runs for nobody: it is not counted.
      .not("days", "is", null)
      .limit(20);
    if (error) {
      if (reworkAbsent(error)) return { ok: false, status: 404, error: "Not found." };
      return { ok: false, status: 500, error: "Couldn't start your campaign. Please try again." };
    }
    const open = ((running ?? []) as { status: string; ends_at: string | null }[]).filter((r) => !isOver(r, now));
    if (open.length >= cap) {
      return { ok: false, status: 409, error: "You have a campaign running already. It can be renewed when it ends.", code: "campaigns_running", limit: cap };
    }
  }

  // The word filter (lib/moderation): a listed word is masked, and the
  // writer is asked first, as a post's writer is.
  const [censored, censoredName, censoredTown] = await Promise.all([
    censorPost(admin, { title: input.title, body: input.words ?? null }),
    censorPost(admin, { title: input.name }),
    place?.town ? censorPost(admin, { title: place.town }) : Promise.resolve({ title: null, body: null, hits: 0 }),
  ]);
  // A town the word filter would mask is no town: it is left out, and the campaign is counted as filtered.
  if (place && censoredTown.hits > 0) place = { country: place.country, town: null };
  const hits = censored.hits + censoredName.hits + censoredTown.hits;
  if (hits > 0 && !input.confirmFiltered) {
    return {
      ok: false,
      status: 409,
      error: "Some words in this campaign will be hidden until a moderator reviews them.",
      code: "filtered",
      preview: { title: censored.title, name: censoredName.title, words: censored.body },
    };
  }

  // The creator as Community shows them, kept on the row.
  await ensureCleanHandle(admin, user.id);
  const meta = (user.user_metadata ?? {}) as { display_name?: string };
  const written = (meta.display_name ?? "").trim() || (user.email ? user.email.split("@")[0] : "") || "Reader";
  const [shownName, profile] = await Promise.all([
    censorName(admin, written),
    admin.from("profiles").select("handle").eq("id", user.id).maybeSingle(),
  ]);
  const handle = (profile.data as { handle?: string | null } | null)?.handle ?? null;

  const endsOn = lastDayOf(input.startsOn, input.days);
  const { data: created, error } = await admin
    .from("prayer_campaigns")
    .insert({
      creator_id: user.id,
      title: censored.title ?? input.title,
      intention: input.kind,
      for_whom: input.forWhom,
      subject_name: censoredName.title ?? input.name,
      details: censored.body,
      days: input.days,
      starts_on: input.startsOn,
      ends_on: endsOn,
      ends_at: endsAtOf(endsOn),
      prayer_rule: prayer?.rule ?? null,
      prayer_id: prayer?.id ?? null,
      ...(place ? { place_country: place.country, place_name: place.town } : {}),
      // Everyone in Community, or one circle of the writer's own. The
      // table holds the two columns to each other.
      audience: circleId ? "circle" : "public",
      ...(circleId ? { circle_id: circleId } : {}),
      creator_name: shownName.slice(0, 80),
      creator_handle: handle,
      consent_kind: input.consent,
      consent_at: new Date(now).toISOString(),
      // The Terms of Service, accepted on starting it (the schema takes no
      // campaign without the tick): the moment by this server's own clock,
      // never the sender's. Where the column is not there yet (its SQL,
      // file four, has not run) the insert fails and no campaign is
      // started, so none exists without its acceptance kept.
      terms_accepted_at: new Date(now).toISOString(),
      // Read by a moderator before anyone else sees it.
      status: "held",
      held_reason: heldReasons(texts, hits),
    })
    .select("id")
    .single();
  if (error || !created) {
    if (reworkAbsent(error)) return { ok: false, status: 404, error: "Not found." };
    console.warn("[campaigns] start failed", error?.message);
    return { ok: false, status: 500, error: "Couldn't start your campaign. Please try again." };
  }
  return { ok: true, id: (created as { id: string }).id };
}

// ── Changing its words while it waits ───────────────────────────────────────
//
// 1.9; the notes, 4.4 ("Their words: edit them (read again by a moderator)").
// What is built is the part that needs no new column: while a campaign still
// waits for its FIRST read, its creator can change its title, the name and
// the words. Nothing is seen unread and nothing needs a second read: the
// moderator reads it once, as changed, and is told again what the filters
// saw in the new words.
//
// Once a moderator has read it, the words they read are the words it
// carries. Its creator writes an update, or ends it and runs it again.
// Changing a running campaign's words needs somewhere to keep the new words
// while a moderator reads them, which is a column, which is SQL for the
// owner's signature: not built (the notes, section 33).
//
// Never while it is hidden on readers' reports: the words that were reported
// are the words a moderator must read.

/** How many changes an account may make in an hour: enough to mend what was written, and no way to keep a moderator reading. */
export const CHANGES_AN_HOUR = 20;

/** Whether its creator may still change its words: it waits for its first read. Never one of July's, which is not read at all. */
export function mayChange(row: Record<string, unknown>): boolean {
  return row.status === "held" && typeof row.held_reason === "string" && /^new\b/.test(row.held_reason) && !isJulyRow(row);
}

export type ChangeInput = { title: string; name: string; words?: string | null; confirmFiltered?: boolean };

export type Changed =
  | { ok: true }
  | { ok: false; status: number; error: string; code?: string; preview?: { title: string | null; name: string | null; words: string | null } };

const NOT_THERE: Changed = { ok: false, status: 404, error: "Not found." };
const READ_ALREADY: Changed = { ok: false, status: 409, error: "A moderator has read this campaign, so its words stay as they are.", code: "not_waiting" };

/**
 * Change a waiting campaign's title, name and words, as its creator. Held
 * to everything a new campaign is: no link, the word filter with its writer
 * asked first, and the moderator told what the filters saw, danger first.
 * One answer for a campaign that is not there and one that is someone
 * else's, so this tells nobody what exists.
 */
export async function changeCampaign(admin: SupabaseClient, user: Pick<User, "id">, id: string, input: ChangeInput): Promise<Changed> {
  const found = await readCampaignRow(admin, id);
  if (!found.ok) return found.why === "absent" ? NOT_THERE : { ok: false, status: 500, error: "Couldn't change your campaign. Please try again." };
  const row = found.value;
  if (!row || row.status === "removed" || row.creator_id !== user.id) return NOT_THERE;
  if (!mayChange(row)) return READ_ALREADY;
  if (await rateLimited(`campaign-change-user:${user.id}`, 3600, CHANGES_AN_HOUR)) {
    return { ok: false, status: 429, error: "That is a lot of changes. Please try again in a while.", code: "campaigns_changes" };
  }

  // Words taken away altogether are no words, never an empty line.
  const words = (input.words ?? "").trim() || null;
  // Its place is not changed here, and is still read with the rest.
  const town = typeof row.place_name === "string" ? row.place_name : null;
  const texts = [input.title, input.name, words, town];
  if (findLinks(texts).length > 0) {
    return { ok: false, status: 400, error: "A prayer campaign can't carry a link.", code: "campaign_link" };
  }
  const [censored, censoredName] = await Promise.all([
    censorPost(admin, { title: input.title, body: words }),
    censorPost(admin, { title: input.name }),
  ]);
  const hits = censored.hits + censoredName.hits;
  if (hits > 0 && !input.confirmFiltered) {
    return {
      ok: false,
      status: 409,
      error: "Some words in this campaign will be hidden until a moderator reviews them.",
      code: "filtered",
      preview: { title: censored.title, name: censoredName.title, words: censored.body },
    };
  }

  // Only while it still waits for that first read: a moderator who read it
  // a moment ago has read the words it had, and they stay.
  const { data: written, error } = await admin
    .from("prayer_campaigns")
    .update({
      title: censored.title ?? input.title,
      subject_name: censoredName.title ?? input.name,
      details: censored.body || null,
      held_reason: heldReasons(texts, hits),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("creator_id", user.id)
    .eq("status", "held")
    .like("held_reason", "new%")
    .select("id");
  if (error) {
    console.warn("[campaigns] change failed", error.message);
    return { ok: false, status: 500, error: "Couldn't change your campaign. Please try again." };
  }
  if (!written || written.length === 0) return READ_ALREADY;
  return { ok: true };
}

// ── What a device asks ──────────────────────────────────────────────────────

/**
 * Where each campaign a device carries stands, by id: running, over (closed,
 * ended or past its last day), or gone (taken down, or never there). A held
 * one reads as running: it is hidden while a moderator looks, and those who
 * carry it keep praying until it is decided. Says nothing else of any of
 * them, so an id is all a caller can learn about: whether it still runs.
 *
 * One kept to a circle answers as gone to anyone but its creator and that
 * circle's members (`userId`, from the caller's own token, or nobody): an
 * id tells a reader outside the circle nothing, not even that it is real,
 * and a member who leaves the circle is told to let its name go.
 */
export async function campaignStates(
  admin: SupabaseClient,
  ids: readonly string[],
  now: number = Date.now(),
  userId: string | null = null,
): Promise<Read<Record<string, "running" | "over" | "gone">>> {
  const wanted = [...new Set(ids.filter((id) => UUID.test(id)).map((id) => id.toLowerCase()))];
  const out: Record<string, "running" | "over" | "gone"> = {};
  if (wanted.length === 0) return { ok: true, value: out };
  const { data, error } = await admin.from("prayer_campaigns").select("id, status, ends_at, days, creator_id, audience, circle_id").in("id", wanted);
  if (error) {
    if (reworkAbsent(error)) return { ok: false, why: "absent" };
    return { ok: false, why: "failed" };
  }
  const found = (data ?? []) as unknown as CampaignRow[];
  const byId = new Map(found.map((r) => [r.id.toLowerCase(), r]));
  const kept = found.filter((r) => r.audience === "circle").map((r) => r.circle_id);
  const inCircles = kept.length > 0 ? await circlesHolding(admin, userId, kept) : NO_CIRCLES;
  // Kept to a circle, and the caller is neither its creator nor in that circle.
  const outside = (r: CampaignRow) => r.audience === "circle" && r.creator_id !== userId && !(typeof r.circle_id === "string" && inCircles.has(r.circle_id));
  for (const id of wanted) {
    const r = byId.get(id);
    // One of July's runs for nobody (isJulyRow): over, as its creator sees it.
    out[id] = !r || r.status === "removed" || outside(r) ? "gone" : isJulyRow(r) || isOver(r, now) ? "over" : "running";
  }
  return { ok: true, value: out };
}
