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

async function load(p: ReturnType<typeof phone>, opts: { rate?: number; pieces?: typeof VERSES } = {}) {
  const pieces = opts.pieces ?? VERSES;
  const t = speechTimeline(pieces, DEFAULT_PACE);
  store.setSpokenTrack(
    "speech:genesis/1",
    (host) =>
      session.createSpeechSession({ engine: p.engine, pieces, lang: "en", voice: "en-gb-x-gba-local", rate: opts.rate ?? 1, pace: DEFAULT_PACE, host, clock: () => ms }),
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

  it("goes to the word a seek falls on, and a tap on a line to its first word", async () => {
    const p = phone();
    const t = await load(p);
    store.play();
    const at = t.starts[2] + 0.5;
    const word = wordStarts(VERSES[2].text).filter((s) => timeAtChar(t, 2, s) <= at).pop()!;
    expect(word).toBeGreaterThan(0);
    store.seek(at);
    expect(p.last()).toMatchObject({ from: 2, offset: word });
    expect(store.getAudioSnapshot().currentTime).toBe(timeAtChar(t, 2, word));
    store.seek(t.starts[1]);
    expect(p.last()).toMatchObject({ from: 1, offset: 0 });
    expect(store.getAudioSnapshot().currentTime).toBe(t.starts[1]);
    // In the breath after a verse: the next verse's start.
    store.seek(t.ends[0] - 0.1);
    expect(p.last()).toMatchObject({ from: 1, offset: 0 });
    // Back 15 with less than 15 seconds behind: the start.
    p.say({ type: "start", token: p.last().token, index: 1 });
    store.skipBy(-15);
    expect(p.last()).toMatchObject({ from: 0, offset: 0 });
  });

  // Build 98 note 2 (Updates 98n, then 98o): Now Playing's 15 seconds back and forward while the voice reads.
  // To the start of the piece the moment fell in, 15 seconds on inside a long paragraph went back to that
  // paragraph's start; 98n then sent it to the next piece, which skipped the rest of the paragraph, and back 15
  // still went to the paragraph's start, however far that was. Now each moves about 15 seconds, as on a recording.
  it("moves about 15 seconds forward and back inside a long paragraph, and the voice reads on from that word", async () => {
    const p = phone();
    const long = [{ text: Array(200).fill("word").join(" "), n: 1 }, { text: "And the next paragraph.", n: 2 }, { text: "The last.", n: 3 }];
    const t = await load(p, { pieces: long });
    store.play();
    p.say({ type: "start", token: p.last().token, index: 0 });
    ms += 5000;
    const before = store.currentTimeNow();
    expect(before).toBeCloseTo(5, 5);
    store.skipBy(15);
    const ahead = p.last();
    expect(ahead.from).toBe(0);
    expect(ahead.offset).toBeGreaterThan(0);
    const landed = store.getAudioSnapshot().currentTime;
    expect(landed).toBe(timeAtChar(t, 0, ahead.offset));
    expect(landed).toBeGreaterThan(before + 14.5);
    expect(landed).toBeLessThanOrEqual(before + 15);
    // The voice is asked to read on from that word, and the clock and the lit word follow what it says.
    expect(store.getAudioSnapshot().playing).toBe(true);
    const next = wordStarts(long[0].text).find((s) => s > ahead.offset)!;
    p.say({ type: "word", token: ahead.token, index: 0, start: next, end: next + 4 });
    expect(store.currentTimeNow()).toBe(timeAtChar(t, 0, next));
    // Back 15 goes back about 15 seconds, not to the paragraph's start.
    const from = store.currentTimeNow();
    store.skipBy(-15);
    const back = p.last();
    expect(back.from).toBe(0);
    expect(back.offset).toBeGreaterThan(0);
    const after = store.getAudioSnapshot().currentTime;
    expect(after).toBeGreaterThan(from - 15.5);
    expect(after).toBeLessThanOrEqual(from - 15);
    // Forward past the end: the last word, so the reading ends there as a recording does.
    store.seek(t.starts[2]);
    p.say({ type: "start", token: p.last().token, index: 2 });
    store.skipBy(15);
    expect(p.last()).toMatchObject({ from: 2, offset: wordStarts(long[2].text).pop() });
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

// A phone call, Siri or another app taking the sound during a reading (the
// arbiter's brief for Updates 17, item 4): the voice pauses at its word, as a
// recording pauses for a call, and is ready to take up there. What a reader
// would notice if this broke: the player saying it plays through a call while
// the phone is silent, the reading starting its verse again after the call,
// or a reading the reader paused during the call starting again by itself.
describe("a call, Siri or another app taking the sound during a reading", () => {
  async function onAWord() {
    const p = phone();
    await load(p);
    store.play();
    const token = p.last().token;
    p.say({ type: "start", token, index: 1 });
    const word = wordStarts(VERSES[1].text)[4];
    p.say({ type: "word", token, index: 1, start: word, end: word + 3 });
    return { p, word };
  }

  it("pauses the player at the word, without asking the phone to stop again (it has stopped, and keeps its claim on the sound)", async () => {
    const { p } = await onAWord();
    const stops = p.stops();
    p.say({ type: "interruption", began: true });
    expect(store.getAudioSnapshot().playing).toBe(false);
    expect(p.stops()).toBe(stops);
  });

  it("goes on at the same word when the phone gives the sound back and says it may (a call or Siri over)", async () => {
    const { p, word } = await onAWord();
    const asked = p.asks.length;
    p.say({ type: "interruption", began: true });
    p.say({ type: "interruption", began: false, resume: true });
    expect(p.asks).toHaveLength(asked + 1);
    expect(p.last()).toMatchObject({ from: 1, offset: word });
    expect(store.getAudioSnapshot().playing).toBe(true);
  });

  it("waits for the reader when the phone gives the sound back without saying it may, or another app keeps it; Play takes it up at the word", async () => {
    const { p, word } = await onAWord();
    const asked = p.asks.length;
    p.say({ type: "interruption", began: true });
    p.say({ type: "interruption", began: false, resume: false });
    expect(p.asks).toHaveLength(asked);
    expect(store.getAudioSnapshot().playing).toBe(false);
    store.play();
    expect(p.last()).toMatchObject({ from: 1, offset: word });
  });

  it("does not start again by itself when the reader paused it during the call, and lets the phone's claim on the sound go", async () => {
    const { p } = await onAWord();
    const asked = p.asks.length;
    p.say({ type: "interruption", began: true });
    const stops = p.stops();
    store.pause();
    expect(p.stops()).toBe(stops + 1);
    p.say({ type: "interruption", began: false, resume: true });
    expect(p.asks).toHaveLength(asked);
    expect(store.getAudioSnapshot().playing).toBe(false);
  });

  it("is nothing to a reading that was not speaking", async () => {
    const p = phone();
    await load(p);
    p.say({ type: "interruption", began: true });
    p.say({ type: "interruption", began: false, resume: true });
    expect(p.asks).toHaveLength(0);
    expect(store.getAudioSnapshot().playing).toBe(false);
  });
});

function pieceOf(t: ReturnType<typeof speechTimeline>, time: number): number {
  let at = 0;
  for (let i = 0; i < t.starts.length; i++) if (t.starts[i] <= time) at = i;
  return at;
}
