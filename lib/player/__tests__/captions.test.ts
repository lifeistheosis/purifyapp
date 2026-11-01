import fs from "node:fs";

import { describe, expect, it } from "vitest";

import { captionsFor, readTiming, WORDS_VIEWS } from "@/lib/chants/media";
import type { Chant, ChantTiming } from "@/lib/chants/types";
import { verseCaptions, type ReadAloudManifest } from "@/lib/readAloud/chapters";
import { captionLines, followWord, lineAt, lineParts, verseOf, wordAt } from "../captions";

// The Prayer Rope Anthem, the first chant (data/chants/prayer-rope-anthem.json),
// with each version's line and word times from its timing file, which rides in the app (note 78).
const anthem = JSON.parse(fs.readFileSync("data/chants/prayer-rope-anthem.json", "utf8")) as Chant;
const timing = (id: string): ChantTiming =>
  readTiming(JSON.parse(fs.readFileSync(`data/chants/timing/prayer-rope-anthem/${id}.json`, "utf8")))!;
const version = (id: string) => anthem.variants.find((v) => v.id === id)!;
const NONE = { view: "original" as const, en: false };

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
      // The first word where the line is first heard (note 78): at its start, or just after.
      expect(line.words[0].at).toBeGreaterThanOrEqual(line.at);
      expect(line.words[0].at).toBeLessThan(line.at + 1);
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
    const last = lines.at(-1)!;
    expect(lineAt(lines, last.end + 1)).toBe(lines.length - 1);
  });

  it("lights nothing once a chant's words are done and its recording goes on (notes 56 and 59)", () => {
    // The Arabic Psalm 135 has words for its first verse only: its last line
    // is not shown being sung through every verse after it.
    const firstVerse = captionLines([
      { time: 0.6, end: 4.2, text: "اعترفوا للرب فإنه صالح،" },
      { time: 4.2, end: 11.4, text: "الليلويا." },
    ]);
    expect(lineAt(firstVerse, 10)).toBe(1);
    expect(lineAt(firstVerse, 11.4 + 5.9)).toBe(1);
    expect(lineAt(firstVerse, 11.4 + 6.1)).toBe(-1);
    expect(lineAt(firstVerse, 200)).toBe(-1);
    // A chapter read aloud keeps its last verse lit to the end.
    const read = captionLines([{ time: 0, end: 3, text: "In the beginning was the Word", n: 1 }]);
    expect(lineAt(read, 60)).toBe(0);
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
    const shown = captionsFor(fr.lines, timing("fr"), { view: "both", en: true });
    expect(shown[0].text).toBe(fr.lines[0].text);
    expect(shown[0].en).toBe(fr.lines[0].en);
    expect(shown.every((l) => !l.sub)).toBe(true);
    const hidden = captionsFor(fr.lines, timing("fr"), { view: "both", en: false });
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
  const ALL = { view: "both" as const, en: true };

  it("reads the French anthem in its English, the French as sung under each line", () => {
    const fr = version("fr");
    captionsFor(fr.lines, timing("fr"), ALL).forEach((line, i) => {
      expect(lineParts(line)).toEqual({
        main: { text: fr.lines[i].en, sung: false },
        under: [{ text: fr.lines[i].text, sung: true }],
      });
    });
  });

  it("draws the English anthem as it is sung, with nothing under it", () => {
    const v = version("en");
    for (const view of WORDS_VIEWS) {
      captionsFor(v.lines, timing("en"), { view, en: true }).forEach((line, i) => {
        expect(lineParts(line)).toEqual({ main: { text: v.lines[i].text, sung: true }, under: [] });
      });
    }
  });

  it("draws the Arabic anthem as the reader chose: as sung, as its sound, or each word over its sound (notes 56 and 59)", () => {
    const v = version("ar");
    const t = timing("ar");
    captionsFor(v.lines, t, { view: "original", en: true }).forEach((line, i) => {
      expect(lineParts(line)).toEqual({ main: { text: v.lines[i].text, sung: true }, under: [] });
    });
    captionsFor(v.lines, t, { view: "translit", en: true }).forEach((line, i) => {
      expect(lineParts(line)).toEqual({ main: { text: v.lines[i].translit, sung: true, latin: true }, under: [] });
    });
    const both = captionLines(captionsFor(v.lines, t, ALL));
    both.forEach((line, i) => {
      const parts = lineParts(line);
      expect(parts.main.text).toBe(v.lines[i].text);
      // A sound for every word sung, in order: the n-th under the n-th.
      expect(parts.main.pairs).toEqual(v.lines[i].translit!.split(/\s+/));
      expect(parts.main.pairs).toHaveLength(line.words.length);
      expect(parts.under).toEqual([]);
    });
  });

  it("invents no text: every part drawn is a field of the version's own line", () => {
    for (const v of anthem.variants) {
      for (const view of WORDS_VIEWS) {
        captionsFor(v.lines, timing(v.id), { view, en: true }).forEach((line, i) => {
          const { main, under } = lineParts(line);
          const own = [v.lines[i].text, v.lines[i].en, v.lines[i].translit].filter(Boolean);
          for (const part of [main, ...under]) expect(own).toContain(part.text);
          for (const part of [main, ...under]) if (part.pairs) expect(part.pairs.join(" ")).toBe(v.lines[i].translit);
          // The sung words are drawn once, so they light once.
          const sung = view === "translit" && v.lines[i].translit ? v.lines[i].translit : v.lines[i].text;
          expect([main, ...under].filter((p) => p.sung).map((p) => p.text)).toEqual([sung]);
        });
      }
    }
  });

  it("on a chant's own page (r3-18 B), leads with the words as sung and puts the English under them", () => {
    // The owner's pick of 2026-10-31, B's page: "the words as sung, large and
    // lit, and the English under the line being sung, only there". The same
    // captions as Now Playing's, drawn in the other order; Now Playing keeps
    // round 8's, the English over the words.
    const fr = version("fr");
    captionsFor(fr.lines, timing("fr"), ALL).forEach((line, i) => {
      expect(lineParts(line, "under")).toEqual({ main: { text: fr.lines[i].text, sung: true }, under: [], gloss: fr.lines[i].en });
      expect(lineParts(line).main).toEqual({ text: fr.lines[i].en, sung: false });
    });
    const greek = { text: "Χριστὸς ἀνέστη ἐκ νεκρῶν", translit: "Christos anesti ek nekron", en: "Christ is risen from the dead" };
    const [both] = captionsFor([greek], null, ALL);
    expect(lineParts(both, "under")).toEqual({
      main: { text: greek.text, sung: true, pairs: ["Christos", "anesti", "ek", "nekron"] },
      under: [],
      gloss: greek.en,
    });
    // A line with no English has nothing under it, in either order.
    const v = version("en");
    captionsFor(v.lines, timing("en"), ALL).forEach((line, i) => {
      expect(lineParts(line, "under")).toEqual({ main: { text: v.lines[i].text, sung: true }, under: [] });
    });
  });

  it("puts a transliteration with the sung words, never over them", () => {
    const greek = { text: "Χριστὸς ἀνέστη ἐκ νεκρῶν", translit: "Christos anesti ek nekron", en: "Christ is risen from the dead" };
    const [line] = captionsFor([greek], null, ALL);
    expect(lineParts(line)).toEqual({
      main: { text: greek.en, sung: false },
      under: [{ text: greek.text, sung: true, pairs: ["Christos", "anesti", "ek", "nekron"] }],
    });
    // Where the sound does not go word for word, it goes under the line whole.
    const [loose] = captionsFor([{ ...greek, translit: "Christos anesti ek nekron, alliluia" }], null, ALL);
    expect(lineParts(loose)).toEqual({
      main: { text: greek.en, sung: false },
      under: [
        { text: greek.text, sung: true },
        { text: "Christos anesti ek nekron, alliluia", sung: false },
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

  it("moves to the next verse in the pause, before the voice reads it", () => {
    // Build 81, the owner: at each new verse "the words have to pretty much
    // catch up". The move to a verse takes about half a second, and the
    // voice pauses about that long between verses: the move is made in the
    // pause, as soon as the verse before is done.
    for (let i = 1; i < lines.length; i++) {
      const before = lines[i - 1];
      const gap = lines[i].at - before.end;
      if (gap <= 0.05) continue;
      expect(lineAt(lines, before.end - 0.01), `verse ${i}`).toBe(i - 1);
      expect(lineAt(lines, before.end + 0.01), `verse ${i + 1}`).toBe(i);
    }
  });

  it("lights a verse's words across all of its reading, not ahead of the voice", () => {
    // Five words of one weight each: the fifth starts four fifths of the way
    // through the share of the line its words are spread over.
    const read = captionLines([{ time: 0, end: 10, text: "aa aa aa aa aa" }, { time: 10.45, text: "bb" }]);
    expect(read[0].words.at(-1)!.at).toBeCloseTo(10 * 0.97 * (4 / 5), 5);
    // A sung line that ends where the next begins keeps its breath.
    const sung = captionLines([{ time: 0, text: "aa aa aa aa aa" }, { time: 10, text: "bb" }]);
    expect(sung[0].words.at(-1)!.at).toBeCloseTo(10 * 0.86 * (4 / 5), 5);
    for (const line of lines) expect(line.words.at(-1)!.at).toBeLessThan(line.end);
  });

  it("says nothing of verses over a chant's lines", () => {
    const en = version("en");
    const chant = captionLines(captionsFor(en.lines, timing("en"), NONE));
    expect(verseOf(chant, 3)).toBeNull();
  });
});

describe("each word timed and followed (build 86 note 78)", () => {
  // The owner: "each word timestamped and followed in the lyrics section".
  it("takes each word's own start and end where the line has one for every word", () => {
    const [line] = captionLines([{ time: 2, end: 6, text: "O give thanks", wordTimes: [[2, 2.4], [2.4, 3.9], [3.9, 6]] }]);
    expect(line.words).toEqual([
      { text: "O", at: 2, end: 2.4 },
      { text: "give", at: 2.4, end: 3.9 },
      { text: "thanks", at: 3.9, end: 6 },
    ]);
    // Not one for every word (another view's words, a line changed): the line's pace.
    const [paced] = captionLines([{ time: 2, end: 6, text: "O give thanks", wordTimes: [[2, 3]] }]);
    expect(paced.words.every((w) => w.end === undefined)).toBe(true);
    expect(paced.words[0].at).toBe(2);
  });

  it("knows the word being sung at any moment", () => {
    const [line] = captionLines([{ time: 2, end: 6, text: "O give thanks", wordTimes: [[2, 2.4], [2.4, 3.9], [3.9, 6]] }]);
    expect(wordAt(line.words, 1.9)).toBe(-1);
    expect(wordAt(line.words, 2)).toBe(0);
    expect(wordAt(line.words, 3)).toBe(1);
    expect(wordAt(line.words, 5.9)).toBe(2);
  });

  it("keeps the word being sung in sight: still while it is, and stood where the line stands when it is not", () => {
    const box = { scrollTop: 400, height: 500, max: 3000 };
    // In the middle of the box: nothing moves.
    expect(followWord({ top: 650, bottom: 680 }, box)).toBeNull();
    // Gone under the fade at the foot (a long line, its seventh row): up to the anchor.
    expect(followWord({ top: 820, bottom: 850 }, box)).toBe(820 - 150);
    // Over the top: back down to it.
    expect(followWord({ top: 380, bottom: 410 }, box)).toBe(380 - 150);
    // Never past what the box can scroll.
    expect(followWord({ top: 3400, bottom: 3430 }, box)).toBe(3000);
    expect(followWord({ top: 40, bottom: 70 }, { scrollTop: 300, height: 500, max: 3000 })).toBe(0);
  });
});

describe("the same words lit in every view (notes 56 and 78)", () => {
  it("lights the Arabic Anthem's n-th word at the same moment as sung, as its sound, and as both", () => {
    const v = version("ar");
    const t = timing("ar");
    const at = (view: "original" | "translit" | "both") =>
      captionLines(captionsFor(v.lines, t, { view, en: false })).map((line) => line.words.map((w) => [w.at, w.end]));
    const sung = at("original");
    expect(sung.flat().every(([, end]) => typeof end === "number")).toBe(true);
    expect(at("translit")).toEqual(sung);
    expect(at("both")).toEqual(sung);
    // Each word lights inside its own line, one after another.
    const lines = captionLines(captionsFor(v.lines, t, { view: "original", en: false }));
    for (const line of lines) {
      for (const w of line.words) {
        expect(w.at).toBeGreaterThanOrEqual(line.at - 0.005);
        expect(w.end!).toBeLessThanOrEqual(line.end + 0.005);
      }
    }
  });

  it("lights at the line's pace where the timing file does not time each word", () => {
    const v = version("en");
    const linesOnly = { ...timing("en"), v: 1 as const, lines: timing("en").lines.map(({ at, end, text }) => ({ at, end, text })) };
    const lines = captionLines(captionsFor(v.lines, linesOnly, NONE));
    expect(lines.every((line) => line.words.every((w) => w.end === undefined))).toBe(true);
  });
});
