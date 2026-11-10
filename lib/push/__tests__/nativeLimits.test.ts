import { readFileSync } from "node:fs";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Turning reminders on never leaves its button waiting for good, and says
 * which wait failed (lib/push/native.ts; build 90, note 2: "turning on
 * notifications doesn't work").
 *
 * Only the wait for the website had a limit. A phone whose own code never
 * answered (its notifications check, the listeners, the request for its
 * address) held the button on "…" until the app was closed, and every
 * failure came back as one word. Now each wait on the phone has a limit, and
 * a failure says whether it was the phone, the address, the connection or
 * the website.
 */

const never = () => new Promise<never>(() => {});

const state = vi.hoisted(() => ({
  store: new Map<string, string>(),
  asked: [] as string[],
  listeners: new Map<string, (arg: unknown) => unknown>(),
  /** How each call into the phone behaves in this test. */
  phoneCheck: "answers" as "answers" | "silent",
  listen: "answers" as "answers" | "silent",
  register: "address" as "address" | "silent" | "throws" | "error-event",
  website: { status: 200, ok: true } as { status: number; ok: boolean } | "unreachable",
}));

vi.mock("@/lib/supabase/localSession", () => ({ readLocalSessionUser: () => ({ id: "ben" }) }));
vi.mock("@/lib/platform/native", () => ({ nativePlatform: () => "android", isNativeClient: () => true }));
vi.mock("@/lib/api/client", () => ({
  apiFetch: async () => {
    state.asked.push("POST /api/push/device");
    if (state.website === "unreachable") throw new TypeError("Failed to fetch");
    return state.website;
  },
}));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isPluginAvailable: (name: string) => name === "WidgetBridge" },
  registerPlugin: () => ({
    update: async () => ({ stored: 0 }),
    notificationsEnabled: () => (state.phoneCheck === "silent" ? never() : Promise.resolve({ enabled: true })),
  }),
}));
vi.mock("@capacitor/push-notifications", () => ({
  PushNotifications: {
    checkPermissions: async () => ({ receive: "granted" }),
    requestPermissions: async () => ({ receive: "granted" }),
    addListener: (name: string, fn: (arg: unknown) => unknown) => {
      if (state.listen === "silent") return never();
      state.listeners.set(name, fn);
      return Promise.resolve({ remove: async () => {} });
    },
    register: () => {
      state.asked.push("register");
      if (state.register === "silent") return never();
      if (state.register === "throws") return Promise.reject(new Error("no Firebase"));
      if (state.register === "error-event") void state.listeners.get("registrationError")?.({ error: "SERVICE_NOT_AVAILABLE" });
      else void state.listeners.get("registration")?.({ value: "the-phones-token" });
      return Promise.resolve();
    },
  },
}));

import { PHONE_WAIT_MS, SAVE_WAIT_MS, enableNative } from "../native";

beforeEach(() => {
  vi.useFakeTimers();
  state.store = new Map();
  state.asked = [];
  state.phoneCheck = "answers";
  state.listen = "answers";
  state.register = "address";
  state.website = { status: 200, ok: true };
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => state.store.get(k) ?? null,
      setItem: (k: string, v: string) => void state.store.set(k, v),
      removeItem: (k: string) => void state.store.delete(k),
    },
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/**
 * Let the limits pass, however many there are on the way. The code loads
 * its plugins as it goes, and a limit's clock starts only after that, so the
 * clock is moved on in steps until the answer is there.
 */
async function settle<T>(going: Promise<T>): Promise<T> {
  let done = false;
  void going.then(
    () => (done = true),
    () => (done = true),
  );
  for (let i = 0; i < 40 && !done; i++) {
    await vi.dynamicImportSettled();
    await vi.advanceTimersByTimeAsync(PHONE_WAIT_MS);
  }
  expect(done, `no answer after ${2 * PHONE_WAIT_MS + SAVE_WAIT_MS} ms and more`).toBe(true);
  return going;
}

describe("turning reminders on never waits for good", () => {
  it("says the phone did not answer when its listeners never attach, and asks from the start at the next tap", async () => {
    state.listen = "silent";
    expect(await settle(enableNative())).toEqual({ ok: false, reason: "failed", why: "phone" });
    expect(state.asked).not.toContain("register");
    // The same tap again, on a phone that now answers.
    state.listen = "answers";
    expect(await settle(enableNative())).toEqual({ ok: true });
  });

  it("goes on when the phone's own notifications check never answers", async () => {
    state.phoneCheck = "silent";
    expect(await settle(enableNative())).toEqual({ ok: true });
    expect(state.asked).toEqual(["register", "POST /api/push/device"]);
  });

  it("says no address came when the request for one never answers", async () => {
    state.register = "silent";
    expect(await settle(enableNative())).toEqual({ ok: false, reason: "failed", why: "no-address" });
    expect(state.asked).toEqual(["register"]);
  });

  it("does not wait at all when the phone refuses the request outright", async () => {
    state.register = "throws";
    // No timer is advanced: the answer is there at once.
    expect(await enableNative()).toEqual({ ok: false, reason: "failed", why: "phone" });
  });

  it("says no address came when Google or Apple say so", async () => {
    state.register = "error-event";
    expect(await enableNative()).toEqual({ ok: false, reason: "failed", why: "no-address" });
  });

  it("tells a website that cannot be reached from one that says no", async () => {
    state.website = "unreachable";
    expect(await enableNative()).toEqual({ ok: false, reason: "failed", why: "offline" });
    state.website = { status: 500, ok: false };
    expect(await enableNative()).toEqual({ ok: false, reason: "failed", why: "refused" });
  });

  it("is held to a limit at every wait but the phone's own question", () => {
    const code = readFileSync("lib/push/native.ts", "utf8");
    const body = code.slice(code.indexOf("export async function enableNative("), code.indexOf("export async function disableNative("));
    // The only bare awaits left are the plugin's own file, the reader's
    // answer to the phone's question, and the two waits that carry a limit.
    const awaits = [...body.matchAll(/await ([^;\n]+)/g)].map((m) => m[1].trim());
    expect(awaits).toEqual([
      'import("@capacitor/push-notifications")',
      "PushNotifications.requestPermissions()",
      "blockedOnPhone())) {",
      "within(attachListeners(), PHONE_WAIT_MS)) === LATE) {",
      "saved",
    ]);
    expect(code).toContain("return (await within(phoneNotificationsEnabled(), PHONE_WAIT_MS)) === false;");
  });
});

describe("the questions' reminders step", () => {
  const flow = readFileSync("components/onboarding/OnboardingFlow.tsx", "utf8").replace(/\s+/g, " ");

  it("never draws the button that turns reminders on to a reader with no account", () => {
    // The sign-in is offered at once; the button is the last branch, reached only with a session.
    expect(flow).toContain(") : needsAccount || !readLocalSessionUser() ? (");
    const at = flow.indexOf(") : needsAccount || !readLocalSessionUser() ? (");
    const button = flow.indexOf('t("onboard.reminders.enable")');
    expect(button).toBeGreaterThan(at);
    expect(flow.split('t("onboard.reminders.enable")').length - 1).toBe(1);
  });

  it("offers the tap again after a failure, and never where the device cannot have reminders", () => {
    expect(flow).toContain('setReminderFail({ again: result.reason !== "unsupported", why: result.why ?? null });');
    expect(flow).toContain('{reminderFail?.again ? ( <PrimaryButton onClick={() => void enableReminders()} disabled={busy}> {t("error.tryAgain")} </PrimaryButton> ) : null}');
  });

  it("says which wait it was to a tester alone", () => {
    expect(flow).toContain("{reminderFail?.why && isTesting() ? (");
    const en = JSON.parse(readFileSync("lib/i18n/messages/en.json", "utf8")) as Record<string, string>;
    for (const why of ["phone", "no-address", "offline", "refused"]) {
      expect(en[`testers.reminders.${why}`], why).toMatch(/^Testers: /);
      expect(en[`testers.reminders.${why}`], why).not.toContain("—");
    }
  });
});

describe("the same handling on Today's account card and in Settings", () => {
  const card = readFileSync("components/onboarding/RoadCards.tsx", "utf8").replace(/\s+/g, " ");
  const settings = readFileSync("components/profile/PushOptIn.tsx", "utf8").replace(/\s+/g, " ");

  it("offers the tap again on the card, and never where the device cannot have reminders", () => {
    expect(card).toContain('setFail({ again: result.reason !== "unsupported", why: result.why ?? null });');
    expect(card).toContain('{note && fail?.again ? (');
    expect(card).toContain('<button type="button" onClick={() => void turnOn()} disabled={busy} className={WAY_ON}> {t("error.tryAgain")} </button>');
    expect(card).toContain("fine={fail?.why && isTesting() ? t(`testers.reminders.${fail.why}`) : null}");
  });

  it("offers the tap again in Settings, after a failure and after notifications were blocked", () => {
    expect(settings).toContain('{busy ? t("prayers.push.turningOn") : failed ? t("error.tryAgain") : t("prayers.push.turnOn")}');
    expect(settings).toContain('{busy ? t("prayers.push.turningOn") : t("error.tryAgain")}');
    expect(settings).toContain("{failed?.why && isTesting() ? (");
    // And its button is a full 44px target.
    expect(settings).toMatch(/const TURN_ON = "inline-flex min-h-11 /);
  });
});

