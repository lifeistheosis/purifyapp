"use client";

// Single source of truth for every prayer-feature localStorage key.
//
// Every read uses a try/catch (private mode, blocked storage, quota
// errors) and every write dispatches a CustomEvent so React subscribers
// (PrayerRuleReader, RhythmStrip, ProfileStats) update without a refresh.
// The event names follow the existing convention
// (`purify:prayer-completed`, `purify:intentions`).
//
// LocalStorage keys:
//   purify.prayers.{ruleId}.dates       JSON string[]    last 30 days the rule was completed
//   purify.prayers.{ruleId}.today       JSON string[]    today's per-prayer done ids
//   purify.prayers.{ruleId}.streak      string           LEGACY — kept for downgrade safety
//   purify.prayers.{ruleId}.last        string           LEGACY
//   purify.intentions.living            JSON Intention[]
//   purify.intentions.departed          JSON Intention[]
//   purify.rope.sessions                JSON RopeSession[]    READ ONLY, see below
//   purify.rope.settings                left where it is, no longer read

import { useSyncExternalStore } from "react";

import { orthodoxPascha } from "@/lib/calendar/pascha";

export const PRAYER_EVENT = "purify:prayer-completed";
export const INTENTIONS_EVENT = "purify:intentions";
export const RECENTS_EVENT = "purify:prayer-recents";

// ── Date helpers ────────────────────────────────────────────────────────────
function ymd(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function todayYmd(): string {
  return ymd();
}

function mmdd(d: Date = new Date()): string {
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ── Generic localStorage helpers ────────────────────────────────────────────
function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown, event: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent(event));
  } catch {
    /* ignore: quota / private mode */
  }
}

// ── Prayer rule completion ──────────────────────────────────────────────────

export type RuleId = string;

/**
 * Read the per-prayer "done today" set. Returns a fresh array each call so
 * useSyncExternalStore can do equality on the parsed JSON string.
 */
export function readTodayDone(ruleId: RuleId): string[] {
  return readJson<string[]>(`purify.prayers.${ruleId}.today.${todayYmd()}`, []);
}

export function writeTodayDone(ruleId: RuleId, ids: string[]) {
  writeJson(
    `purify.prayers.${ruleId}.today.${todayYmd()}`,
    ids,
    PRAYER_EVENT,
  );
}

/**
 * Read the rolling 30-day list of dates on which this rule was completed.
 * If the legacy `streak` key exists from the previous version, derive a
 * best-effort backfill so the rhythm strip isn't empty on first load.
 * The migration is non-destructive — old keys stay so a downgrade still
 * works against an older PWA shell.
 */
export function readPrayedDates(ruleId: RuleId): string[] {
  if (typeof window === "undefined") return [];
  const stored = readJson<string[]>(
    `purify.prayers.${ruleId}.dates`,
    [],
  );
  if (stored.length > 0) return stored;
  // Legacy migration: derive from `.last` + `.streak`.
  try {
    const lastK = window.localStorage.getItem(
      `purify.prayers.${ruleId}.last`,
    );
    const streakK =
      parseInt(
        window.localStorage.getItem(`purify.prayers.${ruleId}.streak`) ?? "0",
        10,
      ) || 0;
    if (!lastK || streakK <= 0) return [];
    // The legacy `last` key was YYYYMMDD; parse it and walk backwards.
    const y = parseInt(lastK.slice(0, 4), 10);
    const m = parseInt(lastK.slice(4, 6), 10) - 1;
    const d = parseInt(lastK.slice(6, 8), 10);
    if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return [];
    const out: string[] = [];
    for (let i = 0; i < Math.min(streakK, 30); i++) {
      const dt = new Date(Date.UTC(y, m, d - i));
      out.push(ymd(dt));
    }
    out.reverse();
    return out;
  } catch {
    return [];
  }
}

/**
 * Append today to the prayed-dates list, idempotent. Returns the next
 * dates array. Side effect: fires PRAYER_EVENT with the date payload.
 */
export function markRuleCompletedToday(ruleId: RuleId): string[] {
  const today = todayYmd();
  const current = readPrayedDates(ruleId);
  if (current.includes(today)) return current;
  const next = [...current, today].slice(-30);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(
        `purify.prayers.${ruleId}.dates`,
        JSON.stringify(next),
      );
      window.dispatchEvent(
        new CustomEvent(PRAYER_EVENT, { detail: { ruleId, date: today } }),
      );
    } catch {
      /* ignore */
    }
  }
  return next;
}

/**
 * 14-day rhythm series: { date, prayed }[]. Newest last.
 */
export function rhythmFor(ruleId: RuleId, days = 14): { date: string; prayed: boolean }[] {
  const dates = new Set(readPrayedDates(ruleId));
  const out: { date: string; prayed: boolean }[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = ymd(d);
    out.push({ date: key, prayed: dates.has(key) });
  }
  return out;
}

/** Number of days since this rule was last prayed; null if never. */
export function daysSinceLast(ruleId: RuleId): number | null {
  const dates = readPrayedDates(ruleId);
  if (dates.length === 0) return null;
  const last = dates[dates.length - 1];
  const lastDate = new Date(last + "T00:00:00");
  const today = new Date(todayYmd() + "T00:00:00");
  const diff = Math.floor(
    (today.getTime() - lastDate.getTime()) / 86_400_000,
  );
  return Math.max(0, diff);
}

// ── Continue Praying (recents) ──────────────────────────────────────────────
// A most-recent-first list of opened prayer rules, deduped by id, capped at
// 12. Powers the "Continue Praying" rail on the hub. Mirrors the reading-hub
// history store but lives under the prayers namespace.

const RECENTS_KEY = "purify.prayers.recents";
const RECENTS_CAP = 12;

export type RecentPrayer = {
  id: RuleId;
  title: string;
  href: string;
  at: number;
};

export function readRecentPrayers(): RecentPrayer[] {
  return readJson<RecentPrayer[]>(RECENTS_KEY, []);
}

export function recordPrayerOpened(entry: Omit<RecentPrayer, "at">) {
  if (typeof window === "undefined") return;
  const list = readRecentPrayers().filter((r) => r.id !== entry.id);
  list.unshift({ ...entry, at: Date.now() });
  writeJson(RECENTS_KEY, list.slice(0, RECENTS_CAP), RECENTS_EVENT);
}

/** Clear the Continue-Praying recents log. */
export function clearRecentPrayers() {
  if (typeof window === "undefined") return;
  writeJson(RECENTS_KEY, [], RECENTS_EVENT);
}

export function useRecentPrayers(): RecentPrayer[] {
  const raw = useSyncExternalStore(
    subscribeRecents,
    () => JSON.stringify(readRecentPrayers()),
    () => JSON.stringify([]),
  );
  try {
    return JSON.parse(raw) as RecentPrayer[];
  } catch {
    return [];
  }
}

function subscribeRecents(cb: () => void): () => void {
  if (typeof window === "undefined") return EMPTY_SUBSCRIBE();
  window.addEventListener(RECENTS_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(RECENTS_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

// ── Intentions (diptychs) ───────────────────────────────────────────────────

export type Intention = {
  id: string;
  name: string;
  relationship?: string;
  note?: string;
  nameday?: string; // MM-DD
  repose?: string; // YYYY-MM-DD (departed only)
  tags?: string[];
  addedAt: string; // ISO timestamp
};

export type IntentionKind = "living" | "departed";

export function readIntentions(kind: IntentionKind): Intention[] {
  return readJson<Intention[]>(`purify.intentions.${kind}`, []);
}

export function writeIntentions(kind: IntentionKind, items: Intention[]) {
  writeJson(`purify.intentions.${kind}`, items, INTENTIONS_EVENT);
}

export function upsertIntention(kind: IntentionKind, item: Intention) {
  const list = readIntentions(kind);
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx >= 0) {
    list[idx] = item;
  } else {
    list.unshift(item);
  }
  writeIntentions(kind, list);
}

export function deleteIntention(kind: IntentionKind, id: string) {
  const list = readIntentions(kind).filter((x) => x.id !== id);
  writeIntentions(kind, list);
}

/**
 * The days after a falling asleep that the Church keeps with prayer for the
 * departed: the third, the ninth and the fortieth, the day itself counted
 * as the first (1.8, memorial days).
 */
export const MEMORIAL_DAYS = [3, 9, 40] as const;
export type MemorialDay = (typeof MEMORIAL_DAYS)[number];

const DAY_MS = 86_400_000;

/** A local calendar day as a count of days, so two days subtract cleanly. */
function dayNumber(y: number, m: number, d: number): number {
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

/** Which memorial day `today` is for a repose date (YYYY-MM-DD), or null. Pure. */
export function memorialDayOf(repose: string, today: Date = new Date()): MemorialDay | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(repose);
  if (!m) return null;
  const since = dayNumber(today.getFullYear(), today.getMonth() + 1, today.getDate()) - dayNumber(+m[1], +m[2], +m[3]);
  return MEMORIAL_DAYS.find((day) => day === since + 1) ?? null;
}

/**
 * The Saturdays of the Souls in a year, as local YYYY-MM-DD: Meatfare
 * Saturday, the second, third and fourth Saturdays of Great Lent, and the
 * Saturday before Pentecost. All hang on Pascha, which both calendars keep
 * on the same civil day, so they are the same for every reader. Pure.
 */
export function soulSaturdays(year: number): string[] {
  const pascha = orthodoxPascha(year);
  return [-57, -36, -29, -22, 48].map((offset) => {
    const d = new Date(pascha.getTime() + offset * DAY_MS);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  });
}

/** Whether a local day is a Saturday of the Souls. Pure. */
export function isSoulSaturday(today: Date = new Date()): boolean {
  const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return soulSaturdays(today.getFullYear()).includes(key);
}

/**
 * Today's surfacing on Today and /prayers/today. Returns:
 *   - living entries whose `nameday` MM-DD matches today
 *   - departed entries whose `repose` MM-DD matches today (yearly anniversary)
 *   - departed entries on their third, ninth or fortieth day (1.8)
 *   - whether today is a Saturday of the Souls, with the departed to pray for (1.8)
 */
export function intentionsForToday(now: Date = new Date()): {
  namedays: Intention[];
  anniversaries: { entry: Intention; years: number }[];
  memorials: { entry: Intention; day: MemorialDay }[];
  soulSaturday: { departed: Intention[] } | null;
} {
  const today = mmdd(now);
  const todayYear = now.getFullYear();
  const living = readIntentions("living");
  const departed = readIntentions("departed");
  const namedays = living.filter((i) => i.nameday === today);
  const anniversaries = departed
    .filter((i) => i.repose && i.repose.slice(5) === today)
    .map((entry) => {
      const reposeYear = parseInt(entry.repose!.slice(0, 4), 10);
      const years = todayYear - reposeYear;
      return { entry, years };
    })
    // The day itself is not an anniversary.
    .filter(({ years }) => years >= 1);
  const memorials = departed.flatMap((entry) => {
    const day = entry.repose ? memorialDayOf(entry.repose, now) : null;
    return day ? [{ entry, day }] : [];
  });
  return { namedays, anniversaries, memorials, soulSaturday: isSoulSaturday(now) ? { departed } : null };
}

// ── Sessions from the retired prayer rope ───────────────────────────────────
//
// The digital prayer rope came down in 1.6, on the owner's decision of
// 2026-10-10. Its screen, its settings and everything that wrote a session
// went with it, and nothing new is recorded.
//
// What a reader already recorded is still theirs. Nothing here deletes
// `purify.rope.sessions` or `purify.rope.settings` from a device, and
// readRopeSessions() stays so lib/prayers/sync.ts can still carry a device's
// sessions up to the reader's own account, the one place they could be handed
// back from. Nothing displays them and nothing adds them up.

export type RopeSession = {
  id: string;
  startedAt: string; // ISO
  knots: number;
  line: string;
};

export function readRopeSessions(): RopeSession[] {
  return readJson<RopeSession[]>("purify.rope.sessions", []);
}

// ── React hook helpers ──────────────────────────────────────────────────────

const SERVER_EMPTY: string[] = [];
const EMPTY_SUBSCRIBE = () => () => {};

export function useRhythm(ruleId: RuleId, days = 14) {
  return useSyncExternalStore(
    subscribePrayer,
    () => JSON.stringify(rhythmFor(ruleId, days)),
    () => JSON.stringify([]),
  );
}

export function useTodayDone(ruleId: RuleId): string[] {
  const raw = useSyncExternalStore(
    subscribePrayer,
    () => JSON.stringify(readTodayDone(ruleId)),
    () => JSON.stringify(SERVER_EMPTY),
  );
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return SERVER_EMPTY;
  }
}

export function useIntentions(kind: IntentionKind): Intention[] {
  const raw = useSyncExternalStore(
    subscribeIntentions,
    () => JSON.stringify(readIntentions(kind)),
    () => JSON.stringify([]),
  );
  try {
    return JSON.parse(raw) as Intention[];
  } catch {
    return [];
  }
}

function subscribePrayer(cb: () => void): () => void {
  if (typeof window === "undefined") return EMPTY_SUBSCRIBE();
  window.addEventListener(PRAYER_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(PRAYER_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

function subscribeIntentions(cb: () => void): () => void {
  if (typeof window === "undefined") return EMPTY_SUBSCRIBE();
  window.addEventListener(INTENTIONS_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(INTENTIONS_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

// ── Tiny uuid for client-side ids ───────────────────────────────────────────
export function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // RFC4122 v4 fallback for older browsers.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
