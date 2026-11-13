// The phone's voice plays through the one player (1.9, build 95 note 25,
// the arbiter's brief: "It is a second player, so play, pause, the lock
// screen, the sleep timer and ambience's balance are all wired to it").
//
// The sleep timer, the ambience's balance and the lock screen all follow the
// player's snapshot (lib/player/sleep.ts, lib/ambience/player.ts,
// lib/player/lockScreen.ts), so a voice is wired to them when it moves the
// snapshot as a recording does. These tests drive the real player with a
// stand-in for the phone, reporting as the plugin does, and fail if a rule
// breaks. What a reader would notice: the verse lit before the voice reaches
// it, Play starting the chapter again after a pause, the ambience staying
// loud under the voice, the sleep timer never stopping it.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SpeakAsk, SpeechEngine, SpeechEvent } from "@/lib/listen/speech/engine";
import { DEFAULT_PACE, speechTimeline, timeAtChar, wordStarts } from "@/lib/listen/speech/timeline";

class FakeAudio {
  src = "";
  error = null;
  paused = true;
  currentTime = 0;
  duration = NaN;
  loop = false;
  volume = 1;
  preload = "";
  playbackRate = 1;
  defaultPlaybackRate = 1;
  addEventListener() {}
  removeAttribute(name: string) {
    if (name === "src") this.src = "";
  }
  load() {}
  play() {
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
}

/** The phone, as the plugin reports it. */
function phone() {
  const asks: SpeakAsk[] = [];
  let stops = 0;
  const listeners = new Set<(e: SpeechEvent) => void>();
  const engine: SpeechEngine = {
    side: "android",
    voices: async () => [],
    speak: async (ask) => {
      asks.push(ask);
    },
    stop: async () => {
      stops += 1;
    },
    preview: async () => {},
    nowPlaying: async () => {},
    onEvent: (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
  const say = (e: SpeechEvent) => {
    for (const l of [...listeners]) l(e);
  };
  return { engine, asks, stops: () => stops, say, last: () => asks[asks.length - 1] };
}

const VERSES = [
  { text: "In the beginning God created the heaven and the earth.", n: 1 },
  { text: "And the earth was without form, and void; and darkness was upon the face of the deep.", n: 2 },
  { text: "And God said, Let there be light: and there was light.", n: 3 },
];

type Store = typeof import("@/lib/prayers/persistentAudioStore");
let store: Store;
let session: typeof import("@/lib/listen/speech/session");
let ms = 0;

async function load(p: ReturnType<typeof phone>, opts: { rate?: number } = {}) {
  const t = speechTimeline(VERSES, DEFAULT_PACE);
  store.setSpokenTrack(
    "speech:genesis/1",
    (host) =>
      session.createSpeechSession({ engine: p.engine, pieces: VERSES, lang: "en", voice: "en-gb-x-gba-local", rate: opts.rate ?? 1, pace: DEFAULT_PACE, host, clock: () => ms }),
    { title: "Genesis 1", captions: t.captions, duration: t.duration, rate: opts.rate ?? 1 },
  );
  return t;
}

beforeEach(async () => {
  vi.useFakeTimers();
  vi.resetModules();
  ms = 0;
  vi.stubGlobal("window", {});
  vi.stubGlobal("navigator", {});
  vi.stubGlobal("Audio", FakeAudio);
  store = await import("@/lib/prayers/persistentAudioStore");
  session = await import("@/lib/listen/speech/session");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("a text spoken by the phone's voice, in the one player", () => {
  it("is loaded paused at its start, with its length and its verses as the player's words", async () => {
    const p = phone();
    const t = await load(p);
    const s = store.getAudioSnapshot();
    expect(s.src).toBe("speech:genesis/1");
    expect(s.playing).toBe(false);
    expect(s.duration).toBe(t.duration);
    expect(s.captions?.map((c) => c.n)).toEqual([1, 2, 3]);
    expect(p.asks).toHaveLength(0);
    expect(store.isSpoken()).toBe(true);
  });

  it("plays by asking the phone for every piece at once, and says it is playing, which the ambience and the lock screen follow", async () => {
    const p = phone();
    await load(p);
    store.play();
    expect(p.last()).toMatchObject({ from: 0, offset: 0, lang: "en", voice: "en-gb-x-gba-local", rate: 1 });
    expect(p.last().pieces).toEqual(VERSES.map((v) => v.text));
    expect(store.getAudioSnapshot().playing).toBe(true);
  });

  it("lights a verse only when the phone begins it", async () => {
    const p = phone();
    const t = await load(p);
    store.play();
    const token = p.last().token;
    p.say({ type: "start", token, index: 0 });
    ms += 60_000;
    // Long past verse 1's estimate, the phone still on it: verse 2 is not lit.
    expect(store.currentTimeNow()).toBeLessThan(t.starts[1] - 0.15);
    p.say({ type: "done", token, index: 0 });
    expect(store.currentTimeNow()).toBeLessThan(t.starts[1] - 0.15);
    p.say({ type: "start", token, index: 1 });
    expect(store.currentTimeNow()).toBe(t.starts[1]);
  });

  it("follows the words where the phone reports them: the captions take each word's time, and the clock stands on the word said", async () => {
    const p = phone();
    await load(p);
    store.play();
    const token = p.last().token;
    p.say({ type: "start", token, index: 2 });
    const second = wordStarts(VERSES[2].text)[3];
    p.say({ type: "word", token, index: 2, start: second, end: second + 4 });
    const s = store.getAudioSnapshot();
    expect(s.captions?.[2].wordTimes).toHaveLength(wordStarts(VERSES[2].text).length);
    const words = speechTimeline(VERSES, DEFAULT_PACE, { words: true });
    expect(store.currentTimeNow()).toBeCloseTo(timeAtChar(words, 2, second), 6);
  });

  it("stops the phone on Pause and takes the reading up at the word it was on", async () => {
    const p = phone();
    await load(p);
    store.play();
    const token = p.last().token;
    p.say({ type: "start", token, index: 1 });
    const word = wordStarts(VERSES[1].text)[5];
    p.say({ type: "word", token, index: 1, start: word, end: word + 4 });
    store.pause();
    expect(p.stops()).toBe(1);
    expect(store.getAudioSnapshot().playing).toBe(false);
    store.play();
    expect(p.last()).toMatchObject({ from: 1, offset: word });
  });

  it("takes up at the next verse when paused between two", async () => {
    const p = phone();
    await load(p);
    store.play();
    const token = p.last().token;
    p.say({ type: "start", token, index: 0 });
    p.say({ type: "done", token, index: 0 });
    store.pause();
    store.play();
    expect(p.last()).toMatchObject({ from: 1, offset: 0 });
  });

  it("goes to the start of the verse a seek or 15 seconds fall in", async () => {
    const p = phone();
    const t = await load(p);
    store.play();
    store.seek(t.starts[2] + 0.5);
    expect(p.last()).toMatchObject({ from: 2, offset: 0 });
    expect(store.getAudioSnapshot().currentTime).toBe(t.starts[2]);
    p.say({ type: "start", token: p.last().token, index: 2 });
    store.skipBy(-15);
    expect(p.last()).toMatchObject({ from: 0, offset: 0 });
  });

  it("takes a new speed at once, from where it is", async () => {
    const p = phone();
    await load(p);
    store.play();
    p.say({ type: "start", token: p.last().token, index: 1 });
    store.setRate(1.5);
    expect(p.last()).toMatchObject({ from: 1, rate: 1.5 });
    expect(store.getAudioSnapshot().rate).toBe(1.5);
  });

  it("never takes a report from a reading stopped a moment ago for the one now", async () => {
    const p = phone();
    const t = await load(p);
    store.play();
    const old = p.last().token;
    store.seek(t.starts[2]);
    p.say({ type: "start", token: old, index: 0 });
    p.say({ type: "end", token: old });
    expect(store.getAudioSnapshot().playing).toBe(true);
    expect(store.currentTimeNow()).toBe(t.starts[2]);
  });

  it("stops at the end, back at the start", async () => {
    const p = phone();
    await load(p);
    store.play();
    p.say({ type: "end", token: p.last().token });
    const s = store.getAudioSnapshot();
    expect(s.playing).toBe(false);
    expect(s.currentTime).toBe(0);
  });

  it("reads again at the end while Loop is on, for ever or the repeats left", async () => {
    const p = phone();
    await load(p);
    store.setLoopMode("inf");
    store.play();
    p.say({ type: "end", token: p.last().token });
    expect(p.asks).toHaveLength(2);
    expect(p.last()).toMatchObject({ from: 0, offset: 0 });
    store.setLoopMode(3);
    p.say({ type: "end", token: p.last().token });
    expect(p.asks).toHaveLength(3);
  });

  it("obeys a sleep timer set to the end, over any loop", async () => {
    const p = phone();
    await load(p);
    store.setLoopMode("inf");
    store.setSleep({ kind: "end" });
    store.play();
    p.say({ type: "end", token: p.last().token });
    expect(p.asks).toHaveLength(1);
    expect(store.getAudioSnapshot()).toMatchObject({ playing: false, sleep: { kind: "off" } });
  });

  it("is stopped by a recording loaded after it, and by the player put away", async () => {
    const p = phone();
    await load(p);
    store.play();
    store.setTrack("https://audio.purifyapp.net/read/john/1.mp3", { title: "John 1" });
    expect(p.stops()).toBe(1);
    expect(store.isSpoken()).toBe(false);
    const q = phone();
    await load(q);
    store.play();
    store.unload();
    expect(q.stops()).toBe(1);
    expect(store.getAudioSnapshot().src).toBeNull();
  });

  it("says when the phone could not speak, and Play asks it again", async () => {
    const p = phone();
    await load(p);
    store.play();
    p.say({ type: "error", token: p.last().token, index: 0, message: "synthesis-failed" });
    expect(store.getAudioSnapshot()).toMatchObject({ playing: false, failed: true });
    store.play();
    expect(p.asks).toHaveLength(2);
    expect(store.getAudioSnapshot().failed).toBe(false);
  });

  it("answers the iPhone's lock screen buttons through the player", async () => {
    const p = phone();
    const t = await load(p);
    p.say({ type: "remote", action: "toggle" });
    expect(store.getAudioSnapshot().playing).toBe(true);
    p.say({ type: "start", token: p.last().token, index: 0 });
    p.say({ type: "remote", action: "skip", seconds: 15 });
    expect(p.last().from).toBe(pieceOf(t, 15));
    p.say({ type: "remote", action: "pause" });
    expect(store.getAudioSnapshot().playing).toBe(false);
  });

  it("keeps the voice's pace when it has spoken a verse whole, for the next reading's timeline", async () => {
    const p = phone();
    const kept: number[] = [];
    const t = speechTimeline(VERSES, DEFAULT_PACE);
    store.setSpokenTrack(
      "speech:genesis/1",
      (host) => session.createSpeechSession({ engine: p.engine, pieces: VERSES, lang: "en", voice: null, rate: 1, pace: DEFAULT_PACE, host, clock: () => ms, onPace: (x) => kept.push(x) }),
      { captions: t.captions, duration: t.duration },
    );
    store.play();
    const token = p.last().token;
    p.say({ type: "start", token, index: 1 });
    ms += (VERSES[1].text.length / 10 + 0.35) * 1000;
    p.say({ type: "done", token, index: 1 });
    expect(kept).toHaveLength(1);
    expect(kept[0]).toBeCloseTo((DEFAULT_PACE + 10) / 2, 3);
  });
});

function pieceOf(t: ReturnType<typeof speechTimeline>, time: number): number {
  let at = 0;
  for (let i = 0; i < t.starts.length; i++) if (t.starts[i] <= time) at = i;
  return at;
}
