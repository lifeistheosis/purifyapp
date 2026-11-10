import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Notifications switched off in an Android phone's settings
 * (lib/push/native.ts, blockedOnPhone; the bridge's notificationsEnabled in
 * WidgetBridgePlugin.java). On Android 12 and older the push plugin answers
 * "granted" whatever the reader set, so the app showed reminders as on while
 * the phone hid every one. Now the app asks the phone, and a phone that
 * hides them reads as blocked everywhere reminders are shown or turned on.
 */

const state = vi.hoisted(() => ({
  store: new Map<string, string>(),
  platform: "android" as "android" | "ios",
  enabled: true as boolean | "no-method",
  asked: [] as string[],
  listeners: new Map<string, (arg: unknown) => unknown>(),
}));

vi.mock("@/lib/platform/native", () => ({
  nativePlatform: () => state.platform,
  isNativeClient: () => true,
}));
vi.mock("@/lib/supabase/localSession", () => ({ readLocalSessionUser: () => ({ id: "ben" }) }));
vi.mock("@/lib/api/client", () => ({
  apiFetch: async (path: string, init: RequestInit = {}) => {
    state.asked.push(`${init.method ?? "GET"} ${path.split("?")[0]}`);
    return { status: 200, ok: true };
  },
}));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isPluginAvailable: (name: string) => name === "WidgetBridge", getPlatform: () => "android" },
  registerPlugin: () => ({
    update: async () => ({ stored: 0 }),
    notificationsEnabled: async () => {
      state.asked.push("the phone's settings");
      if (state.enabled === "no-method") throw new Error("not implemented");
      return { enabled: state.enabled };
    },
  }),
}));
vi.mock("@capacitor/push-notifications", () => ({
  PushNotifications: {
    checkPermissions: async () => ({ receive: "granted" }),
    requestPermissions: async () => ({ receive: "granted" }),
    addListener: async (name: string, fn: (arg: unknown) => unknown) => {
      state.listeners.set(name, fn);
      return { remove: async () => {} };
    },
    register: async () => {
      state.asked.push("register");
      await state.listeners.get("registration")?.({ value: "the-phones-token" });
    },
  },
}));

import { enableNative, nativeStatus, refreshNative } from "../native";

const ON = "purify:push.native-on";

beforeEach(() => {
  state.store = new Map([
    [ON, "1"],
    ["purify:push.native-token", "the-phones-token"],
  ]);
  state.platform = "android";
  state.enabled = true;
  state.asked = [];
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

describe("an Android phone that hides Purify's notifications", () => {
  it("is never shown as having reminders, but as blocked", async () => {
    state.enabled = false;
    expect(await nativeStatus()).toBe("denied");
  });

  it("is told where to allow them instead of being registered", async () => {
    state.enabled = false;
    state.store.delete(ON);
    expect(await enableNative()).toEqual({ ok: false, reason: "denied" });
    expect(state.asked).not.toContain("register");
  });

  it("is taken off the server's list at launch, as a phone that refused the permission is", async () => {
    state.enabled = false;
    await refreshNative();
    expect(state.asked).toContain("DELETE /api/push/device");
    expect(state.store.has(ON)).toBe(false);
  });
});

describe("a phone that shows them, or cannot say", () => {
  it("has reminders on as before", async () => {
    expect(await nativeStatus()).toBe("subscribed");
  });

  it("reads a build without the question as allowed, as every phone was read before", async () => {
    state.enabled = "no-method";
    expect(await nativeStatus()).toBe("subscribed");
  });

  it("never asks on an iPhone, whose own permission already says it", async () => {
    state.platform = "ios";
    state.enabled = false;
    expect(await nativeStatus()).toBe("subscribed");
    expect(state.asked).not.toContain("the phone's settings");
  });
});

describe("the bridge's answer on Android", () => {
  const REPO = join(__dirname, "..", "..", "..");
  const plugin = readFileSync(
    join(REPO, "android", "app", "src", "main", "java", "net", "purifyapp", "purify", "widget", "WidgetBridgePlugin.java"),
    "utf8",
  );

  it("reads the app's switch and the push channel's own", () => {
    expect(plugin).toContain("public void notificationsEnabled(PluginCall call)");
    expect(plugin).toContain("NotificationManagerCompat.from(context).areNotificationsEnabled()");
    expect(plugin).toContain("manager.getNotificationChannel(MainActivity.PUSH_CHANNEL)");
    expect(plugin).toContain("channel.getImportance() == NotificationManager.IMPORTANCE_NONE");
    expect(plugin).toContain('result.put("enabled", enabled);');
  });
});
