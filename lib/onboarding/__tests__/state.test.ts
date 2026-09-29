import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ONBOARDING_EVENT,
  clearResumeStage,
  dismissNudge,
  fillSpaceFromAccount,
  isNudgeDismissed,
  isOnboarded,
  markOnboarded,
  parseSpaceSnapshot,
  readFastingRule,
  readIntent,
  readLevel,
  readResumeStage,
  refreshDayOne,
  setResumeStage,
  shouldShowOnboarding,
  spaceSnapshot,
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

    it("leaves a returning reader alone, and marks them done quietly", () => {
      store.setItem("purify:calendar.style", "new");
      expect(shouldShowOnboarding()).toBe(false);
      expect(isOnboarded()).toBe(true);
    });

    it("counts a reader who finished the first version as done", () => {
      store.setItem("purify:onboarded", "1");
      expect(isOnboarded()).toBe(true);
      expect(shouldShowOnboarding()).toBe(false);
    });

    it("resumes mid-flow after a sign-in, even though the new session reads as prior use", () => {
      store.setItem("sb-abc-auth-token", "{}");
      setResumeStage("assessment");
      expect(readResumeStage()).toBe("assessment");
      expect(shouldShowOnboarding()).toBe(true);
      clearResumeStage();
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

    it("never shows a Day 1 card to a long-time reader marked done silently", () => {
      store.setItem("purify:bookmark:1", "x");
      shouldShowOnboarding();
      dismissNudge();
      refreshDayOne();
      expect(isNudgeDismissed()).toBe(true);
    });
  });
});
