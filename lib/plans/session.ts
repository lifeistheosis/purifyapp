import { useSyncExternalStore } from "react";

import { localDay } from "@/lib/player/chantAsk";
import { leaveReadingsFlow } from "@/lib/readings/flow";

import { getPlan, type PlanReading, type ReadingPlan } from "./plans";
import { completeDay } from "./progress";

/**
 * A reading plan's day as a session, not a link (1.7, the owner's note 22:
 * "today a plan just sends you to the book and leaves you there").
 *
 * Begin on the plan's page opens the day's first chapter with a bar at its
 * foot (components/plans/PlanFlowBar.tsx): where the reader is in the day,
 * Next to the following chapter (a kathisma is several psalms), and Done
 * after the last. Done keeps the day exactly as "Mark as read" kept it
 * (completeDay: the plan's progress, the rhythm strand, and the plan's badge
 * mark once the whole plan is read) and goes back to the plan's page, which
 * opens on the finish: the questions, the saying, tomorrow.
 *
 * The walk mirrors today's readings (lib/readings/flow.ts): kept for the
 * session and for its day only. Only one walk is ever under way: starting
 * this one leaves today's readings, and starting those leaves this.
 */
export type PlanSession = {
  planId: string;
  /** The plan's day, from 0. */
  day: number;
  items: PlanReading[];
  /** Which of the day's chapters is being read. */
  at: number;
  /** The reader's civil day it was begun on. */
  on: string;
};

/** The day just finished, for the plan's page to open on. */
export type JustFinished = { planId: string; day: number; on: string };

const KEY = "purify:plans.session";
const FINISHED_KEY = "purify:plans.justFinished";
const listeners = new Set<() => void>();
let cache: { raw: string | null; val: PlanSession | null } | null = null;
let finishedCache: { raw: string | null; val: JustFinished | null } | null = null;

export function hrefOfReading(r: PlanReading): string {
  return `/bible/${r.book}/${r.chapter}`;
}

function readRaw(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function read(): PlanSession | null {
  const raw = readRaw(KEY);
  if (cache && cache.raw === raw) return cache.val;
  let val: PlanSession | null = null;
  try {
    const parsed = raw ? (JSON.parse(raw) as PlanSession) : null;
    val = parsed && typeof parsed.planId === "string" && Array.isArray(parsed.items) && parsed.items.length ? parsed : null;
  } catch {
    val = null;
  }
  cache = { raw, val };
  return val;
}

function readFinished(): JustFinished | null {
  const raw = readRaw(FINISHED_KEY);
  if (finishedCache && finishedCache.raw === raw) return finishedCache.val;
  let val: JustFinished | null = null;
  try {
    const parsed = raw ? (JSON.parse(raw) as JustFinished) : null;
    val = parsed && typeof parsed.planId === "string" && Number.isInteger(parsed.day) ? parsed : null;
  } catch {
    val = null;
  }
  finishedCache = { raw, val };
  return val;
}

function store(key: string, value: unknown): void {
  try {
    if (value) window.sessionStorage.setItem(key, JSON.stringify(value));
    else window.sessionStorage.removeItem(key);
  } catch {
    /* no session storage: the walk is just not remembered */
  }
  cache = null;
  finishedCache = null;
  listeners.forEach((l) => l());
}

/** Begin a day: today's readings step aside, and the day's first chapter is the place. */
export function startPlanSession(plan: ReadingPlan, day: number, now: Date = new Date()): PlanSession | null {
  const items = plan.days[day];
  if (!items?.length) return null;
  leaveReadingsFlow();
  const session: PlanSession = { planId: plan.id, day, items: [...items], at: 0, on: localDay(now) };
  store(FINISHED_KEY, null);
  store(KEY, session);
  return session;
}

export function goToPlanReading(at: number): void {
  const s = read();
  if (s) store(KEY, { ...s, at: Math.max(0, Math.min(s.items.length - 1, at)) });
}

/**
 * The last chapter read: the day is kept as "Mark as read" kept it, and the
 * plan's page will open on its finish.
 */
export function finishPlanSession(now: Date = new Date()): JustFinished | null {
  const s = read();
  if (!s) return null;
  const plan = getPlan(s.planId);
  if (plan) completeDay(plan, s.day);
  const done: JustFinished = { planId: s.planId, day: s.day, on: localDay(now) };
  store(KEY, null);
  store(FINISHED_KEY, done);
  return done;
}

export function leavePlanSession(): void {
  if (read()) store(KEY, null);
}

/** The finish has been seen ("Back to the plan"), or another day begun. */
export function clearJustFinished(): void {
  if (readFinished()) store(FINISHED_KEY, null);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The day under way, begun today, or null. */
export function usePlanSession(now?: Date): PlanSession | null {
  const s = useSyncExternalStore(subscribe, read, () => null);
  if (!s) return null;
  return s.on === localDay(now ?? new Date()) ? s : null;
}

/** The day this plan has just finished, today, or null. */
export function useJustFinished(planId: string, now?: Date): JustFinished | null {
  const f = useSyncExternalStore(subscribe, readFinished, () => null);
  if (!f || f.planId !== planId) return null;
  return f.on === localDay(now ?? new Date()) ? f : null;
}

/** For code outside a component (the readings flow, a chapter's controls). */
export function currentPlanSession(now: Date = new Date()): PlanSession | null {
  const s = read();
  return s && s.on === localDay(now) ? s : null;
}
