import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Reminders and an account (lib/push/native.ts, lib/push/reminders.ts,
 * lib/push/wish.ts). A phone's token and a browser's subscription are kept
 * for an account and nowhere else, so with nobody signed in no reminder can
 * ever come. Until 2026-10-31 such a reader was asked the phone's question,
 * told "on", and heard nothing until they happened to sign in. Now nothing
 * is asked of the device, the caller is told "signed-out" and asks for a
 * sign-in, and "on" waits for the server to hold the token.
 */

const state = vi.hoisted(() => ({
  store: new Map<string, string>(),
  user: { id: "ben" } as { id: string } | null,
  native: true,
  asked: [] as string[],
  answer: { status: 200, ok: true } as { status: number; ok: boolean } | "silent",
  listeners: new Map<string, (arg: unknown) => unknown>(),
}));

vi.mock("@/lib/supabase/localSession", () => ({ readLocalSessionUser: () => state.user }));
vi.mock("@/lib/platform/native", () => ({
  nativePlatform: () => (state.native ? "android" : null),
  isNativeClient: () => state.native,
}));
vi.mock("@/lib/api/client", () => ({
  apiFetch: async () => {
    state.asked.push("POST /api/push/device");
    return state.answer === "silent" ? new Promise(() => {}) : state.answer;
  },
}));
vi.mock("@capacitor/push-notifications", () => ({
  PushNotifications: {
    checkPermissions: async () => ({ receive: "granted" }),
    requestPermissions: async () => {
      state.asked.push("the phone's question");
      return { receive: "granted" };
    },
    addListener: async (name: string, fn: (arg: unknown) => unknown) => {
      state.listeners.set(name, fn);
      return { remove: async () => {} };
    },
    register: async () => {
      state.asked.push("register");
      void state.listeners.get("registration")?.({ value: "the-phones-token" });
    },
  },
}));

import { enableNative, nativeStatus, SAVE_WAIT_MS } from "../native";
import { enableReminders, remindersStatus } from "../reminders";
import { clearReminderWish, keepReminderWish, readReminderWish } from "../wish";

const ON = "purify:push.native-on";

beforeEach(() => {
  state.store = new Map();
  state.user = { id: "ben" };
  state.native = true;
  state.asked = [];
  state.answer = { status: 200, ok: true };
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

describe("turning reminders on with nobody signed in", () => {
  it("asks the phone nothing and says why, on a phone", async () => {
    state.user = null;
    expect(await enableNative()).toEqual({ ok: false, reason: "signed-out" });
    expect(state.asked).toEqual([]);
    expect(state.store.has(ON)).toBe(false);
  });

  it("asks the browser nothing and says why, on the website", async () => {
    state.user = null;
    state.native = false;
    expect(await enableReminders()).toEqual({ ok: false, reason: "signed-out" });
  });

  it("never shows reminders as on while nobody is signed in", async () => {
    state.store.set(ON, "1");
    expect(await nativeStatus()).toBe("subscribed");
    state.user = null;
    expect(await nativeStatus()).toBe("not-subscribed");
    expect(await remindersStatus()).toBe("not-subscribed");
  });
});

describe("turning reminders on, signed in", () => {
  it("says on once the server holds the phone, and not before", async () => {
    expect(await enableNative()).toEqual({ ok: true });
    expect(state.asked).toEqual(["the phone's question", "register", "POST /api/push/device"]);
    expect(state.store.get(ON)).toBe("1");
  });

  it("says it did not work when the server refuses, and keeps nothing to send behind the reader's back", async () => {
    state.answer = { status: 500, ok: false };
    expect(await enableNative()).toEqual({ ok: false, reason: "failed", why: "refused" });
    expect(state.store.has(ON)).toBe(false);
    expect(state.store.has("purify:push.pending-native")).toBe(false);
  });

  it("says signed-out when the server no longer knows the session", async () => {
    state.answer = { status: 401, ok: false };
    expect(await enableNative()).toEqual({ ok: false, reason: "signed-out" });
    expect(state.store.has(ON)).toBe(false);
  });

  it("gives up waiting after a while, and says so", async () => {
    vi.useFakeTimers();
    state.answer = "silent";
    const going = enableNative();
    // The wait begins before the phone is asked for its token, so once the
    // token has gone to the server the clock it waits on exists.
    await vi.waitFor(() => expect(state.asked).toContain("POST /api/push/device"));
    await vi.advanceTimersByTimeAsync(SAVE_WAIT_MS);
    // The phone's address had come; it was the website that never answered.
    expect(await going).toEqual({ ok: false, reason: "failed", why: "offline" });
    expect(state.store.has(ON)).toBe(false);
  });
});

describe("the wish kept across the sign-in", () => {
  it("keeps the times asked for, and is gone once cleared", () => {
    expect(readReminderWish()).toBeNull();
    keepReminderWish({ morning: "07:00", evening: "21:00" });
    expect(readReminderWish()).toEqual({ morning: "07:00", evening: "21:00" });
    clearReminderWish();
    expect(readReminderWish()).toBeNull();
  });

  it("reads a broken one as no wish at all, and never hands on a broken time", () => {
    state.store.set("purify:push.wish", "{not json");
    expect(readReminderWish()).toBeNull();
    state.store.set("purify:push.wish", JSON.stringify({ morning: "25:99", evening: "21:00" }));
    expect(readReminderWish()).toEqual({ morning: "07:00", evening: "21:00" });
  });
});
