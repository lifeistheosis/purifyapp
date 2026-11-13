"use client";

import type { CaptionSource } from "@/lib/prayers/persistentAudioStore";

import type { SpeechEngine, SpeechEvent } from "./engine";
import { learnPace, pieceAt, speechTimeline, timeAtChar, timeWhileSpeaking, type SpeechPiece, type SpeechTimeline } from "./timeline";

/**
 * One text spoken by the phone's voice, as the one player plays it (1.9,
 * build 95 note 25): the second way the player makes sound, beside a
 * recording. The player (lib/prayers/persistentAudioStore.ts) hands it play,
 * pause, a seek, the speed and the volume, and takes back what a recording's
 * element would tell it: playing or not, where it is, its length, its words,
 * and its end. So the mini player, Now Playing, the lock screen, the sleep
 * timer and the ambience's balance follow the voice as they follow a
 * recording, because they all follow the player.
 *
 * A pause stops the phone and keeps the word it was on; Play takes the
 * reading up at that word. A seek, and 15 seconds back or forward, go to the
 * start of the verse or paragraph the moment falls in. A new speed is taken
 * at the word being spoken.
 */

export type SpokenState = { playing?: boolean; currentTime?: number; duration?: number; captions?: CaptionSource; failed?: boolean };

export type SpeechHost = {
  state(patch: SpokenState): void;
  /** The text has been read to its end: the player decides whether to stop, repeat, or sleep. */
  ended(restart: () => void): void;
  /** A button on the lock screen (the iPhone's, which the plugin draws while the phone speaks). */
  remote?(action: "play" | "pause" | "toggle" | "skip", seconds?: number): void;
};

export type SpeechSession = {
  timeline(): SpeechTimeline;
  play(): void;
  pause(): void;
  seek(time: number): void;
  now(): number;
  setRate(rate: number): void;
  setVolume(volume: number): void;
  /** Stop for good: the player has moved on. */
  stop(): void;
};

export type SpeechSessionOptions = {
  engine: SpeechEngine;
  pieces: SpeechPiece[];
  lang: string;
  /** A voice's id, or null for the phone's own voice for the language. */
  voice: string | null;
  rate: number;
  volume?: number;
  /** The voice's pace as learned before (letters a second at speed 1). */
  pace: number;
  /** Told the voice's pace each time it is learned, to be kept for next time. */
  onPace?: (pace: number) => void;
  /** What the lock screen shows, where the plugin draws it. */
  title?: string;
  artist?: string;
  host: SpeechHost;
  /** For tests: the clock. */
  clock?: () => number;
};

const TICK_MS = 250;

export function createSpeechSession(o: SpeechSessionOptions): SpeechSession {
  const clock = o.clock ?? (() => (typeof performance !== "undefined" ? performance.now() : Date.now()));
  let pace = o.pace;
  let words = false;
  let timeline = speechTimeline(o.pieces, pace);
  let rate = o.rate;
  let volume = o.volume ?? 1;
  /** The ask the phone is answering; reports for any other are old. */
  let token = 0;
  let speaking = false;
  let stopped = false;
  /** The piece being spoken (or to be spoken at Play), and the letter in it the clock runs from. */
  let index = 0;
  let fromChar = 0;
  /** When the clock last stood exactly (a piece begun, a word reported). */
  let since = clock();
  /** When the piece being spoken began, for its pace, or -1 when it was not begun at its start at this speed. */
  let pieceBegan = -1;
  let ticker: ReturnType<typeof setInterval> | null = null;
  /** The piece the phone has just finished, before it begins the next. */
  let finished = -1;

  const pieces = o.pieces.map((p) => p.text);

  function now(): number {
    if (!pieces.length) return 0;
    if (!speaking) return fromChar > 0 ? timeAtChar(timeline, index, fromChar) : timeline.starts[index] ?? 0;
    return timeWhileSpeaking(timeline, index, fromChar, (clock() - since) / 1000, rate, words);
  }

  function tick(on: boolean): void {
    if (ticker) clearInterval(ticker);
    ticker = on ? setInterval(() => o.host.state({ currentTime: now() }), TICK_MS) : null;
  }

  function speak(): void {
    token += 1;
    speaking = true;
    since = clock();
    pieceBegan = fromChar === 0 ? since : -1;
    tick(true);
    o.host.state({ playing: true, failed: false, currentTime: now() });
    void o.engine
      .speak({
        token,
        pieces,
        from: index,
        offset: fromChar,
        lang: o.lang,
        voice: o.voice,
        rate,
        volume,
        title: o.title,
        artist: o.artist,
        duration: timeline.duration,
        elapsed: now(),
      })
      .catch(() => fail());
  }

  function halt(): void {
    if (!speaking) return;
    // Where it stands now is where Play takes it up: the next piece when the
    // phone was between two, else the word being spoken.
    const at = now();
    if (finished === index && index < pieces.length - 1) {
      index += 1;
      fromChar = 0;
    } else if (words) {
      let char = 0;
      for (const s of timeline.words[index] ?? []) if (timeAtChar(timeline, index, s) <= at) char = s;
      fromChar = char;
    }
    finished = -1;
    token += 1;
    speaking = false;
    tick(false);
    void o.engine.stop();
  }

  function fail(): void {
    halt();
    o.host.state({ playing: false, failed: true });
  }

  const off = o.engine.onEvent((e: SpeechEvent) => {
    if (stopped) return;
    if (e.type === "remote") {
      o.host.remote?.(e.action, e.seconds);
      return;
    }
    if (e.token !== token || !speaking) return;
    if (e.type === "start") {
      if (e.index !== index) {
        index = e.index;
        fromChar = 0;
      }
      finished = -1;
      since = clock();
      pieceBegan = fromChar === 0 ? since : -1;
      o.host.state({ currentTime: now() });
      return;
    }
    if (e.type === "word") {
      if (e.index !== index) {
        index = e.index;
        pieceBegan = -1;
        finished = -1;
      }
      if (!words) {
        // The phone reports words: from now each verse's words have their own times.
        words = true;
        const at = now();
        timeline = speechTimeline(o.pieces, pace, { words: true });
        o.host.state({ captions: timeline.captions, duration: timeline.duration, currentTime: at });
      }
      fromChar = e.start;
      since = clock();
      o.host.state({ currentTime: now() });
      return;
    }
    if (e.type === "done") {
      if (pieceBegan >= 0 && e.index === index) {
        const learned = learnPace(pace, pieces[index].length, (clock() - pieceBegan) / 1000, rate);
        if (learned !== pace) {
          pace = learned;
          o.onPace?.(pace);
        }
      }
      // The verse stays lit until the phone begins the next: never before.
      finished = e.index;
      return;
    }
    if (e.type === "end") {
      speaking = false;
      finished = -1;
      tick(false);
      index = 0;
      fromChar = 0;
      // The next reading is timed at the pace learned in this one.
      timeline = speechTimeline(o.pieces, pace, { words });
      o.host.state({ playing: false, currentTime: 0, duration: timeline.duration, captions: timeline.captions });
      o.host.ended(() => speak());
      return;
    }
    if (e.type === "error") fail();
  });

  return {
    timeline: () => timeline,
    play() {
      if (stopped || speaking || !pieces.length) return;
      speak();
    },
    pause() {
      if (!speaking) return;
      halt();
      o.host.state({ playing: false, currentTime: now() });
      void o.engine.nowPlaying({ title: o.title ?? "", artist: o.artist ?? "", duration: timeline.duration, elapsed: now(), playing: false });
    },
    seek(time: number) {
      if (!pieces.length) return;
      const was = speaking;
      if (was) halt();
      index = pieceAt(timeline, time);
      fromChar = 0;
      o.host.state({ currentTime: timeline.starts[index] });
      if (was) speak();
    },
    now,
    setRate(next: number) {
      if (next === rate) return;
      const was = speaking;
      if (was) halt();
      rate = next;
      if (was) speak();
    },
    setVolume(next: number) {
      volume = next;
      if (speaking) {
        halt();
        speak();
      }
    },
    stop() {
      if (stopped) return;
      halt();
      stopped = true;
      off();
      void o.engine.nowPlaying(null);
    },
  };
}
