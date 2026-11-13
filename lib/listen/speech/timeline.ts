import type { CaptionSource } from "@/lib/prayers/persistentAudioStore";

/**
 * The phone's voice keeps time the way a recording does (1.9, build 95 note
 * 25). A recording has a length and a clock; a voice the phone speaks has
 * neither, only the piece it is on (a verse, or a paragraph) and, where the
 * phone reports it, the word. So a spoken text is given a timeline: each
 * piece a length from its letters at the voice's own pace, the pieces end to
 * end. The player's seek bar, its 15 seconds back and forward, the sleep
 * timer, the lock screen and the lit words then work on it as on a
 * recording's.
 *
 * The timeline is in the text's own time, as a recording's clock is: at
 * speed 2 the clock runs twice as fast and the length stays what it is.
 *
 * Exact where it matters: a verse lights when the phone says it has begun
 * it, never before (the clock is held short of the next piece until then),
 * and a word lights when the phone says it is speaking that word (its time
 * is the word's own start on the timeline). Between those reports the clock
 * runs on at the reader's speed, held short of the next word.
 */

/** Letters a second at speed 1 before a voice has been heard: an ordinary reading pace. */
export const DEFAULT_PACE = 14;
/** The pause after each piece, in the text's own time. */
export const BREATH = 0.35;
/** How far short of the next piece the clock is held until the phone begins it (more than the captions' lead of 0.15 s). */
const EDGE = 0.25;
/** How far short of the next word the clock is held until the phone reports it. */
const WORD_EDGE = 0.01;

export type SpeechPiece = { text: string; n?: number };

export type SpeechTimeline = {
  starts: number[];
  ends: number[];
  /** How long each piece's words take, the breath after it left out. */
  spoken: number[];
  duration: number;
  pace: number;
  captions: CaptionSource;
  /** Each piece's words' first letters. */
  words: number[][];
  texts: string[];
};

/** Where each word of a piece begins, as the player splits words (lib/player/captions.ts wordsOf). */
export function wordStarts(text: string): number[] {
  return [...text.matchAll(/\S+/g)].map((m) => m.index ?? 0);
}

/**
 * A text's timeline at a voice's pace. `words` gives every verse its words'
 * own times, once the phone has shown it reports words; until then a piece is
 * lit as a whole.
 */
export function speechTimeline(pieces: readonly SpeechPiece[], pace: number, opts: { words?: boolean } = {}): SpeechTimeline {
  const p = Number.isFinite(pace) && pace > 0 ? pace : DEFAULT_PACE;
  const starts: number[] = [];
  const ends: number[] = [];
  const spoken: number[] = [];
  const words: number[][] = [];
  let at = 0;
  for (const piece of pieces) {
    const speaking = Math.max(piece.text.length, 1) / p;
    starts.push(at);
    spoken.push(speaking);
    at += speaking + BREATH;
    ends.push(at);
    words.push(wordStarts(piece.text));
  }
  const timeline: SpeechTimeline = { starts, ends, spoken, duration: at, pace: p, captions: [], words, texts: pieces.map((x) => x.text) };
  timeline.captions = pieces.map((piece, i) => ({
    time: starts[i],
    end: ends[i],
    text: piece.text,
    ...(typeof piece.n === "number" ? { n: piece.n } : {}),
    ...(opts.words ? { wordTimes: wordTimesOf(timeline, i) } : {}),
  }));
  return timeline;
}

/** The time of the word that holds letter `char` of piece `i`: the word's own start. */
export function timeAtChar(t: SpeechTimeline, i: number, char: number): number {
  const starts = t.words[i] ?? [];
  const length = Math.max(t.texts[i]?.length ?? 1, 1);
  let first = 0;
  for (const s of starts) if (s <= char) first = s;
  return t.starts[i] + (first / length) * t.spoken[i];
}

function wordTimesOf(t: SpeechTimeline, i: number): [number, number][] {
  const starts = t.words[i];
  const length = Math.max(t.texts[i].length, 1);
  const time = (char: number) => t.starts[i] + (char / length) * t.spoken[i];
  return starts.map((s, j) => [time(s), j + 1 < starts.length ? time(starts[j + 1]) : t.starts[i] + t.spoken[i]]);
}

/** The piece a moment falls in, for a seek: the first before the start, the last after the end. */
export function pieceAt(t: SpeechTimeline, time: number): number {
  let at = 0;
  for (let i = 0; i < t.starts.length; i++) if (t.starts[i] <= time) at = i;
  return at;
}

/**
 * Where the clock stands while piece `i` is spoken: from the word last
 * reported (or the piece's start), on at the reader's speed for the time
 * since, held short of the next word where words are reported, else short of
 * the next piece.
 */
export function timeWhileSpeaking(t: SpeechTimeline, i: number, fromChar: number, elapsed: number, rate: number, words = false): number {
  const base = fromChar > 0 || words ? timeAtChar(t, i, fromChar) : t.starts[i];
  const run = base + Math.max(0, elapsed) * rate;
  let cap = t.ends[i] - EDGE;
  if (words) {
    const next = (t.words[i] ?? []).find((s) => timeAtChar(t, i, s) > base);
    cap = next !== undefined ? timeAtChar(t, i, next) - WORD_EDGE : t.starts[i] + t.spoken[i];
  }
  return Math.max(base, Math.min(run, cap));
}

/**
 * A voice's pace, learned from a piece it has spoken whole: `chars` letters in
 * `seconds` of the reader's time at `rate`. Halfway from the pace known to the
 * one heard, so one odd piece moves it little; a piece cut short, stalled or
 * too short to tell teaches nothing.
 */
export function learnPace(current: number, chars: number, seconds: number, rate: number): number {
  if (chars < 20 || !(seconds > 0) || !(rate > 0)) return current;
  const speaking = seconds * rate - BREATH;
  if (speaking < 0.3) return current;
  const heard = chars / speaking;
  if (heard < 4 || heard > 40) return current;
  return (current + heard) / 2;
}
