import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";

import type { CommunityUser } from "@/lib/community/adminStanding";
import { findLinks, spamSignals } from "@/lib/community/spam";
import { NEW_ACCOUNT_MS } from "@/lib/community/trust";
import { readTrust } from "@/lib/community/trustServer";
import { censorName, censorPost } from "@/lib/moderation/server";
import { ensureCleanHandle } from "@/lib/profile/server";
import { rateLimited } from "@/lib/security/ratelimit";

import {
  CAMPAIGN_COLS,
  RUNNING_CAP,
  STARTED_A_DAY,
  campaignPsalm,
  endsAtOf,
  isJulyRow,
  isOver,
  lastDayOf,
  publicCampaign,
  startsNow,
  type CampaignKind,
  type ConsentKind,
  type ForWhom,
  type PrayerRef,
  type PublicCampaign,
} from "./model";
import { reworkAbsent } from "./opening";

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
  ends_at?: string | null;
  mod_cleared_at?: string | null;
};

const SERVER_COLS = `${CAMPAIGN_COLS}, creator_id, audience, held_reason, mod_cleared_at, keep_after_end`;

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
 *   kept to a circle   nobody yet: circles as an audience come in a later
 *                      phase, and a row that says so is not shown as public
 *                      in the meantime.
 *   anything else      everyone campaigns are open for.
 */
export function mayRead(row: CampaignRow, userId: string | null): boolean {
  if (row.status === "removed") return false;
  if (row.audience === "circle") return false;
  if (row.status === "held" || isJulyRow(row)) return userId !== null && row.creator_id === userId;
  return true;
}

/**
 * Everyone this reader has blocked or muted, as lib/community/blocks.ts reads
 * them, for a route that already knows who is asking. The ids go into a
 * WHERE clause and nowhere else. Never throws: a lookup that breaks leaves
 * the list unfiltered, which is the softer of the two failures.
 */
export async function hiddenFor(admin: SupabaseClient, userId: string | null): Promise<string[]> {
  if (!userId) return [];
  try {
    const [blocks, mutes] = await Promise.all([
      admin.from("community_blocks").select("blocked_id").eq("blocker_id", userId).limit(500),
      admin.from("community_mutes").select("muted_id").eq("muter_id", userId).limit(500),
    ]);
    if (blocks.error) console.warn("[campaigns] block lookup failed", blocks.error.message);
    return [
      ...((blocks.error ? [] : (blocks.data ?? [])) as { blocked_id: string }[]).map((r) => r.blocked_id),
      ...((mutes.error ? [] : (mutes.data ?? [])) as { muted_id: string }[]).map((r) => r.muted_id),
    ];
  } catch {
    return [];
  }
}

/** The row as its reader receives it, saying whether they started it. */
export function forReader(row: CampaignRow, userId: string | null): PublicCampaign {
  const mine = userId !== null && row.creator_id === userId;
  // Whether it is kept after its last day is its creator's own setting, and told to nobody else.
  return { ...publicCampaign(row), mine, ...(mine ? { keep_after_end: row.keep_after_end === true } : {}) };
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
  return { ok: true, value: ((data ?? []) as unknown as CampaignRow[]).map((r) => forReader(r, userId)) };
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
  const byId = new Map(((found ?? []) as unknown as CampaignRow[]).map((c) => [c.id, c]));
  const out: CarriedRow[] = [];
  for (const j of rows) {
    const c = byId.get(j.campaign_id);
    // What has ended or been taken down is no longer carried: the device
    // hears that from the state route and lets go by itself. A row of July's
    // "prayed" taps is no choice to carry anything: one of July's is never
    // carried.
    if (!c || isJulyRow(c) || !mayRead(c, userId) || c.status === "held" || isOver(c, now)) continue;
    out.push({ campaign: forReader(c, userId), places: j.places ?? [], until_on: j.until_on });
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
};

export type Started =
  | { ok: true; id: string }
  | { ok: false; status: number; error: string; code?: string; preview?: { title: string | null; name: string | null; words: string | null }; limit?: number };

/**
 * Words that may mean the writer is in danger. Only to bring the campaign to
 * the head of the moderators' queue: the words shown to its writer are the
 * owner's and a priest's to write (his item 129), and none is shown until
 * they have. English only for now, which is said plainly here: a reader in
 * crisis in another language is read by the moderator who reads every
 * campaign, and no sooner.
 */
const CRISIS = /\b(?:suicid\w*|kill\s+my\s?self|end\s+my\s+(?:own\s+)?life|take\s+my\s+(?:own\s+)?life|want\s+to\s+die|(?:don'?t|do\s+not)\s+want\s+to\s+(?:live|be\s+alive)|self[-\s]?harm)\b/i;

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
  if (CRISIS.test(all)) reasons.push("crisis");
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
  const prayer = input.forWhom === "living" && input.prayer ? campaignPsalm(input.prayer) : null;
  if (input.prayer && !prayer) return { ok: false, status: 400, error: "That prayer is not one a campaign can carry.", code: "bad_prayer" };

  const texts = [input.title, input.name, input.words ?? null];
  if (findLinks(texts).length > 0) {
    return { ok: false, status: 400, error: "A prayer campaign can't carry a link.", code: "campaign_link" };
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
  const [censored, censoredName] = await Promise.all([
    censorPost(admin, { title: input.title, body: input.words ?? null }),
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
      audience: "public",
      creator_name: shownName.slice(0, 80),
      creator_handle: handle,
      consent_kind: input.consent,
      consent_at: new Date(now).toISOString(),
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

// ── What a device asks ──────────────────────────────────────────────────────

/**
 * Where each campaign a device carries stands, by id: running, over (closed,
 * ended or past its last day), or gone (taken down, or never there). A held
 * one reads as running: it is hidden while a moderator looks, and those who
 * carry it keep praying until it is decided. Says nothing else of any of
 * them, so an id is all a caller can learn about: whether it still runs.
 */
export async function campaignStates(
  admin: SupabaseClient,
  ids: readonly string[],
  now: number = Date.now(),
): Promise<Read<Record<string, "running" | "over" | "gone">>> {
  const wanted = [...new Set(ids.filter((id) => UUID.test(id)).map((id) => id.toLowerCase()))];
  const out: Record<string, "running" | "over" | "gone"> = {};
  if (wanted.length === 0) return { ok: true, value: out };
  const { data, error } = await admin.from("prayer_campaigns").select("id, status, ends_at, days").in("id", wanted);
  if (error) {
    if (reworkAbsent(error)) return { ok: false, why: "absent" };
    return { ok: false, why: "failed" };
  }
  const byId = new Map(((data ?? []) as { id: string; status: string; ends_at: string | null; days: number | null }[]).map((r) => [r.id.toLowerCase(), r]));
  for (const id of wanted) {
    const r = byId.get(id);
    // One of July's runs for nobody (isJulyRow): over, as its creator sees it.
    out[id] = !r || r.status === "removed" ? "gone" : isJulyRow(r) || isOver(r, now) ? "over" : "running";
  }
  return { ok: true, value: out };
}
