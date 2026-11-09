// A recording that would not load is loaded again (1.9).
//
// The owner's report of 2026-11-09: "people are saying that the chant player
// actually doesn't load". Run against the live website, the 1.8 store bundle
// showed why: when a recording's request failed once (the phone changing
// network, a moment with no signal), the audio element was left in its error
// state, where it refuses every play() and never asks the network again. The
// store did not listen for that, and loading the same address again was a
// no-op, so that recording's Play did nothing from then on, on its page, in
// the mini player and in Now Playing, with the connection back and no word
// on the screen, until the app was closed.
//
// What a reader would notice if this broke: Play tapped on a chant or a
// chapter, and nothing, for the rest of the day.
//
// There is no browser here, so the element is stood in: it fails to load
// while `net.up` is false, as a phone's does, and stays failed until it is
// told to load again, as a phone's does.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const net = { up: true };

class FakeAudio {
  static made: FakeAudio[] = [];
  src = "";
  error: { code: number } | null = null;
  paused = true;
  currentTime = 0;
  duration = NaN;
  loop = false;
  volume = 1;
  preload = "";
  playbackRate = 1;
  defaultPlaybackRate = 1;
  /** How many times the recording was asked of the network. */
  loads = 0;
  private listeners = new Map<string, Set<() => void>>();

  constructor() {
    FakeAudio.made.push(this);
  }
  addEventListener(type: string, fn: () => void) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(fn);
  }
  emit(type: string) {
    for (const fn of this.listeners.get(type) ?? []) fn();
  }
  removeAttribute(name: string) {
    if (name === "src") this.src = "";
  }
  load() {
    this.loads += 1;
    this.error = null;
    this.paused = true;
  }
  /** A phone's element: refused for ever once it has failed, until load(). */
  play(): Promise<void> {
    if (this.error) return Promise.reject(new Error("NotSupportedError"));
    return Promise.resolve().then(() => {
      if (!net.up) {
        this.error = { code: 2 };
        this.emit("error");
        throw new Error("NotSupportedError");
      }
      this.paused = false;
      this.emit("play");
      this.emit("playing");
    });
  }
  pause() {
    if (this.paused) return;
    this.paused = true;
    this.emit("pause");
  }
  /** The connection drops while it plays. */
  drop() {
    this.error = { code: 2 };
    this.paused = true;
    this.emit("error");
  }
}

type Store = typeof import("@/lib/prayers/persistentAudioStore");
let store: Store;
const el = () => FakeAudio.made[FakeAudio.made.length - 1];
const SRC = "https://audio.purifyapp.net/chants/psalm-135/en.mp3";
/** Let promises settle, and timers up to `ms` run. */
const pass = (ms = 0) => vi.advanceTimersByTimeAsync(ms);

beforeEach(async () => {
  vi.useFakeTimers();
  vi.resetModules();
  FakeAudio.made = [];
  net.up = true;
  vi.stubGlobal("window", {});
  vi.stubGlobal("Audio", FakeAudio);
  store = await import("@/lib/prayers/persistentAudioStore");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("a recording that fails to load", () => {
  it("is loaded again when the reader taps Play, and plays once the connection is back", async () => {
    net.up = false;
    store.setTrack(SRC, { title: "Psalm 135" });
    store.play();
    await pass();
    expect(store.getAudioSnapshot().playing).toBe(false);
    // Past the player's own tries, with still no connection.
    await pass(60_000);
    expect(store.getAudioSnapshot().failed).toBe(true);
    const before = el().loads;

    // This is the tap that did nothing in 1.8.
    net.up = true;
    store.play();
    await pass();
    expect(el().loads).toBe(before + 1);
    expect(store.getAudioSnapshot().playing).toBe(true);
    expect(store.getAudioSnapshot().failed).toBe(false);
  });

  it("is tried again by the player itself, twice, before it says it cannot be had", async () => {
    net.up = false;
    store.setTrack(SRC);
    store.play();
    await pass();
    const first = el().loads;
    expect(store.getAudioSnapshot().failed).toBe(false);
    await pass(store.RETRY_AFTER_MS[0]);
    expect(el().loads).toBe(first + 1);
    expect(store.getAudioSnapshot().failed).toBe(false);
    await pass(store.RETRY_AFTER_MS[1]);
    expect(el().loads).toBe(first + 2);
    await pass(60_000);
    // Two tries and no more: it does not go on asking for ever.
    expect(el().loads).toBe(first + 2);
    expect(store.getAudioSnapshot()).toMatchObject({ failed: true, playing: false, src: SRC });
  });

  it("plays by itself when the connection comes back between the player's tries", async () => {
    net.up = false;
    store.setTrack(SRC);
    store.play();
    await pass();
    net.up = true;
    await pass(store.RETRY_AFTER_MS[0]);
    expect(store.getAudioSnapshot()).toMatchObject({ playing: true, failed: false });
  });

  it("goes on from where it had got to when the connection drops while it plays", async () => {
    store.setTrack(SRC);
    store.play();
    await pass();
    el().currentTime = 95;
    el().emit("timeupdate");
    el().drop();
    expect(store.getAudioSnapshot().playing).toBe(false);
    await pass(store.RETRY_AFTER_MS[0]);
    expect(store.getAudioSnapshot().playing).toBe(true);
    expect(el().currentTime).toBe(95);
    expect(el().src).toBe(SRC);
  });

  it("is left alone once the reader pauses: no try starts sound they stopped", async () => {
    net.up = false;
    store.setTrack(SRC);
    store.play();
    await pass();
    store.pause();
    const loads = el().loads;
    net.up = true;
    await pass(60_000);
    expect(el().loads).toBe(loads);
    expect(store.getAudioSnapshot()).toMatchObject({ playing: false, failed: false });
  });

  it("does not follow the reader to another recording", async () => {
    net.up = false;
    store.setTrack(SRC);
    store.play();
    await pass(60_000);
    expect(store.getAudioSnapshot().failed).toBe(true);
    net.up = true;
    store.setTrack("https://audio.purifyapp.net/chants/psalm-117/ar.mp3");
    expect(store.getAudioSnapshot().failed).toBe(false);
    store.play();
    await pass();
    expect(store.getAudioSnapshot().playing).toBe(true);
  });

  it("says nothing of a recording that was put away", async () => {
    net.up = false;
    store.setTrack(SRC);
    store.play();
    await pass();
    store.unload();
    await pass(60_000);
    expect(store.getAudioSnapshot()).toMatchObject({ src: null, failed: false, playing: false });
  });
});

describe("a recording that loads", () => {
  it("is not loaded twice by Play, pause and Play", async () => {
    store.setTrack(SRC);
    const loads = el().loads;
    store.play();
    await pass();
    store.pause();
    store.play();
    await pass();
    expect(el().loads).toBe(loads);
    expect(store.getAudioSnapshot()).toMatchObject({ playing: true, failed: false });
  });
});
