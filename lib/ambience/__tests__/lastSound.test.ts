// The ambience remembers the reader's last sound (1.9, s2-09 of
// docs/1.9-build/ideas.json): the one they chose in the ambience sheet and
// heard, kept on the device, so the sheet can mark it while nothing plays.
//
// What it must not remember: a Plus preview's minute of a sound (not the
// reader's choice), a sound that never played (it failed to load), or a
// stored name the list no longer has. Stopping a sound keeps it: the last
// sound is still the last sound.
//
// The player runs on Web Audio; a small stand-in for it is enough here,
// since what is tested is what is kept, not what is heard.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prayers/persistentAudioStore", () => ({
  getAudioSnapshot: () => ({ playing: false, src: null }),
  subscribeAudio: () => () => {},
}));
vi.mock("@/lib/media/streamed", () => ({ streamedUrl: (p: string) => p }));

const KEY = "purify.ambience.last";
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

describe("the ambience's last sound", () => {
  it("is none before the reader has chosen one", async () => {
    const p = await player();
    expect(p.getLastAmbience()).toBeNull();
  });

  it("is the sound the reader chose, once it plays, and stays when it stops", async () => {
    const p = await player();
    await p.playAmbience("rain", { remember: true });
    expect(p.getAmbiencePlaying()).toBe("rain");
    expect(p.getLastAmbience()).toBe("rain");
    expect(store[KEY]).toBe("rain");

    await p.playAmbience("sea", { remember: true });
    expect(p.getLastAmbience()).toBe("sea");

    // Stopped by the reader, or let go by the sleep timer: still the last one.
    p.stopAmbience();
    await Promise.resolve();
    expect(p.getAmbiencePlaying()).toBeNull();
    expect(p.getLastAmbience()).toBe("sea");
    p.fadeOutAmbience(8);
    expect(store[KEY]).toBe("sea");
  });

  it("is read back from the device in a new session", async () => {
    store[KEY] = "peal";
    const p = await player();
    expect(p.getLastAmbience()).toBe("peal");
  });

  it("is not a preview's sound, or the sound a preview gives back", async () => {
    store[KEY] = "birds";
    const p = await player();
    await p.playAmbience("rain");
    expect(p.getAmbiencePlaying()).toBe("rain");
    expect(p.getLastAmbience()).toBe("birds");
    expect(store[KEY]).toBe("birds");
  });

  it("is not a sound that could not be played", async () => {
    const p = await player();
    fetchOk = false;
    await p.playAmbience("wind", { remember: true });
    expect(p.getAmbiencePlaying()).toBeNull();
    expect(p.getLastAmbience()).toBeNull();
    expect(store[KEY]).toBeUndefined();
  });

  it("forgets a name the list no longer has", async () => {
    store[KEY] = "thunder";
    const p = await player();
    expect(p.getLastAmbience()).toBeNull();
  });
});
