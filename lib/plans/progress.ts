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
  write({ ...state, [plan.id]: { ...current, done: { ...current.done, [String(index)]: today } } });
  markKept(strandKey(plan.strand), today);
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

/**
 * Days in a row, ending today or yesterday, on which the reader read at least
 * one day of any plan. Yesterday counts, so a streak does not break at dawn
 * before today's reading. Civil days, like every mark (lib/rhythm/dayKey.ts).
 */
export function planStreak(state: PlansState, today: DayKey = todayKey()): number {
  const days = new Set<DayKey>();
  for (const p of Object.values(state)) for (const d of Object.values(p.done)) days.add(d);
  const step = (key: DayKey, by: number): DayKey => {
    const d = new Date(`${key}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + by);
    return d.toISOString().slice(0, 10);
  };
  let cursor = days.has(today) ? today : step(today, -1);
  let n = 0;
  while (days.has(cursor)) {
    n += 1;
    cursor = step(cursor, -1);
  }
  return n;
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
