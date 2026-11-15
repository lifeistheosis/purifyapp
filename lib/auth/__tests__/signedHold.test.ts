import fs from "node:fs";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import type { ResolvedAuth } from "@/lib/supabase/resolveUser";

import { HOLD_MS, forgetHold, holdStep, signedOutAtOnce, type HoldEnv } from "../signedHold";

// Gate 3c groups 1 and 2: a signed page met by a reader who is not signed in
// drew an empty waiting screen for 18 to 24 frames, then switched again to
// sign in. The rule (lib/auth/signedHold.ts): with no session stored, hold the
// page being left while the session is read, and go on from there.

function env(at: string) {
  let now = 0;
  let here = at;
  const timers: Array<() => void> = [];
  const e: HoldEnv = {
    now: () => now,
    here: () => here,
    wait: () => new Promise<void>((resolve) => timers.push(resolve)),
  };
  return {
    e,
    go: (to: string) => (here = to),
    later: (ms: number) => (now += ms),
    bound: () => timers.splice(0).forEach((fire) => fire()),
  };
}

function asker() {
  let settle: (a: ResolvedAuth) => void = () => {};
  const ask = vi.fn(() => new Promise<ResolvedAuth>((resolve) => (settle = resolve)));
  return { ask, answer: (a: ResolvedAuth) => settle(a) };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
let n = 0;
const fresh = () => `/account/data-${++n}`;

describe("a signed page with no session stored", () => {
  it("holds the page being left until the session read answers, asking once", () => {
    const { e } = env("/");
    const { ask } = asker();
    const page = fresh();
    const first = holdStep(page, ask, () => {}, e);
    const again = holdStep(page, ask, () => {}, e);
    expect("wait" in first).toBe(true);
    expect("wait" in again && "wait" in first && again.wait === first.wait).toBe(true);
    expect(ask).toHaveBeenCalledTimes(1);
  });

  it("signed out in time: goes on by a push from the page being left, and keeps holding", async () => {
    const { e } = env("/email/change/");
    const { ask, answer } = asker();
    const leave = vi.fn();
    const page = fresh();
    holdStep(page, ask, leave, e);
    answer({ state: "signed-out" });
    await flush();
    expect(leave).toHaveBeenCalledTimes(1);
    expect(leave).toHaveBeenCalledWith("push");
    // Never drawn: every render after it still holds.
    expect("wait" in holdStep(page, ask, leave, e)).toBe(true);
    expect(leave).toHaveBeenCalledTimes(1);
  });

  it("replaces when the address already shows the page (a step back, a cold start)", async () => {
    const page = fresh();
    const { e } = env(`${page}/`);
    const { ask, answer } = asker();
    const leave = vi.fn();
    holdStep(page, ask, leave, e);
    answer({ state: "signed-out" });
    await flush();
    expect(leave).toHaveBeenCalledWith("replace");
  });

  it("does not move a reader who went somewhere else meanwhile", async () => {
    const { e, go } = env("/");
    const { ask, answer } = asker();
    const leave = vi.fn();
    holdStep(fresh(), ask, leave, e);
    go("/bible/");
    answer({ state: "signed-out" });
    await flush();
    expect(leave).not.toHaveBeenCalled();
  });

  it("signed in: draws with the answer, never sent away", async () => {
    const { e } = env("/");
    const { ask, answer } = asker();
    const leave = vi.fn();
    const page = fresh();
    holdStep(page, ask, leave, e);
    answer({ state: "signed-in", user: { id: "u" } as never });
    await flush();
    const step = holdStep(page, ask, leave, e);
    expect("answer" in step && step.answer?.state).toBe("signed-in");
    expect(leave).not.toHaveBeenCalled();
  });

  it(`past the bound (${HOLD_MS} ms) the page draws its own waiting state, and a late answer moves nothing`, async () => {
    const { e, bound } = env("/");
    const { ask, answer } = asker();
    const leave = vi.fn();
    const page = fresh();
    holdStep(page, ask, leave, e);
    bound();
    await flush();
    const step = holdStep(page, ask, leave, e);
    expect("answer" in step && step.answer).toBe(null);
    answer({ state: "signed-out" });
    await flush();
    expect(leave).not.toHaveBeenCalled();
  });

  it("asks again on the next visit", async () => {
    const { e, later } = env("/");
    const { ask, answer } = asker();
    const page = fresh();
    holdStep(page, ask, () => {}, e);
    answer({ state: "signed-in", user: { id: "u" } as never });
    await flush();
    forgetHold(page);
    holdStep(page, ask, () => {}, e);
    expect(ask).toHaveBeenCalledTimes(2);
    later(10_000);
    holdStep(page, ask, () => {}, e);
    expect(ask).toHaveBeenCalledTimes(3);
  });
});

describe("every signed page that waits before sending a reader on uses the rule", () => {
  const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

  it("the account gate holds before it draws its waiting line", () => {
    const gate = read("components/account/AccountAuthGate.tsx");
    expect(gate).toMatch(/useSignedHold\(pathname, away, isNativeClient\)/);
    expect(gate.indexOf("useSignedHold(")).toBeLessThan(gate.indexOf("ui.loadingYourAccount"));
  });

  it("the plan screen holds before it draws its waiting line", () => {
    const plan = read("components/premium/PlanScreen.tsx");
    expect(plan).toMatch(/useSignedHold\("\/plan", NO_PLAN/);
  });

  it("the apps' set-password page decides on the device, with no baked redirect", () => {
    const page = read("app/(auth)/set-password/page.tsx");
    const exported = page.slice(page.indexOf("if (IS_STATIC_EXPORT)"), page.indexOf("const supabase"));
    expect(exported).toMatch(/<AccountAuthGate to="\/signin">/);
    expect(exported).not.toMatch(/redirect\(/);
  });
});

// /set-password/'s blank (Updates 83, 1 of 8; Updates 90, 1 of 2; Gate 4, 1 of 3; mended by Updates 92). With no
// session kept on the device the hold asked the session read, and on a cold client that read could outlast
// HOLD_MS: the bound passed first, the gate drew its waiting line, and its own read sent the reader on 22 frames
// later. The read can only say what the device keeps, so a device that keeps none is signed out at once.
describe("a device with no session kept is signed out at once (Updates 92)", () => {
  it("goes on before any bound passes, however slow the bound", async () => {
    const path = "/set-password-at-once";
    const env: HoldEnv = { now: () => 0, here: () => "/settings", wait: () => new Promise(() => {}) };
    const leave = vi.fn();
    const first = holdStep(path, signedOutAtOnce, leave, env);
    expect("wait" in first).toBe(true);
    await Promise.resolve();
    await Promise.resolve();
    expect(leave).toHaveBeenCalledTimes(1);
    expect(leave).toHaveBeenCalledWith("push");
    // Still holding the page being left while the router takes the reader on: never the waiting line.
    expect("wait" in holdStep(path, signedOutAtOnce, leave, env)).toBe(true);
    expect(leave).toHaveBeenCalledTimes(1);
  });

  it("asks the session read nothing while it holds, so a cold client's slow read cannot pass the bound", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "lib/auth/signedHold.ts"), "utf8");
    const hook = /export function useSignedHold[\s\S]*?\n\}/.exec(src)?.[0] ?? "";
    expect(hook).toContain("holdStep(path, signedOutAtOnce,");
    expect(hook).not.toMatch(/resolveUser/);
    // A device with a session kept is never held: it arrives as before.
    expect(hook).toContain("readLocalSessionUser()) return undefined;");
  });
});
