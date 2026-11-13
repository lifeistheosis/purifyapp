// The speech plugin reached through Capacitor's own code (1.9, build 95 note
// 25), on a stand-in for the bridge the Android shell injects, as
// lib/platform/__tests__/nativePlugin.test.ts does for the lock screen: a
// plugin handed through a promise bare never answers (the trap that kept the
// lock screen's player from the phone from 1.8 to 1.9), and a mock of
// registerPlugin could not show it. What a reader would notice: Listen that
// does nothing in the app, or a voice list that never fills.

import { describe, expect, it, vi } from "vitest";

const phone = vi.hoisted(() => {
  const calls: { plugin: string; method: string; options: unknown }[] = [];
  const callbacks: ((data: unknown) => void)[] = [];
  const g = globalThis as Record<string, unknown>;
  g.androidBridge = { postMessage: () => {} };
  g.Capacitor = {
    PluginHeaders: [
      {
        name: "PurifySpeech",
        methods: ["voices", "speak", "stop", "preview", "nowPlaying"].map((name) => ({ name, rtype: "promise" })).concat([{ name: "addListener", rtype: "callback" }]),
      },
    ],
    nativePromise: (plugin: string, method: string, options: unknown) => {
      calls.push({ plugin, method, options });
      return Promise.resolve(method === "voices" ? { voices: [{ id: "en-gb-x-gba-local", name: "en-gb-x-gba-local", lang: "en-GB", quality: 400, default: true }] } : undefined);
    },
    nativeCallback: (plugin: string, method: string, options: unknown, callback: (data: unknown) => void) => {
      calls.push({ plugin, method, options });
      callbacks.push(callback);
      return String(calls.length);
    },
  };
  return { calls, callbacks };
});

describe("the speech plugin, through Capacitor's own code", () => {
  it("lists the phone's voices, speaks, and brings the phone's reports back to the player", async () => {
    const { speechEngine } = await import("@/lib/listen/speech/engine");
    const engine = await speechEngine();
    expect(engine?.side).toBe("android");
    expect(await engine!.voices()).toEqual([{ id: "en-gb-x-gba-local", name: "en-gb-x-gba-local", lang: "en-GB", quality: 400, default: true }]);
    const heard: unknown[] = [];
    engine!.onEvent((e) => heard.push(e));
    await engine!.speak({ token: 4, pieces: ["In the beginning."], from: 0, offset: 0, lang: "en", voice: null, rate: 1, volume: 1 });
    const speak = phone.calls.find((c) => c.method === "speak");
    expect(speak).toMatchObject({ plugin: "PurifySpeech", options: { token: 4, pieces: ["In the beginning."] } });
    const listen = phone.calls.find((c) => c.method === "addListener");
    expect(listen?.options).toMatchObject({ eventName: "speech" });
    phone.callbacks[phone.callbacks.length - 1]({ type: "start", token: 4, index: 0 });
    expect(heard).toEqual([{ type: "start", token: 4, index: 0 }]);
  });
});
