// Campaign streak arithmetic: the pure core, no window, no React, no fetch.
//
// Modelled on lib/fasting/streak.ts, deliberately, including the rule that
// today is forgiven. The two features ask the same question of the reader
// ("did you keep this today?") and answering it two different ways would
// mean two different definitions of a streak inside one app.
//
// What is NOT here, on purpose: the ~20h PRAY_COOLDOWN_MS gate in
// lib/campaigns/campaigns.ts. Twenty hours is not a day. A reader who prays
// at 21:00 and again at 08:00 the next morning is refused by it, and one who
// prays at 08:00 and again at 04:00 is credited twice. Days are day keys
// (lib/rhythm/dayKey.ts), computed on the reader's own calendar, which is
// the only frame in which "I prayed every day this week" is a true sentence.

// Only lib/rhythm/dayKey. NOT lib/calendar/orthodox directly: a value import
// of that module pulls a 416 KB saints chunk into whatever bundle touches
// it, which is why components/calendar/* import it type-only. dayKey already
// pays that cost once, so going through it keeps campaigns clear of it.
import { todayKey, type DayKey } from "@/lib/rhythm/dayKey";

/** One kept day. The server stores one row per campaign, reader and day. */
export type CampaignDay = {
  day_key: DayKey;
};

export type CampaignProgress = {
  /** Consecutive days ending today, or ending yesterday if today is not yet
   *  marked. Today never breaks a streak that is still open. */
  streak: number;
  /** Every day the reader has kept on this campaign. */
  totalDays: number;
  /** Whether the reader has already prayed on their own calendar today. */
  prayedToday: boolean;
  /** The longest run they have kept, for a quiet "your longest was 12". */
  longest: number;
};

/**
 * The days as a set of keys, deduplicated and safe against a malformed row.
 *
 * The server's primary key already prevents duplicates, but this is fed by a
 * network response and a bad row must degrade to "that day does not count",
 * never to a thrown render.
 */
export function dayKeySet(days: readonly CampaignDay[]): Set<DayKey> {
  const out = new Set<DayKey>();
  for (const d of days) {
    const k = d?.day_key;
    if (typeof k === "string" && /^\d{4}-\d{2}-\d{2}$/.test(k)) out.add(k);
  }
  return out;
}

/**
 * Consecutive days ending at `today`, walking backwards.
 *
 * Today is forgiven: a reader who has not yet prayed today still has the
 * streak they went to bed with, and it only breaks once a whole day has
 * passed unmarked. Without that rule the number would read zero every
 * morning until the reader opened the app, which is precisely the shape of
 * pressure the ethos forbids.
 */
export function computeStreak(
  kept: ReadonlySet<DayKey>,
  today: DayKey = todayKey(),
): number {
  if (kept.size === 0) return 0;

  // Walk back from today. `keysEndingAt` steps on UTC dates so it cannot
  // skip or repeat a day across a DST boundary.
  const anchor = parseKey(today);
  if (!anchor) return 0;

  let streak = 0;
  for (let back = 0; back < MAX_WALK; back++) {
    const d = new Date(anchor);
    d.setUTCDate(d.getUTCDate() - back);
    if (kept.has(keyOfUtc(d))) {
      streak++;
      continue;
    }
    // An unmarked TODAY does not break anything: the day is not over yet.
    // Any earlier unmarked day ends the run.
    if (back > 0) break;
  }
  return streak;
}

/** The longest consecutive run anywhere in the reader's history. */
export function longestStreak(kept: ReadonlySet<DayKey>): number {
  if (kept.size === 0) return 0;
  const sorted = [...kept].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = parseKey(sorted[i - 1]);
    const cur = parseKey(sorted[i]);
    if (!prev || !cur) {
      run = 1;
      continue;
    }
    prev.setUTCDate(prev.getUTCDate() + 1);
    if (keyOfUtc(prev) === sorted[i]) {
      run++;
      if (run > best) best = run;
    } else {
      run = 1;
    }
  }
  return best;
}

/** Everything a campaign card needs, in one pass. */
export function summarize(
  days: readonly CampaignDay[],
  today: DayKey = todayKey(),
): CampaignProgress {
  const kept = dayKeySet(days);
  return {
    streak: computeStreak(kept, today),
    totalDays: kept.size,
    prayedToday: kept.has(today),
    longest: longestStreak(kept),
  };
}

/**
 * The window a campaign's rhythm strip renders: the last `days` day keys
 * ending today, each flagged kept or not. Oldest first, so it reads left to
 * right the way a calendar does.
 */
export function rhythm(
  days: readonly CampaignDay[],
  windowDays = 14,
  today: DayKey = todayKey(),
): { key: DayKey; kept: boolean }[] {
  const kept = dayKeySet(days);
  const anchor = parseKey(today);
  if (!anchor) return [];
  const out: { key: DayKey; kept: boolean }[] = [];
  for (let back = windowDays - 1; back >= 0; back--) {
    const d = new Date(anchor);
    d.setUTCDate(d.getUTCDate() - back);
    const key = keyOfUtc(d);
    out.push({ key, kept: kept.has(key) });
  }
  return out;
}

/**
 * Whether the reader may mark this campaign today.
 *
 * Replaces canPrayAgain's clock arithmetic with a calendar question. The
 * server asks the same question against the same key, so the button and the
 * route cannot disagree.
 */
export function canPrayToday(
  days: readonly CampaignDay[],
  today: DayKey = todayKey(),
): boolean {
  return !dayKeySet(days).has(today);
}

/** How far back `computeStreak` will walk before giving up. Three years is
 *  longer than any campaign duration the app offers, and bounds the loop
 *  against a malformed anchor. */
const MAX_WALK = 1100;

function parseKey(key: DayKey): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const [y, m, d] = key.split("-").map(Number);
  // Noon, matching the UTC-noon frame the rest of the app carries days in,
  // so no zone shift can push the date across a boundary.
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function keyOfUtc(d: Date): DayKey {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
