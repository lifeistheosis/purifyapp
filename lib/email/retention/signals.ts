import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { getBook } from "@/lib/bible/books";
import type { CalStyle } from "@/lib/calendar/orthodox";
import { nameDay } from "@/lib/profile/nameDay";
import { getSaint, getWork } from "@/lib/saints/saints";
import { isColumnAbsent } from "@/lib/supabase/columnAbsent";
import { pageAllIn } from "@/lib/supabase/pageAll";
import { cleanPlacesSlice } from "@/lib/sync/keptMerge";

import type { RetentionKind } from "./kinds";
import {
  parseRetentionKey,
  PICK_UP_LOOKBACK_DAYS,
  type FirstWeekReader,
  type FirstWeekStep,
  type ParsedKey,
  type PersonalLine,
  type PickUpStep,
} from "./plan";

/**
 * What the account already keeps, read for the readers an email is for and
 * for nobody else.
 *
 * PRIVACY FIRST, the arbiter's brief of 2026-11-13: "Use only what a reader's
 * own account already keeps on the server ... Never add tracking. If a step
 * cannot be known, send that day's guide without claiming they have not done
 * it." So every read here is of a table the privacy page already names as
 * kept with an account, and nothing is written:
 *
 *   profiles             when the account was made, the calendar on their
 *                        Community profile, the patron saint they chose, and
 *                        what they are reading now, only while they show it
 *   prayer_completions   the prayer-rule check-offs ("the days you have
 *                        prayed")
 *   bookmarks,           with Purify Plus: verses kept and noted
 *   annotations
 *   user_kept            with Purify Plus: the place in the Bible and in
 *                        each long work, plans and Remember
 *   email_sends          what Purify already sent them
 *
 * No analytics table is read (the visit data is never joined to an account,
 * as the privacy page promises), and nothing is kept from these reads: they
 * decide one run's email and are gone. lib/email/retention/__tests__ holds
 * the list of tables.
 *
 * A read that fails is reported in `errors` and its fact is treated as not
 * known: a step not known to be done is sent, in words that claim nothing. A
 * table that is not there yet is not an error, just nothing kept.
 */

const DAY = 86_400_000;

/** The tables these reads may touch, and no other. */
export const READS = ["profiles", "prayer_completions", "bookmarks", "annotations", "user_kept", "email_sends"] as const;

type Errors = string[];

type ApiError = { message: string; code?: string };

/**
 * Every row of an .in() read, or null when it failed. A table not there yet
 * reads as empty. `quiet` lets a caller take a failure it knows how to step
 * around (a column not there yet) without it being reported.
 */
async function readIn<T>(
  label: string,
  ids: readonly string[],
  run: (some: string[], from: number, to: number) => PromiseLike<{ data: T[] | null; error: ApiError | null }>,
  errors: Errors,
  quiet: (cause: ApiError | undefined) => boolean = () => false,
): Promise<T[] | null> {
  if (ids.length === 0) return [];
  try {
    return await pageAllIn<T>(ids, run);
  } catch (e) {
    const cause = (e as Error & { cause?: ApiError }).cause;
    if (isTableAbsent(cause)) return [];
    if (!quiet(cause)) errors.push(`${label}: ${(e as Error).message}`);
    return null;
  }
}

/** The reckoning a profile names, new unless it says old. */
const styleOf = (v: unknown): CalStyle => (v === "old" ? "old" : "new");

type ProfileRow = {
  id: string;
  joined_at: string | null;
  calendar_reckoning?: string | null;
  patron_saint?: string | null;
  now_reading?: string | null;
  now_reading_at?: string | null;
  show_now_reading?: boolean | null;
};

const PROFILE_FULL = "id, joined_at, calendar_reckoning, patron_saint, now_reading, now_reading_at, show_now_reading";
const PROFILE_BASE = "id, joined_at";

/** Profiles for these ids, with the newer columns where the table has them. */
export async function readProfiles(admin: SupabaseClient, ids: readonly string[], errors: Errors): Promise<Map<string, ProfileRow>> {
  const out = new Map<string, ProfileRow>();
  // The newer columns first. A column the table lacks yet steps back to what
  // it has, quietly; anything else is an error and leaves the facts unknown.
  let stepped = false;
  const full = await readIn<ProfileRow>(
    "profiles",
    ids,
    (some, from, to) => admin.from("profiles").select(PROFILE_FULL).in("id", some).order("id").range(from, to),
    errors,
    (cause) => (stepped = isColumnAbsent(cause)),
  );
  const rows = full ?? (stepped
    ? await readIn<ProfileRow>(
        "profiles",
        ids,
        (some, from, to) => admin.from("profiles").select(PROFILE_BASE).in("id", some).order("id").range(from, to),
        errors,
      )
    : null);
  for (const r of rows ?? []) out.set(r.id, r);
  return out;
}

// ── The first-week guide ─────────────────────────────────────────────────

/**
 * For each new reader: when the account was made, and the steps it shows
 * done. Morning prayers, by a check-off of the morning rule; the calendar,
 * by the Old Calendar on their profile (the New is the column's default, so
 * it says nothing either way); a verse, by a verse bookmarked or noted with
 * Plus. A step nothing shows stays not known.
 */
export async function readFirstWeek(admin: SupabaseClient, ids: readonly string[], errors: Errors): Promise<FirstWeekReader[]> {
  const [profiles, prayed, marked, noted] = await Promise.all([
    readProfiles(admin, ids, errors),
    readIn<{ user_id: string }>(
      "prayer_completions",
      ids,
      (some, from, to) =>
        admin
          .from("prayer_completions")
          .select("user_id")
          .in("user_id", some)
          .eq("rule_id", "morning")
          .order("user_id")
          .order("prayed_on")
          .range(from, to),
      errors,
    ),
    readIn<{ user_id: string }>(
      "bookmarks",
      ids,
      (some, from, to) =>
        admin
          .from("bookmarks")
          .select("user_id")
          .in("user_id", some)
          .in("kind", ["bible-verse", "bible-chapter"])
          .order("id")
          .range(from, to),
      errors,
    ),
    readIn<{ user_id: string }>(
      "annotations",
      ids,
      (some, from, to) =>
        admin.from("annotations").select("user_id").in("user_id", some).eq("kind", "bible-verse").order("id").range(from, to),
      errors,
    ),
  ]);
  const prayedBy = new Set((prayed ?? []).map((r) => r.user_id));
  const keptBy = new Set([...(marked ?? []), ...(noted ?? [])].map((r) => r.user_id));
  return ids.map((id) => {
    const p = profiles.get(id);
    const done: Partial<Record<FirstWeekStep, boolean>> = {};
    if (prayedBy.has(id)) done.morning = true;
    if (p?.calendar_reckoning === "old") done.calendar = true;
    if (keptBy.has(id)) done.verse = true;
    return { userId: id, joinedAt: p?.joined_at ?? null, done };
  });
}

// ── Where you left off ───────────────────────────────────────────────────

const BOOK_CHAPTER = /^([a-z0-9-]{1,40})\/([0-9]{1,3})$/;

/** A book's name as the app names it, from the slug a row keeps. */
function bookName(slug: string, kept?: string): string | null {
  return getBook(slug)?.name ?? (kept && kept !== slug ? kept : null);
}

/** The lines a reader's own rows give. Pure. */
export function linesFrom(input: {
  profile: ProfileRow | undefined;
  places: unknown;
  now: Date;
}): PersonalLine[] {
  const lines: PersonalLine[] = [];
  const places = input.places ? cleanPlacesSlice(input.places) : null;
  if (places?.bible) {
    const name = bookName(places.bible.book, places.bible.bookName);
    if (name) {
      lines.push({ kind: "bible", book: places.bible.book, bookName: name, chapter: places.bible.chapter, verse: places.bible.verse, at: places.bible.ts });
    }
  }
  for (const [key, place] of Object.entries(places?.works ?? {})) {
    const [saintSlug, workSlug] = key.split("/");
    const found = getWork(saintSlug, workSlug);
    if (!found) continue;
    lines.push({
      kind: "work",
      saintSlug,
      saintName: found.saint.name,
      workSlug,
      workTitle: found.work.title,
      sectionN: place.sectionN,
      paragraph: place.paragraph,
      at: place.savedAt,
    });
  }
  // What they are reading now, only while they show it on their profile.
  const p = input.profile;
  const reading = p?.show_now_reading === true && p.now_reading ? BOOK_CHAPTER.exec(p.now_reading) : null;
  if (reading) {
    const name = bookName(reading[1]);
    const at = p?.now_reading_at ? Date.parse(p.now_reading_at) : NaN;
    if (name && Number.isFinite(at)) lines.push({ kind: "bible", book: reading[1], bookName: name, chapter: Number(reading[2]), verse: 1, at });
  }
  // Their patron saint's next feast, in their own reckoning.
  const saint = p?.patron_saint ? getSaint(p.patron_saint) : null;
  if (saint) {
    const day = nameDay(saint.feastDays, p?.calendar_reckoning, input.now);
    if (day && !day.today) lines.push({ kind: "patron", saintSlug: saint.slug, saintName: saint.name, on: day.date });
  }
  return lines;
}

export type PickUpFacts = { userId: string; lastActiveAt: number | null; lines: PersonalLine[] };

/**
 * For each reader: the last time inside the lookback their account kept
 * anything (or was made), and the lines it gives. Kept means a prayer
 * checked off, a verse bookmarked or noted, a place, plan or Remember kept,
 * or a chapter shown as being read. The reading settings are not counted:
 * changing a typeface is not reading.
 */
export async function readPickUp(admin: SupabaseClient, ids: readonly string[], now: Date, errors: Errors): Promise<PickUpFacts[]> {
  const since = new Date(now.getTime() - PICK_UP_LOOKBACK_DAYS * DAY).toISOString();
  const [profiles, prayed, marked, noted, kept] = await Promise.all([
    readProfiles(admin, ids, errors),
    readIn<{ user_id: string; completed_at: string }>(
      "prayer_completions",
      ids,
      (some, from, to) =>
        admin
          .from("prayer_completions")
          .select("user_id, completed_at")
          .in("user_id", some)
          .gte("completed_at", since)
          .order("user_id")
          .order("rule_id")
          .order("prayed_on")
          .range(from, to),
      errors,
    ),
    readIn<{ user_id: string; added_at: string }>(
      "bookmarks",
      ids,
      (some, from, to) =>
        admin.from("bookmarks").select("user_id, added_at").in("user_id", some).gte("added_at", since).order("id").range(from, to),
      errors,
    ),
    readIn<{ user_id: string; updated_at: string }>(
      "annotations",
      ids,
      (some, from, to) =>
        admin.from("annotations").select("user_id, updated_at").in("user_id", some).gte("updated_at", since).order("id").range(from, to),
      errors,
    ),
    readIn<{ user_id: string; slice: string; value: unknown; updated_at: string }>(
      "user_kept",
      ids,
      (some, from, to) =>
        admin
          .from("user_kept")
          .select("user_id, slice, value, updated_at")
          .in("user_id", some)
          .in("slice", ["plans", "remember", "places"])
          .order("user_id")
          .order("slice")
          .range(from, to),
      errors,
    ),
  ]);

  const floor = Date.parse(since);
  const last = new Map<string, number>();
  const touch = (id: string, ts: string | number | null | undefined) => {
    const t = typeof ts === "number" ? ts : ts ? Date.parse(ts) : NaN;
    if (!Number.isFinite(t) || t < floor || t > now.getTime()) return;
    if (t > (last.get(id) ?? -Infinity)) last.set(id, t);
  };
  for (const r of prayed ?? []) touch(r.user_id, r.completed_at);
  for (const r of marked ?? []) touch(r.user_id, r.added_at);
  for (const r of noted ?? []) touch(r.user_id, r.updated_at);
  const placesBy = new Map<string, unknown>();
  for (const r of kept ?? []) {
    touch(r.user_id, r.updated_at);
    if (r.slice === "places") placesBy.set(r.user_id, r.value);
  }
  for (const [id, p] of profiles) {
    touch(id, p.joined_at);
    touch(id, p.now_reading_at);
  }

  return ids.map((id) => ({
    userId: id,
    lastActiveAt: last.get(id) ?? null,
    lines: linesFrom({ profile: profiles.get(id), places: placesBy.get(id), now }),
  }));
}

/**
 * Every time each reader's account kept something between `from` and `to`:
 * the same five signs readPickUp counts. For the brief's measure (effect.ts),
 * read only for readers a retention email reached. Null when any of the
 * reads failed, so a figure built on it says "not read" rather than a number
 * that is too low.
 */
export async function readActivity(
  admin: SupabaseClient,
  ids: readonly string[],
  from: Date,
  to: Date,
  errors: Errors,
): Promise<Map<string, number[]> | null> {
  const a = from.toISOString();
  const b = to.toISOString();
  const before = errors.length;
  const [prayed, marked, noted, kept, profiles] = await Promise.all([
    readIn<{ user_id: string; completed_at: string }>(
      "prayer_completions",
      ids,
      (some, f, t) =>
        admin
          .from("prayer_completions")
          .select("user_id, completed_at")
          .in("user_id", some)
          .gte("completed_at", a)
          .lte("completed_at", b)
          .order("user_id")
          .order("rule_id")
          .order("prayed_on")
          .range(f, t),
      errors,
    ),
    readIn<{ user_id: string; added_at: string }>(
      "bookmarks",
      ids,
      (some, f, t) => admin.from("bookmarks").select("user_id, added_at").in("user_id", some).gte("added_at", a).lte("added_at", b).order("id").range(f, t),
      errors,
    ),
    readIn<{ user_id: string; updated_at: string }>(
      "annotations",
      ids,
      (some, f, t) =>
        admin.from("annotations").select("user_id, updated_at").in("user_id", some).gte("updated_at", a).lte("updated_at", b).order("id").range(f, t),
      errors,
    ),
    readIn<{ user_id: string; updated_at: string }>(
      "user_kept",
      ids,
      (some, f, t) =>
        admin
          .from("user_kept")
          .select("user_id, updated_at")
          .in("user_id", some)
          .in("slice", ["plans", "remember", "places"])
          .gte("updated_at", a)
          .lte("updated_at", b)
          .order("user_id")
          .order("slice")
          .range(f, t),
      errors,
    ),
    readProfiles(admin, ids, errors),
  ]);
  if (errors.length > before || !prayed || !marked || !noted || !kept) return null;
  const out = new Map<string, number[]>();
  const add = (id: string, ts: string | null | undefined) => {
    const t = ts ? Date.parse(ts) : NaN;
    if (!Number.isFinite(t) || t < from.getTime() || t > to.getTime()) return;
    (out.get(id) ?? out.set(id, []).get(id)!).push(t);
  };
  for (const r of prayed) add(r.user_id, r.completed_at);
  for (const r of marked) add(r.user_id, r.added_at);
  for (const r of noted) add(r.user_id, r.updated_at);
  for (const r of kept) add(r.user_id, r.updated_at);
  for (const [id, p] of profiles) add(id, p.now_reading_at);
  return out;
}

// ── The fasting companion ────────────────────────────────────────────────

/** Each reader's reckoning, from their profile: new unless it says old. */
export async function readStyles(admin: SupabaseClient, ids: readonly string[], errors: Errors): Promise<Map<string, CalStyle>> {
  const profiles = await readProfiles(admin, ids, errors);
  return new Map(ids.map((id) => [id, styleOf(profiles.get(id)?.calendar_reckoning)]));
}

// ── What was sent ────────────────────────────────────────────────────────

export type SentRow = { key: ParsedKey; at: number };

/** The retention emails these readers already had (sent, or in flight) in the last `days`, read back into their parts. */
export async function readSent(
  admin: SupabaseClient,
  ids: readonly string[],
  kind: RetentionKind,
  now: Date,
  days: number,
  errors: Errors,
): Promise<SentRow[] | null> {
  const since = new Date(now.getTime() - days * DAY).toISOString();
  const rows = await readIn<{ dedupe_key: string; created_at: string }>(
    "email_sends",
    ids,
    (some, from, to) =>
      admin
        .from("email_sends")
        .select("dedupe_key, created_at")
        .in("user_id", some)
        .eq("kind", kind)
        .in("status", ["sent", "pending"])
        .gte("created_at", since)
        .order("id")
        .range(from, to),
    errors,
  );
  if (!rows) return null;
  const out: SentRow[] = [];
  for (const r of rows) {
    const key = parseRetentionKey(r.dedupe_key);
    const at = Date.parse(r.created_at);
    if (key && Number.isFinite(at)) out.push({ key, at });
  }
  return out;
}

/** The steps of "where you left off" each reader had after their last activity. Pure. */
export function pickUpSentSince(rows: readonly SentRow[], lastActiveAt: ReadonlyMap<string, number | null>): Map<string, Set<PickUpStep>> {
  const out = new Map<string, Set<PickUpStep>>();
  for (const { key, at } of rows) {
    if (key.kind !== "pick_up" || key.owner) continue;
    const last = lastActiveAt.get(key.userId);
    if (last !== null && last !== undefined && at <= last) continue;
    (out.get(key.userId) ?? out.set(key.userId, new Set()).get(key.userId)!).add(key.step);
  }
  return out;
}

/** Each reader's fasting notes already had, by "<fast key>:<piece>", with when. Pure. */
export function fastingSent(rows: readonly SentRow[], owner: boolean): Map<string, Map<string, number>> {
  const out = new Map<string, Map<string, number>>();
  for (const { key, at } of rows) {
    if (key.kind !== "fasting_companion" || key.owner !== owner) continue;
    const mine = out.get(key.userId) ?? out.set(key.userId, new Map()).get(key.userId)!;
    const piece = `${key.fastKey}:${key.piece}`;
    if (!mine.has(piece) || at < mine.get(piece)!) mine.set(piece, at);
  }
  return out;
}
