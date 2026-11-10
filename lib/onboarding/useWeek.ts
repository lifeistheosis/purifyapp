"use client";

// The reader's first week (./week.ts) as one live answer: the step waiting
// today, if any. Read by the card on Today (components/onboarding/
// FirstStepsNudge.tsx) and, through ./useDayOne.ts, by the streak's rope,
// which waits while a step is up. Both read it in the same render.

import { useMemo, useSyncExternalStore } from "react";

import { roadsEnabled } from "./flags";
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
import { localDay, parseWeek, stepToday, weekFor, type WeekStep } from "./week";

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
