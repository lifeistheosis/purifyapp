import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ONBOARDING_EVENT,
  ONBOARDING_VERSION,
  accountAnsweredThisVersion,
  clearResumeStage,
  dismissNudge,
  fillSpaceFromAccount,
  isNudgeDismissed,
  isOnboarded,
  markOnboarded,
  markOnboardedSilently,
  parseSpaceSnapshot,
  priorUseDetected,
  readFastingRule,
  readIntent,
  readLevel,
  readResumeStage,
  refreshDayOne,
  setResumeStage,
  shouldShowOnboarding,
  spaceSnapshot,
  wasOnboardedAgain,
  writeFastingRule,
  writeIntent,
  writeLevel,
} from "../state";

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

describe("onboarding state", () => {
  let store: ReturnType<typeof storage>;
  let events: string[];

  beforeEach(() => {
    store = storage();
    events = [];
    vi.stubGlobal("window", {
      localStorage: store,
      dispatchEvent: (e: Event) => {
        events.push(e.type);
        return true;
      },
    });
    vi.stubGlobal("CustomEvent", class extends Event {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads fasting as strict until the reader chooses, which is how it always showed", () => {
    expect(readFastingRule()).toBe("strict");
    writeFastingRule("hidden");
    expect(readFastingRule()).toBe("hidden");
  });

  it("round-trips the three answers through one snapshot string", () => {
    expect(parseSpaceSnapshot(spaceSnapshot())).toEqual({ level: null, intent: null, fasting: "strict" });
    writeLevel("learning");
    writeIntent("liturgy");
    writeFastingRule("modified");
    expect(parseSpaceSnapshot(spaceSnapshot())).toEqual({ level: "learning", intent: "liturgy", fasting: "modified" });
    expect(events).toContain(ONBOARDING_EVENT);
  });

  it("ignores junk in a snapshot rather than trusting it", () => {
    expect(parseSpaceSnapshot("bishop|nap|feast")).toEqual({ level: null, intent: null, fasting: "strict" });
  });

  describe("the account copy", () => {
    it("fills a fresh device and says the account had answered", () => {
      expect(fillSpaceFromAccount({ level: "practicing", intent: "study", fasting: "modified" })).toBe(true);
      expect(readLevel()).toBe("practicing");
      expect(readIntent()).toBe("study");
      expect(readFastingRule()).toBe("modified");
    });

    it("never overwrites an answer given on this device", () => {
      writeLevel("inquirer");
      writeFastingRule("hidden");
      fillSpaceFromAccount({ level: "practicing", intent: "prayer", fasting: "strict" });
      expect(readLevel()).toBe("inquirer");
      expect(readFastingRule()).toBe("hidden");
      // The one it did not have is still taken.
      expect(readIntent()).toBe("prayer");
    });

    it("treats anything without a real level as no answer", () => {
      expect(fillSpaceFromAccount(undefined)).toBe(false);
      expect(fillSpaceFromAccount("practicing")).toBe(false);
      expect(fillSpaceFromAccount({ level: "abbot", intent: "study" })).toBe(false);
      expect(readIntent()).toBeNull();
    });
  });

  describe("who sees the flow", () => {
    it("shows it to a genuinely new visitor", () => {
      expect(shouldShowOnboarding()).toBe(true);
    });

    // 1.5.2: the onboarding begins again for everyone. Until then a device
    // that had been used was marked done without one question being asked,
    // and any earlier version of the flow counted as finished.
    it("asks a reader who has used Purify before, and no longer marks them done", () => {
      store.setItem("purify:calendar.style", "new");
      expect(priorUseDetected()).toBe(true);
      expect(shouldShowOnboarding()).toBe(true);
      expect(isOnboarded()).toBe(false);
      expect(store.getItem("purify:onboarded")).toBeNull();
    });

    it("asks a reader who finished an earlier version", () => {
      for (const earlier of ["1", "2"]) {
        store.setItem("purify:onboarded", earlier);
        expect(isOnboarded()).toBe(false);
        expect(shouldShowOnboarding()).toBe(true);
      }
    });

    it("leaves alone a reader who finished this version, or skipped it", () => {
      markOnboarded();
      expect(store.getItem("purify:onboarded")).toBe(String(ONBOARDING_VERSION));
      expect(isOnboarded()).toBe(true);
      expect(shouldShowOnboarding()).toBe(false);
    });

    it("leaves alone a reader whose account answered this version on another device", () => {
      markOnboardedSilently();
      expect(shouldShowOnboarding()).toBe(false);
    });

    it("resumes mid-flow after a sign-in", () => {
      store.setItem("sb-abc-auth-token", "{}");
      setResumeStage("assessment");
      expect(readResumeStage()).toBe("assessment");
      expect(shouldShowOnboarding()).toBe(true);
      // The stage alone is not what asks: with it cleared, a reader who has
      // not finished is still asked. (Until 1.5.2 the new session read as
      // prior use here, and they were marked done unasked.)
      clearResumeStage();
      expect(readResumeStage()).toBeNull();
      expect(shouldShowOnboarding()).toBe(true);
      // Leaving the flow is finishing it or skipping it, and either marks it.
      markOnboarded();
      expect(shouldShowOnboarding()).toBe(false);
    });

    it("never traps a reader whose storage is shut", () => {
      vi.stubGlobal("window", {
        localStorage: {
          getItem: () => {
            throw new Error("blocked");
          },
        },
        dispatchEvent: () => true,
      });
      expect(isOnboarded()).toBe(true);
      expect(shouldShowOnboarding()).toBe(false);
    });

    it("clears the resume stage and offers a fresh Day 1 card when the flow ends", () => {
      dismissNudge();
      setResumeStage("assessment");
      markOnboarded();
      expect(readResumeStage()).toBeNull();
      expect(isNudgeDismissed()).toBe(false);
    });
  });

  describe("refreshing the Day 1 card from Settings", () => {
    it("brings the card back for a reader who came through the flow", () => {
      markOnboarded();
      dismissNudge();
      refreshDayOne();
      expect(isNudgeDismissed()).toBe(false);
    });

    it("never shows a Day 1 card to a reader marked done silently", () => {
      markOnboardedSilently();
      dismissNudge();
      refreshDayOne();
      expect(isNudgeDismissed()).toBe(true);
    });
  });

  describe("a reader who is back", () => {
    it("is remembered as back, so their first step is not called a Day 1", () => {
      expect(wasOnboardedAgain()).toBe(false);
      markOnboarded({ again: true });
      expect(wasOnboardedAgain()).toBe(true);
      expect(isOnboarded()).toBe(true);
    });

    it("a new reader finishing on the same device clears the mark", () => {
      markOnboarded({ again: true });
      markOnboarded();
      expect(wasOnboardedAgain()).toBe(false);
    });
  });

  describe("which version the account answered", () => {
    it("takes an account that answered this version on another device", () => {
      expect(accountAnsweredThisVersion({ level: "practicing", intent: "study", v: ONBOARDING_VERSION })).toBe(true);
    });

    it("asks again when the account's answers are from an earlier version", () => {
      // Version 2 wrote no version at all.
      expect(accountAnsweredThisVersion({ level: "practicing", intent: "study" })).toBe(false);
      expect(accountAnsweredThisVersion({ level: "learning", v: ONBOARDING_VERSION - 1 })).toBe(false);
    });

    it("does not take a version without an answer, or junk", () => {
      expect(accountAnsweredThisVersion({ v: ONBOARDING_VERSION })).toBe(false);
      expect(accountAnsweredThisVersion({ level: "abbot", v: 99 })).toBe(false);
      expect(accountAnsweredThisVersion({ level: "learning", v: "3" })).toBe(false);
      expect(accountAnsweredThisVersion(null)).toBe(false);
      expect(accountAnsweredThisVersion("practicing")).toBe(false);
    });
  });
});
