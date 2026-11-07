// Two ambience sounds at once, each with its own volume (1.9, s2-06 of
// docs/1.9-build/ideas.json: "layer two sounds, rain and a distant bell").
// The sheet's tiles add and take away layers; a third takes the place of the
// one that began first; one alone is still what the previews and night
// reading ask for; the sleep timer lets them all go. A small stand-in for
// Web Audio, as in lastSound.test.ts.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prayers/persistentAudioStore", () => ({
  getAudioSnapshot: () => ({ playing: false, src: null }),
  subscribeAudio: () => () => {},
}));
vi.mock("@/lib/media/streamed", () => ({ streamedUrl: (p: string) => p }));

let store: Record<string, string>;
let fetchOk: boolean;

function param() {
  return { value: 0, cancelScheduledValues: vi.fn(), setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), setTargetAtTime: vi.fn() };
}

class FakeAudioContext {
  currentTime = 0;
  state = "running";
  destination = {};
  resume = vi.fn(async () => {});
  createGain() {
    return { gain: param(), connect: vi.fn() };
  }
  createBufferSource() {
    return { buffer: null, loop: false, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
  }
  decodeAudioData = vi.fn(async () => ({}));
}

beforeEach(() => {
  vi.resetModules();
  store = {};
  fetchOk = true;
  vi.stubGlobal("window", {
    AudioContext: FakeAudioContext,
    localStorage: {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => {
        store[k] = String(v);
      },
      removeItem: (k: string) => {
        delete store[k];
      },
    },
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: fetchOk, status: fetchOk ? 200 : 503, arrayBuffer: async () => new ArrayBuffer(8) })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function player() {
  return import("@/lib/ambience/player");
}

describe("two sounds at once", () => {
  it("adds a second sound beside the first, and a third takes the place of the one that began first", async () => {
    const p = await player();
    await p.layerAmbience("rain", { remember: true });
    await p.layerAmbience("bell", { remember: true });
    expect(p.getAmbienceLayers()).toEqual(["rain", "bell"]);
    expect(p.getAmbiencePlaying()).toBe("rain");
    await p.layerAmbience("sea", { remember: true });
    expect(p.getAmbienceLayers()).toEqual(["bell", "sea"]);
    expect(p.getLastAmbience()).toBe("sea");
  });

  it("takes a sound away with a second tap on its tile, leaving the other playing", async () => {
    const p = await player();
    await p.layerAmbience("rain");
    await p.layerAmbience("bell");
    await p.layerAmbience("rain");
    expect(p.getAmbienceLayers()).toEqual(["bell"]);
    await p.layerAmbience("bell");
    expect(p.getAmbienceLayers()).toEqual([]);
  });

  it("still plays one sound alone where one is asked for: a preview, night reading", async () => {
    const p = await player();
    await p.layerAmbience("rain");
    await p.layerAmbience("bell");
    await p.playAmbience("wind");
    expect(p.getAmbienceLayers()).toEqual(["wind"]);
    await p.playAmbience(null);
    expect(p.getAmbienceLayers()).toEqual([]);
  });

  it("lets every sound go when the sleep timer runs out", async () => {
    const p = await player();
    await p.layerAmbience("rain");
    await p.layerAmbience("bell");
    p.fadeOutAmbience(8);
    expect(p.getAmbienceLayers()).toEqual([]);
  });

  it("keeps each sound's own volume on the device, whole until the reader sets one", async () => {
    const p = await player();
    await p.layerAmbience("rain");
    p.setAmbienceLevel("rain", 0.3);
    p.setAmbienceLevel("bell", 2);
    expect(JSON.parse(store["purify.ambience.levels"])).toEqual({ rain: 0.3, bell: 1 });
    expect(p.DEFAULT_LEVEL).toBe(1);
    expect(p.MAX_LAYERS).toBe(2);
  });

  it("reads the volumes back in a new session, and forgets a sound the list no longer has", async () => {
    store["purify.ambience.levels"] = JSON.stringify({ rain: 0.4, thunder: 0.9 });
    const p = await player();
    p.setAmbienceLevel("bell", 0.5);
    expect(JSON.parse(store["purify.ambience.levels"])).toEqual({ rain: 0.4, bell: 0.5 });
  });
});
