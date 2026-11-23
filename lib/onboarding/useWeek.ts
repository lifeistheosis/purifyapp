"use client";

// The reader's first week (./week.ts) as one live answer: the step waiting
// today, if any. Read by the card on Today (components/onboarding/
// FirstStepsNudge.tsx) and, through ./useDayOne.ts, by the streak's rope,
// which waits while a step is up. Both read it in the same render.

import { useMemo, useSyncExternalStore } from "react";

import { churchDayOf } from "@/lib/calendar/useChurchDay";
import { useCalendarStyleDefault } from "@/lib/calendar/useCalendarStyleDefault";
import { useTodayAtOnce } from "@/lib/calendar/useToday";

import { leadsIntoDay, stepOnDay } from "./dayStep";
import { dayFrameEnabled, roadsEnabled } from "./flags";
import { leanOf, roadOf, type Road } from "./road";
import {
  ONBOARDING_EVENT,
  isNudgeEligible,
  readBackground,
  readIntent,
  readIntents,
  readLevel,
  readReturning,
  readWeek,
  weekSnapshot,
} from "./state";
import { TESTERS_EVENT } from "./testing";
import { useSpace } from "./useSpace";
import { keptToday, localDay, parseWeek, stepToday, weekFor, type WeekStep } from "./week";

/** The reader's road from what the device holds, or null. */
export function readRoad(): Road | null {
  return roadOf({ background: readBackground(), level: readLevel(), intent: readIntent(), returning: readReturning() });
}

/**
 * Whether a step of the week is up now: the roads on, a reader who came
 * through the questions (never one marked done silently), a road to walk,
 * and a step not yet met today.
 */
export function isWeekStepShown(): boolean {
  if (typeof window === "undefined") return false;
  if (!roadsEnabled() || !isNudgeEligible() || !readRoad()) return false;
  return stepToday(readWeek(), localDay(new Date())) != null;
}

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(ONBOARDING_EVENT, onChange);
  window.addEventListener(TESTERS_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(ONBOARDING_EVENT, onChange);
    window.removeEventListener(TESTERS_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** `${on}|${week}`: the roads and the week as one primitive. Empty on the server and the hydration render. */
function snapshot(): string {
  return `${roadsEnabled() && isNudgeEligible() ? "1" : ""}|${weekSnapshot()}`;
}

export type WeekToday = {
  road: Road;
  /** Today's step, from 0. */
  index: number;
  step: WeekStep;
};

/** Today's step of the reader's week, or null when none is up. */
export function useWeekToday(): WeekToday | null {
  const snap = useSyncExternalStore(subscribe, snapshot, () => "|");
  const { background, level, intent, returning, intents } = useSpace();
  return useMemo(() => {
    const cut = snap.indexOf("|");
    if (snap.slice(0, cut) !== "1") return null;
    const road = roadOf({ background, level, intent, returning });
    if (!road) return null;
    const index = stepToday(parseWeek(snap.slice(cut + 1) || null), localDay(new Date()));
    if (index == null) return null;
    const week = weekFor({ road, lean: leanOf(intent), level, picks: intents.length ? intents : readIntents() });
    return { road, index, step: week[index] };
  }, [snap, background, level, intent, returning, intents]);
}

/** The same, with the day's frame: empty unless the frame is on for this device (./flags.ts). */
function daySnapshot(): string {
  return `${roadsEnabled() && isNudgeEligible() && dayFrameEnabled() ? "1" : ""}|${weekSnapshot()}`;
}

export type WeekDay = {
  road: Road;
  /** The reader's seven steps. Today's is as the day opens it, where it leads into the Church's day (./dayStep.ts). */
  steps: WeekStep[];
  /** Today's step, from 0, while it waits to be kept: null once today's is kept or passed over, or the week is over. */
  waiting: number | null;
  /** The step kept today, from 0, or null. */
  kept: number | null;
};

/**
 * The reader's week as the day's frame reads it (2.0, ./flags.ts): the step
 * waiting today and the step kept today. Null with the frame off, with no
 * road, on the server and on the hydration render, so a reader without the
 * frame has nothing of it drawn.
 */
export function useWeekDay(): WeekDay | null {
  const snap = useSyncExternalStore(subscribe, daySnapshot, () => "|");
  const { background, level, intent, returning, intents } = useSpace();
  // The device's own day and the reader's calendar, for a step that leads into the Church's day.
  // Known in the first frame wherever a page is drawn on the device, and never on the server.
  const churchDay = useTodayAtOnce();
  const [style] = useCalendarStyleDefault();
  return useMemo(() => {
    const cut = snap.indexOf("|");
    if (snap.slice(0, cut) !== "1") return null;
    const road = roadOf({ background, level, intent, returning });
    if (!road) return null;
    const state = parseWeek(snap.slice(cut + 1) || null);
    const today = localDay(new Date());
    const steps = weekFor({ road, lean: leanOf(intent), level, picks: intents.length ? intents : readIntents() });
    const waiting = stepToday(state, today);
    const kept = keptToday(state, today);
    // Only today's step, waiting or kept, and only when it names the day: the Church's day is
    // worked out on two days of a week at most, and on no page of any other day.
    const at = waiting ?? kept;
    if (at != null && churchDay && leadsIntoDay(steps[at])) {
      const day = churchDayOf(churchDay, style);
      const readings = day.readings.length + day.ordinaryReadings.length + day.commemorationReadings.length;
      steps[at] = stepOnDay(steps[at], { readings, saint: day.headlineSaint?.slug ?? null }, steps);
    }
    return { road, steps, waiting, kept };
  }, [snap, background, level, intent, returning, intents, churchDay, style]);
}

