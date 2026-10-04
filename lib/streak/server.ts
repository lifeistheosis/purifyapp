import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { isTableAbsent } from "@/lib/admin/tableAbsent";
import type { EarnedBadgeId } from "@/lib/profile/badges";
import { pageAllSettled } from "@/lib/supabase/pageAll";
import { computeStreak, dayNumber, standing, topMilestone, weekStrip, type Milestone } from "./compute";
import type { StreakPayload } from "./types";
import { todayIn, validZone } from "./zone";

// The server's streak: walks the ledger, keeps one row per reader
// (reader_streaks, 20261006), and answers what a profile shows. Service role
// only, because that row holds the saves, which no browser may read.

/** A save is news for this many days after the day it covered; older ones are history. */
const SAVE_NEWS_DAYS = 3;

/**
 * The distinct days a reader kept that count, or null when the ledger cannot
 * be read. computeStreak puts them in order itself.
 *
 * BOTH READS ARE IN PAGES. The API returns at most 1,000 rows a request, from
 * a function as from a table, and says nothing when it stops. The function
 * answers oldest first, so its thousandth day would have been the last one
 * this ever saw: a reader who had kept a thousand days would have been shown
 * a streak that ended there. The fallback asked for 5,000 marks and got the
 * newest thousand, which is far fewer days than marks.
 */
async function keptDays(admin: SupabaseClient, userId: string): Promise<string[] | null> {
  const rpc = await pageAllSettled<{ day: string }>((from, to) =>
    admin.rpc("reader_kept_days", { p_user: userId }).order("day").range(from, to),
  );
  if (!rpc.error) return rpc.data.map((r) => String(r.day).slice(0, 10));
  // Before 20261006 the function is absent: fold the rows instead. Without
  // the gate a backdated row would count, but without the table nothing is
  // stored or shown to anyone else either, so only the reader's own Today
  // could be flattered.
  const { data, error } = await pageAllSettled<{ prayed_on: string }>((from, to) =>
    admin
      .from("prayer_completions")
      .select("prayed_on")
      .eq("user_id", userId)
      .order("prayed_on", { ascending: false })
      .order("rule_id")
      .range(from, to),
  );
  if (error) {
    console.warn("[streak] ledger read failed", error.message);
    return null;
  }
  return [...new Set(data.map((r) => String(r.prayed_on).slice(0, 10)))];
}

type StoredRow = {
  run: number;
  best: number;
  last_kept: string | null;
  saves: number;
  last_save: string | null;
  save_seen: string | null;
  m7: string | null;
  m40: string | null;
  m100: string | null;
  tz: string | null;
};

/**
 * Walk the reader's ledger, store the result, and answer the reader. `tz` is
 * the zone their device reports; without one the zone on file is used, and
 * UTC before there is any.
 */
export async function refreshStreak(
  admin: SupabaseClient,
  userId: string,
  tz?: string | null,
  now: Date = new Date(),
): Promise<StreakPayload> {
  const days = await keptDays(admin, userId);
  if (!days) return { state: "unavailable" };

  const stored = await admin.from("reader_streaks").select("tz, save_seen").eq("user_id", userId).maybeSingle();
  const row = (stored.error ? null : stored.data) as Pick<StoredRow, "tz" | "save_seen"> | null;
  const zone = validZone(tz) ?? validZone(row?.tz) ?? null;
  const today = todayIn(zone, now);
  const r = computeStreak(days, today);
  // The first walk for a reader: any save in their history happened before
  // there was a streak to show them, so it is not news.
  const first = !stored.error && !row;

  if (!stored.error || !isTableAbsent(stored.error)) {
    const { error } = await admin.from("reader_streaks").upsert(
      {
        user_id: userId,
        run: r.run,
        best: r.best,
        last_kept: r.lastKept,
        saves: r.saves,
        last_save: r.lastSave,
        m7: r.milestones[7] ?? null,
        m40: r.milestones[40] ?? null,
        m100: r.milestones[100] ?? null,
        tz: zone,
        computed_at: now.toISOString(),
        ...(first ? { save_seen: r.lastSave } : {}),
      },
      { onConflict: "user_id" },
    );
    if (error && !isTableAbsent(error)) console.warn("[streak] store failed", error.message);
  }

  // Told once: only where the row can remember that it was told.
  const recent = r.lastSave !== null && dayNumber(today) - dayNumber(r.lastSave) <= SAVE_NEWS_DAYS;
  const seen = row?.save_seen ?? null;
  const saved = !stored.error && !first && recent && r.lastSave !== null && (seen === null || r.lastSave > seen);
  return {
    state: "ok",
    current: r.current,
    best: r.best,
    keptToday: r.keptToday,
    lastKept: r.lastKept,
    saved,
    strip: weekStrip(days, today),
    today,
  };
}

/** The reader has seen the sheet that told them a save was used. */
export async function ackSave(admin: SupabaseClient, userId: string): Promise<void> {
  const { data, error } = await admin.from("reader_streaks").select("last_save").eq("user_id", userId).maybeSingle();
  if (error || !data) return;
  const last = (data as { last_save: string | null }).last_save;
  if (last) await admin.from("reader_streaks").update({ save_seen: last }).eq("user_id", userId);
}

const BADGE_FOR: Record<Milestone, EarnedBadgeId> = { 7: "streak_7", 40: "streak_40", 100: "streak_100" };

/**
 * What a profile shows of a reader's streak, from the stored row alone: the
 * streak as it stands today in their zone, and the highest streak badge
 * reached with the day it was. Nothing before 20261006 or the reader's first
 * visit after it.
 */
export async function profileStreak(
  admin: SupabaseClient,
  userId: string,
  now: Date = new Date(),
): Promise<{ current: number; badge: { id: EarnedBadgeId; since: string | null } | null }> {
  const { data, error } = await admin
    .from("reader_streaks")
    .select("run, best, last_kept, saves, m7, m40, m100, tz")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return { current: 0, badge: null };
  const row = data as StoredRow;
  const current = standing({ run: row.run, saves: row.saves, lastKept: row.last_kept }, todayIn(row.tz, now));
  const top = topMilestone(row.best);
  const since = top === 100 ? row.m100 : top === 40 ? row.m40 : top === 7 ? row.m7 : null;
  return { current, badge: top ? { id: BADGE_FOR[top], since: since ? `${since}T12:00:00Z` : null } : null };
}
