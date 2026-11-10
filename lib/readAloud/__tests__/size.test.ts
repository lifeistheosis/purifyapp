// The rough size beside the save mark (1.9, his yes to the sheet's 16): each
// chapter's length from its timings, at the recordings' rate, for the
// chapters a book has not saved yet, said inside the mark's one button.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { megabytes } from "@/lib/bible/downloads/catalog";
import { BYTES_PER_SECOND, unsavedBytes } from "@/lib/readAloud/size";

const read = (f: string) => JSON.parse(fs.readFileSync(f, "utf8"));
const index = read("data/readAloud/index.json") as string[];
const seconds = read("data/readAloud/seconds.json") as Record<string, number>;

describe("each chapter's length", () => {
  it("is known for every chapter that has a reading, and for no other", () => {
    expect(Object.keys(seconds).sort()).toEqual([...index].sort());
  });

  it("is its timings' own length, in whole seconds", () => {
    for (const key of index) {
      const timings = read(path.join("public/audio/read", `${key}.json`)) as { seconds: number };
      expect(seconds[key], key).toBe(Math.round(timings.seconds));
    }
  });
});

describe("what a book will take", () => {
  it("is its chapters' lengths at the recordings' rate, about 40 kbit/s", () => {
    expect(BYTES_PER_SECOND).toBe(5_000);
    // John 1 as served is 1,645,656 bytes for 331 seconds: within 1%.
    expect(Math.abs(unsavedBytes("john", [1], new Set()) - 1_645_656) / 1_645_656).toBeLessThan(0.01);
  });

  it("leaves out what is already saved", () => {
    const all = unsavedBytes("jude", [1], new Set());
    expect(all).toBeGreaterThan(0);
    expect(unsavedBytes("jude", [1], new Set(["jude/1"]))).toBe(0);
    const john = Array.from({ length: 21 }, (_, i) => i + 1);
    expect(unsavedBytes("john", john, new Set(["john/1"]))).toBe(unsavedBytes("john", john, new Set()) - seconds["john/1"] * BYTES_PER_SECOND);
  });

  it("is said in the reader's own numbers", () => {
    expect(megabytes(unsavedBytes("john", Array.from({ length: 21 }, (_, i) => i + 1), new Set()), "en")).toBe("31 MB");
  });
});

describe("the save mark", () => {
  const source = fs.readFileSync("components/player/SaveOffline.tsx", "utf8");
  it("says the size inside its one button, and to a screen reader", () => {
    expect(source).toMatch(/size=\{offline\.size\}/);
    expect(source).toMatch(/label=\{`\$\{t\("player\.offline\.save", \{ book: name \}\)\}, \$\{offline\.size\}`\}/);
    // The book's mark and row, and the chant's row (1.9, item 8), whose mark is the same SaveOfflineMark.
    expect(source.match(/data-save-size=""/g)?.length).toBe(3);
    expect(source).toMatch(/size=\{chant\.size\}/);
  });
});
