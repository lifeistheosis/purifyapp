import { readFileSync } from "node:fs";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Readers who already answered are asked the new questions once (1.9, his
 * 110: "yes, once"). What must hold for a reader who is back:
 *
 *   - they are asked once, and greeted as a reader who is back, with an
 *     account or without one;
 *   - they are never taken into the first test, which asks where a NEW
 *     reader should be offered an account;
 *   - their streak's rope and its evening card never wait behind the week's
 *     card, as they do for a new reader who has no streak;
 *   - and it all follows the flag: with the new onboarding turned off, the
 *     version is 3 and nobody is asked again.
 */

const flags = vi.hoisted(() => ({ lit: true }));
vi.mock("../flags", () => ({
  ROADS_LIVE: true,
  roadsBuilt: () => flags.lit,
  roadsEnabled: () => flags.lit,
}));

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  flags.lit = true;
  vi.resetModules();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the questions' version follows the new onboarding", () => {
  it("is 4 while it is lit, and 3 with it turned off", async () => {
    expect((await import("../state")).ONBOARDING_VERSION).toBe(4);
    flags.lit = false;
    vi.resetModules();
    expect((await import("../state")).ONBOARDING_VERSION).toBe(3);
  });

  it("asks a reader who answered version 3 once more, and not again after", async () => {
    const state = await import("../state");
    store.set("purify:onboarded", "3");
    expect(state.isOnboarded()).toBe(false);
    expect(state.finishedEarlierVersion()).toBe(true);
    state.markOnboarded({ again: true });
    expect(store.get("purify:onboarded")).toBe("4");
    expect(state.isOnboarded()).toBe(true);
    expect(state.finishedEarlierVersion()).toBe(false);
    expect(state.wasOnboardedAgain()).toBe(true);
  });

  it("does not ask a reader who answered 4 again when the new onboarding is turned off", async () => {
    store.set("purify:onboarded", "4");
    flags.lit = false;
    vi.resetModules();
    const state = await import("../state");
    expect(state.isOnboarded()).toBe(true);
  });

  it("takes a new visitor for a new visitor: nothing stored, or the questions never finished", async () => {
    const state = await import("../state");
    expect(state.finishedEarlierVersion()).toBe(false);
    store.set("purify:onboarded", "0");
    expect(state.finishedEarlierVersion()).toBe(false);
    // The walks' and the pictures' reader, whom no version reaches.
    store.set("purify:onboarded", "99");
    expect(state.isOnboarded()).toBe(true);
    expect(state.finishedEarlierVersion()).toBe(false);
  });

  it("takes an account's copy from version 3 as answered before, and from version 4 as answered", async () => {
    const state = await import("../state");
    expect(state.accountAnsweredThisVersion({ level: "practicing", v: 3 })).toBe(false);
    expect(state.accountAnsweredThisVersion({ level: "practicing", v: 4 })).toBe(true);
  });
});

describe("the streak of a reader who is back", () => {
  const WEEK_UP = { "purify:background": "orthodox", "purify:level": "practicing", "purify:firststeps.eligible": "1" };

  it("never waits behind the week's card, though a new reader's does", async () => {
    for (const [k, v] of Object.entries(WEEK_UP)) store.set(k, v);
    store.set("purify:onboarded", "4");
    const dayOne = await import("../useDayOne");
    // A new reader: the card is up, and the rope waits for it.
    expect(dayOne.isDayOneShown()).toBe(true);
    expect(dayOne.streakWaits()).toBe(true);
    // The same morning for a reader who is back: the card is up, the rope is too.
    store.set("purify:onboarding.again", "1");
    expect(dayOne.isDayOneShown()).toBe(true);
    expect(dayOne.streakWaits()).toBe(false);
  });

  it("is what the rope and the evening card ask", () => {
    for (const file of ["components/today/StreakRow.tsx", "components/streak/StreakAtRisk.tsx"]) {
      const code = readFileSync(file, "utf8");
      expect(code, file).toContain("const dayOne = useStreakWaits();");
      expect(code, file).not.toContain("useDayOneShown");
    }
  });
});

describe("where a reader who is back is taken", () => {
  const gate = readFileSync("components/onboarding/FirstRunGate.tsx", "utf8").replace(/\s+/g, " ");
  const flow = readFileSync("components/onboarding/OnboardingFlow.tsx", "utf8").replace(/\s+/g, " ");
  const card = readFileSync("components/onboarding/FirstStepsNudge.tsx", "utf8").replace(/\s+/g, " ");

  it("is greeted as one when signed out too, and never as a new visitor", () => {
    expect(gate).toContain('setStart(roadsBuilt() && finishedEarlierVersion() ? "returning" : "welcome")');
  });

  it("is never taken into the test of where a new reader is offered an account", () => {
    expect(flow).toContain('if (roads && !hasAccount && startAt !== "account" && startAt !== "returning") {');
  });

  it("is shown the week's steps as their next step, not their first week", () => {
    expect(card).toContain('eyebrow={again ? t("onboard.returning.nextEyebrow") : t("onboard.week.eyebrow", { n: week.index + 1 })}');
  });

  it("stands for a reader who has answered, in every walk and picture, by a number no version reaches", () => {
    for (const file of [
      "scripts/mock-check.mjs",
      "scripts/export-walk.mjs",
      "scripts/stripe-walk.mjs",
      "scripts/room-walk.mjs",
      "scripts/export-perf.mjs",
      "scripts/release-pictures.mjs",
      "scripts/promo/capture.mjs",
      "scripts/promo/edit-capture.mjs",
      "scripts/promo/card-capture.mjs",
      "tests/smoke/mobile-shell.spec.ts",
      "tests/smoke/tablet-shell.spec.ts",
    ]) {
      const code = readFileSync(file, "utf8");
      expect(code, file).not.toMatch(/purify:onboarded"[,:] "[1-9]"/);
    }
  });
});
