import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A tapped notification on a phone, from the app's side (lib/push/native.ts,
 * listenForTaps). The tap listener used to be attached only with the
 * registration ones, three seconds after launch and only where this phone's
 * own note said reminders were on: a notification that launched the app
 * showed Today first, and one that came while the note was missing opened
 * only Today. And Android hands an app rebuilt from the recent apps list the
 * intent that first started it, so an old tap came back with it.
 *
 * None of this can be walked in a browser: both are the phone apps only.
 */

const state = vi.hoisted(() => ({
  store: new Map<string, string>(),
  platform: "android" as "android" | "ios" | null,
  added: [] as string[],
  listeners: new Map<string, (arg: unknown) => unknown>(),
}));

vi.mock("@/lib/platform/native", () => ({ nativePlatform: () => state.platform }));
vi.mock("@/lib/api/client", () => ({
  apiFetch: () => Promise.resolve({ status: 200, ok: true }),
}));
vi.mock("@capacitor/push-notifications", () => ({
  PushNotifications: {
    checkPermissions: async () => ({ receive: "granted" }),
    requestPermissions: async () => ({ receive: "granted" }),
    addListener: async (name: string, fn: (arg: unknown) => unknown) => {
      state.added.push(name);
      state.listeners.set(name, fn);
      return { remove: async () => {} };
    },
    register: async () => {},
  },
}));

const TAP = "pushNotificationActionPerformed";
const ON = "purify:push.native-on";

/** A fresh copy of both modules, so each test starts before any listener. */
async function fresh() {
  vi.resetModules();
  const native = await import("../native");
  const open = await import("../open");
  const opened: string[] = [];
  open.setPushOpener((url) => opened.push(url));
  return { native, opened };
}

function tap(id: string | undefined, url: string, actionId = "tap") {
  return state.listeners.get(TAP)?.({ actionId, notification: { id, data: { url } } });
}

beforeEach(() => {
  state.store = new Map();
  state.platform = "android";
  state.added = [];
  state.listeners = new Map();
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

describe("listenForTaps", () => {
  it("listens on a phone whose reminders are off, and opens what was tapped", async () => {
    const { native, opened } = await fresh();
    expect(state.store.has(ON)).toBe(false);
    await native.listenForTaps();
    expect(state.added).toEqual([TAP]);
    tap("0:1700000000%abc", "/community#post-123");
    expect(opened).toEqual(["/community#post-123"]);
  });

  it("does nothing in a browser", async () => {
    state.platform = null;
    const { native } = await fresh();
    await native.listenForTaps();
    expect(state.added).toEqual([]);
  });

  it("listens once, however often it is asked, and turning reminders on adds no second", async () => {
    const { native, opened } = await fresh();
    await native.listenForTaps();
    await native.listenForTaps();
    await native.enableNative();
    state.store.set(ON, "1");
    await native.refreshNative();
    expect(state.added.filter((n) => n === TAP)).toHaveLength(1);
    // The registration listeners still arrive with reminders, as before.
    expect(state.added).toContain("registration");
    tap("id-1", "/prayers/morning");
    expect(opened).toEqual(["/prayers/morning"]);
  });

  it("does not open the same tap twice when Android hands it back", async () => {
    const { native, opened } = await fresh();
    await native.listenForTaps();
    tap("0:1700000000%abc", "/prayers/morning");
    // The app was cleared from memory and opened again from the recent apps:
    // a new app life, the same intent, the same tap.
    const again = await fresh();
    await again.native.listenForTaps();
    tap("0:1700000000%abc", "/prayers/morning");
    expect(opened).toEqual(["/prayers/morning"]);
    expect(again.opened).toEqual([]);
    // A new notification is a new tap.
    tap("0:1700000999%def", "/prayers/evening");
    expect(again.opened).toEqual(["/prayers/evening"]);
  });

  it("opens a tap that has no id, as every tap was opened before", async () => {
    const { native, opened } = await fresh();
    await native.listenForTaps();
    tap(undefined, "/calendar");
    tap(undefined, "/calendar");
    expect(opened).toEqual(["/calendar", "/calendar"]);
  });

  it("opens nothing for a notification swiped away, or one that points outside the app", async () => {
    const { native, opened } = await fresh();
    await native.listenForTaps();
    tap("id-2", "/prayers/morning", "dismiss");
    tap("id-3", "https://example.org/");
    expect(opened).toEqual([]);
  });

  it("remembers only the last few opened taps", async () => {
    const { native } = await fresh();
    await native.listenForTaps();
    for (let i = 0; i < 30; i++) tap(`id-${i}`, "/prayers/morning");
    const kept = JSON.parse(state.store.get("purify:push.opened") ?? "[]") as string[];
    expect(kept).toHaveLength(20);
    expect(kept[kept.length - 1]).toBe("id-29");
  });
});
