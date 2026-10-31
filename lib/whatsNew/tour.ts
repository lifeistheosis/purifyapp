// The guided tour of what a release brings (1.8, the owner's note 49 of build
// 80): "users who are already signed in also whoever updates their app gets
// animated pop up on their screen referring to the new update and they can
// click see whats new and it guides you through the app highlighting what is
// new etc and they can click skip to cancel the guided updated explaining
// mode".
//
// This file is the tour as data, and the arithmetic of moving through it.
// Who is offered it, and what the device keeps, is ./tourState.ts. The store
// the screens share is ./tourStore.ts. The layer that moves between screens
// and lights each element is components/whats-new/tour/TourLayer.tsx, and
// its look is components/whats-new/tour/TourLook.tsx with the "tour-" rules
// in app/globals.css: the look can be replaced without touching any of this.
//
// A STEP names a page, an element on it and two catalog keys. The element is
// the one carrying data-tour="<target>". The tour goes to the page with the
// app's own client navigation (so the export and the apps move offline), waits
// for the element, and lights it. It waits for the page rather than for a
// clock: while the page is still arriving (its skeleton, its parts drawn one
// after another) the tour waits, and only a page that has come and gone still
// without the element (a screen not in this build, or one not drawn for this
// reader) is passed over, so the tour is never stuck on it
// (./tourDom.ts, lookVerdict).
//
// No React and no DOM here, so all of it is tested in node
// (lib/whatsNew/__tests__/tour.test.ts).

import { featureRelease } from "./version";

/** The attribute that marks what a step lights: data-tour="<target>". */
export const TOUR_ATTR = "data-tour";

export type TourStep = {
  /** Unique in its tour, and the name the pop-up's highlights use. */
  id: string;
  /**
   * The page the step lives on, as the app's own address ("/theology"). Null
   * for something drawn on every page (a player): it is looked for on the
   * page the reader is already on.
   */
  route: string | null;
  /** The element to light: the one carrying data-tour="<target>". */
  target: string;
  /** Catalog keys: a title, and the stop's one line of the story. */
  title: string;
  body: string;
  /**
   * The lit element takes taps while the step is shown, so the reader can try
   * it (Community's switch). Only for an element that stays on its page when
   * used: a tap that leaves the page ends the tour.
   */
  tryIt?: boolean;
  /**
   * Its screen is being built beside the tour and its element is not marked
   * yet. The tour passes over it without looking, and the pop-up does not
   * name it. lib/whatsNew/__tests__/tour.test.ts holds this true: a step
   * whose data-tour is placed must lose it in the same commit.
   */
  awaiting?: true;
};

export type Tour = {
  /** The release it belongs to, "1.8". Its patches (1.8.1) share it. */
  version: string;
  /** The pop-up's name and its one line, catalog keys. */
  name: string;
  line: string;
  /** Two or three step ids the pop-up names under its line. */
  highlights: readonly string[];
  steps: readonly TourStep[];
};

/**
 * 1.8, told as the story of 1.8 (the owner's pick B of sheet r3-14,
 * 2026-10-31): the eight stops the sheet draws, in its order, each a page of
 * the story. One search, the saint web, Community's two rooms, the New
 * Testament read aloud, the Theology path, the atlas, a saint's words as a
 * picture, and Settings. Chants are left out until their rights are settled,
 * as the sheet leaves them out; the player's pill is told within the New
 * Testament's page, as the sheet tells it, so no stop depends on something
 * playing.
 *
 * `body` is the stop's line of the story (tour.story.*), and the title page
 * names the first three, as the sheet's title page does.
 */
const TOUR_1_8: Tour = {
  version: "1.8",
  name: "whatsnew.highlights.eyebrow",
  line: "whatsnew.highlights.title",
  highlights: ["search", "saint-web", "community"],
  steps: [
    {
      id: "search",
      route: "/",
      target: "search",
      title: "tour.step.search.title",
      body: "tour.story.search",
    },
    {
      id: "saint-web",
      route: "/saints/john-chrysostom",
      target: "saint-web",
      title: "tour.step.saintWeb.title",
      body: "tour.story.saintWeb",
    },
    {
      id: "community",
      route: "/community",
      target: "community-halves",
      title: "tour.step.community.title",
      body: "tour.story.community",
      tryIt: true,
    },
    {
      id: "listen",
      route: "/bible/matthew/1",
      target: "listen",
      title: "tour.step.listen.title",
      body: "tour.story.listen",
    },
    {
      id: "theology",
      route: "/theology",
      target: "theology-path",
      title: "tour.step.theology.title",
      body: "tour.story.theology",
    },
    { id: "atlas", route: "/history", target: "atlas", title: "history.map.title", body: "tour.story.atlas" },
    {
      id: "quote-picture",
      route: "/",
      target: "quote-picture",
      title: "tour.step.quote.title",
      body: "tour.story.quote",
    },
    {
      id: "settings",
      route: "/settings",
      target: "settings-panels",
      title: "tour.step.settings.title",
      body: "tour.story.settings",
    },
  ],
};

/** Every release that has a tour, newest first. */
export const TOURS: readonly Tour[] = [TOUR_1_8];

/** The tour of the release `version` belongs to, or null when it has none. */
export function tourFor(version: string): Tour | null {
  const release = featureRelease(version.trim());
  return TOURS.find((t) => t.version === release) ?? null;
}

/** How many of what the release brings the pop-up names. */
export const HIGHLIGHTS_MIN = 2;
export const HIGHLIGHTS_MAX = 3;

/**
 * The steps the pop-up names: its highlights, in their order, but never a
 * step still awaiting its screen, since the pop-up may not promise what the
 * tour then passes over. When fewer than two are left, the tour's other steps
 * fill in, up to three: first those on a page of their own, then those drawn
 * only for some readers (the mini player, with something loaded).
 */
export function highlightSteps(tour: Tour): TourStep[] {
  const ready = tour.steps.filter((s) => !s.awaiting);
  const named = tour.highlights
    .map((id) => ready.find((s) => s.id === id))
    .filter((s): s is TourStep => Boolean(s))
    .slice(0, HIGHLIGHTS_MAX);
  if (named.length >= HIGHLIGHTS_MIN) return named;
  const fill = [...ready.filter((s) => s.route !== null), ...ready.filter((s) => s.route === null)];
  for (const s of fill) {
    if (named.length >= HIGHLIGHTS_MAX) break;
    if (!named.includes(s)) named.push(s);
  }
  return named;
}

/** The steps passed over from the start: those still awaiting their screens. */
export function awaitingSteps(tour: Tour): number[] {
  return tour.steps.flatMap((s, i) => (s.awaiting ? [i] : []));
}

// ---------------------------------------------------------------------------
// Moving through the steps. The tour only ever moves one step at a time, so
// every step before the one shown has been tried: found, or passed over.

/**
 * The next step to try from `from`, going `dir`, passing over the steps
 * already found missing. Null when there is none that way.
 */
export function stepAfter(from: number, dir: 1 | -1, count: number, missing: readonly number[]): number | null {
  for (let i = from + dir; i >= 0 && i < count; i += dir) {
    if (!missing.includes(i)) return i;
  }
  return null;
}

/**
 * "2 of 8": where the shown step stands among the steps that are there. A
 * step found missing leaves the count, so it reads in order with no gap; the
 * total can only fall, as later steps turn out to be missing.
 */
export function stepCount(index: number, count: number, missing: readonly number[]): { at: number; of: number } {
  const passed = missing.filter((i) => i < index).length;
  return { at: index - passed + 1, of: Math.max(1, count - missing.length) };
}

/** Where the tour was started from, and how: the pop-up, or Take the tour. */
export type TourOrigin = { route: string; via: "offer" | "replay" };

export type TourState =
  | { phase: "idle" }
  /** The pop-up: the release's name, its line, a few highlights, two buttons. */
  | { phase: "offer"; version: string }
  /**
   * A step. Until its element is found the layer is moving to it (going to
   * its page, waiting for the element); once found it is lit, with its words.
   * `shown` is the last step found, whose words stay on the card, quieted,
   * while the tour moves on: a step passed over never shows its words.
   */
  | {
      phase: "step";
      version: string;
      index: number;
      dir: 1 | -1;
      found: boolean;
      shown: number | null;
      missing: readonly number[];
      origin: TourOrigin;
    }
  /** The end card: where to take the tour again. */
  | { phase: "end"; version: string; missing: readonly number[]; origin: TourOrigin };

export type TourAction =
  | { type: "offer"; version: string }
  | { type: "start"; version: string; origin: TourOrigin }
  /** The element of step `index` is on screen. */
  | { type: "found"; index: number }
  /** The element of step `index` did not come, or went: pass over it. */
  | { type: "missing"; index: number }
  | { type: "next" }
  | { type: "back" }
  /** Skip, Escape, Android's back, or the reader leaving the page: it ends. */
  | { type: "skip" }
  /** The end card's Done. */
  | { type: "finish" };

export const IDLE: TourState = { phase: "idle" };

/** Step `index` of a tour, about to be looked for. */
function at(
  version: string,
  index: number,
  dir: 1 | -1,
  missing: readonly number[],
  origin: TourOrigin,
  shown: number | null,
): TourState {
  return { phase: "step", version, index, dir, found: false, shown, missing, origin };
}

/**
 * The tour's one transition. Pure: what the device keeps (./tourState.ts)
 * and what the screen does (the layer) both follow from the state it returns.
 * An action that does not fit the state changes nothing.
 */
export function reduceTour(state: TourState, action: TourAction): TourState {
  switch (action.type) {
    case "offer":
      return state.phase === "idle" && tourFor(action.version) ? { phase: "offer", version: action.version } : state;

    case "start": {
      if (state.phase !== "idle" && state.phase !== "offer") return state;
      const tour = tourFor(action.version);
      if (!tour) return IDLE;
      // A step still awaiting its screen is passed over from the start, and
      // never counted.
      const missing = awaitingSteps(tour);
      const first = stepAfter(-1, 1, tour.steps.length, missing);
      if (first === null) return { phase: "end", version: action.version, missing, origin: action.origin };
      return at(action.version, first, 1, missing, action.origin, null);
    }

    case "found":
      if (state.phase !== "step" || state.index !== action.index || state.found) return state;
      return { ...state, found: true, shown: action.index };

    case "missing": {
      if (state.phase !== "step" || state.index !== action.index) return state;
      const tour = tourFor(state.version);
      const count = tour?.steps.length ?? 0;
      const missing = state.missing.includes(action.index) ? state.missing : [...state.missing, action.index];
      // A lit step whose element went has no words to keep on the card.
      const shown = state.shown === action.index ? null : state.shown;
      const onward = stepAfter(action.index, state.dir, count, missing);
      if (onward !== null) return at(state.version, onward, state.dir, missing, state.origin, shown);
      // Going back and nothing is left behind it: on to the next step there is.
      if (state.dir === -1) {
        const ahead = stepAfter(action.index, 1, count, missing);
        if (ahead !== null) return at(state.version, ahead, 1, missing, state.origin, shown);
      }
      return { phase: "end", version: state.version, missing, origin: state.origin };
    }

    case "next": {
      if (state.phase !== "step" || !state.found) return state;
      const count = tourFor(state.version)?.steps.length ?? 0;
      const onward = stepAfter(state.index, 1, count, state.missing);
      if (onward === null) return { phase: "end", version: state.version, missing: state.missing, origin: state.origin };
      return at(state.version, onward, 1, state.missing, state.origin, state.index);
    }

    case "back": {
      if (state.phase !== "step" || !state.found) return state;
      const count = tourFor(state.version)?.steps.length ?? 0;
      const before = stepAfter(state.index, -1, count, state.missing);
      return before === null ? state : at(state.version, before, -1, state.missing, state.origin, state.index);
    }

    case "skip":
      return state.phase === "idle" ? state : IDLE;

    case "finish":
      return state.phase === "end" ? IDLE : state;
  }
}

/** Whether Back has a step to go to from the one shown. */
export function canGoBack(state: TourState): boolean {
  if (state.phase !== "step") return false;
  const count = tourFor(state.version)?.steps.length ?? 0;
  return stepAfter(state.index, -1, count, state.missing) !== null;
}
