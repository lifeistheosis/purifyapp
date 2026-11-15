import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import type { CaptionLine } from "@/lib/player/captions";
import { lineToMeet, singingStarted, SEEK_S } from "@/lib/player/meetSinging";

// Build 98 note 13 (his word of 2026-11-15, about 22:02 UTC): "it should
// automatically follow the lyrics one started". The Prayer Rope Anthem at 0:07,
// playing, its words left in the middle of the song and no line lit.

const ROOT = path.resolve(__dirname, "../../..");
const line = (at: number, end: number, text: string): CaptionLine => ({ at, end, text, words: [{ text, at, end }] });
/** The Anthem's English as its timing file has it: an opening, then the lines. */
const timing = JSON.parse(fs.readFileSync(path.join(ROOT, "public/audio/chants/prayer-rope-anthem/en.json"), "utf8"));
const firstAt = Number(timing.lines?.[0]?.at ?? timing.lines?.[0]?.start ?? timing[0]?.at);
const lines = [line(firstAt, firstAt + 4, "first"), line(firstAt + 4, firstAt + 8, "second"), line(firstAt + 8, firstAt + 12, "third")];
const at = (playing: boolean, currentTime: number, src = "/audio/chants/prayer-rope-anthem/en.mp3") => ({ playing, currentTime, src });

describe("the words meet the singing as it starts (build 98 note 13)", () => {
  it("the Anthem has an opening before its first line, the seconds his screenshot was taken in", () => {
    expect(firstAt).toBeGreaterThan(3);
  });

  it("from Play: the singing started", () => {
    expect(singingStarted(at(false, 0), at(true, 0))).toBe(true);
    expect(singingStarted(at(false, 41), at(true, 41))).toBe(true);
  });

  it("a seek while it plays, forward or back, is a start; the singing going on is not", () => {
    expect(singingStarted(at(true, 10), at(true, 10.25))).toBe(false);
    // Twice the speed: half a second between two answers of the player.
    expect(singingStarted(at(true, 10), at(true, 10.5))).toBe(false);
    expect(singingStarted(at(true, 10), at(true, 10 + SEEK_S + 13.5))).toBe(true);
    expect(singingStarted(at(true, 40), at(true, 25))).toBe(true);
  });

  it("another recording begun is a start, and nothing paused ever is", () => {
    expect(singingStarted(at(true, 30), at(true, 0.1, "/audio/chants/prayer-rope-anthem/ar.mp3"))).toBe(true);
    expect(singingStarted(at(true, 10), at(false, 10))).toBe(false);
    expect(singingStarted(at(false, 10), at(false, 60))).toBe(false);
  });

  it("in the opening, before any line is sung, the words go to the first line", () => {
    expect(lineToMeet(lines, 0)).toBe(0);
    expect(lineToMeet(lines, Math.min(7, firstAt - 0.5))).toBe(0);
  });

  it("once a line is sung, the words go to it", () => {
    expect(lineToMeet(lines, firstAt + 5)).toBe(1);
    expect(lineToMeet(lines, firstAt + 9)).toBe(2);
  });

  it("long after the last line, and with no words, they are left where they are", () => {
    expect(lineToMeet(lines, firstAt + 600)).toBeNull();
    expect(lineToMeet([], 3)).toBeNull();
  });

  it("the words box listens for the start, and meets the singing from it", () => {
    const box = fs.readFileSync(path.join(ROOT, "components/player/LiveCaptions.tsx"), "utf8");
    expect(box).toContain("subscribeAudio(");
    expect(box).toContain("singingStarted(was, now)");
    expect(box).toMatch(/meetSinging\(currentRef\.current, true\)/);
  });
});
