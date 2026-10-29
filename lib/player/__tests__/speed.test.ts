// Speed (1.8): round 8 A drew "1x, Speed" under the player's controls
// (Homebase/boards/purify-master/variants/08-player); built with the
// owner's "add everything we left out" of 2026-10-28. 0.75, 1, 1.25, 1.5 and
// 2, the reader's own, kept on the device, for the Bible read aloud. A sung
// chant is never sped up: it always plays at 1, and the player shows no
// Speed while one plays.
//
// What a reader would notice if this broke: a chant sung fast because a
// chapter was left at 1.5, a Speed button on a chant, a speed forgotten
// between chapters, or "1.25" in a German phone's English figures.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { SPEEDS, SPEED_KEY, nextSpeed, parseSpeed, readSpeed, speedText } from "@/lib/player/speed";

const root = join(__dirname, "..", "..", "..");
const read = (path: string) => readFileSync(join(root, path), "utf8").replace(/\r\n/g, "\n");

describe("the speeds", () => {
  it("are 0.75, 1, 1.25, 1.5 and 2", () => {
    expect([...SPEEDS]).toEqual([0.75, 1, 1.25, 1.5, 2]);
  });

  it("go up one at a tap, and round from 2 to 0.75", () => {
    expect(nextSpeed(1)).toBe(1.25);
    expect(nextSpeed(1.25)).toBe(1.5);
    expect(nextSpeed(1.5)).toBe(2);
    expect(nextSpeed(2)).toBe(0.75);
    expect(nextSpeed(0.75)).toBe(1);
    // A speed from elsewhere comes back to 1.
    expect(nextSpeed(0.5)).toBe(1);
  });

  it("are written in the reader's own figures", () => {
    expect(speedText(1, "en")).toBe("1×");
    expect(speedText(1.25, "en")).toBe("1.25×");
    expect(speedText(1.25, "de")).toBe("1,25×");
    expect(speedText(0.75, "fr")).toBe("0,75×");
  });
});

describe("the reader's speed, on the device", () => {
  it("is 1 until they choose, and 1 for anything that is not a speed", () => {
    expect(parseSpeed(null)).toBe(1);
    expect(parseSpeed("")).toBe(1);
    expect(parseSpeed("3")).toBe(1);
    expect(parseSpeed("fast")).toBe(1);
    expect(parseSpeed("1.5")).toBe(1.5);
    expect(parseSpeed("0.75")).toBe(0.75);
    // With no device at all (the server, this test).
    expect(readSpeed()).toBe(1);
  });

  it("is kept under its own key, and saved when Speed is tapped", () => {
    expect(SPEED_KEY).toBe("purify:player.speed");
    const sheet = read("components/player/NowPlayingSheet.tsx");
    expect(sheet).toMatch(/const next = nextSpeed\(audio\.rate\);\s*saveSpeed\(next\);\s*setRate\(next\);/);
  });

  it("is what every chapter read aloud starts at, and today's readings too", () => {
    expect(read("lib/readAloud/play.ts")).toContain("rate: readSpeed(),");
    expect(read("lib/readings/listen.ts")).toContain("rate: readSpeed(),");
  });
});

describe("a chant is never sped up", () => {
  it("plays every version at 1", () => {
    expect(read("lib/chants/play.ts")).toMatch(/const meta = \{[\s\S]*?\brate: 1,\s*\};/);
  });

  it("plays at 1 whatever a track before it was left at: a track that asks for no speed is as recorded", () => {
    const store = read("lib/prayers/persistentAudioStore.ts");
    expect(store).toContain("const rate = clampRate(opts.rate ?? 1);");
    expect(store).not.toContain("a.playbackRate = snapshot.rate;");
  });

  it("has no Speed in the player: the choice is drawn for the Bible read aloud alone", () => {
    const sheet = read("components/player/NowPlayingSheet.tsx");
    const at = sheet.indexOf('t("player.speed")');
    expect(at).toBeGreaterThan(-1);
    const guard = sheet.lastIndexOf('{playing?.kind === "chapter" ? (', at);
    expect(guard).toBeGreaterThan(-1);
    // Nothing closes the guard between it and the Speed button.
    expect(sheet.slice(guard, at)).not.toContain(") : null}");
    expect(sheet.match(/t\("player\.speed"\)/g)?.length).toBe(2);
  });
});
