"use client";

import { countPlanBegun, countPlanFinished } from "@/lib/analytics/featureCount";
import { useSyncExternalStore } from "react";

import { markKept, strandKey } from "@/lib/rhythm/marks";
import { todayKey, type DayKey } from "@/lib/rhythm/dayKey";

import { getPlan, type ReadingPlan } from "./plans";

/**
 * Where a reader is in each reading plan (lib/plans/plans.ts).
 *
 * On the device, in one localStorage entry. A finished day is also kept under
 * the plan's daily-rhythm strand (`day:reading`, `day:gospel`,
 * lib/rhythm/marks.ts), which is synced and feeds the rhythm row, so the
 * streak a plan builds is the reader's one streak, not a second one.
 */

export type PlanProgress = {
  startedOn: DayKey;
  /** Day index (0-based) to the civil day it was read on. */
  done: Record<string, DayKey>;
  /**
   * When the plan last changed on this device, Date.now() (1.9), so the
   * newer copy wins when progress comes from another device
   * (lib/sync/kept.ts). Progress kept before 1.9 has none, and is older than
   * anything that has.
   */
  at?: number;
};
export type PlansState = Record<string, PlanProgress>;

const KEY = "purify:plans";
const EVENT = "purify:plans";
/**
 * When each plan was last started over on this device (1.9), so a plan
 * started over here is not handed back by another device that still has the
 * old progress.
 */
const RESET_KEY = "purify:plans.reset";

/** The window event a change to the plans sends; `detail.source` is "sync" for what another device sent. */
export const PLANS_EVENT = EVENT;

function read(): PlansState {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};
    return parsed && typeof parsed === "object" ? (parsed as PlansState) : {};
  } catch {
    return {};
  }
}

function write(state: PlansState, source?: "sync"): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent(EVENT, source ? { detail: { source } } : undefined));
  } catch {
    /* storage blocked: the plan simply does not remember */
  }
}

/** When each plan was last started over here. */
export function readPlanResets(): Record<string, number> {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RESET_KEY) ?? "{}") as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, number> = {};
    for (const [id, at] of Object.entries(parsed)) if (typeof at === "number" && Number.isFinite(at)) out[id] = at;
    return out;
  } catch {
    return {};
  }
}

function writeResets(resets: Record<string, number>): void {
  try {
    window.localStorage.setItem(RESET_KEY, JSON.stringify(resets));
  } catch {
    /* kept for as long as the page is */
  }
}

/**
 * The 1.9 counts (admin A5, lib/analytics/featureCount.ts): a plan begun and a
 * plan finished, each once per plan on a device, so starting over does not
 * count it twice. Only what the reader does here: the sync's writes go round.
 */
const COUNTED_KEY = "purify:count.plans";

function countOnce(what: "begun" | "finished", planId: string, send: (planId: string) => void): void {
  try {
    const counted = JSON.parse(window.localStorage.getItem(COUNTED_KEY) ?? "{}") as Partial<Record<"begun" | "finished", string[]>>;
    const list = Array.isArray(counted[what]) ? counted[what] : [];
    if (list.includes(planId)) return;
    window.localStorage.setItem(COUNTED_KEY, JSON.stringify({ ...counted, [what]: [...list, planId] }));
  } catch {
    return;
  }
  send(planId);
}

export function startPlan(id: string, today: DayKey = todayKey()): void {
  const state = read();
  if (state[id]) return;
  write({ ...state, [id]: { startedOn: today, done: {}, at: Date.now() } });
  countOnce("begun", id, countPlanBegun);
}

export function resetPlan(id: string): void {
  const state = read();
  delete state[id];
  writeResets({ ...readPlanResets(), [id]: Date.now() });
  write(state);
}

/** Everything a plan keeps, for another device: the progress and the plans started over (lib/sync/kept.ts). */
export function readPlansForSync(): { plans: PlansState; resets: Record<string, number> } {
  return { plans: read(), resets: readPlanResets() };
}

/** Put in place what the sync merged; marked as the sync's, so it is not sent back. */
export function writePlansFromSync(plans: PlansState, resets: Record<string, number>): void {
  writeResets(resets);
  write(plans, "sync");
}

/** Mark a day read (today), and keep today under the plan's strand. */
export function completeDay(plan: ReadingPlan, index: number, today: DayKey = todayKey()): void {
  const state = read();
  const current = state[plan.id] ?? { startedOn: today, done: {} };
  const done = { ...current.done, [String(index)]: today };
  write({ ...state, [plan.id]: { ...current, done, at: Date.now() } });
  markKept(strandKey(plan.strand), today);
  // The whole plan read: kept once more under `plan:<id>`, which syncs with
  // the rest of the day marks into prayer_completions, and is what the
  // Psalter and Four Gospels badges are read from (lib/profile/earned.ts).
  if (plan.days.every((_, i) => done[String(i)])) {
    markKept(planDoneKey(plan.id), today);
    countOnce("finished", plan.id, countPlanFinished);
  }
}

/** The mark a finished plan leaves, e.g. `plan:psalter`. */
export function planDoneKey(planId: string): string {
  return `plan:${planId}`;
}

export function uncompleteDay(planId: string, index: number): void {
  const state = read();
  const current = state[planId];
  if (!current) return;
  const done = { ...current.done };
  delete done[String(index)];
  write({ ...state, [planId]: { ...current, done, at: Date.now() } });
}

/** The first day not yet read, or null when the plan is finished. */
export function nextDay(plan: ReadingPlan, progress: PlanProgress | undefined): number | null {
  for (let i = 0; i < plan.days.length; i += 1) if (!progress?.done[String(i)]) return i;
  return null;
}

/** A civil day `by` days from `key`. */
function step(key: DayKey, by: number): DayKey {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + by);
  return d.toISOString().slice(0, 10);
}

/** How many plan days were read on each civil day, across every plan. */
function readsByDay(state: PlansState): Map<DayKey, number> {
  const count = new Map<DayKey, number>();
  for (const p of Object.values(state)) for (const d of Object.values(p.done)) count.set(d, (count.get(d) ?? 0) + 1);
  return count;
}

/** The days in a row ending at `anchor`, with every missed day caught up as below. */
function rowFrom(count: Map<DayKey, number>, anchor: DayKey): number {
  let cursor = anchor;
  let n = 0;
  let credit = 0;
  for (;;) {
    const read = count.get(cursor) ?? 0;
    if (read > 0) {
      n += 1;
      credit += read - 1;
      cursor = step(cursor, -1);
      continue;
    }
    // A run of missed days: caught up if the days read beyond one a day
    // after it cover all of it, and reading stands before it.
    let gap = 0;
    let before = cursor;
    while (gap <= credit && (count.get(before) ?? 0) === 0) {
      gap += 1;
      before = step(before, -1);
    }
    if (n === 0 || gap > credit || (count.get(before) ?? 0) === 0) return n;
    credit -= gap;
    n += gap;
    cursor = before;
  }
}

/**
 * Days in a row, ending today or yesterday, on which the reader read at least
 * one day of any plan. Yesterday counts, so a streak does not break at dawn
 * before today's reading. Civil days, like every mark (lib/rhythm/dayKey.ts).
 *
 * A missed day is not a broken streak once it is caught up (1.9, s4-05 of
 * docs/1.9-build/ideas.json: "a missed day offers catch up ... never a broken
 * streak"): each plan day read beyond the first on a day covers one missed
 * day before it, between days of reading. Mon read, Tue missed, Wed two read:
 * three days in a row.
 */
export function planStreak(state: PlansState, today: DayKey = todayKey()): number {
  const count = readsByDay(state);
  return rowFrom(count, count.has(today) ? today : step(today, -1));
}

/**
 * Yesterday missed, with reading before it: how many days in a row there
 * will be once yesterday's reading is read with today's (the plans' offer
 * to catch up). Null when there is nothing to catch up.
 */
export function catchUp(state: PlansState, today: DayKey = todayKey()): number | null {
  const count = readsByDay(state);
  const yesterday = step(today, -1);
  if ((count.get(yesterday) ?? 0) > 0 || (count.get(today) ?? 0) >= 2) return null;
  if ((count.get(step(today, -2)) ?? 0) === 0) return null;
  const caught = new Map(count);
  caught.set(today, 2);
  return rowFrom(caught, today);
}

export function isPlanId(id: string): boolean {
  return Boolean(getPlan(id));
}

// ── The live state ───────────────────────────────────────────────────────

let cache: { raw: string | null; state: PlansState } | null = null;
const EMPTY: PlansState = {};

function snapshot(): PlansState {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  if (!cache || cache.raw !== raw) cache = { raw, state: read() };
  return cache.state;
}

function subscribe(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function usePlans(): PlansState {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}
