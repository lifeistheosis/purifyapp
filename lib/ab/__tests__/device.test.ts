import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// A test on a device (1.9): the version it is given and keeps, saying once
// that it was shown, and saying each milestone once, inside its two weeks
// (docs/1.9-build/notes/onboarding-fable.md, section 10).

const world = vi.hoisted(() => ({ roads: true, counting: true, now: "2026-12-10T10:00:00Z" }));

vi.mock("@/lib/onboarding/flags", () => ({
  roadsBuilt: () => world.roads,
  // Plus, introduced once, stays shut in these tests: they are the first test's.
  litNow: () => ({ roads: world.roads, plusIntro: false }),
}));
vi.mock("@/lib/onboarding/count", () => ({ countPlatform: () => "android", countingAllowed: () => world.counting }));
vi.mock("@/lib/platform/native", () => ({ isNativeClient: () => false }));
vi.mock("@/lib/site", () => ({ SITE_URL: "https://purifyapp.net" }));

import { AB_PICK_KEY } from "@/lib/onboarding/testers";
import { TESTERS_KEY } from "@/lib/onboarding/testing";

import { armOf } from "../assign";
import { PICK_KEY, abTick, armHere, exposed, pickArm, reached, refreshWeights, shownArm } from "../device";
import { ACCOUNT_PLACE, type AbTest } from "../tests";

const TEST: AbTest = { ...ACCOUNT_PLACE, begins: "2026-12-01", ends: "2027-02-23" };
const TESTS = [TEST];

function storage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, String(v)),
    removeItem: (k: string) => void map.delete(k),
    map,
  };
}

let store: ReturnType<typeof storage>;
let sent: { url: string; body: Record<string, unknown> | null; credentials?: string }[];
let weightsAnswer: unknown;

beforeEach(() => {
  store = storage();
  sent = [];
  weightsAnswer = { v: 1, tests: { "account-place": { weights: { card: 0.5, end: 0.5 } } } };
  world.roads = true;
  world.counting = true;
  vi.useFakeTimers();
  vi.setSystemTime(new Date(world.now));
  vi.stubGlobal("window", { localStorage: store });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      sent.push({ url, body: init?.body ? JSON.parse(String(init.body)) : null, credentials: init?.credentials });
      return { ok: true, json: async () => weightsAnswer } as Response;
    }),
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const rows = (name: string) => sent.filter((s) => s.body?.name === name).map((s) => s.body!.props as Record<string, unknown>);
const day = (iso: string) => vi.setSystemTime(new Date(`${iso}T10:00:00Z`));

describe("the version a device is given", () => {
  it("is worked out from its own seed, kept, and never changed", () => {
    const here = armHere("onboarding", TESTS)!;
    const seed = store.getItem("purify:ab.seed")!;
    expect(seed).toBeTruthy();
    expect(here.arm).toBe(armOf(TEST, seed));
    // Kept: the shares may move, the device's version does not.
    store.setItem("purify:ab.weights", JSON.stringify({ at: Date.now(), tests: { "account-place": { card: 0, end: 1 } } }));
    expect(armHere("onboarding", TESTS)!.arm).toBe(here.arm);
    store.setItem("purify:ab.weights", JSON.stringify({ at: Date.now(), tests: { "account-place": { card: 1, end: 0 } } }));
    expect(armHere("onboarding", TESTS)!.arm).toBe(here.arm);
  });

  it("follows the shares the website last gave, for a device not yet given one", () => {
    store.setItem("purify:ab.weights", JSON.stringify({ at: Date.now(), tests: { "account-place": { card: 0, end: 1 } } }));
    expect(armHere("onboarding", TESTS)!.arm).toBe("end");
  });

  it("is none while no test is running: before the roads are lit, before its first day, after its last", () => {
    world.roads = false;
    expect(armHere("onboarding", TESTS)).toBeNull();
    world.roads = true;
    day("2026-11-20");
    expect(armHere("onboarding", TESTS)).toBeNull();
    day("2027-03-01");
    expect(armHere("onboarding", TESTS)).toBeNull();
    expect(armHere("plus", TESTS)).toBeNull();
    // Nothing was drawn or kept for a device that is in no test.
    expect(store.getItem("purify:ab.mine")).toBeNull();
  });

  it("is none for a device whose visits are never counted (an admin's, automation)", () => {
    world.counting = false;
    expect(armHere("onboarding", TESTS)).toBeNull();
    exposed("onboarding", TESTS);
    reached("finished", TESTS);
    expect(sent).toEqual([]);
  });

  it("is, in Testers mode, the version the admin picked, said to nobody", () => {
    store.setItem(TESTERS_KEY, "{}");
    expect(armHere("onboarding", TESTS)).toBeNull();
    pickArm("account-place", "end");
    expect(armHere("onboarding", TESTS)!.arm).toBe("end");
    // Whether or not a test is running: it is a look, not a test.
    world.roads = false;
    expect(armHere("onboarding", TESTS)!.arm).toBe("end");
    exposed("onboarding", TESTS);
    reached("finished", TESTS);
    refreshWeights(TESTS);
    expect(sent).toEqual([]);
    // The pick is one of the keys "Back to my own" puts back.
    expect(PICK_KEY).toBe(AB_PICK_KEY);
  });
});

describe("saying a device was shown its version", () => {
  it("is said once, with the test, the version and the kind of device, and nothing else", () => {
    const { arm } = armHere("onboarding", TESTS)!;
    exposed("onboarding", TESTS);
    exposed("onboarding", TESTS);
    expect(rows("ab_exposed")).toEqual([{ test: "account-place", arm, platform: "android" }]);
    expect(shownArm("account-place")).toBe(arm);
    // No cookie and no sign-in travel with it, and the seed is nowhere in it.
    expect(sent[0].credentials).toBe("omit");
    expect(JSON.stringify(sent)).not.toContain(store.getItem("purify:ab.seed")!);
  });

  it("is not said by a device that was given a version and never reached the screen", () => {
    armHere("onboarding", TESTS);
    expect(shownArm("account-place")).toBeNull();
    reached("finished", TESTS);
    expect(sent).toEqual([]);
  });
});

describe("saying a milestone was reached", () => {
  const shown = () => {
    const { arm } = armHere("onboarding", TESTS)!;
    exposed("onboarding", TESTS);
    sent.length = 0;
    return arm;
  };

  it("is said once for each, with the day the device was shown and not today", () => {
    const arm = shown();
    reached("finished", TESTS);
    reached("finished", TESTS);
    day("2026-12-12");
    reached("account", TESTS);
    expect(rows("ab_reached")).toEqual([
      { test: "account-place", arm, what: "finished", shown: "2026-12-10", platform: "android" },
      { test: "account-place", arm, what: "account", shown: "2026-12-10", platform: "android" },
    ]);
  });

  it("is only what the test reads", () => {
    shown();
    reached("first_step", TESTS);
    expect(sent).toEqual([]);
  });

  it("is only inside the device's two weeks, and coming back only in the second of them", () => {
    shown();
    day("2026-12-15");
    abTick(false, TESTS);
    expect(rows("ab_reached")).toEqual([]);
    day("2026-12-17");
    abTick(false, TESTS);
    abTick(false, TESTS);
    expect(rows("ab_reached").map((r) => r.what)).toEqual(["back_week2"]);
    // Day 14 and after: nothing more is sent for this device, whatever it does.
    day("2026-12-24");
    reached("plus_bought", TESTS);
    abTick(true, TESTS);
    expect(rows("ab_reached").map((r) => r.what)).toEqual(["back_week2"]);
  });

  it("hears from a device it showed after the test's last day, while its two weeks last", () => {
    const short: AbTest = { ...TEST, ends: "2026-12-12" };
    armHere("onboarding", [short]);
    exposed("onboarding", [short]);
    sent.length = 0;
    day("2026-12-18");
    abTick(true, [short]);
    expect(rows("ab_reached").map((r) => r.what).sort()).toEqual(["account", "back_week2"]);
  });

  it("says someone is signed in only when someone is", () => {
    shown();
    abTick(false, TESTS);
    expect(sent).toEqual([]);
    abTick(true, TESTS);
    expect(rows("ab_reached").map((r) => r.what)).toEqual(["account"]);
  });
});

describe("the shares", () => {
  it("are asked of the website with nothing of the reader, kept, and not asked again while fresh", async () => {
    refreshWeights(TESTS);
    await vi.runAllTimersAsync();
    expect(sent).toEqual([{ url: "/api/ab/weights", body: null, credentials: "omit" }]);
    expect(JSON.parse(store.getItem("purify:ab.weights")!).tests).toEqual({ "account-place": { card: 0.5, end: 0.5 } });
    refreshWeights(TESTS);
    await vi.runAllTimersAsync();
    expect(sent).toHaveLength(1);
    vi.setSystemTime(new Date(Date.now() + 7 * 60 * 60 * 1000));
    refreshWeights(TESTS);
    await vi.runAllTimersAsync();
    expect(sent).toHaveLength(2);
  });

  it("are not asked for while no test is running", async () => {
    world.roads = false;
    refreshWeights(TESTS);
    await vi.runAllTimersAsync();
    expect(sent).toEqual([]);
  });
});
