import { describe, expect, it } from "vitest";

import { trackEventSchema } from "@/lib/security/schemas";

import { AB_SENDING, AB_TESTS, abWord, abWords, registryFaults, runningTest, type AbTest } from "../tests";

// The registry of tests (1.9; docs/1.9-build/notes/onboarding-fable.md, 4).

const test = (o: Partial<AbTest> = {}): AbTest => ({
  id: "day1-guided",
  surface: "onboarding",
  arms: ["a", "b"],
  share: 1,
  begins: "2026-12-07",
  ends: "2026-12-27",
  outcome: "back on day 7",
  guard: "back on day 30",
  needs: 1100,
  ...o,
});

describe("the tests Purify runs", () => {
  it("are none, and nothing leaves a device, until the owner agrees the privacy page's sentence", () => {
    expect(AB_TESTS).toEqual([]);
    expect(AB_SENDING).toBe(false);
  });

  it("are a registry with nothing wrong in it", () => {
    expect(registryFaults(AB_TESTS)).toEqual([]);
  });

  it("may only send what the server's closed list takes", () => {
    // A running test whose words the server refuses would count nothing and
    // say so nowhere. Adding a test means adding its member to
    // trackEventSchema in the same change (the head of ../tests.ts).
    for (const t of AB_TESTS) {
      for (const arm of t.arms) {
        const row = { name: "ab_exposed", props: { test: t.id, arm, platform: "ios" } };
        expect(trackEventSchema.safeParse(row).success, abWord(t, arm)).toBe(true);
      }
    }
    // And while none runs, the server takes no such row at all.
    if (AB_TESTS.length === 0) {
      expect(trackEventSchema.safeParse({ name: "ab_exposed", props: { test: "x", arm: "a", platform: "ios" } }).success).toBe(false);
    }
  });
});

describe("what a registry entry must say", () => {
  it("passes one that names its outcome, its guard, its readers and its last day", () => {
    expect(registryFaults([test()])).toEqual([]);
  });

  it("refuses one with no outcome, no guard, no end, too few readers or a share of nobody", () => {
    expect(registryFaults([test({ outcome: " " })]).join()).toContain("the one outcome");
    expect(registryFaults([test({ guard: "" })]).join()).toContain("must not fall");
    expect(registryFaults([test({ ends: "" })]).join()).toContain("a first and a last day");
    expect(registryFaults([test({ ends: "2026-12-01" })]).join()).toContain("in order");
    expect(registryFaults([test({ needs: 12 })]).join()).toContain("how many readers");
    expect(registryFaults([test({ share: 0 })]).join()).toContain("share");
    expect(registryFaults([test({ share: 1.5 })]).join()).toContain("share");
  });

  it("refuses an id or an arm that could hold more than a short word", () => {
    expect(registryFaults([test({ id: "Day One!" })]).join()).toContain("an id is");
    expect(registryFaults([test({ arms: ["a"] })]).join()).toContain("two to four arms");
    expect(registryFaults([test({ arms: ["a", "a"] })]).join()).toContain("each arm named once");
    expect(registryFaults([test({ arms: ["a", "reader-0000-4000-8000"] })]).join()).toContain("is a short word");
    expect(registryFaults([test(), test()]).join()).toContain("used once");
  });

  it("refuses two tests on one surface at the same time, and allows them one after the other or on two surfaces", () => {
    const second = test({ id: "door-led", begins: "2026-12-20", ends: "2027-01-10" });
    expect(registryFaults([test(), second]).join()).toContain("at the same time");
    expect(registryFaults([test(), test({ id: "door-led", begins: "2026-12-28", ends: "2027-01-17" })])).toEqual([]);
    expect(registryFaults([test(), test({ id: "plus-card", surface: "plus" })])).toEqual([]);
  });
});

describe("which test is running", () => {
  const tests = [test(), test({ id: "plus-card", surface: "plus", begins: "2026-12-14", ends: "2027-01-03" })];

  it("is the one whose days hold today, on its own surface", () => {
    expect(runningTest("onboarding", "2026-12-06", tests)).toBeNull();
    expect(runningTest("onboarding", "2026-12-07", tests)?.id).toBe("day1-guided");
    expect(runningTest("onboarding", "2026-12-27", tests)?.id).toBe("day1-guided");
    expect(runningTest("onboarding", "2026-12-28", tests)).toBeNull();
    expect(runningTest("plus", "2026-12-20", tests)?.id).toBe("plus-card");
    expect(runningTest("plus", "2026-12-07", tests)).toBeNull();
  });

  it("names a test and its arm in one word, and lists every word it can say", () => {
    expect(abWord(test(), "b")).toBe("day1-guided:b");
    expect(abWords(tests)).toEqual(["day1-guided:a", "day1-guided:b", "plus-card:a", "plus-card:b"]);
    expect(abWords()).toEqual([]);
  });
});
