// Who is offered the release's tour, and what the device keeps of it (1.8,
// the owner's note 49 of build 80): lib/whatsNew/tourState.ts, and the marks
// each move of the tour leaves (lib/whatsNew/tourStore.ts).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { onboardedBefore } from "@/lib/onboarding/state";
import { IDLE, reduceTour, type TourAction, type TourState } from "../tour";
import {
  TOUR_KEY,
  claimUpdateScreen,
  decideOffer,
  marksKept,
  parseMarks,
  readTourMark,
  resetUpdateScreenForTests,
  withMark,
  writeTourMark,
  type OfferInput,
} from "../tourState";
import { dispatchTour, getTourState, markFor, resetTourForTests } from "../tourStore";
import { CURRENT_VERSION, WHATS_NEW_SEEN_KEY, compareVersions, whatsNewUnseen } from "../version";

function storage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
    map,
  };
}

/** An updater on 1.7.2 opening 1.8 for the first time, onboarded, not signed in. */
const UPDATER: OfferInput = {
  hasTour: true,
  mark: null,
  seenVersion: "1.7.2",
  current: "1.8",
  signedIn: false,
  onboardedBefore: true,
  onboarded: true,
  midOnboarding: false,
  testing: false,
  storage: true,
};

/** A new install on its very first open. */
const NEW_INSTALL: OfferInput = {
  ...UPDATER,
  seenVersion: null,
  onboardedBefore: false,
  onboarded: false,
};

describe("who is offered the tour", () => {
  it("offers it to a reader who had an earlier version", () => {
    expect(decideOffer(UPDATER)).toBe("offer");
  });

  it("knows an earlier version by any one of three signs", () => {
    // The notes of an earlier release opened, and nothing else.
    expect(decideOffer({ ...NEW_INSTALL, seenVersion: "1.7", onboarded: true })).toBe("offer");
    // The onboarding finished on an earlier open, the bell never opened.
    expect(decideOffer({ ...NEW_INSTALL, onboardedBefore: true, onboarded: true })).toBe("offer");
    // Signed in.
    expect(decideOffer({ ...NEW_INSTALL, signedIn: true, onboarded: true })).toBe("offer");
  });

  it("offers it to a reader who opened this release's notes on an earlier build of it", () => {
    // Build 82 of 1.8 had no tour: its readers have seen the notes and not the tour.
    expect(decideOffer({ ...UPDATER, seenVersion: "1.8" })).toBe("offer");
  });

  it("never offers it to a new install, which is marked so a later open does not either", () => {
    expect(decideOffer(NEW_INSTALL)).toBe("new");
    expect(decideOffer({ ...NEW_INSTALL, mark: "new", onboarded: true, onboardedBefore: true })).toBe("none");
  });

  it("never offers it in the middle of the onboarding, and waits without keeping anything", () => {
    expect(decideOffer({ ...UPDATER, midOnboarding: true })).toBe("wait");
    // An updater the onboarding asks again (its version moved on).
    expect(decideOffer({ ...UPDATER, onboarded: false })).toBe("wait");
    expect(decideOffer({ ...UPDATER, signedIn: true, onboarded: false })).toBe("wait");
  });

  it("offers it once: seen, skipped and finished all close it for the release", () => {
    for (const mark of ["seen", "skipped", "finished", "new"] as const) {
      expect(decideOffer({ ...UPDATER, mark }), mark).toBe("none");
    }
  });

  it("offers nothing to a device that has seen a later release, or a test that says so", () => {
    expect(decideOffer({ ...UPDATER, seenVersion: "1.9" })).toBe("none");
    expect(decideOffer({ ...UPDATER, seenVersion: "99" })).toBe("none");
    // Not a version at all still counts as having used Purify.
    expect(decideOffer({ ...NEW_INSTALL, seenVersion: "soon", onboarded: true })).toBe("offer");
  });

  it("offers nothing in Testers mode, where storage is shut, or for a release with no tour", () => {
    expect(decideOffer({ ...UPDATER, testing: true })).toBe("none");
    expect(decideOffer({ ...UPDATER, storage: false })).toBe("none");
    expect(decideOffer({ ...UPDATER, hasTour: false })).toBe("none");
  });
});

describe("versions in order", () => {
  it("reads number by number", () => {
    expect(compareVersions("1.10", "1.9")).toBe(1);
    expect(compareVersions("1.8", "1.8.0")).toBe(0);
    expect(compareVersions("1.7.2", "1.8")).toBe(-1);
    expect(compareVersions("soon", "1.8")).toBeNull();
    // The bell still reads the same through it.
    expect(whatsNewUnseen("1.7.2", "1.8")).toBe(true);
    expect(whatsNewUnseen("99", "1.8")).toBe(false);
    expect(whatsNewUnseen("x", "1.8")).toBe(true);
  });
});

describe("the marks the device keeps", () => {
  it("reads leniently: junk is no mark", () => {
    expect(parseMarks(null)).toEqual({});
    expect(parseMarks("not json")).toEqual({});
    expect(parseMarks("[1,2]")).toEqual({});
    expect(parseMarks('"seen"')).toEqual({});
    expect(parseMarks('{"1.8":"seen","1.7":"maybe","1.6":3}')).toEqual({ "1.8": "seen" });
  });

  it("only ever rise: new, seen, skipped, finished", () => {
    const seen = withMark({}, "1.8", "seen");
    expect(seen).toEqual({ "1.8": "seen" });
    const skipped = withMark(seen, "1.8", "skipped");
    expect(skipped).toEqual({ "1.8": "skipped" });
    const finished = withMark(skipped, "1.8", "finished");
    // Taking the tour again from What's New and skipping it keeps it finished.
    expect(withMark(finished, "1.8", "skipped")).toBe(finished);
    expect(withMark(finished, "1.8", "seen")).toBe(finished);
    // One release's mark leaves another's alone.
    expect(withMark(finished, "1.9", "new")).toEqual({ "1.8": "finished", "1.9": "new" });
  });

  describe("on the device", () => {
    let store: ReturnType<typeof storage>;
    beforeEach(() => {
      store = storage();
      vi.stubGlobal("window", { localStorage: store });
    });
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("keeps one small object, by release", () => {
      expect(readTourMark("1.8")).toBeNull();
      writeTourMark("1.8", "seen");
      writeTourMark("1.8", "finished");
      writeTourMark("1.8", "skipped");
      expect(readTourMark("1.8")).toBe("finished");
      expect(JSON.parse(store.getItem(TOUR_KEY)!)).toEqual({ "1.8": "finished" });
      expect(marksKept()).toBe(true);
      // The probe leaves nothing behind.
      expect([...store.map.keys()]).toEqual([TOUR_KEY]);
    });

    it("survives junk under its key", () => {
      store.setItem(TOUR_KEY, "{oops");
      expect(readTourMark("1.8")).toBeNull();
      writeTourMark("1.8", "new");
      expect(readTourMark("1.8")).toBe("new");
    });

    it("says when nothing can be kept", () => {
      vi.stubGlobal("window", {
        localStorage: {
          getItem: () => null,
          setItem: () => {
            throw new Error("quota");
          },
          removeItem: () => {},
        },
      });
      expect(marksKept()).toBe(false);
      expect(() => writeTourMark("1.8", "seen")).not.toThrow();
    });

    it("reads any finished onboarding as an earlier open", () => {
      expect(onboardedBefore()).toBe(false);
      store.setItem("purify:onboarded", "2");
      expect(onboardedBefore()).toBe(true);
      store.setItem("purify:onboarded", "junk");
      expect(onboardedBefore()).toBe(false);
    });
  });
});

describe("one update screen per open", () => {
  afterEach(() => resetUpdateScreenForTests());

  it("goes to whichever asks first: the tour's pop-up or the store's sheet", () => {
    expect(claimUpdateScreen("tour")).toBe(true);
    expect(claimUpdateScreen("store")).toBe(false);
    expect(claimUpdateScreen("tour")).toBe(true);
    resetUpdateScreenForTests();
    expect(claimUpdateScreen("store")).toBe(true);
    expect(claimUpdateScreen("tour")).toBe(false);
  });
});

describe("what each move of the tour keeps", () => {
  const offer: TourAction = { type: "offer", version: "1.8" };
  const start: TourAction = { type: "start", version: "1.8", origin: { route: "/", via: "offer" } };
  const step = (s: TourState, a: TourAction) => markFor(s, reduceTour(s, a), a);

  it("marks the pop-up seen as it shows, and a tour cut short skipped", () => {
    expect(step(IDLE, offer)).toEqual({ version: "1.8", mark: "seen" });
    const offered = reduceTour(IDLE, offer);
    expect(step(offered, { type: "skip" })).toEqual({ version: "1.8", mark: "skipped" });
    // See what's new keeps nothing yet.
    expect(step(offered, start)).toBeNull();
    const lit = reduceTour(reduceTour(offered, start), { type: "found", index: 0 });
    expect(step(lit, { type: "skip" })).toEqual({ version: "1.8", mark: "skipped" });
    expect(step(lit, { type: "next" })).toBeNull();
  });

  it("marks it finished when the end card comes, and keeps nothing more as it closes", () => {
    let s = reduceTour(IDLE, start);
    let mark = null;
    for (let i = 0; i < 9; i++) {
      const a: TourAction = { type: "missing", index: i };
      mark = markFor(s, reduceTour(s, a), a) ?? mark;
      s = reduceTour(s, a);
    }
    expect(s.phase).toBe("end");
    expect(mark).toEqual({ version: "1.8", mark: "finished" });
    expect(step(s, { type: "finish" })).toBeNull();
    expect(step(s, { type: "skip" })).toBeNull();
  });

  describe("through the store", () => {
    let store: ReturnType<typeof storage>;
    beforeEach(() => {
      store = storage();
      vi.stubGlobal("window", { localStorage: store, addEventListener: () => {}, removeEventListener: () => {} });
      resetTourForTests();
    });
    afterEach(() => {
      resetTourForTests();
      vi.unstubAllGlobals();
    });

    it("keeps the mark and puts the bell out when the pop-up shows: one update screen", () => {
      store.setItem(WHATS_NEW_SEEN_KEY, "1.7.2");
      dispatchTour(offer);
      expect(getTourState().phase).toBe("offer");
      expect(readTourMark("1.8")).toBe("seen");
      expect(store.getItem(WHATS_NEW_SEEN_KEY)).toBe(CURRENT_VERSION);
      expect(whatsNewUnseen(store.getItem(WHATS_NEW_SEEN_KEY))).toBe(false);
      dispatchTour({ type: "skip" });
      expect(getTourState()).toBe(IDLE);
      expect(readTourMark("1.8")).toBe("skipped");
    });

    it("keeps nothing for a move that changes nothing", () => {
      dispatchTour({ type: "next" });
      expect(store.getItem(TOUR_KEY)).toBeNull();
    });
  });
});
