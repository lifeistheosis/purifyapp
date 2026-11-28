// A Verse of the Day that shows part of a long verse is heard as it is shown
// (his word, 2026-11-28: "when you click play it starts playing the whole verse
// rather than what you see"). The recordings are timed by whole verses, so each
// part's start and end are measured from the sound (scripts/verse-part-times.py)
// into data/today/verse-part-times.json. These hold that file to the picks and
// to the recordings' own timings.

import fs from "node:fs";
import { describe, expect, it } from "vitest";

import measured from "@/data/today/verse-part-times.json";
import { hasReadAloud, type ReadAloudManifest } from "@/lib/readAloud/chapters";
import { partTimes } from "@/lib/readings/listen";
import { verseListenPart } from "@/lib/today/verseListen";
import { versePartCut, versePartKey } from "@/lib/today/versePartTimes";
import { VERSE_PICKS } from "@/lib/today/versePicks";

const timings = (book: string, chapter: number): ReadAloudManifest =>
  JSON.parse(fs.readFileSync(`public/audio/read/${book}/${chapter}.json`, "utf8")) as ReadAloudManifest;

const letters = (s: string) => s.replace(/[^A-Za-z]/g, "").length;

/** Every chosen verse that shows a part and has a recording to hear it in. */
const parts = Object.entries(VERSE_PICKS)
  .filter(([, p]) => p.part && hasReadAloud(p.book, p.chapter))
  .map(([day, p]) => ({ day, ...p, part: p.part as string }));

describe("the parts of chosen verses, timed in their recordings", () => {
  it("has every part with a recording timed, under its verse and its very words", () => {
    expect(parts.length).toBeGreaterThan(30);
    const missing = parts.filter((p) => !versePartCut(p.book, p.chapter, p.verse, p.part)).map((p) => `${p.day} ${versePartKey(p.book, p.chapter, p.verse, p.part)}`);
    // Run scripts/verse-part-times.py after adding a pick with a part.
    expect(missing).toEqual([]);
  });

  it("keeps no times for a part no pick shows any more", () => {
    const shown = new Set(parts.map((p) => versePartKey(p.book, p.chapter, p.verse, p.part)));
    expect(Object.keys(measured.times).filter((k) => !shown.has(k))).toEqual([]);
  });

  it("places each part inside its own verse, starting and ending with the verse where the part does", () => {
    for (const p of parts) {
      const cut = versePartCut(p.book, p.chapter, p.verse, p.part)!;
      const verse = timings(p.book, p.chapter).verses.find((v) => v.n === p.verse)!;
      const label = `${p.day} ${p.book} ${p.chapter}:${p.verse}`;
      expect(cut.at, label).toBeGreaterThanOrEqual(verse.at);
      expect(cut.end, label).toBeLessThanOrEqual(verse.end);
      expect(cut.end - cut.at, label).toBeGreaterThan(0.8);
      const text = (verse.text ?? "").replace(/\s+/g, " ").trim();
      const start = text.indexOf(p.part);
      expect(start, label).toBeGreaterThanOrEqual(0);
      if (start === 0) expect(cut.at, label).toBe(verse.at);
      if (!/[A-Za-z0-9]/.test(text.slice(start + p.part.length))) expect(cut.end, label).toBe(verse.end);
    }
  });

  it("finds each part about where its words fall in the verse, so a word said twice is not taken for the other", () => {
    // Hebrews 4:7 says "To day" twice and shows the second: a part placed at
    // the first would start in the verse's first tenth, not past its half.
    for (const p of parts) {
      const cut = versePartCut(p.book, p.chapter, p.verse, p.part)!;
      const verse = timings(p.book, p.chapter).verses.find((v) => v.n === p.verse)!;
      const text = (verse.text ?? "").replace(/\s+/g, " ").trim();
      const start = text.indexOf(p.part);
      const said = verse.end - verse.at;
      const label = `${p.day} ${p.book} ${p.chapter}:${p.verse}`;
      expect(Math.abs((cut.at - verse.at) / said - letters(text.slice(0, start)) / letters(text)), label).toBeLessThan(0.15);
      expect(Math.abs((cut.end - verse.at) / said - letters(text.slice(0, start + p.part.length)) / letters(text)), label).toBeLessThan(0.15);
    }
  });

  it("hears Luke 10:20 from \"rejoice\", after \"but rather\", to the verse's end", () => {
    const part = "rejoice, because your names are written in heaven.";
    const verse = timings("luke", 10).verses.find((v) => v.n === 20)!;
    const cut = versePartCut("luke", 10, 20, part)!;
    expect(cut.at).toBeGreaterThan(141.7);
    expect(cut.at).toBeGreaterThan(verse.at + (verse.end - verse.at) / 2);
    expect(cut.end).toBe(verse.end);
  });

  it("carries the part's times into what Listen plays, and none for a verse shown whole", () => {
    const part = "rejoice, because your names are written in heaven.";
    const heard = verseListenPart({ book: "luke", chapter: 10, verse: 20, shown: part }, "Luke 10:20", "Verse of the Day");
    expect(heard.cut).toEqual(versePartCut("luke", 10, 20, part));
    expect(partTimes(timings("luke", 10), heard)).toEqual({ start: heard.cut!.at, end: heard.cut!.end });
    const whole = timings("luke", 10).verses.find((v) => v.n === 20)!;
    const wholeHeard = verseListenPart({ book: "luke", chapter: 10, verse: 20, shown: whole.text }, "Luke 10:20", "Verse of the Day");
    expect(wholeHeard.cut).toBeUndefined();
    expect(partTimes(timings("luke", 10), wholeHeard)).toEqual({ start: whole.at, end: whole.end });
  });

  it("hears the whole verse rather than trust a cut outside it", () => {
    const manifest = timings("luke", 10);
    const verse = manifest.verses.find((v) => v.n === 20)!;
    const span = { start: verse.at, end: verse.end };
    expect(partTimes(manifest, { from: 20, to: 20, cut: { at: verse.at - 3, end: verse.end } })).toEqual(span);
    expect(partTimes(manifest, { from: 20, to: 20, cut: { at: verse.at + 1, end: verse.end + 3 } })).toEqual(span);
    expect(partTimes(manifest, { from: 20, to: 20, cut: { at: verse.end, end: verse.at } })).toEqual(span);
  });
});
