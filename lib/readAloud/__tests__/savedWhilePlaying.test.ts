// A chapter saved to the phone while it plays is still the chapter playing
// (1.9). The week's readings can save today's chapters on opening
// (lib/readAloud/week.ts), and a saved chapter plays from the phone's copy,
// so the address of what plays is not fixed. The page and the dock knew the
// chapter playing by its address, and lost it: Listen offered again for the
// chapter already playing, the verse no longer following the voice, and no
// rolling on into the next chapter at its end. They know it by the chapter
// the recording reads now.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { readAloudRecording, readingOfSrc } from "@/lib/readAloud/chapters";

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, "../../..", rel), "utf8");

describe("the chapter playing", () => {
  it("is the same chapter streamed or saved on the phone", () => {
    const streamed = readAloudRecording("luke", 6);
    const saved = "https://localhost/_capacitor_file_/data/user/0/net.purifyapp.purify/files/audio/read/luke/6.mp3";
    expect(readingOfSrc(streamed)).toEqual({ book: "luke", chapter: 6 });
    expect(readingOfSrc(saved)).toEqual(readingOfSrc(streamed));
  });

  it("is known by that chapter, not by its address, on the page and in the dock", () => {
    const page = read("components/bible/ReadAloud.tsx");
    const hook = page.slice(page.indexOf("function useThisChapter("), page.indexOf("export function ListenButton"));
    expect(hook).toContain("const reading = readingOfSrc(audio.src);");
    // Or the phone's voice reading it, in the Bible the page shows (1.9, build 95 note 25).
    expect(hook).toContain("const loaded = spoken || (!bible && reading?.book === book && reading.chapter === chapter);");
    expect(hook).not.toMatch(/audio\.src\.endsWith/);

    const dock = read("components/bible/ReaderDock.tsx");
    expect(dock).toContain("const loaded = readingOfSrc(audio.src);");
    expect(dock).not.toMatch(/audio\.src\.endsWith\(readAloudSrc/);
  });
});
