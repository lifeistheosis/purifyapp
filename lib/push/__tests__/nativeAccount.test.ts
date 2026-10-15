import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Whose phone it is: the app's half of /api/push/device (deviceRoute.test.ts
 * is the server's).
 *
 * A phone's token is saved for whoever is signed in when the app sends it.
 * Before 2026-10-14 it was sent only at launch and never taken back, so a
 * phone kept showing the account that had signed out of it, and an account
 * that signed in heard nothing until the app was closed and opened again.
 * relinkNative sends it after a sign-in, unlinkNative takes it back before a
 * sign-out. Neither can be walked in a browser: both are the phone apps only.
 */

const state = vi.hoisted(() => ({
  store: new Map<string, string>(),
  platform: "android" as "android" | "ios" | null,
  calls: [] as string[],
  answer: { status: 200, ok: true } as { status: number; ok: boolean } | "never",
  listeners: new Map<string, (arg: unknown) => unknown>(),
  receive: "granted",
}));

vi.mock("@/lib/platform/native", () => ({ nativePlatform: () => state.platform }));
vi.mock("@/lib/api/client", () => ({
  apiFetch: (path: string, init: RequestInit = {}) => {
    state.calls.push(`${init.method ?? "GET"} ${path}`);
    if (state.answer === "never") return new Promise(() => {});
    return Promise.resolve(state.answer);
  },
}));
vi.mock("@capacitor/push-notifications", () => ({
  PushNotifications: {
    checkPermissions: async () => ({ receive: state.receive }),
    addListener: async (name: string, fn: (arg: unknown) => unknown) => {
      state.listeners.set(name, fn);
      return { remove: async () => {} };
    },
    // The plugin answers a register() with the phone's token, a moment later.
    register: async () => {
      state.calls.push("register");
      await state.listeners.get("registration")?.({ value: "the-phones-token" });
    },
  },
}));

import { relinkNative, unlinkNative, UNLINK_WAIT_MS } from "../native";

const ON = "purify:push.native-on";
const TOKEN = "purify:push.native-token";
const USER = "purify:push.native-user";
const PENDING = "purify:push.pending-native";

beforeEach(() => {
  state.store = new Map();
  state.platform = "android";
  state.calls = [];
  state.answer = { status: 200, ok: true };
  state.receive = "granted";
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

describe("relinkNative: a sign-in", () => {
  it("sends this phone's token for the account that signed in", async () => {
    state.store.set(ON, "1");
    await relinkNative("ben");
    expect(state.calls).toEqual(["register", "POST /api/push/device"]);
    expect(state.store.get(USER)).toBe("ben");
  });

  it("does it once per account, though Supabase says SIGNED_IN at every return to the app", async () => {
    state.store.set(ON, "1");
    await relinkNative("ben");
    state.calls = [];
    await relinkNative("ben");
    await relinkNative("ben");
    expect(state.calls).toEqual([]);
    // Another account on the same phone is a new owner.
    await relinkNative("anna");
    expect(state.calls).toEqual(["register", "POST /api/push/device"]);
  });

  it("sends first what was kept from before there was an account", async () => {
    // Turned on during onboarding, signed out: the server said 401 and the
    // payload waited for an account, which only /account used to send.
    state.store.set(ON, "1");
    state.store.set(PENDING, JSON.stringify({ token: "the-phones-token", platform: "android" }));
    await relinkNative("ben");
    expect(state.calls[0]).toBe("POST /api/push/device");
    expect(state.store.has(PENDING)).toBe(false);
  });

  it("does nothing for a reader who has notifications off here, or in a browser", async () => {
    await relinkNative("ben");
    expect(state.calls).toEqual([]);
    expect(state.store.has(USER)).toBe(false);
    state.store.set(ON, "1");
    state.platform = null;
    await relinkNative("ben");
    expect(state.calls).toEqual([]);
  });
});

describe("unlinkNative: a sign-out", () => {
  it("takes this phone off the account and keeps the reader's choice", async () => {
    state.store.set(ON, "1");
    state.store.set(TOKEN, "the-phones-token");
    state.store.set(USER, "ben");
    await unlinkNative();
    expect(state.calls).toEqual(["DELETE /api/push/device?token=the-phones-token"]);
    expect(state.store.has(USER)).toBe(false);
    // On, so the next account to sign in gets the phone.
    expect(state.store.get(ON)).toBe("1");
    await relinkNative("anna");
    expect(state.calls.slice(1)).toEqual(["register", "POST /api/push/device"]);
  });

  it("never holds the sign-out up", async () => {
    vi.useFakeTimers();
    state.store.set(TOKEN, "the-phones-token");
    state.answer = "never";
    let done = false;
    const going = unlinkNative().then(() => {
      done = true;
    });
    await vi.advanceTimersByTimeAsync(UNLINK_WAIT_MS - 1);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await going;
    expect(done).toBe(true);
    expect(UNLINK_WAIT_MS).toBeLessThanOrEqual(2500);
  });

  it("sends nothing from a browser, or from a phone that never had a token", async () => {
    await unlinkNative();
    state.platform = null;
    state.store.set(TOKEN, "the-phones-token");
    await unlinkNative();
    expect(state.calls).toEqual([]);
  });
});
