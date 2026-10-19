// Your first Liturgy (1.7): the reader's own plan, kept on the device.
//
// The owner's note 27 of 2026-10-16: a guided way to a first Divine Liturgy
// for an inquirer, which asks what kind of church they are going to, ends in
// a checklist they keep, and puts a reminder on Today for that Sunday. All of
// it is the reader's alone, so it lives in localStorage and never reaches a
// server: no account, no network, nothing to sync.
//
// This file is the small half, on purpose. Today's reminder card and the
// Start here card read the plan through it, and neither should carry the
// guide's words in its script: those are in ./firstLiturgy.ts, which only
// the guide imports.

import { useSyncExternalStore } from "react";

import { dateLocale } from "@/lib/i18n/deviceDates";

/**
 * The kinds of Orthodox parish a reader can choose, in the guide's order. The
 * list is the jurisdictions of the Assembly of Canonical Orthodox Bishops of
 * the United States (./firstLiturgy.ts names the source), each standing for
 * its tradition wherever its parishes are, and "Not sure". No Church that is
 * not in communion with the Orthodox Church is on it (the owner, 2026-10-16).
 */
export const KIND_IDS = [
  "greek",
  "antiochian",
  "oca",
  "russian",
  "serbian",
  "romanian",
  "bulgarian",
  "georgian",
  "ukrainian",
  "carpatho",
  "albanian",
  "unsure",
] as const;
export type KindId = (typeof KIND_IDS)[number];

/** The guide's cards, in order. `when` is skipped by a reader only reading. */
export const STEP_IDS = ["intro", "kind", "when", "before", "arrive", "during", "after", "customs", "ready"] as const;
export type StepId = (typeof STEP_IDS)[number];

/** The checklist the reader keeps, in order. */
export const CHECK_IDS = ["time", "priest", "clothes", "early", "read", "stay"] as const;
export type CheckId = (typeof CHECK_IDS)[number];

/** How many days before the Liturgy its reminder waits on Today. */
export const REMINDER_DAYS = 6;

export type LiturgyPlan = {
  v: 1;
  /** The answer to "Going to your first Liturgy?": null until asked. */
  going: boolean | null;
  kind: KindId | null;
  /** The day, as the reader's own YYYY-MM-DD. */
  date: string | null;
  /** The card the reader is on. */
  step: StepId;
  /** The furthest card reached, as an index of STEP_IDS. */
  furthest: number;
  /** Reached the last card at least once. */
  done: boolean;
  checked: CheckId[];
  /** The day whose reminder the reader put away on Today. */
  hiddenFor: string | null;
};

export const EMPTY_PLAN: LiturgyPlan = Object.freeze({
  v: 1,
  going: null,
  kind: null,
  date: null,
  step: "intro",
  furthest: 0,
  done: false,
  checked: [],
  hiddenFor: null,
}) as LiturgyPlan;

export const LITURGY_PLAN_KEY = "purify:firstLiturgy";
const EVENT = "purify:first-liturgy";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function isKind(v: unknown): v is KindId {
  return typeof v === "string" && (KIND_IDS as readonly string[]).includes(v);
}
function isStep(v: unknown): v is StepId {
  return typeof v === "string" && (STEP_IDS as readonly string[]).includes(v);
}
function isCheck(v: unknown): v is CheckId {
  return typeof v === "string" && (CHECK_IDS as readonly string[]).includes(v);
}

/**
 * A stored plan, read leniently: a field that is missing or malformed is the
 * empty plan's, so an older or hand-edited value never breaks a screen.
 */
export function parsePlan(raw: string | null): LiturgyPlan {
  if (!raw) return EMPTY_PLAN;
  let data: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return EMPTY_PLAN;
    data = parsed as Record<string, unknown>;
  } catch {
    return EMPTY_PLAN;
  }
  const furthest = typeof data.furthest === "number" && Number.isInteger(data.furthest) ? data.furthest : 0;
  return {
    v: 1,
    going: typeof data.going === "boolean" ? data.going : null,
    kind: isKind(data.kind) ? data.kind : null,
    date: typeof data.date === "string" && DAY.test(data.date) ? data.date : null,
    step: isStep(data.step) ? data.step : "intro",
    furthest: Math.min(Math.max(furthest, 0), STEP_IDS.length - 1),
    done: data.done === true,
    checked: Array.isArray(data.checked) ? [...new Set(data.checked.filter(isCheck))] : [],
    hiddenFor: typeof data.hiddenFor === "string" && DAY.test(data.hiddenFor) ? data.hiddenFor : null,
  };
}

// One parsed plan per stored string, so useSyncExternalStore gets the same
// object back until the plan really changes.
let snapRaw: string | null | undefined;
let snapVal: LiturgyPlan = EMPTY_PLAN;

export function readPlan(): LiturgyPlan {
  if (typeof window === "undefined") return EMPTY_PLAN;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(LITURGY_PLAN_KEY);
  } catch {
    return EMPTY_PLAN;
  }
  if (raw === snapRaw) return snapVal;
  snapRaw = raw;
  snapVal = parsePlan(raw);
  return snapVal;
}

/** Changes the plan, and tells every card that shows it. */
export function updatePlan(change: (plan: LiturgyPlan) => LiturgyPlan): LiturgyPlan {
  const next = change(readPlan());
  try {
    window.localStorage.setItem(LITURGY_PLAN_KEY, JSON.stringify(next));
  } catch {
    // A private window keeps nothing: the guide still works, page by page.
  }
  window.dispatchEvent(new Event(EVENT));
  return next;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** The plan, live. The empty plan on the server and in the first render. */
export function useLiturgyPlan(): LiturgyPlan {
  return useSyncExternalStore(subscribe, readPlan, () => EMPTY_PLAN);
}

/** The cards on this reader's way through, in order. */
export function pathFor(plan: Pick<LiturgyPlan, "going">): StepId[] {
  return STEP_IDS.filter((s) => s !== "when" || plan.going !== false);
}

/** The card after `step` on the reader's way, or null after the last. */
export function stepAfter(plan: Pick<LiturgyPlan, "going">, step: StepId): StepId | null {
  const path = pathFor(plan);
  const at = path.indexOf(step);
  return at >= 0 && at < path.length - 1 ? path[at + 1] : null;
}

/** The card before `step` on the reader's way, or null before the first. */
export function stepBefore(plan: Pick<LiturgyPlan, "going">, step: StepId): StepId | null {
  const path = pathFor(plan);
  const at = path.indexOf(step);
  return at > 0 ? path[at - 1] : null;
}

/** Moves the reader to a card, and remembers how far they have come. */
export function goToStep(step: StepId): LiturgyPlan {
  return updatePlan((p) => ({
    ...p,
    step,
    furthest: Math.max(p.furthest, STEP_IDS.indexOf(step)),
    done: p.done || step === "ready",
  }));
}

export function toggleCheck(id: CheckId): LiturgyPlan {
  return updatePlan((p) => ({
    ...p,
    checked: p.checked.includes(id) ? p.checked.filter((c) => c !== id) : CHECK_IDS.filter((c) => c === id || p.checked.includes(c)),
  }));
}

// ---- Days, always the reader's own calendar day, never UTC.

/** A date as the reader's own YYYY-MM-DD. */
export function dayOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** A YYYY-MM-DD as a local Date at midnight. */
export function dateOf(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(day: string, n: number): string {
  const d = dateOf(day);
  return dayOf(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
}

/** Whole days from `from` to `to`; negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return Math.round((dateOf(to).getTime() - dateOf(from).getTime()) / 86_400_000);
}

/**
 * The two Sundays a reader is offered. On a Sunday the first is the day
 * itself ("Today"), on any other day the coming Sunday; the second is the
 * Sunday after it.
 */
export function sundaysFrom(today: string): { first: string; second: string; todayIsSunday: boolean } {
  const weekday = dateOf(today).getDay();
  const first = addDays(today, (7 - weekday) % 7);
  return { first, second: addDays(first, 7), todayIsSunday: weekday === 0 };
}

/**
 * Today's reminder, if one is due: the reader is going, the day is chosen,
 * it is at most REMINDER_DAYS away and not past, and the reader has not put
 * this day's reminder away.
 */
export function reminderFor(plan: LiturgyPlan, today: string): { date: string; daysAway: number } | null {
  if (!plan.date || plan.going === false || plan.hiddenFor === plan.date) return null;
  const daysAway = daysBetween(today, plan.date);
  if (daysAway < 0 || daysAway > REMINDER_DAYS) return null;
  return { date: plan.date, daysAway };
}

/** The first day the reminder shows, for a day still further off. */
export function reminderStarts(date: string): string {
  return addDays(date, -REMINDER_DAYS);
}

/** A chosen day that has not passed, or null. */
export function upcomingDate(plan: Pick<LiturgyPlan, "date">, today: string): string | null {
  return plan.date && daysBetween(today, plan.date) >= 0 ? plan.date : null;
}

/**
 * A day as a reader says it, "Sunday, 19 October", in their language when the
 * device can write it (lib/i18n/deviceDates.ts) and in English when it cannot.
 * Its first letter is a capital, since it stands at the head of a line.
 */
export function formatDay(day: string, locale: string): string {
  const lang = dateLocale(locale);
  const words = new Intl.DateTimeFormat(lang, { weekday: "long", day: "numeric", month: "long" }).format(dateOf(day));
  return words.charAt(0).toLocaleUpperCase(lang) + words.slice(1);
}

// ---- The catalog keys the small cards need without the guide's file.

export function kindNameKey(kind: KindId): string {
  return `start.liturgy.kind.${kind}.name`;
}
