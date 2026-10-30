// The player's previous, next and Read (1.8): drawn in the owner's round 8 A
// (Homebase/boards/purify-master/variants/08-player), left out of the first
// 1.8 build for want of anything behind them, built with his "add
// everything we left out" of 2026-10-28.
//
// What a reader would notice if this broke: a next that leads to a chapter
// with no recording, or past Revelation; a previous before Matthew 1; a chant
// stepping to a version that cannot play; Read opening the wrong chapter, or
// the chapter at its top instead of at the verse being read.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { chapterSteps, chantVersionOf, playingOf, readHref, shareHref, versionSteps } from "@/lib/player/steps";
import { hasReadAloud } from "@/lib/readAloud/chapters";

const root = join(__dirname, "..", "..", "..");
const read = (path: string) => readFileSync(join(root, path), "utf8").replace(/\r\n/g, "\n");

describe("what is playing", () => {
  it("knows a chapter read aloud, from the bucket and from a copy saved on the phone", () => {
    expect(playingOf("https://audio.purifyapp.net/read/john/1.mp3")).toEqual({ kind: "chapter", book: "john", chapter: 1 });
    expect(playingOf("https://localhost/_capacitor_file_/data/files/audio/read/1-john/5.mp3")).toEqual({ kind: "chapter", book: "1-john", chapter: 5 });
  });

  it("knows a chant, by where its recordings are, in the apps and on the website", () => {
    expect(playingOf("/audio/chants/prayer-rope-anthem/fr.mp3")).toEqual({ kind: "chant", slug: "prayer-rope-anthem" });
    expect(playingOf("https://purifyapp.net/audio/chants/prayer-rope-anthem/ar.mp3")).toEqual({ kind: "chant", slug: "prayer-rope-anthem" });
    // 1.8: a recording in Purify's bucket, the same address everywhere.
    expect(playingOf("https://audio.purifyapp.net/chants/psalm-135/el.mp3")).toEqual({ kind: "chant", slug: "psalm-135" });
  });

  it("knows a chant by the library's index too, wherever its recording is kept", () => {
    const rows = [{ slug: "anthem", variants: [{ id: "en", audio: { src: "/audio/anthem-en.mp3" } }] }];
    expect(playingOf("/audio/anthem-en.mp3", rows)).toEqual({ kind: "chant", slug: "anthem" });
    expect(chantVersionOf("https://purifyapp.net/audio/anthem-en.mp3", rows)?.variant.id).toBe("en");
    expect(chantVersionOf("/audio/other.mp3", rows)).toBeNull();
  });

  it("is nothing it does not know", () => {
    expect(playingOf(null)).toBeNull();
    expect(playingOf("/audio/ambience/rain.mp3")).toBeNull();
  });
});

describe("previous and next, for the Bible read aloud", () => {
  it("steps to the chapter before and after", () => {
    expect(chapterSteps("john", 1, hasReadAloud)).toEqual({ previous: { book: "luke", chapter: 24 }, next: { book: "john", chapter: 2 } });
    expect(chapterSteps("john", 21, hasReadAloud).next).toEqual({ book: "acts", chapter: 1 });
  });

  it("has nothing before Matthew 1, whose neighbour has no recording, and nothing after Revelation 22", () => {
    expect(hasReadAloud("malachi", 4)).toBe(false);
    expect(chapterSteps("matthew", 1, hasReadAloud)).toEqual({ previous: null, next: { book: "matthew", chapter: 2 } });
    expect(chapterSteps("revelation", 22, hasReadAloud)).toEqual({ previous: { book: "revelation", chapter: 21 }, next: null });
  });

  it("only to a chapter that has a recording, never past it to a farther one", () => {
    const only = new Set(["john/1", "john/3"]);
    const has = (book: string, chapter: number) => only.has(`${book}/${chapter}`);
    expect(chapterSteps("john", 1, has)).toEqual({ previous: null, next: null });
    expect(chapterSteps("john", 2, has)).toEqual({ previous: { book: "john", chapter: 1 }, next: { book: "john", chapter: 3 } });
  });

  it("reads them at the reader's speed, through the one way a reading starts", () => {
    const steps = read("components/player/PlayerSteps.tsx");
    expect(steps).toContain("chapterSteps(playing.book, playing.chapter, hasReadAloud)");
    expect(steps).toContain("void startReading(to.book, to.chapter,");
    expect(read("lib/readAloud/play.ts")).toContain("rate: readSpeed(),");
    // Listen and the reading that rolls on use the same one.
    expect(read("components/bible/ReadAloud.tsx")).toContain('import { startReading } from "@/lib/readAloud/play";');
  });
});

describe("previous and next, for a chant", () => {
  const versions = [{ id: "en" }, { id: "fr" }, { id: "ar" }];
  const all = () => true;

  it("steps to the version before and after, in the chant's own order", () => {
    expect(versionSteps(versions, "fr", all)).toEqual({ previous: { id: "en" }, next: { id: "ar" } });
  });

  it("has nothing past either end", () => {
    expect(versionSteps(versions, "en", all)).toEqual({ previous: null, next: { id: "fr" } });
    expect(versionSteps(versions, "ar", all)).toEqual({ previous: { id: "fr" }, next: null });
    expect(versionSteps([{ id: "en" }], "en", all)).toEqual({ previous: null, next: null });
  });

  it("passes over a version that may not play now, and has nothing where none may", () => {
    expect(versionSteps(versions, "en", (v) => v.id !== "fr")).toEqual({ previous: null, next: { id: "ar" } });
    expect(versionSteps(versions, "fr", () => false)).toEqual({ previous: null, next: null });
    expect(versionSteps(versions, "gone", all)).toEqual({ previous: null, next: null });
  });

  it("plays it through the chants' own way, which never speeds one up", () => {
    const steps = read("components/player/PlayerSteps.tsx");
    expect(steps).toContain('availabilityFor(row.slug, v) === "playable"');
    expect(steps).toMatch(/playChant\(\{ slug: row\.slug, title: t\(chantTitleKey\(row\.key\)\), variant: to,/);
  });
});

describe("previous and next, drawn", () => {
  it("stand at the two ends of the controls, and keep their place where there is nothing to go to", () => {
    const transport = read("components/player/Transport.tsx");
    expect(transport).toMatch(/<StepButton step=\{steps\.previous\} back \/>\s*\{middle\}\s*<StepButton step=\{steps\.next\} \/>/);
    expect(transport).toMatch(/if \(!step\) return <span aria-hidden className=\{cn\("h-11 w-11 shrink-0", edge\)\} \/>;/);
    // A chant's page keeps its own three controls.
    expect(read("components/chants/ChantPlay.tsx")).not.toContain("steps=");
    expect(read("components/player/NowPlayingSheet.tsx")).toContain('<PlayerTransport audio={audio} className="mt-3" />');
  });
});

describe("Read", () => {
  it("opens the chapter at the verse being read", () => {
    const john = playingOf("https://audio.purifyapp.net/read/john/1.mp3");
    expect(readHref(john, 4)).toBe("/bible/john/1#v4");
  });

  it("opens the chapter at its top while no verse is known yet", () => {
    const john = playingOf("https://audio.purifyapp.net/read/john/1.mp3");
    expect(readHref(john, null)).toBe("/bible/john/1");
    expect(readHref(john)).toBe("/bible/john/1");
  });

  it("opens a chant's page, which shows the version playing", () => {
    expect(readHref(playingOf("/audio/chants/prayer-rope-anthem/fr.mp3"), 3)).toBe("/chants/prayer-rope-anthem");
    const page = read("components/chants/ChantPage.tsx");
    expect(page).toContain("?? playingHere ?? firstVersion(chant.variants, locale)");
  });

  it("is not drawn for what it cannot open", () => {
    expect(readHref(null)).toBeNull();
    expect(read("components/player/NowPlayingSheet.tsx")).toMatch(/\{readTo \? \(\s*<Link\s+href=\{readTo\}\s+onClick=\{\(\) => closeNowPlaying\(\)\}/);
  });

  it("is lit from the same verse count the words show", () => {
    const sheet = read("components/player/NowPlayingSheet.tsx");
    expect(sheet).toContain("const reading = verseOf(sung.lines, sung.current);");
    expect(sheet).toContain("const readTo = readHref(playing, reading?.verse);");
  });
});

describe("Share, from the •••", () => {
  it("hands on the page of what is playing", () => {
    expect(shareHref(playingOf("https://audio.purifyapp.net/read/john/1.mp3"))).toBe("/bible/john/1");
    expect(shareHref(playingOf("/audio/chants/prayer-rope-anthem/en.mp3"))).toBe("/chants/prayer-rope-anthem");
    expect(shareHref(null)).toBeNull();
  });
});
