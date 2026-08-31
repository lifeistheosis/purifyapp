import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Two properties here, and both are about not making a noise.
 *
 * DEFAULT OFF. This panel is opened on a phone in public. A dashboard that
 * makes a cash register sound the first time somebody opens it is a dashboard
 * they close, and there is no undo for a sound that has already played in a
 * quiet room. The storage key being absent must mean silence, not "unset, so
 * assume yes".
 *
 * COALESCED. One poll can change thirty numbers at once. Thirty ka-chings is
 * not thirty times the information, it is a malfunction. The batch is what
 * gets a sound, and money wins it outright rather than layering a tick under
 * the register.
 *
 * The module reads `window` at call time and catches its own failures, so the
 * globals are stubbed per test rather than at import.
 */

type Started = { freq: number; at: number };

let started: Started[];
let store: Record<string, string>;

function installGlobals() {
  started = [];
  store = {};

  const gain = () => ({
    gain: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn().mockReturnValue({ connect: vi.fn() }),
  });

  class FakeAudioContext {
    currentTime = 0;
    state = "running";
    destination = {};
    resume = vi.fn();
    createGain = gain;
    createOscillator() {
      const osc = {
        type: "sine" as OscillatorType,
        frequency: { setValueAtTime: (f: number) => (osc._freq = f) },
        _freq: 0,
        connect: vi.fn().mockReturnValue({ connect: vi.fn() }),
        start: (at: number) => started.push({ freq: osc._freq, at }),
        stop: vi.fn(),
      };
      return osc;
    }
  }

  vi.stubGlobal("window", {
    AudioContext: FakeAudioContext,
    localStorage: {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
    },
  });
}

async function load() {
  vi.resetModules();
  return import("../sound");
}

beforeEach(() => {
  vi.useFakeTimers();
  installGlobals();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("default", () => {
  it("is off when nothing has been stored", async () => {
    const s = await load();
    expect(s.adminSoundEnabled()).toBe(false);
  });

  it("plays nothing at all while it is off", async () => {
    const s = await load();
    s.chaChing();
    s.tick();
    s.reportChange(true);
    vi.advanceTimersByTime(500);
    expect(started).toEqual([]);
  });

  it("only counts an explicit 1 as on", async () => {
    const s = await load();
    store["purify.sound.admin"] = "0";
    expect(s.adminSoundEnabled()).toBe(false);
    store["purify.sound.admin"] = "true";
    expect(s.adminSoundEnabled()).toBe(false);
    store["purify.sound.admin"] = "1";
    expect(s.adminSoundEnabled()).toBe(true);
  });
});

describe("the register", () => {
  it("is two strikes, the second a minor third above the first", async () => {
    const s = await load();
    s.setAdminSoundEnabled(true);
    s.chaChing();

    const strikes = [...new Set(started.map((x) => x.at))].sort((a, b) => a - b);
    expect(strikes).toHaveLength(2);
    expect(started).toHaveLength(6); // three partials per strike

    const first = started.filter((x) => x.at === strikes[0]).map((x) => x.freq);
    const second = started.filter((x) => x.at === strikes[1]).map((x) => x.freq);
    const ratio = Math.min(...second) / Math.min(...first);
    // A minor third is 6/5. Loose bound: the point is that it RISES by roughly
    // a third, not that it hits equal temperament exactly.
    expect(ratio).toBeGreaterThan(1.1);
    expect(ratio).toBeLessThan(1.3);
  });
});

describe("coalescing", () => {
  it("gives a whole batch of changed numbers one sound, not thirty", async () => {
    const s = await load();
    s.setAdminSoundEnabled(true);
    for (let i = 0; i < 30; i++) s.reportChange(false);
    vi.advanceTimersByTime(200);
    expect(started).toHaveLength(1); // one tick, one oscillator
  });

  it("lets money win the batch outright rather than sounding both", async () => {
    const s = await load();
    s.setAdminSoundEnabled(true);
    s.reportChange(false);
    s.reportChange(true); // one money card in a batch of counts
    s.reportChange(false);
    vi.advanceTimersByTime(200);
    // The register, and no tick underneath it.
    expect(started).toHaveLength(6);
  });

  it("opens a fresh batch after the previous one has flushed", async () => {
    const s = await load();
    s.setAdminSoundEnabled(true);
    s.reportChange(false);
    vi.advanceTimersByTime(200);
    expect(started).toHaveLength(1);

    s.reportChange(false);
    vi.advanceTimersByTime(200);
    expect(started).toHaveLength(2);
  });
});
