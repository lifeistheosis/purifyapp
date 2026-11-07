"use client";

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
};
export type PlansState = Record<string, PlanProgress>;

const KEY = "purify:plans";
const EVENT = "purify:plans";

function read(): PlansState {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};
    return parsed && typeof parsed === "object" ? (parsed as PlansState) : {};
  } catch {
    return {};
  }
}

function write(state: PlansState): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* storage blocked: the plan simply does not remember */
  }
}

export function startPlan(id: string, today: DayKey = todayKey()): void {
  const state = read();
  if (!state[id]) write({ ...state, [id]: { startedOn: today, done: {} } });
}

export function resetPlan(id: string): void {
  const state = read();
  delete state[id];
  write(state);
}

/** Mark a day read (today), and keep today under the plan's strand. */
export function completeDay(plan: ReadingPlan, index: number, today: DayKey = todayKey()): void {
  const state = read();
  const current = state[plan.id] ?? { startedOn: today, done: {} };
  const done = { ...current.done, [String(index)]: today };
  write({ ...state, [plan.id]: { ...current, done } });
  markKept(strandKey(plan.strand), today);
  // The whole plan read: kept once more under `plan:<id>`, which syncs with
  // the rest of the day marks into prayer_completions, and is what the
  // Psalter and Four Gospels badges are read from (lib/profile/earned.ts).
  if (plan.days.every((_, i) => done[String(i)])) markKept(planDoneKey(plan.id), today);
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
  write({ ...state, [planId]: { ...current, done } });
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
