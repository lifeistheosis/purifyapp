// A sound starts wherever a reader is (build 95, note 11: a reader, new to
// the Faith, found every ambience sound "does not currently work").
//
// The cause was the iPhone app. Its shell answers a file of the bundle that
// is a sound (an .mp3 asked for whole, as fetch asks) with no HTTP status:
// Capacitor's WebViewAssetHandler.swift sends a plain URLResponse for a media
// file, WebKit gives that response the status 0 (ResourceResponseCocoa.mm),
// and fetch's `ok` is false for any status outside 200 to 299. The player took
// that for a failure, so in the iPhone app every sound said "Could not play",
// though every byte of it had come. Android's shell answers 200 and the
// website answers 200, which is why no walk in Chromium ever saw it.
//
// And around it, what a sound that truly cannot play must say: a reader on
// the website with no signal is told it needs a connection; a phone that
// cannot make an AudioContext is told it could not play, not left on
// "Loading"; a context the phone interrupted (a call) is woken by the tap;
// and on an iPhone the sound plays as media, as the reading voice does, so
// the silent switch does not mute it (WebKit bug 237322), and only while a
// sound plays.
//
// A small stand-in for Web Audio, as in layers.test.ts.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prayers/persistentAudioStore", () => ({
  getAudioSnapshot: () => ({ playing: false, src: null }),
  subscribeAudio: () => () => {},
}));
vi.mock("@/lib/media/streamed", () => ({ streamedUrl: (p: string) => p }));

type Answer = { ok: boolean; status: number; type: string; bytes: number } | "unreached";
let answer: Answer;
let contextState: string;
let resumed: number;
let decoded: number;

function param() {
  return { value: 0, cancelScheduledValues: vi.fn(), setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), setTargetAtTime: vi.fn() };
}

class FakeAudioContext {
  currentTime = 0;
  state = contextState;
  destination = {};
  resume = vi.fn(async () => {
    resumed += 1;
    this.state = "running";
  });
  createGain() {
    return { gain: param(), connect: vi.fn() };
  }
  createBufferSource() {
    return { buffer: null, loop: false, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
  }
  decodeAudioData = vi.fn(async () => {
    decoded += 1;
    return {};
  });
}

function stubWindow(extra: Record<string, unknown> = {}) {
  const store: Record<string, string> = {};
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
    ...extra,
  });
}

beforeEach(() => {
  vi.resetModules();
  answer = { ok: true, status: 200, type: "basic", bytes: 8 };
  contextState = "running";
  resumed = 0;
  decoded = 0;
  stubWindow();
  vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (iPhone)" });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      if (answer === "unreached") throw new TypeError("Load failed");
      const { ok, status, type, bytes } = answer;
      return { ok, status, type, arrayBuffer: async () => new ArrayBuffer(bytes) };
    }),
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function player() {
  return import("@/lib/ambience/player");
}

describe("a sound the iPhone app carries (build 95, note 11)", () => {
  it("plays though the app's shell answers it with no HTTP status", async () => {
    // What WebKit hands the page for a bundled .mp3 in the iPhone app.
    answer = { ok: false, status: 0, type: "basic", bytes: 8 };
    const p = await player();
    await p.layerAmbience("rain", { remember: true });
    const s = p.getAmbienceSnapshot();
    expect(decoded).toBe(1);
    expect(s.failed).toBe(null);
    expect(s.layers).toEqual(["rain"]);
    expect(p.getLastAmbience()).toBe("rain");
  });

  it("plays every one of the six that way, and two together", async () => {
    answer = { ok: false, status: 0, type: "basic", bytes: 8 };
    const p = await player();
    const { AMBIENCE_TRACKS } = await import("@/lib/ambience/ambience");
    for (const t of AMBIENCE_TRACKS) {
      await p.playAmbience(t.id);
      expect(p.getAmbienceSnapshot().failed, t.id).toBe(null);
      expect(p.getAmbienceLayers(), t.id).toEqual([t.id]);
    }
    await p.layerAmbience("bell");
    expect(p.getAmbienceLayers()).toEqual(["wind", "bell"]);
  });

  it("still refuses an answer that is a server's error, an empty one, or one it may not read", async () => {
    const p = await player();
    for (const a of [
      { ok: false, status: 404, type: "basic", bytes: 120 },
      { ok: false, status: 500, type: "basic", bytes: 120 },
      { ok: false, status: 0, type: "basic", bytes: 0 },
      { ok: false, status: 0, type: "opaque", bytes: 0 },
    ]) {
      answer = a;
      await p.playAmbience(null);
      await p.playAmbience("rain");
      expect(p.getAmbienceSnapshot().failed, JSON.stringify(a)).toBe("rain");
      expect(p.getAmbienceLayers(), JSON.stringify(a)).toEqual([]);
    }
  });
});

describe("what a sound that cannot play says", () => {
  it("on the website, with no signal: it needs a connection", async () => {
    answer = "unreached";
    const p = await player();
    await p.layerAmbience("rain");
    const s = p.getAmbienceSnapshot();
    expect(s.failed).toBe("rain");
    expect(s.failedFor).toBe("connection");
  });

  it("on the website, a file that came back wrong is not a connection fault", async () => {
    answer = { ok: false, status: 404, type: "basic", bytes: 120 };
    const p = await player();
    await p.layerAmbience("rain");
    expect(p.getAmbienceSnapshot().failedFor).toBe("error");
  });

  it("in the apps, a sound they carry never waits on a connection", async () => {
    stubWindow({ Capacitor: { isNativePlatform: () => true } });
    answer = "unreached";
    const p = await player();
    await p.layerAmbience("rain");
    const s = p.getAmbienceSnapshot();
    expect(s.failed).toBe("rain");
    expect(s.failedFor).toBe("error");
  });

  it("a phone that cannot make an AudioContext is told the sound could not play, not left loading", async () => {
    stubWindow({ AudioContext: undefined });
    const p = await player();
    await p.layerAmbience("rain").catch(() => {});
    const s = p.getAmbienceSnapshot();
    expect(s.loading).toBe(null);
    expect(s.failed).toBe("rain");
    expect(s.failedFor).toBe("error");
  });

  it("a failure is not kept: the next tap tries again, and plays", async () => {
    answer = "unreached";
    const p = await player();
    await p.layerAmbience("rain");
    expect(p.getAmbienceSnapshot().failed).toBe("rain");
    answer = { ok: true, status: 200, type: "basic", bytes: 8 };
    await p.layerAmbience("rain");
    const s = p.getAmbienceSnapshot();
    expect(s.failed).toBe(null);
    expect(s.failedFor).toBe(null);
    expect(s.layers).toEqual(["rain"]);
  });
});

describe("the phone's own audio rules", () => {
  it("a tap wakes a context the phone interrupted (a call), as it wakes a suspended one", async () => {
    for (const state of ["suspended", "interrupted"]) {
      vi.resetModules();
      contextState = state;
      resumed = 0;
      const p = await player();
      await p.layerAmbience("rain");
      expect(resumed, state).toBe(1);
      expect(p.getAmbienceLayers(), state).toEqual(["rain"]);
    }
  });

  it("on an iPhone, a sound plays as media, so the silent switch does not mute it, and only while one plays", async () => {
    vi.useFakeTimers();
    const session = { type: "auto" };
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (iPhone)", audioSession: session });
    const p = await player();
    await p.layerAmbience("rain");
    expect(session.type).toBe("playback");
    await p.layerAmbience("bell");
    // One of two stops: the other still plays, as media.
    await p.layerAmbience("rain");
    vi.advanceTimersByTime(5_000);
    expect(session.type).toBe("playback");
    // The last stops: after its fade the phone's own rules come back (the
    // gift's chime, which a reader in church has on silent, obeys the switch).
    await p.layerAmbience("bell");
    expect(session.type).toBe("playback");
    vi.advanceTimersByTime(5_000);
    expect(session.type).toBe("auto");
  });

  it("gives the phone its rules back after a sound that could not play, and after the sleep timer's fade", async () => {
    vi.useFakeTimers();
    const session = { type: "auto" };
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (iPhone)", audioSession: session });
    answer = { ok: false, status: 500, type: "basic", bytes: 0 };
    const p = await player();
    await p.layerAmbience("rain");
    vi.advanceTimersByTime(1_000);
    expect(session.type).toBe("auto");

    answer = { ok: true, status: 200, type: "basic", bytes: 8 };
    await p.playAmbience("sea");
    expect(session.type).toBe("playback");
    p.fadeOutAmbience(30);
    vi.advanceTimersByTime(29_000);
    expect(session.type).toBe("playback");
    vi.advanceTimersByTime(2_000);
    expect(session.type).toBe("auto");
  });

  it("a sound chosen during another's fade keeps the session", async () => {
    vi.useFakeTimers();
    const session = { type: "auto" };
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (iPhone)", audioSession: session });
    const p = await player();
    await p.layerAmbience("rain");
    await p.layerAmbience("rain");
    await p.layerAmbience("wind");
    vi.advanceTimersByTime(5_000);
    expect(session.type).toBe("playback");
    expect(p.getAmbienceLayers()).toEqual(["wind"]);
  });

  it("asks nothing of a browser without the phone's audio session", async () => {
    const p = await player();
    await p.layerAmbience("rain");
    await p.layerAmbience("rain");
    expect(p.getAmbienceSnapshot().failed).toBe(null);
  });
});
