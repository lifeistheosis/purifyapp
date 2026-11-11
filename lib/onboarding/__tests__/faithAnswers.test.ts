// @vitest-environment node
import fs from "node:fs";

import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The answers about a reader's faith stay on the device (his "yes privacy",
 * 2026-11-11, call 32: "the welcome answers about one's faith no longer kept
 * with accounts and every copy cleared").
 *
 * Three answers say what a reader believes or where they stand: how familiar
 * they are with Orthodox Christianity (the level), whether they are coming
 * back after time away (returning, asked only of the baptized Orthodox), and
 * where they come from (the background). Until this change the first two went
 * to every signed-in reader's account, and the third did too while the new
 * onboarding was dark. Now none is sent, none is taken from an account, and a
 * copy an account still holds is taken off at the reader's next sign-in.
 *
 * What still travels in the account's copy is what the privacy page names:
 * what the reader is looking for, the fasting rule, and the version of the
 * questions they answered.
 */

const net = vi.hoisted(() => ({
  space: null as unknown,
  signedIn: true,
  updateUser: vi.fn<(arg: { data: { purify_space: Record<string, unknown> } }) => Promise<{ data: object; error: null }>>(async () => ({ data: {}, error: null })),
  profileUpdates: [] as unknown[],
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: async () => ({
        data: { session: net.signedIn ? { user: { id: "reader-1", user_metadata: net.space === null ? {} : { purify_space: net.space } } } : null },
      }),
      getUser: async () => ({ data: { user: net.signedIn ? { id: "reader-1", user_metadata: {} } : null } }),
      updateUser: net.updateUser,
    },
    from: () => ({
      update: (patch: unknown) => {
        net.profileUpdates.push(patch);
        return { eq: async () => ({ data: null, error: null }) };
      },
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
    }),
  }),
}));

import { FAITH_ANSWERS, clearFaithAnswersFromAccount, saveSpaceToAccount, withoutFaithAnswers } from "../accountSync";
import {
  ONBOARDING_VERSION,
  accountAnsweredThisVersion,
  fillSpaceFromAccount,
  readBackground,
  readFastingRule,
  readIntents,
  readLevel,
  readReturning,
  writeBackground,
  writeFastingRule,
  writeIntents,
  writeLevel,
  writeReturning,
} from "../state";

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
  };
}

beforeEach(() => {
  vi.stubGlobal("window", {
    localStorage: storage(),
    sessionStorage: storage(),
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  });
  vi.stubGlobal("document", { cookie: "" });
  net.space = null;
  net.signedIn = true;
  net.updateUser.mockClear();
  net.profileUpdates.length = 0;
});

/** A device whose reader answered everything: baptized Orthodox, back after time away. */
function answered() {
  writeBackground("orthodox");
  writeLevel("practicing");
  writeReturning(true);
  writeIntents(["prayer", "liturgy"]);
  writeFastingRule("modified");
}

const sent = () => net.updateUser.mock.calls.map((c) => c[0].data.purify_space);

describe("the answers about a reader's faith", () => {
  it("are three, and named", () => {
    expect([...FAITH_ANSWERS].sort()).toEqual(["background", "level", "returning"]);
  });

  it("are not in what is saved to the account, at the end of the questions or from Settings", async () => {
    answered();
    await saveSpaceToAccount({ finished: true });
    await saveSpaceToAccount();
    expect(net.updateUser).toHaveBeenCalledTimes(2);
    for (const space of sent()) {
      for (const key of FAITH_ANSWERS) expect(space).not.toHaveProperty(key);
      // No word of them under any other name either.
      const words = JSON.stringify(space);
      expect(words).not.toContain("practicing");
      expect(words).not.toContain("orthodox");
      expect(words).not.toContain("returning");
      // What the page names does go: what they are looking for, and the fast they keep.
      expect(space).toMatchObject({ intent: "prayer", intents: ["prayer", "liturgy"], fasting: "modified" });
    }
    // The end of the questions stamps the version; a change in Settings keeps what the copy carried.
    expect(sent()[0]).toMatchObject({ v: ONBOARDING_VERSION });
  });

  it("are never taken from an account onto a device", () => {
    const old = { level: "practicing", background: "orthodox", returning: true, intent: "study", intents: ["study", "saints"], fasting: "hidden", v: ONBOARDING_VERSION };
    fillSpaceFromAccount(old);
    expect(readLevel()).toBeNull();
    expect(readBackground()).toBeNull();
    expect(readReturning()).toBe(false);
    // The rest of the copy is still taken where this device has none.
    expect(readIntents()).toEqual(["study", "saints"]);
    expect(readFastingRule()).toBe("hidden");
  });

  it("are taken off a copy an account still holds, and the rest of the copy is left as it was", async () => {
    net.space = { level: "practicing", returning: true, background: "catholic", intent: "study", intents: ["study"], fasting: "strict", savedAt: "2026-10-01T10:00:00.000Z", v: 3 };
    await clearFaithAnswersFromAccount();
    expect(net.updateUser).toHaveBeenCalledTimes(1);
    expect(sent()[0]).toEqual({ intent: "study", intents: ["study"], fasting: "strict", savedAt: "2026-10-01T10:00:00.000Z", v: 3 });
  });

  it("are taken off once when two ask in the same moment, as a cold start does", async () => {
    net.space = { level: "learning", intent: "prayer", v: 4 };
    await Promise.all([clearFaithAnswersFromAccount(), clearFaithAnswersFromAccount()]);
    expect(net.updateUser).toHaveBeenCalledTimes(1);
    // And a later sign-in looks again.
    await clearFaithAnswersFromAccount();
    expect(net.updateUser).toHaveBeenCalledTimes(2);
  });

  it("and nothing is sent when the copy holds none of them, when there is no copy, or when nobody is signed in", async () => {
    net.space = { intent: "study", intents: ["study"], fasting: "strict", v: 4 };
    await clearFaithAnswersFromAccount();
    net.space = null;
    await clearFaithAnswersFromAccount();
    net.space = "practicing";
    await clearFaithAnswersFromAccount();
    net.signedIn = false;
    net.space = { level: "practicing" };
    await clearFaithAnswersFromAccount();
    expect(net.updateUser).not.toHaveBeenCalled();
  });

  it("withoutFaithAnswers says null when there is nothing to take off", () => {
    expect(withoutFaithAnswers({ intent: "prayer" })).toBeNull();
    expect(withoutFaithAnswers(undefined)).toBeNull();
    expect(withoutFaithAnswers(["level"])).toBeNull();
    expect(withoutFaithAnswers({ level: "inquirer", intent: "prayer" })).toEqual({ intent: "prayer" });
    // A key that is there with nothing in it is still taken off.
    expect(withoutFaithAnswers({ background: null, v: 4 })).toEqual({ v: 4 });
  });
});

describe("a second device of the same account", () => {
  it("knows the questions were answered by the version on the copy, with no level in it", () => {
    expect(accountAnsweredThisVersion({ intent: "prayer", v: ONBOARDING_VERSION })).toBe(true);
    expect(accountAnsweredThisVersion({ intent: "prayer", v: ONBOARDING_VERSION - 1 })).toBe(false);
    expect(accountAnsweredThisVersion({ intent: "prayer" })).toBe(false);
  });

  it("is asked the questions: the gate never finishes them on the account's word", () => {
    const gate = fs.readFileSync("components/onboarding/FirstRunGate.tsx", "utf8");
    // The faith answers are not in the account, so there is nothing to start this device from without asking.
    expect(gate).not.toContain("markOnboardedSilently");
    // Answered this version elsewhere: the first question, and never "We updated our onboarding", which would not be true.
    expect(gate).toMatch(/accountAnsweredThisVersion\(space\)[^;]*\)\s*\{\s*setResumeStage\("assessment"\);\s*if \(alive\) setStart\("level"\);/);
  });
});

describe("the code that keeps them home", () => {
  const sync = fs.readFileSync("lib/onboarding/accountSync.ts", "utf8");
  const bridge = fs.readFileSync("components/profile/ProfilePrefsBridge.tsx", "utf8");

  it("the account's copy is written with no faith answer in it", () => {
    const written = sync.slice(sync.indexOf("purify_space: {"), sync.indexOf("savedAt:"));
    expect(written.length).toBeGreaterThan(40);
    expect(written).not.toMatch(/\blevel\b/);
    expect(written).not.toMatch(/\bbackground\b/i);
    expect(written).not.toMatch(/\breturning\b/i);
    expect(sync).not.toContain("readBackground");
    expect(sync).not.toContain("readReturning");
  });

  it("a sign-in and a signed-in cold start both clear an older copy", () => {
    expect(bridge).toContain('from "@/lib/onboarding/accountSync"');
    expect(bridge.match(/clearFaithAnswersFromAccount\(\)/g)?.length).toBe(2);
  });
});
