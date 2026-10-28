import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import available from "@/data/readAloud/index.json";
import { READ_ALOUD_RECORDINGS, bookOfSrc, hasReadAloud, readAloudSrc, verseAt, type ReadAloudManifest } from "@/lib/readAloud/chapters";

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

  it("is one list in the build and on the website, so the apps and the website agree", () => {
    // scripts/read-aloud-index.mjs writes both from the files themselves.
    expect(JSON.parse(fs.readFileSync("public/audio/read/index.json", "utf8"))).toEqual(available);
  });

  it("plays from Purify's bucket, on the website and in the apps alike", () => {
    // 1.8: the recordings are too big for the public repository the website
    // is built from. Only a copy saved on the phone is read from anywhere else.
    expect(READ_ALOUD_RECORDINGS).toBe("https://audio.purifyapp.net/read");
    expect(readAloudSrc("john", 1, false)).toBe("https://audio.purifyapp.net/read/john/1.mp3");
    expect(readAloudSrc("john", 1, true)).toBe("https://audio.purifyapp.net/read/john/1.mp3");
    // The website's pages may play from it, and nothing else new.
    expect(fs.readFileSync("lib/security/headers.ts", "utf8")).toContain(`"media-src 'self' https://audio.purifyapp.net"`);
  });

  it("knows a playing chapter's book from the bucket's address and a saved copy's", () => {
    // Offline saving offers the playing book (components/player/SaveOffline.tsx).
    expect(bookOfSrc("https://audio.purifyapp.net/read/1-john/2.mp3")).toBe("1-john");
    expect(bookOfSrc("https://localhost/_capacitor_file_/data/app/files/audio/read/jude/1.mp3")).toBe("jude");
    expect(bookOfSrc("/audio/read/john/1.mp3")).toBe("john");
    expect(bookOfSrc("/audio/chants/anthem/en.mp3")).toBeNull();
    expect(bookOfSrc(null)).toBeNull();
  });

  it("keeps the recordings out of the repository, and their timings and the list in it", () => {
    expect(fs.readFileSync(".gitignore", "utf8")).toMatch(/^public\/audio\/read\/\*\*\/\*\.mp3$/m);
    expect(fs.readFileSync("scripts/read-aloud-index.mjs", "utf8")).toContain(String.raw`/^\d+\.json$/`);
  });

  it("has timings for every verse in order, for each chapter it lists", () => {
    for (const key of available as string[]) {
      const [book, ch] = key.split("/");
      expect(hasReadAloud(book, Number(ch)), key).toBe(true);
      const timings = path.join("public/audio/read", book, `${ch}.json`);
      expect(fs.existsSync(timings), timings).toBe(true);
      const manifest = JSON.parse(fs.readFileSync(timings, "utf8")) as ReadAloudManifest;
      const verses = JSON.parse(fs.readFileSync(path.join("data/bible", book, `${ch}.json`), "utf8")).verses as { n: number }[];
      expect(manifest.verses.map((v) => v.n), key).toEqual(verses.map((v) => v.n));
      for (let i = 1; i < manifest.verses.length; i += 1) expect(manifest.verses[i].at, key).toBeGreaterThan(manifest.verses[i - 1].end);
      expect(manifest.verses.at(-1)!.end, key).toBeLessThanOrEqual(manifest.seconds);
    }
  });
});
