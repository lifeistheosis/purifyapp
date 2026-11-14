// Build 97 note 10 (Updates 63): the photographs are ready before the sheet
// rises. Measured on the export while John 1 played (scripts/ambience-open-walk.mjs):
// on the first opening every tile's photograph had its bytes but none was
// decoded, so the six faded in as the sheet rose and after it stood. The rule:
// the sheet's host, mounted on every screen, decodes all six once the app is
// idle, and opening the sheet starts them if the idle has not come yet.
import fs from "node:fs";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AMBIENCE_TRACKS } from "@/lib/ambience/ambience";
import { resetWarmAmbiencePhotos, warmAmbiencePhotos, warmAmbiencePhotosWhenIdle } from "@/lib/ambience/warmPhotos";

const made: { src: string; decoded: number }[] = [];

class FakeImage {
  decoding = "";
  record = { src: "", decoded: 0 };
  constructor() {
    made.push(this.record);
  }
  set src(v: string) {
    this.record.src = v;
  }
  decode() {
    this.record.decoded += 1;
    return Promise.resolve();
  }
}

beforeEach(() => {
  made.length = 0;
  resetWarmAmbiencePhotos();
  vi.useFakeTimers();
  vi.stubGlobal("Image", FakeImage);
  vi.stubGlobal("window", { setTimeout, clearTimeout, requestIdleCallback: (fn: () => void) => setTimeout(fn, 0), cancelIdleCallback: clearTimeout });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("the ambience photographs, warmed ahead", () => {
  it("loads and decodes every sound's own photograph, once a session", async () => {
    await warmAmbiencePhotos();
    await warmAmbiencePhotos();
    expect(made.map((m) => m.src)).toEqual(AMBIENCE_TRACKS.map((t) => t.photo.src));
    expect(made.every((m) => m.decoded === 1)).toBe(true);
  });

  it("waits for the app to settle and be idle, and an unmount before then warms nothing", () => {
    const undo = warmAmbiencePhotosWhenIdle();
    vi.advanceTimersByTime(500);
    expect(made).toHaveLength(0);
    undo();
    vi.advanceTimersByTime(10_000);
    expect(made).toHaveLength(0);
    warmAmbiencePhotosWhenIdle();
    vi.advanceTimersByTime(10_000);
    expect(made).toHaveLength(AMBIENCE_TRACKS.length);
  });

  it("is asked by the sheet's host on every screen, and by every opening", () => {
    const read = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8");
    const host = read("components/player/AmbienceSheet.tsx");
    const hostBody = host.slice(host.indexOf("function AmbienceSheetHost"), host.indexOf("function TitleMark"));
    expect(hostBody).toMatch(/useEffect\(\(\) => warmAmbiencePhotosWhenIdle\(\), \[\]\)/);
    const sheet = read("lib/ambience/sheet.ts");
    const opener = sheet.slice(sheet.indexOf("export function openAmbience"), sheet.indexOf("export function closeAmbience"));
    expect(opener).toMatch(/warmAmbiencePhotos\(\)/);
  });
});

// The same note, the same measure: over the player's Words view the sheet rose in 36 frames in
// 1.5s (53 dropped; 82 frames over the Cover view), with or without the scrim's blur, because the
// words' glow was restyled every frame behind it. The rule: under a sheet over the player, the
// words rest.
describe("the player's words under a sheet", () => {
  it("rest while a sheet stands over the player", () => {
    const player = fs.readFileSync(path.join(process.cwd(), "components/player/NowPlayingSheet.tsx"), "utf8");
    expect(player).toMatch(/const covered = [^;]*ambienceSheet\.open && ambienceSheet\.overPlayer/);
    const words = player.slice(player.indexOf('id="player-view-panel-words"'));
    expect(words.slice(0, words.indexOf("</LiveCaptions>") > 0 ? words.indexOf("</LiveCaptions>") : words.indexOf("/>", words.indexOf("<LiveCaptions")))).toMatch(/active=\{words && !covered && !ambienceLeaving\}/);
  });
});
