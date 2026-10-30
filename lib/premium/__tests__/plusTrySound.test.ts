// The sound a Plus preview plays (r3-07 A: Ambience, John 1 with Rain for a
// minute), held to its minute: it begins with the tap, it can be changed
// within the minute, it stops by itself when the minute is up, and leaving
// the preview stops it at once and gives a subscriber back what they had on.
//
// What a reader would notice if this broke: rain still falling after the
// preview, or after the sheet closed; or their own sound gone for good.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ambience/player", () => ({
  playAmbience: vi.fn(async () => {}),
  fadeOutAmbience: vi.fn(),
  getAmbiencePlaying: vi.fn(() => null),
}));

import { fadeOutAmbience, getAmbiencePlaying, playAmbience } from "@/lib/ambience/player";
import { TRY_MINUTE_MS } from "@/lib/premium/plusTry";
import { beginTry, endTrySound, trySound, trySoundState } from "@/lib/premium/plusTrySound";

const play = vi.mocked(playAmbience);
const fade = vi.mocked(fadeOutAmbience);
const playing = vi.mocked(getAmbiencePlaying);

beforeEach(() => {
  vi.useFakeTimers();
  play.mockClear();
  fade.mockClear();
  playing.mockReturnValue(null);
});

afterEach(() => {
  endTrySound();
  vi.useRealTimers();
});

describe("a preview's minute of sound", () => {
  it("begins with Rain, from the tap on Try it", () => {
    beginTry("ambience");
    expect(play).toHaveBeenCalledWith("rain");
    expect(trySoundState()).toMatchObject({ feature: "ambience", ended: false });
  });

  it("stops by itself when the minute is up, and the sounds stay quiet after", () => {
    beginTry("ambience");
    vi.advanceTimersByTime(TRY_MINUTE_MS - 1);
    expect(fade).not.toHaveBeenCalled();
    expect(trySoundState().ended).toBe(false);
    vi.advanceTimersByTime(1);
    expect(fade).toHaveBeenCalledTimes(1);
    expect(trySoundState().ended).toBe(true);
    play.mockClear();
    trySound("birds");
    expect(play).not.toHaveBeenCalled();
  });

  it("lets another sound be chosen within the minute, which goes on counting", () => {
    beginTry("ambience");
    vi.advanceTimersByTime(20_000);
    trySound("birds");
    expect(play).toHaveBeenLastCalledWith("birds");
    vi.advanceTimersByTime(TRY_MINUTE_MS - 20_000);
    expect(trySoundState().ended).toBe(true);
  });

  it("stops at once when the reader leaves, and the minute never ends on a page left behind", () => {
    beginTry("ambience");
    endTrySound();
    expect(fade).toHaveBeenCalledTimes(1);
    expect(trySoundState()).toMatchObject({ feature: null, ended: false });
    vi.advanceTimersByTime(TRY_MINUTE_MS);
    expect(fade).toHaveBeenCalledTimes(1);
  });

  it("gives a subscriber back the sound they had on", () => {
    playing.mockReturnValue("sea");
    beginTry("ambience");
    play.mockClear();
    endTrySound();
    expect(play).toHaveBeenCalledWith("sea");
  });

  it("plays nothing for a page, and a page tried next ends the sound before it", () => {
    beginTry("plans");
    expect(play).not.toHaveBeenCalled();
    expect(trySoundState().feature).toBeNull();
    beginTry("ambience");
    beginTry("plans");
    expect(fade).toHaveBeenCalledTimes(1);
    expect(trySoundState().feature).toBeNull();
  });

  it("asks nothing when there is nothing to stop", () => {
    endTrySound();
    expect(fade).not.toHaveBeenCalled();
    expect(play).not.toHaveBeenCalled();
  });
});
