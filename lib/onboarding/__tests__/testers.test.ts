import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Testers mode (1.8): an admin sees Purify as another kind of reader and
 * comes back (the owner, 2026-10-28: "I am able to easily switch the
 * preference of my user to test out what different backgrounds see").
 *
 * What a reader (the admin) would notice if this broke: their own answers
 * gone after a test, Today showing a Catholic's first step for good; a test
 * answer written into their account and following them to another phone; or
 * the admin's own taps landing in the onboarding totals as a stream of
 * imaginary Catholics.
 *
 * Who may see the switches is the server's (app/api/admin/whoami, tested in
 * lib/admin/__tests__/whoamiRoute.test.ts).
 */

const net = vi.hoisted(() => ({
  apiFetch: vi.fn<(...args: unknown[]) => Promise<Response>>(async () => new Response("{}")),
  updateUser: vi.fn<(...args: unknown[]) => Promise<{ data: object; error: null }>>(async () => ({ data: {}, error: null })),
  profileUpdates: [] as unknown[],
  getUser: vi.fn(async () => ({
    data: { user: { id: "admin-1", user_metadata: { purify_space: { level: "practicing", intent: "prayer", background: "orthodox", v: 3 } } } },
  })),
}));

vi.mock("@/lib/api/client", () => ({ apiFetch: net.apiFetch }));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: { user: { user_metadata: { purify_space: { level: "practicing", v: 3 } } } } } }),
      getUser: net.getUser,
      updateUser: net.updateUser,
    },
    from: () => ({
      update: (patch: unknown) => {
        net.profileUpdates.push(patch);
        return { eq: async () => ({ data: null, error: null }) };
      },
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { focus: ["saints"], depth: "inquirer" }, error: null }) }) }),
    }),
  }),
}));

import { CALENDAR_STYLE_KEY } from "@/lib/calendar/styleDefault";

import { saveSpaceToAccount } from "../accountSync";
import { beginCountRun, countDayOne, countFinished, countOnboarding, countPicks, countReturns, countingAllowed } from "../count";
import { pullProfilePrefs, pushProfilePrefs } from "@/lib/profile/preferences";
import {
  SPACE_KEYS,
  fillSpaceFromAccount,
  isOnboarded,
  markOnboarded,
  readBackground,
  readDepth,
  readFastingRule,
  readIntents,
  readLevel,
  writeIntents,
} from "../state";
import { TESTER_KEYS, backToMyOwn, startTesting, testAs, testFirstOpen } from "../testers";
import { TESTERS_KEY, isTesting } from "../testing";

function storage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, String(v)),
    removeItem: (k: string) => void map.delete(k),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
    map,
  };
}

/** The admin's own device before any test: answers given, the flow finished, a Day 1 card dismissed. */
const OWN: Record<string, string> = {
  "purify:onboarded": "3",
  "purify:level": "practicing",
  "purify:depth": "faithful",
  "purify:fasting-rule": "strict",
  "purify:background": "orthodox",
  "purify:intent": "prayer",
  "purify:intents": JSON.stringify(["prayer", "liturgy"]),
  "purify:focus": JSON.stringify(["prayer", "calendar"]),
  "purify:firststeps.eligible": "1",
  "purify:firststeps.dismissed": "1",
  [CALENDAR_STYLE_KEY]: "old",
  // Not a key a test touches: it must come through untouched too.
  "purify:bookmarks": JSON.stringify([{ ref: "john/1/1" }]),
};

let store: ReturnType<typeof storage>;
let cookies: string[];
let events: string[];

beforeEach(() => {
  store = storage();
  for (const [k, v] of Object.entries(OWN)) store.setItem(k, v);
  cookies = [];
  events = [];
  vi.stubGlobal("window", {
    localStorage: store,
    sessionStorage: storage(),
    dispatchEvent: (e: Event) => {
      events.push(e.type);
      return true;
    },
  });
  vi.stubGlobal("document", {
    set cookie(v: string) {
      cookies.push(v);
    },
  });
  vi.stubGlobal("CustomEvent", class extends Event {});
  // A phone's browser, not automation, so only Testers mode can stop a count.
  vi.stubGlobal("navigator", {
    userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36",
    webdriver: false,
  });
  net.apiFetch.mockClear();
  net.updateUser.mockClear();
  net.getUser.mockClear();
  net.profileUpdates = [];
  beginCountRun();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const everything = () => Object.fromEntries([...store.map.entries()].filter(([k]) => k !== TESTERS_KEY).sort());

describe("Testers mode switches the device, and only the device", () => {
  it("shows a Catholic who is learning at once, from the answers every screen reads", () => {
    testAs({ background: "catholic" });
    testAs({ level: "learning" });
    expect(isTesting()).toBe(true);
    expect(readBackground()).toBe("catholic");
    expect(readLevel()).toBe("learning");
    // What the level brings in the flow: the register and the fast.
    expect(readDepth()).toBe("inquirer");
    expect(readFastingRule()).toBe("modified");
    // The Day 1 card comes back for the reader being tested.
    expect(store.getItem("purify:firststeps.dismissed")).toBeNull();
    expect(events).toContain("purify:onboarding");
    expect(events).toContain("purify:testers");
  });

  it("keeps the reader's own answers once, at the first switch, never a test's", () => {
    testAs({ background: "protestant" });
    const kept = store.getItem(TESTERS_KEY);
    testAs({ background: "catholic" });
    testAs({ level: "inquirer" });
    expect(store.getItem(TESTERS_KEY)).toBe(kept);
    const keys = (JSON.parse(kept ?? "{}") as { keys: Record<string, string | null> }).keys;
    expect(keys["purify:background"]).toBe("orthodox");
    expect(keys["purify:level"]).toBe("practicing");
    // Every key a test can change is kept, the absent ones as absent.
    expect(Object.keys(keys).sort()).toEqual([...TESTER_KEYS].sort());
    expect(keys["purify:onboarding.stage"]).toBeNull();
  });

  it("opens as a first open: the welcome questions' answers and marks cleared", () => {
    testAs({ background: "catholic" });
    testFirstOpen();
    expect(isTesting()).toBe(true);
    expect(isOnboarded()).toBe(false);
    for (const key of SPACE_KEYS) expect(store.getItem(key), key).toBeNull();
    // What is not the space is not touched.
    expect(store.getItem("purify:bookmarks")).toBe(OWN["purify:bookmarks"]);
  });
});

describe("Back to my own", () => {
  it("puts back every key exactly, after switches and a whole first open", () => {
    const before = everything();
    testAs({ background: "catholic" });
    testAs({ level: "learning" });
    testFirstOpen();
    // The welcome questions run again, as the flow writes them.
    store.setItem("purify:onboarding.stage", "assessment");
    testAs({ background: "none" });
    writeIntents(["saints", "gospels"]);
    store.setItem(CALENDAR_STYLE_KEY, "new");
    markOnboarded({ again: true });

    expect(backToMyOwn()).toBe(true);
    expect(isTesting()).toBe(false);
    expect(store.getItem(TESTERS_KEY)).toBeNull();
    expect(everything()).toEqual(before);
    expect(readIntents()).toEqual(["prayer", "liturgy"]);
    // The calendar's cookie follows its key back, for the server's render.
    expect(cookies.at(-1)).toMatch(/^purify_calendar_style=old;/);
  });

  it("takes away again what was absent before the test", () => {
    store.removeItem("purify:background");
    store.removeItem(CALENDAR_STYLE_KEY);
    const before = everything();
    testAs({ background: "catholic" });
    testFirstOpen();
    store.setItem(CALENDAR_STYLE_KEY, "new");
    backToMyOwn();
    expect(everything()).toEqual(before);
    expect(readBackground()).toBeNull();
    expect(cookies.at(-1)).toMatch(/^purify_calendar_style=; Max-Age=0;/);
  });

  it("does nothing to a device that was not testing", () => {
    const before = everything();
    expect(backToMyOwn()).toBe(false);
    expect(everything()).toEqual(before);
  });
});

describe("while testing", () => {
  it("counts nothing: no screen, no answer, no pick, no finish, no Day 1, no return", async () => {
    // Counting works on this device until the test begins.
    countOnboarding({ name: "onboarding_step", props: { route: "new", step: "welcome" } });
    expect(net.apiFetch).toHaveBeenCalledTimes(1);
    net.apiFetch.mockClear();
    store.setItem("purify:onboarding.counted", JSON.stringify({ at: "2026-01-01", v: 3, route: "new", sent: [] }));

    testAs({ background: "catholic" });
    beginCountRun();
    expect(countingAllowed()).toBe(false);
    countOnboarding({ name: "onboarding_step", props: { route: "new", step: "background" } });
    countOnboarding({ name: "onboarding_answer", props: { route: "new", question: "background", answer: "catholic" } });
    countPicks("new", ["saints", "gospels"]);
    countFinished("new", { background: "catholic", level: "learning", intent: "saints" }, true);
    countDayOne("saintsLives", { background: "catholic" });
    countReturns();
    expect(net.apiFetch).not.toHaveBeenCalled();
    // The device's own record of its first run is left as it was, its days unsent.
    expect(JSON.parse(store.getItem("purify:onboarding.counted") ?? "{}").sent).toEqual([]);
  });

  it("sends nothing to the account, and takes nothing from it", async () => {
    testAs({ background: "catholic", level: "inquirer" });
    await saveSpaceToAccount({ finished: true });
    await saveSpaceToAccount();
    await pushProfilePrefs();
    await pullProfilePrefs();
    expect(net.updateUser).not.toHaveBeenCalled();
    expect(net.profileUpdates).toEqual([]);
    expect(net.getUser).not.toHaveBeenCalled();
    // A first open on a signed-in device asks again rather than taking the account's answers.
    testFirstOpen();
    expect(fillSpaceFromAccount({ level: "practicing", intent: "prayer", background: "orthodox", v: 3 })).toBe(false);
    expect(readLevel()).toBeNull();
  });

  it("and after it, the account is the reader's own answers again", async () => {
    startTesting();
    testAs({ background: "catholic" });
    backToMyOwn();
    await saveSpaceToAccount();
    expect(net.updateUser).toHaveBeenCalledTimes(1);
    const sent = (net.updateUser.mock.calls[0]?.[0] as { data: { purify_space: Record<string, unknown> } }).data.purify_space;
    expect(sent).toMatchObject({ level: "practicing", intent: "prayer", background: "orthodox", fasting: "strict" });
  });
});
