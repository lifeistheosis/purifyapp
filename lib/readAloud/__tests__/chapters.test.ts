import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import available from "@/data/readAloud/index.json";
import { hasReadAloud, readAloudSrc, verseAt, type ReadAloudManifest } from "@/lib/readAloud/chapters";

describe("read-aloud", () => {
  const m: ReadAloudManifest = {
    voice: "test",
    seconds: 20,
    verses: [
      { n: 1, at: 0, end: 4.2 },
      { n: 2, at: 4.65, end: 9 },
      { n: 3, at: 9.45, end: 19.5 },
    ],
  };

  it("names the verse being read, its pause included", () => {
    // A verse lights a hair (50 ms) before its first word.
    expect([0, 4.3, 4.62, 4.7, 9.4, 12, 19.9].map((t) => verseAt(m, t))).toEqual([1, 1, 2, 2, 3, 3, 3]);
  });

  it("has a file, and timings for every verse in order, for each chapter it lists", () => {
    for (const key of available as string[]) {
      const [book, ch] = key.split("/");
      expect(hasReadAloud(book, Number(ch)), key).toBe(true);
      const mp3 = path.join("public", readAloudSrc(book, Number(ch)));
      expect(fs.existsSync(mp3), mp3).toBe(true);
      const manifest = JSON.parse(fs.readFileSync(mp3.replace(/\.mp3$/, ".json"), "utf8")) as ReadAloudManifest;
      const verses = JSON.parse(fs.readFileSync(path.join("data/bible", book, `${ch}.json`), "utf8")).verses as { n: number }[];
      expect(manifest.verses.map((v) => v.n), key).toEqual(verses.map((v) => v.n));
      for (let i = 1; i < manifest.verses.length; i += 1) expect(manifest.verses[i].at, key).toBeGreaterThan(manifest.verses[i - 1].end);
      expect(manifest.verses.at(-1)!.end, key).toBeLessThanOrEqual(manifest.seconds);
    }
  });
});
