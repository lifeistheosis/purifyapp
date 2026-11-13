// The phone's voice keeps time the way a recording does (1.9, build 95 note
// 25): a chapter or a life spoken by the phone's own voice has a length, a
// place, verses that light exactly as each is begun, and words that light as
// the phone reports them. lib/listen/speech/timeline.ts holds the rules.

import { describe, expect, it } from "vitest";

import { captionLines, lineAt, wordAt } from "@/lib/player/captions";
import {
  BREATH,
  DEFAULT_PACE,
  learnPace,
  pieceAt,
  speechTimeline,
  timeAtChar,
  timeWhileSpeaking,
  wordStarts,
} from "@/lib/listen/speech/timeline";

const VERSES = [
  { text: "In the beginning God created the heaven and the earth.", n: 1 },
  { text: "And the earth was without form, and void.", n: 2 },
  { text: "And God said, Let there be light: and there was light.", n: 3 },
];

describe("a spoken text's timeline", () => {
  it("gives every piece a start, an end where the next begins, and a length from its letters at the voice's pace", () => {
    const t = speechTimeline(VERSES, DEFAULT_PACE);
    expect(t.starts[0]).toBe(0);
    expect(t.starts).toHaveLength(3);
    for (let i = 0; i < 3; i++) {
      const length = VERSES[i].text.length / DEFAULT_PACE + BREATH;
      expect(t.ends[i] - t.starts[i]).toBeCloseTo(length, 6);
      if (i < 2) expect(t.ends[i]).toBe(t.starts[i + 1]);
    }
    expect(t.duration).toBe(t.ends[2]);
  });

  it("is the player's captions: each verse its number, its time and its end, and no word times until the phone reports words", () => {
    const t = speechTimeline(VERSES, DEFAULT_PACE);
    expect(t.captions.map((c) => c.n)).toEqual([1, 2, 3]);
    expect(t.captions.map((c) => c.time)).toEqual(t.starts);
    expect(t.captions.every((c) => c.wordTimes === undefined)).toBe(true);
    const words = speechTimeline(VERSES, DEFAULT_PACE, { words: true });
    expect(words.captions[0].wordTimes).toHaveLength(VERSES[0].text.split(/\s+/).length);
  });

  it("lights a verse exactly when the voice begins it: never a breath before", () => {
    const t = speechTimeline(VERSES, DEFAULT_PACE);
    const lines = captionLines(t.captions, t.duration);
    // The voice is still on verse 1 as late as the timeline lets it run.
    const lateInOne = timeWhileSpeaking(t, 0, 0, 999, 1);
    expect(lineAt(lines, lateInOne)).toBe(0);
    // Verse 2 lights only at its own start, which the voice reports.
    expect(lineAt(lines, t.starts[1])).toBe(1);
  });

  it("lights the very word the phone says it is speaking", () => {
    const t = speechTimeline(VERSES, DEFAULT_PACE, { words: true });
    const lines = captionLines(t.captions, t.duration);
    const text = VERSES[2].text;
    const starts = wordStarts(text);
    for (let j = 0; j < starts.length; j++) {
      // The phone reports the word's first letter, or a letter inside it.
      for (const at of [starts[j], starts[j] + 1]) {
        if (at >= text.length) continue;
        const time = timeAtChar(t, 2, at);
        expect(lineAt(lines, time)).toBe(2);
        expect(wordAt(lines[2].words, time)).toBe(j);
      }
    }
  });

  it("finds the piece a moment falls in, for a seek and for skipping 15 seconds", () => {
    const t = speechTimeline(VERSES, DEFAULT_PACE);
    expect(pieceAt(t, -3)).toBe(0);
    expect(pieceAt(t, 0)).toBe(0);
    expect(pieceAt(t, t.starts[1] + 0.01)).toBe(1);
    expect(pieceAt(t, t.duration + 50)).toBe(2);
  });

  it("moves on at the reader's speed while a piece is spoken, and never past the piece or the next word", () => {
    const t = speechTimeline(VERSES, DEFAULT_PACE, { words: true });
    const at = timeWhileSpeaking(t, 1, 0, 1, 2);
    expect(at).toBeCloseTo(t.starts[1] + 2, 6);
    expect(timeWhileSpeaking(t, 1, 0, 60, 2)).toBeLessThan(t.starts[2]);
    // Since the word the phone reported, never into the next word.
    const second = wordStarts(VERSES[1].text)[1];
    const from = timeAtChar(t, 1, second);
    const third = timeAtChar(t, 1, wordStarts(VERSES[1].text)[2]);
    expect(timeWhileSpeaking(t, 1, second, 30, 1, true)).toBeLessThan(third);
    expect(timeWhileSpeaking(t, 1, second, 0, 1, true)).toBeCloseTo(from, 6);
  });

  it("learns a voice's own pace from what it has spoken, and keeps it sane", () => {
    const text = "x".repeat(140);
    // 140 letters spoken in 10.35 s at speed 1 is 14 a second.
    expect(learnPace(DEFAULT_PACE, text.length, 10 + BREATH, 1)).toBeCloseTo((DEFAULT_PACE + 14) / 2, 3);
    // At speed 2 the same letters take half the time and the pace is the same.
    expect(learnPace(14, text.length, (10 + BREATH) / 2, 2)).toBeCloseTo(14, 3);
    // A cut-off or a stall teaches nothing.
    expect(learnPace(14, text.length, 0.05, 1)).toBe(14);
    expect(learnPace(14, text.length, 600, 1)).toBe(14);
    expect(learnPace(14, 3, 1, 1)).toBe(14);
  });

  it("gives a text with no pieces no length and no captions", () => {
    const t = speechTimeline([], DEFAULT_PACE);
    expect(t.duration).toBe(0);
    expect(t.captions).toEqual([]);
  });
});
