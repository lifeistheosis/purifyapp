// Attempts kept on the device, and the completion count read from them.
//
// Every attempt is written here first, signed in or not. A signed-in reader's
// attempt is also posted to /api/catechism/attempt; a signed-out reader's
// stays here and only the aggregate counters leave the device. Same idiom as
// lib/onboarding/state.ts: localStorage plus an in-tab event, no hooks, so
// the You tab can read the count without pulling any quiz code with it.

import type { AttemptAnswer, Reckoning } from "./types";

const KEY = "purify:catechism:attempts";

/** Fired in-tab whenever an attempt is written. */
export const CATECHISM_EVENT = "purify:catechism";

/** Keep this many, newest by key; older ones are pruned on write. */
const KEEP = 800;

export type LocalAttempt = {
  id: string;
  date: string;
  reckoning: Reckoning;
  answers: AttemptAnswer[];
  score: number;
  total: number;
  completed_at: string;
  /** True once the server has recorded it. Signed-out attempts stay false. */
  synced: boolean;
};

export function attemptKey(date: string, reckoning: Reckoning): string {
  return `${date}:${reckoning}`;
}

function emit() {
  try {
    window.dispatchEvent(new CustomEvent(CATECHISM_EVENT));
  } catch {
    /* ignore */
  }
}

export function readAttempts(): Record<string, LocalAttempt> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, LocalAttempt>;
  } catch {
    return {};
  }
}

export function readAttempt(date: string, reckoning: Reckoning): LocalAttempt | null {
  const a = readAttempts()[attemptKey(date, reckoning)];
  return a && typeof a === "object" && Array.isArray(a.answers) ? a : null;
}

export function writeAttempt(attempt: LocalAttempt): void {
  if (typeof window === "undefined") return;
  try {
    const all = readAttempts();
    all[attemptKey(attempt.date, attempt.reckoning)] = attempt;
    const keys = Object.keys(all).sort();
    while (keys.length > KEEP) delete all[keys.shift() as string];
    window.localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* private mode: the attempt holds for this page view only */
  }
  emit();
}

export function markSynced(date: string, reckoning: Reckoning): void {
  const a = readAttempt(date, reckoning);
  if (!a || a.synced) return;
  writeAttempt({ ...a, synced: true });
}

/** How many catechisms this device has completed. */
export function completionCount(): number {
  return Object.keys(readAttempts()).length;
}

/** A client-generated attempt id, so a retry never records twice. */
export function newAttemptId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  // RFC 4122 v4 shape from Math.random, for a WebView without crypto.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}
