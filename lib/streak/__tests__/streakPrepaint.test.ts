import vm from "node:vm";
import { describe, expect, it } from "vitest";

import { STREAK_PREPAINT } from "../streakPrepaint";

/** Run the pre-paint string the way the browser does, over a stored device, and say whether it set data-kept. */
function kept(stored: Record<string, string>, throws = false): boolean {
  let set = false;
  const keys = Object.keys(stored);
  const localStorage = {
    get length() {
      if (throws) throw new Error("blocked");
      return keys.length;
    },
    key: (i: number) => keys[i] ?? null,
    getItem: (k: string) => (k in stored ? stored[k] : null),
  };
  const sandbox: Record<string, unknown> = {
    localStorage,
    document: { documentElement: { setAttribute: (k: string) => k === "data-kept" && (set = true) } },
  };
  sandbox.window = sandbox;
  vm.runInNewContext(STREAK_PREPAINT, sandbox);
  return set;
}

describe("the streak pre-paint (1.9, no zero as a first sight)", () => {
  it("marks a device that holds a kept day, in any rule's ledger", () => {
    expect(kept({ "purify.prayers.morning.dates": JSON.stringify(["2026-11-12"]) })).toBe(true);
    expect(kept({ "purify.locale": "en", "purify.prayers.mine-evening.dates": JSON.stringify(["2026-11-01", "2026-11-02"]) })).toBe(true);
  });

  it("marks the legacy count the ledgers replaced, and the server's last answer with a best", () => {
    expect(kept({ "purify.prayers.evening.streak": "3", "purify.prayers.evening.last": "20261112" })).toBe(true);
    expect(kept({ "purify.streak.server": JSON.stringify({ state: "ok", best: 5, current: 0, strip: [] }) })).toBe(true);
  });

  it("leaves a new reader unmarked: nothing stored, empty ledgers, a zero best", () => {
    expect(kept({})).toBe(false);
    expect(kept({ "purify.prayers.morning.dates": "[]", "purify:onboarded": "1" })).toBe(false);
    expect(kept({ "purify.prayers.morning.streak": "0" })).toBe(false);
    expect(kept({ "purify.streak.server": JSON.stringify({ state: "ok", best: 0, current: 0, strip: [] }) })).toBe(false);
    expect(kept({ "purify.prayers.morning.dates": "not json" })).toBe(false);
  });

  it("says nothing, and throws nothing, where storage is blocked", () => {
    expect(kept({ "purify.prayers.morning.dates": JSON.stringify(["2026-11-12"]) }, true)).toBe(false);
  });
});
