import fs from "node:fs";

import { describe, expect, it } from "vitest";

import { captionsFor, readTiming } from "@/lib/chants/media";
import type { Chant, ChantTiming } from "@/lib/chants/types";
import { verseCaptions, type ReadAloudManifest } from "@/lib/readAloud/chapters";
import { captionLines, lineAt, lineParts, verseOf } from "../captions";

// The Prayer Rope Anthem, the first chant (data/chants/prayer-rope-anthem.json),
// with each version's line times from its timing file beside the recording.
const anthem = JSON.parse(fs.readFileSync("data/chants/prayer-rope-anthem.json", "utf8")) as Chant;
const timing = (id: string): ChantTiming =>
  readTiming(JSON.parse(fs.readFileSync(`public/audio/chants/prayer-rope-anthem/${id}.json`, "utf8")))!;
const version = (id: string) => anthem.variants.find((v) => v.id === id)!;
const NONE = { translit: false, en: false };

describe("live captions", () => {
  const en = version("en");
  const lines = captionLines(captionsFor(en.lines, timing("en"), NONE), en.audio.durationSec);

  it("keeps every line and every word of the anthem, in order", () => {
    expect(lines).toHaveLength(en.lines.length);
    lines.forEach((line, i) => {
      expect(line.words.map((w) => w.text).join(" ")).toBe(en.lines[i].text);
    });
  });

  it("lights each word inside its own line, one after another", () => {
    for (const line of lines) {
      expect(line.words[0].at).toBe(line.at);
      for (let j = 1; j < line.words.length; j++) expect(line.words[j].at).toBeGreaterThan(line.words[j - 1].at);
      expect(line.words.at(-1)!.at).toBeLessThan(line.end);
    }
  });

  it("ends a line where the next begins, and the last a little after it starts", () => {
    for (let i = 0; i + 1 < lines.length; i++) expect(lines[i].end).toBe(lines[i + 1].at);
    const last = lines.at(-1)!;
    expect(last.end).toBeGreaterThan(last.at);
    expect(last.end).toBeLessThanOrEqual(en.audio.durationSec);
  });

  it("knows the line at any moment, a breath early", () => {
    expect(lineAt(lines, 0)).toBe(-1);
    expect(lineAt(lines, 3.1)).toBe(0); // 3.2 starts, taken 0.15 early
    expect(lineAt(lines, 24)).toBe(4);
    expect(lineAt(lines, 200)).toBe(lines.length - 1);
  });

  it("works for every version, French included", () => {
    const fr = version("fr");
    const frLines = captionLines(captionsFor(fr.lines, timing("fr"), NONE), 0);
    expect(frLines.length).toBe(fr.lines.length);
    expect(frLines.every((l) => l.words.length > 0)).toBe(true);
  });

  it("takes a line's own end from the timing file when it has one", () => {
    const held = captionLines([
      { time: 1, end: 4, text: "Christ is risen" },
      { time: 9, text: "from the dead" },
    ]);
    expect(held[0].end).toBe(4);
    expect(held[0].words.at(-1)!.at).toBeLessThan(4);
  });
});

describe("the lines under a sung line", () => {
  it("are handed through untouched, in order, and never lit word by word", () => {
    const out = captionLines([
      { time: 0, text: "Χριστὸς ἀνέστη ἐκ νεκρῶν", sub: ["Christós anésti ek nekrón", "Christ is risen from the dead"] },
      { time: 4, text: "θανάτῳ θάνατον πατήσας" },
    ]);
    expect(out[0].sub).toEqual(["Christós anésti ek nekrón", "Christ is risen from the dead"]);
    expect(out[0].words.map((w) => w.text).join(" ")).toBe("Χριστὸς ἀνέστη ἐκ νεκρῶν");
    expect(out[1].sub).toBeUndefined();
  });

  it("follow the reader's choice: the English over the French anthem, the French under it, or the French alone", () => {
    const fr = version("fr");
    const shown = captionsFor(fr.lines, timing("fr"), { translit: true, en: true });
    expect(shown[0].text).toBe(fr.lines[0].text);
    expect(shown[0].en).toBe(fr.lines[0].en);
    expect(shown.every((l) => !l.sub)).toBe(true);
    const hidden = captionsFor(fr.lines, timing("fr"), { translit: true, en: false });
    expect(hidden.every((l) => !l.en && !l.sub)).toBe(true);
  });

  it("are dropped, and the times with them, when the timing file does not match the words", () => {
    const en = version("en");
    const short = { ...timing("en"), lines: timing("en").lines.slice(1) };
    const out = captionsFor(en.lines, short, NONE);
    expect(out.every((l) => l.time === undefined)).toBe(true);
    expect(captionLines(out)).toEqual([]);
  });
});

describe("Sing along (1.8, round 9 A): each line drawn from its own data and nothing else", () => {
  const ALL = { translit: true, en: true };

  it("reads the French anthem in its English, the French as sung under each line", () => {
    const fr = version("fr");
    captionsFor(fr.lines, timing("fr"), ALL).forEach((line, i) => {
      expect(lineParts(line)).toEqual({
        main: { text: fr.lines[i].en, sung: false },
        under: [{ text: fr.lines[i].text, sung: true }],
      });
    });
  });

  it("draws the English anthem and the Arabic one as they are sung, with nothing under them", () => {
    for (const id of ["en", "ar"]) {
      const v = version(id);
      captionsFor(v.lines, timing(id), ALL).forEach((line, i) => {
        expect(lineParts(line)).toEqual({ main: { text: v.lines[i].text, sung: true }, under: [] });
      });
    }
  });

  it("invents no text: every part drawn is a field of the version's own line", () => {
    for (const v of anthem.variants) {
      captionsFor(v.lines, timing(v.id), ALL).forEach((line, i) => {
        const { main, under } = lineParts(line);
        const own = [v.lines[i].text, v.lines[i].en, v.lines[i].translit].filter(Boolean);
        for (const part of [main, ...under]) expect(own).toContain(part.text);
        // The sung words are drawn once, so they light once.
        expect([main, ...under].filter((p) => p.sung).map((p) => p.text)).toEqual([v.lines[i].text]);
      });
    }
  });

  it("puts a transliteration under the sung words, never over them", () => {
    const greek = { text: "Χριστὸς ἀνέστη ἐκ νεκρῶν", translit: "Christós anésti ek nekrón", en: "Christ is risen from the dead" };
    const [line] = captionsFor([greek], null, ALL);
    expect(lineParts(line)).toEqual({
      main: { text: greek.en, sung: false },
      under: [
        { text: greek.text, sung: true },
        { text: greek.translit, sung: false },
      ],
    });
  });

  it("keeps the English and the verse number through the timing", () => {
    const out = captionLines([
      { time: 0, text: "Je tiendrai mon chapelet", en: "I will hold my prayer rope" },
      { time: 4, text: "In the beginning was the Word", n: 1 },
    ]);
    expect(out[0].en).toBe("I will hold my prayer rope");
    expect(out[0].words.map((w) => w.text).join(" ")).toBe("Je tiendrai mon chapelet");
    expect(out[1].n).toBe(1);
    expect(out[1].en).toBeUndefined();
  });
});

describe("a chapter read aloud, as the words view counts it (1.8, round 8 B)", () => {
  const john1 = JSON.parse(fs.readFileSync("public/audio/read/john/1.json", "utf8")) as ReadAloudManifest;
  const lines = captionLines(verseCaptions(john1));

  it("carries every verse, its number, its words and its own end", () => {
    expect(lines).toHaveLength(john1.verses.length);
    lines.forEach((line, i) => {
      expect(line.n).toBe(john1.verses[i].n);
      expect(line.text).toBe(john1.verses[i].text);
      expect(line.end).toBe(john1.verses[i].end);
    });
  });

  it("says Verse 4 of 51 while the fourth verse is read", () => {
    const fourth = john1.verses[3];
    expect(verseOf(lines, lineAt(lines, fourth.at + 0.5))).toEqual({ verse: 4, total: 51 });
    expect(verseOf(lines, -1)).toBeNull();
  });

  it("says nothing of verses over a chant's lines", () => {
    const en = version("en");
    const chant = captionLines(captionsFor(en.lines, timing("en"), NONE));
    expect(verseOf(chant, 3)).toBeNull();
  });
});
