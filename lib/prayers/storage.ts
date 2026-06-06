"use client";

// Single source of truth for every prayer-feature localStorage key.
//
// Every read uses a try/catch (private mode, blocked storage, quota
// errors) and every write dispatches a CustomEvent so React subscribers
// (PrayerRuleReader, RhythmStrip, ProfileStats, the rope screen) update
// without a refresh. The event names follow the existing convention
// (`purify:prayer-completed`, `purify:rope`, `purify:intentions`).
//
// LocalStorage keys:
//   purify.prayers.{ruleId}.dates       JSON string[]    last 30 days the rule was completed
//   purify.prayers.{ruleId}.today       JSON string[]    today's per-prayer done ids
//   purify.prayers.{ruleId}.streak      string           LEGACY — kept for downgrade safety
//   purify.prayers.{ruleId}.last        string           LEGACY
//   purify.intentions.living            JSON Intention[]
//   purify.intentions.departed          JSON Intention[]
//   purify.rope.sessions                JSON RopeSession[]
//   purify.rope.settings                JSON RopeSettings

import { useSyncExternalStore } from "react";

export const PRAYER_EVENT = "purify:prayer-completed";
export const INTENTIONS_EVENT = "purify:intentions";
export const ROPE_EVENT = "purify:rope";
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
 * Today's surfacing on /prayers/today. Returns:
 *   - living entries whose `nameday` MM-DD matches today
 *   - departed entries whose `repose` MM-DD matches today (yearly anniversary)
 */
export function intentionsForToday(): {
  namedays: Intention[];
  anniversaries: { entry: Intention; years: number }[];
} {
  const today = mmdd();
  const todayYear = new Date().getFullYear();
  const living = readIntentions("living");
  const departed = readIntentions("departed");
  const namedays = living.filter((i) => i.nameday === today);
  const anniversaries = departed
    .filter((i) => i.repose && i.repose.slice(5) === today)
    .map((entry) => {
      const reposeYear = parseInt(entry.repose!.slice(0, 4), 10);
      const years = todayYear - reposeYear;
      return { entry, years };
    });
  return { namedays, anniversaries };
}

// ── Prayer rope (chotki) ────────────────────────────────────────────────────

export type RopeSession = {
  id: string;
  startedAt: string; // ISO
  knots: number;
  line: string;
};

export type RopeSettings = {
  knotCount: 33 | 50 | 100;
  line: string;
  haptics: boolean;
  bell: boolean;
};

export const DEFAULT_ROPE_SETTINGS: RopeSettings = {
  knotCount: 100,
  line: "Lord Jesus Christ, Son of God, have mercy on me, a sinner.",
  haptics: false,
  bell: false,
};

export function readRopeSettings(): RopeSettings {
  return {
    ...DEFAULT_ROPE_SETTINGS,
    ...readJson<Partial<RopeSettings>>("purify.rope.settings", {}),
  };
}

export function writeRopeSettings(settings: RopeSettings) {
  writeJson("purify.rope.settings", settings, ROPE_EVENT);
}

export function readRopeSessions(): RopeSession[] {
  return readJson<RopeSession[]>("purify.rope.sessions", []);
}

export function appendRopeSession(session: RopeSession) {
  const list = readRopeSessions();
  list.push(session);
  writeJson("purify.rope.sessions", list.slice(-500), ROPE_EVENT);
}

export function ropeStats(): {
  yearKnots: number;
  weekKnots: number;
  yearSessions: number;
} {
  const sessions = readRopeSessions();
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1).getTime();
  const weekStart = now.getTime() - 7 * 86_400_000;
  let yearKnots = 0;
  let weekKnots = 0;
  let yearSessions = 0;
  for (const s of sessions) {
    const t = new Date(s.startedAt).getTime();
    if (t >= yearStart) {
      yearKnots += s.knots;
      yearSessions++;
    }
    if (t >= weekStart) weekKnots += s.knots;
  }
  return { yearKnots, weekKnots, yearSessions };
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

export function useRopeSettings(): RopeSettings {
  const raw = useSyncExternalStore(
    subscribeRope,
    () => JSON.stringify(readRopeSettings()),
    () => JSON.stringify(DEFAULT_ROPE_SETTINGS),
  );
  try {
    return JSON.parse(raw) as RopeSettings;
  } catch {
    return DEFAULT_ROPE_SETTINGS;
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

function subscribeRope(cb: () => void): () => void {
  if (typeof window === "undefined") return EMPTY_SUBSCRIBE();
  window.addEventListener(ROPE_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(ROPE_EVENT, cb);
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
