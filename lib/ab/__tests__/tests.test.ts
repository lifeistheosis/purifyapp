import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { PLUS_INTRO_LIVE, PLUS_ORDER_LIVE, ROADS_LIVE, litNow } from "@/lib/onboarding/flags";
import { trackEventSchema } from "@/lib/security/schemas";

import { MILESTONES } from "../milestones";
import {
  ACCOUNT_PLACE,
  AB_PLANNED,
  AB_SENDING,
  PLUS_INTRODUCED,
  PLUS_SHEET_ORDER,
  AB_TESTS,
  abWord,
  abWords,
  isAbArm,
  readsMilestone,
  registryFaults,
  runningTest,
  shownDayOk,
  type AbTest,
} from "../tests";

// The registry of tests (1.9; docs/1.9-build/notes/onboarding-fable.md, 4 and 10).

const test = (o: Partial<AbTest> = {}): AbTest => ({
  id: "day1-guided",
  surface: "onboarding",
  asks: "Is a guided first step better than a section's front door?",
  arms: ["a", "b"],
  share: 1,
  begins: "2026-12-07",
  ends: "2027-02-28",
  judge: "back_week2",
  guards: ["finished"],
  needs: 1100,
  warmup: 200,
  floor: 0.2,
  ...o,
});
const open = { roads: true, plusIntro: true, plusOrder: true };
const shut = { roads: false, plusIntro: false, plusOrder: false };

describe("the tests Purify runs", () => {
  it("are a registry with nothing wrong in it", () => {
    expect(registryFaults(AB_TESTS)).toEqual([]);
  });

  it("hold the account's place, as the owner agreed it", () => {
    expect(AB_TESTS).toEqual([ACCOUNT_PLACE, PLUS_INTRODUCED, PLUS_SHEET_ORDER]);
    // The built version first: what the test falls back to.
    expect(ACCOUNT_PLACE.arms).toEqual(["card", "end"]);
    expect(ACCOUNT_PLACE.judge).toBe("back_week2");
    expect(ACCOUNT_PLACE.guards).toEqual(["finished", "account", "plus_bought"]);
    expect(ACCOUNT_PLACE).toMatchObject({ warmup: 200, floor: 0.2, needs: 1100, share: 1, gate: "roads" });
  });

  it("run nothing before the roads are lit for readers, whatever the day", () => {
    for (const day of ["2026-11-10", "2026-12-25", "2027-06-01"]) {
      expect(runningTest("onboarding", day, shut), day).toBeNull();
    }
  });

  it("are given their twelve weeks in the commit that lights the roads", () => {
    // While the roads are off the days hold nothing open. Lit, the test must
    // have been given its first day and a last day twelve weeks on.
    if (!ROADS_LIVE) return;
    const days = (Date.parse(ACCOUNT_PLACE.ends) - Date.parse(ACCOUNT_PLACE.begins)) / 86_400_000;
    expect(days).toBe(84);
    // And lit, it runs: on its first day, on its last, and not the day after.
    const open = { roads: true, plusIntro: false, plusOrder: false };
    expect(runningTest("onboarding", ACCOUNT_PLACE.begins, open)?.id).toBe("account-place");
    expect(runningTest("onboarding", ACCOUNT_PLACE.ends, open)?.id).toBe("account-place");
    const after = new Date(Date.parse(ACCOUNT_PLACE.ends) + 86_400_000).toISOString().slice(0, 10);
    expect(runningTest("onboarding", after, open)).toBeNull();
  });

  it("send only once the privacy page says how a test is counted", () => {
    // lib/admin/__tests__/privacyLines.test.ts holds the page to the sentence.
    expect(AB_SENDING).toBe(true);
  });
});

describe("what the server takes of a test", () => {
  const exposed = (props: Record<string, unknown>) => trackEventSchema.safeParse({ name: "ab_exposed", props }).success;
  const reached = (props: Record<string, unknown>) => trackEventSchema.safeParse({ name: "ab_reached", props }).success;

  it("is every version of a registered test, and every milestone it reads", () => {
    for (const t of AB_TESTS) {
      for (const arm of t.arms) {
        expect(exposed({ test: t.id, arm, platform: "ios" }), abWord(t, arm)).toBe(true);
        for (const what of [t.judge, ...t.guards]) {
          expect(reached({ test: t.id, arm, what, shown: "2026-12-01", platform: "android" }), `${abWord(t, arm)} ${what}`).toBe(true);
        }
      }
    }
  });

  it("is nothing else: no other test, version, milestone or word", () => {
    expect(exposed({ test: "price-test", arm: "a", platform: "ios" })).toBe(false);
    expect(exposed({ test: "account-place", arm: "middle", platform: "ios" })).toBe(false);
    expect(exposed({ test: "account-place", arm: "card", platform: "ios", seed: "abc123" })).toBe(false);
    expect(exposed({ test: "account-place", arm: "card", platform: "ios", background: "catholic" })).toBe(false);
    expect(reached({ test: "account-place", arm: "card", what: "first_step", shown: "2026-12-01", platform: "ios" })).toBe(false);
    expect(reached({ test: "account-place", arm: "card", what: "prayed", shown: "2026-12-01", platform: "ios" })).toBe(false);
    expect(reached({ test: "account-place", arm: "card", what: "finished", shown: "2026-12-01T09:14:00Z", platform: "ios" })).toBe(false);
    expect(reached({ test: "account-place", arm: "card", what: "finished", platform: "ios" })).toBe(false);
    expect(reached({ test: "account-place", arm: "card", what: "finished", shown: "2026-12-01", platform: "ios", user: "x" })).toBe(false);
  });

  it("is held to the registry, version by version and milestone by milestone", () => {
    expect(isAbArm("account-place", "end")).toBe(true);
    expect(isAbArm("account-place", "b")).toBe(false);
    expect(isAbArm("nothing", "a")).toBe(false);
    for (const what of MILESTONES) {
      const read = ACCOUNT_PLACE.judge === what || ACCOUNT_PLACE.guards.includes(what);
      expect(readsMilestone("account-place", what), what).toBe(read);
    }
    expect(readsMilestone("nothing", "finished")).toBe(false);
  });

  it("keeps a reached row under the day its device was shown, if that is a day a device could say", () => {
    const today = "2026-12-20";
    expect(shownDayOk("2026-12-20", today)).toBe(true);
    expect(shownDayOk("2026-12-07", today)).toBe(true);
    // A clock a day ahead, or the last day of the window read a day late.
    expect(shownDayOk("2026-12-21", today)).toBe(true);
    expect(shownDayOk("2026-12-05", today)).toBe(true);
    // Not a day in the future, a day long past, or anything that is not a day.
    expect(shownDayOk("2026-12-23", today)).toBe(false);
    expect(shownDayOk("2026-11-01", today)).toBe(false);
    expect(shownDayOk("yesterday", today)).toBe(false);
    expect(shownDayOk("2026-12-20T10:00:00Z", today)).toBe(false);
  });
});

describe("what a registry entry must say", () => {
  it("passes one that names its question, its judge, its guards, its readers and its last day", () => {
    expect(registryFaults([test()])).toEqual([]);
  });

  it("refuses one with no question, no guard, no end, too few readers or a share of nobody", () => {
    expect(registryFaults([test({ asks: " " })]).join()).toContain("the question it asks");
    expect(registryFaults([test({ guards: [] })]).join()).toContain("must not get worse");
    expect(registryFaults([test({ guards: ["back_week2"] })]).join()).toContain("not the judge");
    expect(registryFaults([test({ ends: "" })]).join()).toContain("a first and a last day");
    expect(registryFaults([test({ ends: "2026-12-01" })]).join()).toContain("in order");
    expect(registryFaults([test({ needs: 12 })]).join()).toContain("how many readers");
    expect(registryFaults([test({ share: 0 })]).join()).toContain("share");
    expect(registryFaults([test({ share: 1.5 })]).join()).toContain("share");
  });

  it("refuses shares that would move on too few devices, or leave a version too little to learn from", () => {
    expect(registryFaults([test({ warmup: 20 })]).join()).toContain("a warmup of");
    expect(registryFaults([test({ warmup: 2000 })]).join()).toContain("no more than it needs");
    expect(registryFaults([test({ floor: 0 })]).join()).toContain("a floor of");
    expect(registryFaults([test({ floor: 0.6 })]).join()).toContain("no more than an equal share");
  });

  it("refuses an id or an arm that could hold more than a short word", () => {
    expect(registryFaults([test({ id: "Day One!" })]).join()).toContain("an id is");
    expect(registryFaults([test({ arms: ["a"] })]).join()).toContain("two to four arms");
    expect(registryFaults([test({ arms: ["a", "a"] })]).join()).toContain("each arm named once");
    expect(registryFaults([test({ arms: ["a", "reader-0000-4000-8000"] })]).join()).toContain("is a short word");
    expect(registryFaults([test(), test()]).join()).toContain("used once");
  });

  it("refuses two tests on one surface at the same time, and allows them one after the other or on two surfaces", () => {
    const second = test({ id: "door-led", begins: "2027-01-20", ends: "2027-03-10" });
    expect(registryFaults([test(), second]).join()).toContain("at the same time");
    expect(registryFaults([test(), test({ id: "door-led", begins: "2027-03-01", ends: "2027-05-17" })])).toEqual([]);
    expect(registryFaults([test(), test({ id: "plus-card", surface: "plus", judge: "plus_bought", guards: ["back_week2"] })])).toEqual([]);
  });
});

describe("the rules for more than one test", () => {
  it("refuse two tests judged on readers coming back at the same time, on any two screens", () => {
    const today = test({ id: "today-order", surface: "today" });
    expect(registryFaults([test(), today]).join()).toContain("both judged on readers coming back");
    // Judged by something else, they may run together.
    const sheet = test({ id: "plus-order", surface: "plus", judge: "plus_bought", guards: ["back_week2"] });
    expect(registryFaults([test(), sheet])).toEqual([]);
    // Or one after the other.
    expect(registryFaults([test(), test({ id: "today-order", surface: "today", begins: "2027-03-01", ends: "2027-05-24" })])).toEqual([]);
  });

  it("refuse a test on a price, a trial or what Plus includes that does not name the day of his word", () => {
    const offer = test({ id: "yearly-first", surface: "offer", judge: "plus_bought", guards: ["back_week2"] });
    expect(registryFaults([offer]).join()).toContain("names the day of the owner's word");
    expect(registryFaults([{ ...offer, word: "soon" }]).join()).toContain("names the day of the owner's word");
    expect(registryFaults([{ ...offer, word: "2026-12-01" }])).toEqual([]);
    // No such test is registered.
    expect(AB_TESTS.some((t) => t.surface === "offer")).toBe(false);
  });

  it("keep the next three on record, in order, and built into nothing", () => {
    // The Plus sheet's order and Plus, introduced once, are built and registered now, shut.
    expect(AB_PLANNED.map((p) => p.id)).toEqual(["reminders-moment"]);
    for (const p of AB_PLANNED) {
      expect(AB_TESTS.some((t) => t.id === p.id), p.id).toBe(false);
      expect(p.versions.length, p.id).toBe(2);
      for (const text of [p.asks, p.judge, p.guards, p.waits, ...p.versions]) expect(text, p.id).not.toContain("\u2014");
    }
  });
});

describe("which test is running", () => {
  const tests = [test(), test({ id: "plus-card", surface: "plus", begins: "2026-12-14", ends: "2027-01-03" })];

  it("is the one whose days hold today, on its own surface", () => {
    expect(runningTest("onboarding", "2026-12-06", open, tests)).toBeNull();
    expect(runningTest("onboarding", "2026-12-07", open, tests)?.id).toBe("day1-guided");
    expect(runningTest("onboarding", "2027-02-28", open, tests)?.id).toBe("day1-guided");
    expect(runningTest("onboarding", "2027-03-01", open, tests)).toBeNull();
    expect(runningTest("plus", "2026-12-20", open, tests)?.id).toBe("plus-card");
    expect(runningTest("plus", "2026-12-07", open, tests)).toBeNull();
  });

  it("waits for its gate, and a test with none does not", () => {
    const gated = [test({ gate: "roads" })];
    expect(runningTest("onboarding", "2026-12-20", shut, gated)).toBeNull();
    expect(runningTest("onboarding", "2026-12-20", open, gated)?.id).toBe("day1-guided");
    expect(runningTest("onboarding", "2026-12-20", shut, tests)?.id).toBe("day1-guided");
  });

  it("names a test and its arm in one word, and lists every word it can say", () => {
    expect(abWord(test(), "b")).toBe("day1-guided:b");
    expect(abWords(tests)).toEqual(["day1-guided:a", "day1-guided:b", "plus-card:a", "plus-card:b"]);
    expect(abWords()).toEqual([
      "account-place:card",
      "account-place:end",
      "plus-introduced:locks",
      "plus-introduced:card",
      "plus-sheet-order:list",
      "plus-sheet-order:working",
    ]);
  });
});

describe("Plus, introduced once: built, and shut until he has seen it", () => {
  it("runs on no day while its switch is off, whatever else is lit", () => {
    expect(PLUS_INTRO_LIVE).toBe(false);
    expect(litNow().plusIntro).toBe(false);
    for (const day of ["2026-11-10", "2026-12-25", "2027-06-01"]) {
      expect(runningTest("today", day, { roads: true, plusIntro: false, plusOrder: true }), day).toBeNull();
      expect(runningTest("today", day, litNow()), day).toBeNull();
    }
  });

  it("is judged by Plus bought, with readers coming back guarded, and is never a test on a price", () => {
    expect(PLUS_INTRODUCED).toMatchObject({ surface: "today", arms: ["locks", "card"], judge: "plus_bought", guards: ["back_week2"], gate: "plusIntro" });
    // Purify as it is comes first: what the test falls back to.
    expect(PLUS_INTRODUCED.arms[0]).toBe("locks");
    expect(PLUS_INTRODUCED.surface).not.toBe("offer");
  });

  it("may run beside the first test, and never beside the Plus sheet's order", () => {
    const lit = { ...PLUS_INTRODUCED, begins: "2026-12-01", ends: "2027-02-23" };
    expect(registryFaults([ACCOUNT_PLACE, lit])).toEqual([]);
    const sheet = test({ id: "plus-sheet-order", surface: "plus", judge: "plus_bought", guards: ["back_week2"], begins: "2027-01-01", ends: "2027-03-26" });
    expect(registryFaults([lit, sheet]).join()).toContain("are kept apart, and run at the same time");
    // One after the other, they may.
    expect(registryFaults([lit, { ...sheet, begins: "2027-02-24", ends: "2027-05-19" }])).toEqual([]);
  });
});

describe("the Plus sheet's order: built, and shut until he has seen it", () => {
  const sheet = readFileSync("components/billing/UpgradeModal.tsx", "utf8").replace(/\s+/g, " ");

  it("runs on no day while its switch is off", () => {
    expect(PLUS_ORDER_LIVE).toBe(false);
    expect(litNow().plusOrder).toBe(false);
    for (const day of ["2026-11-11", "2026-12-25", "2027-06-01"]) {
      expect(runningTest("plus", day, litNow()), day).toBeNull();
      expect(runningTest("plus", day, { roads: true, plusIntro: true, plusOrder: false }), day).toBeNull();
    }
  });

  it("is judged by the button to subscribe, with purchases and readers coming back guarded, and is no test on an offer", () => {
    expect(PLUS_SHEET_ORDER).toMatchObject({ surface: "plus", arms: ["list", "working"], judge: "plus_pay", guards: ["plus_bought", "back_week2"], gate: "plusOrder" });
    // The sheet as it is built comes first: what the test falls back to.
    expect(PLUS_SHEET_ORDER.arms[0]).toBe("list");
    expect(PLUS_SHEET_ORDER.surface).not.toBe("offer");
  });

  it("never shares a day with the Plus card's test, whichever of the two is asked", () => {
    const card = { ...PLUS_INTRODUCED, begins: "2026-12-01", ends: "2027-02-23" };
    expect(registryFaults([card, { ...PLUS_SHEET_ORDER, begins: "2027-01-01", ends: "2027-03-26" }]).join()).toContain("are kept apart, and run at the same time");
    expect(registryFaults([card, { ...PLUS_SHEET_ORDER, begins: "2027-02-24", ends: "2027-05-19" }])).toEqual([]);
    expect(PLUS_SHEET_ORDER.apart).toContain(PLUS_INTRODUCED.id);
    expect(PLUS_INTRODUCED.apart).toContain(PLUS_SHEET_ORDER.id);
  });

  it("changes only which of the sheet's own screens opens first, for a lock with a feature behind it", () => {
    // The device is said to be shown its version as the sheet opens from a lock.
    expect(sheet).toContain('function sheetOpensWorking(): boolean { const here = armHere("plus"); exposed("plus"); return here?.test.id === PLUS_SHEET_ORDER.id && here.arm === "working"; }');
    // Never the Plus button (no feature of its own), and never the card's own open, which is already the feature working.
    expect(sheet).toContain("const own = row && TRY_PREVIEW_IDS.includes(row.id) ? row : null; if (own && opts?.tryNow) {");
    expect(sheet).toContain("} else if (own && sheetOpensWorking()) {");
    // The plans stand at the foot in both: one dock, drawn outside the choice of screen.
    expect(sheet.split("<PlansDock").length - 1).toBe(1);
  });

  it("says the button to subscribe was tapped, in the sheet and where the sheet leads to the plans' page", () => {
    expect(sheet).toContain('countPlusStep(feature ?? "general", "pay"); reached("plus_pay");');
    expect(sheet).toContain('onNavigate={() => { reached("plus_pay"); onClose(); }}');
  });
});

