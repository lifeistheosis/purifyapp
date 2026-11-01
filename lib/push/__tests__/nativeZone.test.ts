import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A phone's time zone, as the server holds it (lib/push/native.ts,
 * refreshNativeIfMoved). The server sends each reminder at the hour on the
 * reader's clock in the zone the phone last sent, and the phone sent it only
 * at launch: an app kept in the background through a flight went on being
 * reminded on the old zone's hours. Phone apps only; nothing here can be
 * walked in a browser.
 */

const state = vi.hoisted(() => ({
  store: new Map<string, string>(),
  zone: "America/New_York",
  posts: [] as Record<string, unknown>[],
  answer: { status: 200, ok: true } as { status: number; ok: boolean },
  listeners: new Map<string, (arg: unknown) => unknown>(),
}));

vi.mock("@/lib/platform/native", () => ({ nativePlatform: () => "ios" }));
vi.mock("@/lib/api/client", () => ({
  apiFetch: async (_path: string, init: RequestInit = {}) => {
    if (init.body) state.posts.push(JSON.parse(String(init.body)));
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

import { flushPendingNative, refreshNative, refreshNativeIfMoved, updateNativeTimes } from "../native";

const ON = "purify:push.native-on";
const ZONE = "purify:push.native-zone";
const PENDING = "purify:push.pending-native";

beforeEach(() => {
  state.store = new Map([[ON, "1"]]);
  state.zone = "America/New_York";
  state.posts = [];
  state.answer = { status: 200, ok: true };
  const real = Intl.DateTimeFormat.prototype.resolvedOptions;
  vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockImplementation(function (this: Intl.DateTimeFormat) {
    return { ...real.call(this), timeZone: state.zone };
  });
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => state.store.get(k) ?? null,
      setItem: (k: string, v: string) => void state.store.set(k, v),
      removeItem: (k: string) => void state.store.delete(k),
    },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("the zone a phone's reminders keep", () => {
  it("is recorded when the server takes it", async () => {
    await refreshNative();
    expect(state.posts.at(-1)?.timezone).toBe("America/New_York");
    expect(state.store.get(ZONE)).toBe("America/New_York");
  });

  it("is sent again when the app comes back to the front somewhere else", async () => {
    await refreshNative();
    state.posts = [];
    state.zone = "Europe/Athens";
    await refreshNativeIfMoved();
    expect(state.posts).toHaveLength(1);
    expect(state.posts[0]).toMatchObject({ token: "the-phones-token", timezone: "Europe/Athens" });
    expect(state.store.get(ZONE)).toBe("Europe/Athens");
    // And not again while it stays there.
    await refreshNativeIfMoved();
    expect(state.posts).toHaveLength(1);
  });

  it("sends nothing on a return in the same zone, or with reminders off", async () => {
    await refreshNative();
    state.posts = [];
    await refreshNativeIfMoved();
    expect(state.posts).toEqual([]);
    state.zone = "Europe/Athens";
    state.store.delete(ON);
    await refreshNativeIfMoved();
    expect(state.posts).toEqual([]);
  });

  it("leaves a phone that has not recorded one to its launch, which sends it anyway", async () => {
    // An install from before this note existed.
    state.zone = "Europe/Athens";
    await refreshNativeIfMoved();
    expect(state.posts).toEqual([]);
  });

  it("is kept as it was when the server does not take it, so the next return tries again", async () => {
    await refreshNative();
    state.zone = "Europe/Athens";
    state.answer = { status: 500, ok: false };
    await refreshNativeIfMoved();
    expect(state.store.get(ZONE)).toBe("America/New_York");
    state.answer = { status: 200, ok: true };
    state.posts = [];
    await refreshNativeIfMoved();
    expect(state.posts[0]?.timezone).toBe("Europe/Athens");
  });

  it("goes with a change of time, and with a registration kept from before an account", async () => {
    state.store.set("purify:push.native-token", "the-phones-token");
    state.zone = "Asia/Tbilisi";
    expect(await updateNativeTimes({ morning: "06:00" })).toBe("saved");
    expect(state.store.get(ZONE)).toBe("Asia/Tbilisi");
    // Kept while signed out in New York, sent at the sign-in in Athens.
    state.store.set(
      PENDING,
      JSON.stringify({ token: "the-phones-token", platform: "ios", morningTime: "07:00", eveningTime: "21:00", timezone: "America/New_York" }),
    );
    state.zone = "Europe/Athens";
    await flushPendingNative();
    expect(state.posts.at(-1)?.timezone).toBe("Europe/Athens");
    expect(state.store.get(ZONE)).toBe("Europe/Athens");
  });
});
