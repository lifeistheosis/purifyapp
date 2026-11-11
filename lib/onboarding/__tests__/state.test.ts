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
  isSecondChanceDone,
  markOnboarded,
  markSecondChanceDone,
  parseSpaceSnapshot,
  priorUseDetected,
  readBackground,
  readFastingRule,
  readIntent,
  readIntents,
  readKeep,
  readLevel,
  readOnboardedDay,
  readResumeStage,
  readReturning,
  readWeek,
  refreshDayOne,
  setResumeStage,
  shouldShowOnboarding,
  spaceSnapshot,
  wasOnboardedAgain,
  writeBackground,
  writeFastingRule,
  writeIntent,
  writeIntents,
  writeKeep,
  writeLevel,
  writeReturning,
  writeWeek,
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

  it("round-trips the answers through one snapshot string", () => {
    const nothing = { level: null, intent: null, fasting: "strict", background: null, returning: false, intents: [] };
    expect(parseSpaceSnapshot(spaceSnapshot())).toEqual(nothing);
    writeLevel("learning");
    writeIntent("liturgy");
    writeFastingRule("modified");
    writeBackground("protestant");
    expect(parseSpaceSnapshot(spaceSnapshot())).toEqual({
      level: "learning",
      intent: "liturgy",
      fasting: "modified",
      background: "protestant",
      returning: false,
      intents: ["liturgy"],
    });
    expect(events).toContain(ONBOARDING_EVENT);
  });

  it("carries the road back and every pick in the snapshot too (1.9)", () => {
    writeLevel("practicing");
    writeReturning(true);
    writeIntents(["prayer", "saints", "feasts"]);
    writeBackground("christian");
    expect(parseSpaceSnapshot(spaceSnapshot())).toEqual({
      level: "practicing",
      intent: "prayer",
      fasting: "strict",
      background: "christian",
      returning: true,
      intents: ["prayer", "saints", "feasts"],
    });
    writeReturning(false);
    expect(readReturning()).toBe(false);
    expect(parseSpaceSnapshot(spaceSnapshot()).returning).toBe(false);
  });

  it("ignores junk in a snapshot rather than trusting it", () => {
    expect(parseSpaceSnapshot("bishop|nap|feast|martian|yes|nap,quiet,nap")).toEqual({
      level: null,
      intent: null,
      fasting: "strict",
      background: null,
      returning: false,
      intents: ["quiet"],
    });
    // A snapshot written before where-you-come-from was asked.
    expect(parseSpaceSnapshot("learning|liturgy|modified")).toEqual({
      level: "learning",
      intent: "liturgy",
      fasting: "modified",
      background: null,
      returning: false,
      intents: [],
    });
  });

  it("keeps a first week, the day the questions ended and the two cards' marks (1.9)", () => {
    expect(readWeek()).toEqual({ at: 0, day: null, passed: 0 });
    writeWeek({ at: 3, day: "2026-11-10", passed: 1 });
    expect(readWeek()).toEqual({ at: 3, day: "2026-11-10", passed: 1 });
    expect(readOnboardedDay()).toBeNull();
    // Finishing the questions begins the week again from its first day and keeps the day.
    markOnboarded();
    expect(readWeek()).toEqual({ at: 0, day: null, passed: 0 });
    expect(readOnboardedDay()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(readKeep()).toBe("open");
    writeKeep("asked");
    expect(readKeep()).toBe("asked");
    writeKeep("done");
    expect(readKeep()).toBe("done");
    expect(isSecondChanceDone()).toBe(false);
    markSecondChanceDone();
    expect(isSecondChanceDone()).toBe(true);
  });

  describe("the picks of What are you looking for?", () => {
    it("keeps every pick in the order tapped, the first as the intent", () => {
      writeIntents(["study", "quiet", "prayer"]);
      expect(readIntents()).toEqual(["study", "quiet", "prayer"]);
      expect(readIntent()).toBe("study");
      expect(parseSpaceSnapshot(spaceSnapshot()).intent).toBe("study");
      expect(events).toContain(ONBOARDING_EVENT);
    });

    it("clears the intent with the last pick, as an unanswered question", () => {
      writeIntents(["study"]);
      writeIntents([]);
      expect(readIntents()).toEqual([]);
      expect(readIntent()).toBeNull();
      expect(store.getItem("purify:intents")).toBeNull();
    });

    it("puts an intent changed since, in Settings, first", () => {
      writeIntents(["study", "quiet", "prayer"]);
      writeIntent("prayer");
      expect(readIntents()).toEqual(["prayer", "study", "quiet"]);
      writeIntent("liturgy");
      expect(readIntents()).toEqual(["liturgy", "study", "quiet", "prayer"]);
    });

    it("reads a reader from before the picks as their one intent", () => {
      writeIntent("quiet");
      expect(readIntents()).toEqual(["quiet"]);
    });

    it("never trusts junk under the key", () => {
      writeIntent("liturgy");
      store.setItem("purify:intents", "not json");
      expect(readIntents()).toEqual(["liturgy"]);
      store.setItem("purify:intents", JSON.stringify(["abbot", "study", "study", 7]));
      expect(readIntents()).toEqual(["liturgy", "study"]);
      writeIntents(["prayer", "prayer", "quiet"]);
      expect(readIntents()).toEqual(["prayer", "quiet"]);
    });

    it("takes the account's picks with its intent, and never over this device's", () => {
      fillSpaceFromAccount({ level: "learning", intent: "liturgy", intents: ["liturgy", "study", "abbot"] });
      expect(readIntents()).toEqual(["liturgy", "study"]);
      fillSpaceFromAccount({ level: "learning", intent: "prayer", intents: ["prayer"] });
      expect(readIntents()).toEqual(["liturgy", "study"]);
    });

    it("takes an account copy from before the picks as its intent alone", () => {
      fillSpaceFromAccount({ level: "practicing", intent: "study" });
      expect(readIntents()).toEqual(["study"]);
    });
  });

  it("never takes where the reader comes from from an account, whatever the flags say", () => {
    // His "yes privacy" (2026-11-11): the answers about a reader's faith stay
    // on the device (./faithAnswers.test.ts holds the whole of it).
    expect(fillSpaceFromAccount({ level: "inquirer", background: "catholic" })).toBe(true);
    expect(readBackground()).toBeNull();
    writeBackground("prefer-not");
    fillSpaceFromAccount({ level: "inquirer", background: "orthodox" });
    expect(readBackground()).toBe("prefer-not");
  });

  describe("the account copy", () => {
    it("fills a fresh device with the picks and the fast, and never with the level", () => {
      expect(fillSpaceFromAccount({ level: "practicing", intent: "study", fasting: "modified" })).toBe(true);
      expect(readLevel()).toBeNull();
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

    it("takes nothing from what is not a copy, and no answer it does not know", () => {
      expect(fillSpaceFromAccount(undefined)).toBe(false);
      expect(fillSpaceFromAccount("practicing")).toBe(false);
      expect(fillSpaceFromAccount(["study"])).toBe(false);
      expect(readIntent()).toBeNull();
      fillSpaceFromAccount({ intent: "abbot", fasting: "feasting" });
      expect(readIntent()).toBeNull();
      expect(readFastingRule()).toBe("strict");
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

    it("resumes at the reminders after the sign-in they asked for", () => {
      // Reminders are kept with an account, so asking for them signed out
      // sends the reader to sign in, and the questions pick up there.
      setResumeStage("reminders");
      expect(readResumeStage()).toBe("reminders");
      expect(shouldShowOnboarding()).toBe(true);
      markOnboarded();
      expect(readResumeStage()).toBeNull();
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
    it("knows an account that answered this version on another device, by the version alone", () => {
      expect(accountAnsweredThisVersion({ intent: "study", v: ONBOARDING_VERSION })).toBe(true);
      // An older build's copy, with the level still in it, reads the same.
      expect(accountAnsweredThisVersion({ level: "practicing", intent: "study", v: ONBOARDING_VERSION })).toBe(true);
    });

    it("asks again when the account's answers are from an earlier version", () => {
      // Version 2 wrote no version at all.
      expect(accountAnsweredThisVersion({ level: "practicing", intent: "study" })).toBe(false);
      expect(accountAnsweredThisVersion({ level: "learning", v: ONBOARDING_VERSION - 1 })).toBe(false);
    });

    it("does not take junk for a version", () => {
      expect(accountAnsweredThisVersion({ level: "learning", v: "99" })).toBe(false);
      expect(accountAnsweredThisVersion({ v: Number.NaN })).toBe(false);
      expect(accountAnsweredThisVersion([ONBOARDING_VERSION])).toBe(false);
      expect(accountAnsweredThisVersion(null)).toBe(false);
      expect(accountAnsweredThisVersion("practicing")).toBe(false);
    });
  });
});
