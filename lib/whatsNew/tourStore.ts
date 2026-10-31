// The tour's state, shared by the host that offers it (components/whats-new/
// tour/TourHost.tsx), the layer that runs it (TourLayer.tsx) and What's New's
// Take the tour row, read through useSyncExternalStore. The moves are
// ./tour.ts reduceTour; what the device keeps follows from each move, here
// and only here (markFor).

import { useSyncExternalStore } from "react";

import { IDLE, reduceTour, tourFor, type TourAction, type TourOrigin, type TourState } from "./tour";
import { markWhatsNewSeen } from "./seenStore";
import { writeTourMark, type TourMark } from "./tourState";
import { CURRENT_VERSION } from "./version";

let state: TourState = IDLE;
const listeners = new Set<() => void>();

export function getTourState(): TourState {
  return state;
}

export function subscribeTour(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

/**
 * The mark a move leaves on the device, or null: the pop-up shown is "seen",
 * the end card reached is "finished", a tour cut short (Skip, Escape,
 * Android's back, leaving the page) is "skipped". Closing the end card leaves
 * nothing more: the tour was finished.
 */
export function markFor(before: TourState, after: TourState, action: TourAction): { version: string; mark: TourMark } | null {
  if (after.phase === "offer" && before.phase !== "offer") return { version: after.version, mark: "seen" };
  if (after.phase === "end" && before.phase !== "end") return { version: after.version, mark: "finished" };
  if (action.type === "skip" && (before.phase === "offer" || before.phase === "step")) {
    return { version: before.version, mark: "skipped" };
  }
  return null;
}

export function dispatchTour(action: TourAction): void {
  const before = state;
  const after = reduceTour(before, action);
  if (after === before) return;
  state = after;
  const mark = markFor(before, after, action);
  if (mark) writeTourMark(mark.version, mark.mark);
  // The pop-up is the update's one screen: the bell does not light for the
  // same release once it has been shown (lib/whatsNew/tourState.ts). The
  // build's own version, as the bell reads it: a patch's, not its release's.
  if (after.phase === "offer" && before.phase !== "offer") markWhatsNewSeen(CURRENT_VERSION);
  listeners.forEach((cb) => cb());
}

/** The pop-up, for the release `version` belongs to. */
export function offerTour(version: string): void {
  const tour = tourFor(version);
  if (tour) dispatchTour({ type: "offer", version: tour.version });
}

/** See what's new, or Take the tour: the first step. */
export function startTour(version: string, origin: TourOrigin): void {
  const tour = tourFor(version);
  if (tour) dispatchTour({ type: "start", version: tour.version, origin });
}

export function skipTour(): void {
  dispatchTour({ type: "skip" });
}

export function useTour(): TourState {
  return useSyncExternalStore(subscribeTour, getTourState, () => IDLE);
}

/** Test seam. */
export function resetTourForTests(): void {
  state = IDLE;
  listeners.clear();
}
