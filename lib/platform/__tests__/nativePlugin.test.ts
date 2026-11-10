// A plugin of the apps' own shell, handed over in a box (1.9, his report of
// 2026-11-10: on Android the voice went on when he left the app, and no
// player showed in the shade). What a reader would notice if this broke: a
// bridge to the phone that says nothing and does nothing, as the lock
// screen's player did from 1.8 to 1.9. The why is in ../nativePlugin.ts.
//
// This runs Capacitor's own code, as the apps load it, on a stand-in for the
// bridge the Android shell injects before any page script: the plugins it
// carries, by name, and every call kept as it reaches "the phone". A mock of
// registerPlugin hands back a plain object and could not show the trap.

import { afterAll, describe, expect, it, vi } from "vitest";

const phone = vi.hoisted(() => {
  const calls: { plugin: string; method: string; options: unknown }[] = [];
  const g = globalThis as Record<string, unknown>;
  g.androidBridge = { postMessage: () => {} };
  g.Capacitor = {
    PluginHeaders: [
      {
        name: "MediaSession",
        methods: [
          { name: "setMetadata", rtype: "promise" },
          { name: "setPlaybackState", rtype: "promise" },
          { name: "setPositionState", rtype: "promise" },
          { name: "setActionHandler", rtype: "callback" },
        ],
      },
      { name: "StandIn", methods: [{ name: "hello", rtype: "promise" }] },
      {
        name: "WidgetBridge",
        methods: [
          { name: "update", rtype: "promise" },
          { name: "notificationsEnabled", rtype: "promise" },
        ],
      },
    ],
    nativePromise: (plugin: string, method: string, options: unknown) => {
      calls.push({ plugin, method, options });
      // A phone with Purify's notifications switched off.
      return Promise.resolve(method === "notificationsEnabled" ? { enabled: false } : undefined);
    },
    nativeCallback: (plugin: string, method: string, options: unknown) => {
      calls.push({ plugin, method, options });
      return String(calls.length);
    },
  };
  return { calls };
});

/** A stand-in for the one player, playing John 1. */
const audio = vi.hoisted(() => {
  type Snapshot = { src: string | null; title: string | null; artist: string | null; art: string | null; playing: boolean; currentTime: number; duration: number; rate: number };
  const subs = new Set<() => void>();
  const a = {
    snapshot: { src: null, title: null, artist: null, art: null, playing: false, currentTime: 0, duration: 0, rate: 1 } as Snapshot,
    set(patch: Partial<Snapshot>) {
      a.snapshot = { ...a.snapshot, ...patch };
      for (const s of subs) s();
    },
    subscribe: (cb: () => void) => (subs.add(cb), () => void subs.delete(cb)),
  };
  return a;
});

vi.mock("@/lib/platform/native", () => ({ isNativeClient: () => true, nativePlatform: () => "android" }));
vi.mock("@/lib/ambience/player", () => ({
  getAmbienceSnapshot: () => ({ layers: [], loading: null }),
  subscribeAmbience: () => () => {},
  playAmbience: async () => {},
  layerAmbience: async () => {},
  stopAmbience: () => {},
}));
vi.mock("@/lib/prayers/persistentAudioStore", () => ({
  getAudioSnapshot: () => audio.snapshot,
  subscribeAudio: audio.subscribe,
  play: () => audio.set({ playing: true }),
  pause: () => audio.set({ playing: false }),
  stop: () => audio.set({ playing: false, currentTime: 0 }),
  seek: (t: number) => audio.set({ currentTime: t }),
  skipBy: (s: number) => audio.set({ currentTime: audio.snapshot.currentTime + s }),
}));

afterAll(() => {
  const g = globalThis as Record<string, unknown>;
  delete g.androidBridge;
  delete g.Capacitor;
});

describe("a plugin of the shell, from Capacitor's own code", () => {
  it("is a thing JavaScript takes for a promise when bare, which is why it is boxed", async () => {
    const { Capacitor, registerPlugin } = await import("@capacitor/core");
    expect(Capacitor.getPlatform()).toBe("android");
    // Capacitor's plugin object answers every name as a method, then() among
    // them: a promise that resolves to it calls that then() on the phone and
    // never settles. A box has no then().
    const bare = registerPlugin<{ hello(): Promise<void> }>("StandIn");
    expect(typeof (bare as unknown as { then: unknown }).then).toBe("function");
    const { nativePlugin } = await import("../nativePlugin");
    const box = await nativePlugin<{ hello(): Promise<void> }>("StandIn");
    expect(Object.keys(box ?? {})).toEqual(["api", "platform"]);
  });

  it("arrives, once, and its calls reach the phone", async () => {
    const { nativePlugin } = await import("../nativePlugin");
    const first = nativePlugin<{ hello(o: object): Promise<void> }>("StandIn");
    expect(nativePlugin("StandIn")).toBe(first);
    const box = await first;
    expect(box?.platform).toBe("android");
    await box!.api.hello({ from: "the test" });
    expect(phone.calls.at(-1)).toEqual({ plugin: "StandIn", method: "hello", options: { from: "the test" } });
  });

  it("is null when the shell does not carry it", async () => {
    const { nativePlugin } = await import("../nativePlugin");
    expect(await nativePlugin("NotInThisShell")).toBeNull();
  });
});

describe("the widgets' bridge, through Capacitor's own code", () => {
  it("hands the widgets what changed, and says when the phone hides Purify's notifications", async () => {
    const { pushWidgetState, phoneNotificationsEnabled } = await import("@/lib/widget/bridge");
    await pushWidgetState({ remember: '{"ref":"John 1:5"}' });
    expect(phone.calls.filter((c) => c.plugin === "WidgetBridge" && c.method === "update").map((c) => c.options)).toEqual([
      { entries: { remember: '{"ref":"John 1:5"}' } },
    ]);
    // lib/push/native.ts reads only false as blocked; until 1.9 this never came back, and reminders read as on.
    expect(await phoneNotificationsEnabled()).toBe(false);
  });
});

describe("the lock screen's player, through Capacitor's own code", () => {
  it("reaches the media plugin: the buttons, then playing, then the words", async () => {
    vi.stubGlobal("window", { location: { href: "https://localhost/bible/john/1/" } });
    const { connectLockScreen } = await import("@/lib/player/lockScreen");
    const disconnect = connectLockScreen();
    audio.set({ src: "/audio/read/john/1.mp3", title: "John 1", artist: "Read by Purify", playing: true, duration: 300 });
    const media = () => phone.calls.filter((c) => c.plugin === "MediaSession");
    await vi.waitFor(() => expect(media().some((c) => c.method === "setMetadata")).toBe(true), { timeout: 2000 });
    const methods = media().map((c) => c.method);
    expect(methods.filter((m) => m === "setActionHandler")).toHaveLength(6);
    expect(methods.indexOf("setPlaybackState")).toBeLessThan(methods.indexOf("setMetadata"));
    expect(media().find((c) => c.method === "setPlaybackState")?.options).toEqual({ playbackState: "playing" });
    expect(media().find((c) => c.method === "setMetadata")?.options).toEqual({ title: "John 1", artist: "Read by Purify", album: "Purify", artwork: [{ src: "" }] });
    disconnect();
    vi.unstubAllGlobals();
  });
});
