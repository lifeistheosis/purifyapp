// One sleep timer for everything that plays (1.7): the voice or a chant in
// the app's player and the ambience under them. Now Playing and the ambience
// sheet set the same one. When it runs out the player pauses and the
// ambience fades; "end of the track" stays the player's, and its end fades
// the ambience too.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Snap = { src: string | null; playing: boolean; sleep: { kind: "off" } | { kind: "end" } };

const calls: string[] = [];
let audio: Snap = { src: null, playing: false, sleep: { kind: "off" } };
const subscribers = new Set<() => void>();
const tell = () => subscribers.forEach((f) => f());

vi.mock("@/lib/prayers/persistentAudioStore", () => ({
  pause: () => calls.push("pause"),
  setSleep: (next: Snap["sleep"]) => {
    audio = { ...audio, sleep: next };
    tell();
  },
  getAudioSnapshot: () => audio,
  subscribeAudio: (f: () => void) => {
    subscribers.add(f);
    return () => subscribers.delete(f);
  },
}));
vi.mock("@/lib/ambience/player", () => ({
  fadeOutAmbience: (seconds: number) => calls.push(`fade ${seconds}`),
}));

const { SLEEP_FADE_SECONDS, getSleepTimer, isChosen, minutesLeft, setSleepTimer } = await import("@/lib/player/sleep");

beforeEach(() => {
  vi.useFakeTimers();
  calls.length = 0;
  audio = { src: "/audio/read/john/1.mp3", playing: true, sleep: { kind: "off" } };
});

afterEach(() => {
  setSleepTimer({ kind: "off" });
  vi.useRealTimers();
});

describe("the sleep timer", () => {
  it("runs for the minutes chosen, then pauses the voice and lets the ambience fade", () => {
    setSleepTimer({ kind: "minutes", minutes: 15 }, 1_000);
    expect(getSleepTimer()).toEqual({ kind: "minutes", minutes: 15, at: 1_000 + 15 * 60_000 });
    vi.advanceTimersByTime(15 * 60_000 - 1);
    expect(calls).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(calls).toEqual(["pause", `fade ${SLEEP_FADE_SECONDS}`]);
    expect(SLEEP_FADE_SECONDS).toBe(8);
    expect(getSleepTimer()).toEqual({ kind: "off" });
  });

  it("is one timer: a new choice, or Off, replaces the one running", () => {
    setSleepTimer({ kind: "minutes", minutes: 60 });
    setSleepTimer({ kind: "minutes", minutes: 15 });
    vi.advanceTimersByTime(15 * 60_000);
    expect(calls.filter((c) => c === "pause")).toHaveLength(1);
    calls.length = 0;
    setSleepTimer({ kind: "minutes", minutes: 30 });
    setSleepTimer({ kind: "off" });
    vi.advanceTimersByTime(60 * 60_000);
    expect(calls).toEqual([]);
  });

  it("outlives the track being put away, since it times the ambience too", () => {
    setSleepTimer({ kind: "minutes", minutes: 30 });
    audio = { src: null, playing: false, sleep: { kind: "off" } };
    tell();
    expect(getSleepTimer().kind).toBe("minutes");
    vi.advanceTimersByTime(30 * 60_000);
    expect(calls).toContain(`fade ${SLEEP_FADE_SECONDS}`);
  });

  it("leaves the end of the track to the player, and fades the ambience when it ends", () => {
    setSleepTimer({ kind: "end" });
    expect(audio.sleep).toEqual({ kind: "end" });
    expect(getSleepTimer()).toEqual({ kind: "end" });
    // The player's ended handler: it stops, keeps the track, and drops the timer.
    audio = { ...audio, playing: false, sleep: { kind: "off" } };
    tell();
    expect(calls).toEqual([`fade ${SLEEP_FADE_SECONDS}`]);
    expect(getSleepTimer()).toEqual({ kind: "off" });
  });

  it("does not fade the ambience when the track is put away before its end", () => {
    setSleepTimer({ kind: "end" });
    audio = { src: null, playing: false, sleep: { kind: "off" } };
    tell();
    expect(calls).toEqual([]);
    expect(getSleepTimer()).toEqual({ kind: "off" });
  });

  it("clears the end of the track when minutes are chosen instead", () => {
    setSleepTimer({ kind: "end" });
    setSleepTimer({ kind: "minutes", minutes: 15 });
    expect(audio.sleep).toEqual({ kind: "off" });
    expect(getSleepTimer().kind).toBe("minutes");
  });
});

describe("what the sheets say of it", () => {
  it("counts whole minutes up, so it never says 0 before it stops", () => {
    const s = { kind: "minutes" as const, minutes: 15, at: 10 * 60_000 };
    expect(minutesLeft(s, 10 * 60_000 - 61_000)).toBe(2);
    expect(minutesLeft(s, 10 * 60_000 - 59_000)).toBe(1);
    expect(minutesLeft(s, 10 * 60_000 + 5_000)).toBe(1);
    expect(minutesLeft({ kind: "off" }, 0)).toBe(0);
  });

  it("marks the choice that is set", () => {
    const s = { kind: "minutes" as const, minutes: 30, at: 0 };
    expect(isChosen(s, { kind: "minutes", minutes: 30 })).toBe(true);
    expect(isChosen(s, { kind: "minutes", minutes: 15 })).toBe(false);
    expect(isChosen(s, { kind: "off" })).toBe(false);
    expect(isChosen({ kind: "off" }, { kind: "off" })).toBe(true);
    expect(isChosen({ kind: "end" }, { kind: "end" })).toBe(true);
  });
});
