import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A phone's reminder times. The phone keeps its own copy
 * (purify:push.native-times) and sends it with its token at every launch, so
 * the copy is what the server ends up holding. The account screen read
 * neither the copy nor the server and showed 07:00 and 21:00 after every
 * launch; leaving a field then wrote the shown pair into the copy and sent
 * it, so moving the evening put the morning back to 07:00 for good, since
 * every later launch sent it again. These cannot be walked in a browser:
 * they are the phone apps only.
 */

const state = vi.hoisted(() => ({
  store: new Map<string, string>(),
  platform: "android" as "android" | "ios" | null,
  posts: [] as Record<string, unknown>[],
  answer: { status: 200, ok: true } as { status: number; ok: boolean } | "offline",
  listeners: new Map<string, (arg: unknown) => unknown>(),
}));

vi.mock("@/lib/platform/native", () => ({ nativePlatform: () => state.platform }));
vi.mock("@/lib/api/client", () => ({
  apiFetch: async (path: string, init: RequestInit = {}) => {
    expect(path).toBe("/api/push/device");
    state.posts.push(JSON.parse(String(init.body)));
    if (state.answer === "offline") throw new TypeError("Failed to fetch");
    return state.answer;
  },
}));
vi.mock("@capacitor/push-notifications", () => ({
  PushNotifications: {
    checkPermissions: async () => ({ receive: "granted" }),
    addListener: async (name: string, fn: (arg: unknown) => unknown) => {
      state.listeners.set(name, fn);
      return { remove: async () => {} };
    },
    register: async () => {
      await state.listeners.get("registration")?.({ value: "the-phones-token" });
    },
  },
}));

import { flushPendingNative, nativeReminderTimes, refreshNative, updateNativeTimes } from "../native";

const ON = "purify:push.native-on";
const TOKEN = "purify:push.native-token";
const TIMES = "purify:push.native-times";
const PENDING = "purify:push.pending-native";

beforeEach(() => {
  state.store = new Map([
    [ON, "1"],
    [TOKEN, "the-phones-token"],
    [TIMES, JSON.stringify({ morning: "06:15", evening: "22:30" })],
  ]);
  state.platform = "android";
  state.posts = [];
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
  vi.unstubAllGlobals();
});

const times = (body: Record<string, unknown>) => ({ morningTime: body.morningTime, eveningTime: body.eveningTime });
const copy = () => JSON.parse(state.store.get(TIMES)!);

describe("the times a phone shows", () => {
  it("shows the phone's own copy", () => {
    expect(nativeReminderTimes()).toEqual({ morning: "06:15", evening: "22:30" });
  });

  it("shows the defaults only where the phone has none, or a broken one", () => {
    state.store.delete(TIMES);
    expect(nativeReminderTimes()).toEqual({ morning: "07:00", evening: "21:00" });
    state.store.set(TIMES, "{not json");
    expect(nativeReminderTimes()).toEqual({ morning: "07:00", evening: "21:00" });
  });
});

describe("a change to one time on a phone", () => {
  it("changes that time in the copy and sends the reader's other one, not a default", async () => {
    expect(await updateNativeTimes({ evening: "23:00" })).toBe("saved");
    expect(copy()).toEqual({ morning: "06:15", evening: "23:00" });
    expect(times(state.posts[0])).toEqual({ morningTime: "06:15", eveningTime: "23:00" });
  });

  it("is kept in the copy when the server does not take it, and the next launch sends it", async () => {
    state.answer = { status: 401, ok: false };
    expect(await updateNativeTimes({ morning: "05:30" })).toBe("kept");
    state.answer = "offline";
    expect(await updateNativeTimes({ evening: "23:00" })).toBe("kept");
    expect(copy()).toEqual({ morning: "05:30", evening: "23:00" });

    state.answer = { status: 200, ok: true };
    state.posts = [];
    await refreshNative();
    expect(times(state.posts[0])).toEqual({ morningTime: "05:30", eveningTime: "23:00" });
  });

  it("sends the phone's times now, not the ones a kept registration was made with", async () => {
    // Kept while offline with onboarding's times; the reader changed one since.
    state.store.set(
      PENDING,
      JSON.stringify({ token: "the-phones-token", platform: "android", morningTime: "07:00", eveningTime: "21:00", timezone: "UTC" }),
    );
    await flushPendingNative();
    expect(state.posts[0]).toMatchObject({ token: "the-phones-token", morningTime: "06:15", eveningTime: "22:30" });
    expect(state.store.has(PENDING)).toBe(false);
  });
});
