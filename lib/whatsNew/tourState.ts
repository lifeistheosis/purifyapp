// Who is offered a release's tour, and what the device keeps of it (1.8, the
// owner's note 49 of build 80). The tour itself is ./tour.ts.
//
// WHO. On the first open of a version that has a tour, a reader who had an
// earlier version, or who is signed in. Never a new install: they get the
// onboarding (lib/onboarding/state.ts), which is their introduction. And never
// in the middle of the onboarding: an updater whom the onboarding is asking
// again is offered the tour on a later open, not on top of the questions.
//
// "Had an earlier version" is read from what an earlier build left on the
// device, because this build is the first to look:
//   - purify:whatsNewSeen, the last release whose notes this device opened
//     (./version.ts, ./seenStore.ts), any value at all;
//   - purify:onboarded, the onboarding finished on an earlier open, any
//     version of it (a new install finishes it after its first open, and by
//     then its first open has been marked "new", below);
//   - a signed-in account.
// None of the three on the first open is a new install. That open is marked
// "new" for this release at once, so the tour is never offered on a later
// open of the same release, however much the reader has done by then.
//
// WHAT IS KEPT, per release, on the device only (purify:tour, a small JSON
// object): "new" (installed on this release), "seen" (the pop-up was shown),
// "skipped", "finished". A mark only ever rises in that order, so taking the
// tour again from What's New and skipping it does not undo a finished one.
//
// ONE UPDATE SCREEN. The pop-up is the update's one screen: showing it marks
// the release's notes seen, so the bell in the tab bar does not light for the
// same release (./seenStore.ts), and a reader who has already opened What's
// New for this release on this open is not offered the pop-up after it. The
// store's "a new version is available" sheet (components/update/UpdateBridge)
// and the pop-up share one claim per open: whichever comes first is the one
// the reader sees, and the other waits for the next open.

import { compareVersions } from "./version";

/** The device's marks, by release: {"1.8": "finished"}. */
export const TOUR_KEY = "purify:tour";

export type TourMark = "new" | "seen" | "skipped" | "finished";

const RANK: Record<TourMark, number> = { new: 0, seen: 1, skipped: 2, finished: 3 };

function isMark(v: unknown): v is TourMark {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(RANK, v);
}

/** The marks as kept, read leniently: anything that is not a mark is left out. */
export function parseMarks(raw: string | null): Record<string, TourMark> {
  if (!raw) return {};
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const out: Record<string, TourMark> = {};
    for (const [version, mark] of Object.entries(value as Record<string, unknown>)) {
      if (isMark(mark)) out[version] = mark;
    }
    return out;
  } catch {
    return {};
  }
}

/** The marks with `version` raised to `mark`, or the same object when it would not rise. */
export function withMark(marks: Record<string, TourMark>, version: string, mark: TourMark): Record<string, TourMark> {
  const before = marks[version];
  if (before && RANK[before] >= RANK[mark]) return marks;
  return { ...marks, [version]: mark };
}

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function storage(): Store | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

/**
 * Whether this device can keep a mark at all. A tour that could not remember
 * being skipped would come back on every open, so where storage is shut
 * (some private windows) it is never offered; Take the tour still works.
 */
export function marksKept(): boolean {
  const s = storage();
  if (!s) return false;
  try {
    const probe = "purify:tour.probe";
    s.setItem(probe, "1");
    s.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export function readTourMark(version: string): TourMark | null {
  const s = storage();
  if (!s) return null;
  try {
    return parseMarks(s.getItem(TOUR_KEY))[version] ?? null;
  } catch {
    return null;
  }
}

/** Raises this release's mark; never lowers it. */
export function writeTourMark(version: string, mark: TourMark): void {
  const s = storage();
  if (!s) return;
  try {
    const marks = parseMarks(s.getItem(TOUR_KEY));
    const next = withMark(marks, version, mark);
    if (next !== marks) s.setItem(TOUR_KEY, JSON.stringify(next));
  } catch {
    /* storage full or shut: the tour simply is not remembered */
  }
}

/** What decides whether this open offers the tour. All of it read on the device. */
export type OfferInput = {
  /** The release has a tour (./tour.ts, tourFor). */
  hasTour: boolean;
  /** This release's mark on the device. */
  mark: TourMark | null;
  /** purify:whatsNewSeen as this open found it. */
  seenVersion: string | null;
  /** This build's version (CURRENT_VERSION). */
  current: string;
  signedIn: boolean;
  /** purify:onboarded holds any version: the onboarding was finished on an earlier open. */
  onboardedBefore: boolean;
  /** The onboarding this build asks is finished (isOnboarded). */
  onboarded: boolean;
  /** The onboarding is under way: resuming across a sign-in, or on screen. */
  midOnboarding: boolean;
  /** Testers mode: an admin seeing Purify as another reader (lib/onboarding/testing.ts). */
  testing: boolean;
  /** marksKept(). */
  storage: boolean;
};

/**
 *   "offer"  show the pop-up when the reader is on the home screen;
 *   "new"    a new install: mark the release "new" and offer nothing;
 *   "wait"   an updater the onboarding has not finished with: nothing yet,
 *            and nothing kept, so a later open decides again;
 *   "none"   nothing to offer.
 */
export type OfferDecision = "offer" | "new" | "wait" | "none";

export function decideOffer(input: OfferInput): OfferDecision {
  if (!input.hasTour || !input.storage || input.testing) return "none";
  if (input.mark) return "none";
  // A device that has opened a later release's notes (or a test that stores
  // one to say "seen", as scripts/export-walk.mjs does): nothing here is new.
  if (input.seenVersion) {
    const order = compareVersions(input.seenVersion, input.current);
    if (order !== null && order > 0) return "none";
  }
  const updater = input.signedIn || input.seenVersion !== null || input.onboardedBefore;
  if (!updater) return "new";
  if (!input.onboarded || input.midOnboarding) return "wait";
  return "offer";
}

// ---------------------------------------------------------------------------
// One update screen per open. Module scope, like UpdateBridge's own once per
// open: it lasts until the app is opened again, and a move between tabs keeps
// it.

let updateScreen: "store" | "tour" | null = null;

/**
 * Asks to be this open's one update screen. True for the first to ask and for
 * it again; false for the other.
 */
export function claimUpdateScreen(kind: "store" | "tour"): boolean {
  if (updateScreen && updateScreen !== kind) return false;
  updateScreen = kind;
  return true;
}

/** Test seam. */
export function resetUpdateScreenForTests(): void {
  updateScreen = null;
}
