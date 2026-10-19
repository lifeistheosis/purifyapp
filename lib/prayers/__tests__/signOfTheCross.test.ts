import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import lessons from "@/data/prayers/learning/lessons.json";
import lessonsDe from "@/data/prayers/learning/lessons.de.json";
import { LOCALES } from "@/lib/i18n/locales";
import {
  CROSS_FIGURE_ALL_KEYS,
  CROSS_FIGURE_KEYS,
  CROSS_FIGURE_LESSON,
  CROSS_TOUCHES,
  SIGN_OF_THE_CROSS_REVIEW,
} from "@/lib/prayers/signOfTheCross";

// The drawing of the Sign of the Cross (1.7.1) shows what the lesson says and
// nothing else. If the lesson's words move, these fail before the drawing can
// teach something the lesson no longer says.

const ROOT = process.cwd();
const read = (...parts: string[]) => fs.readFileSync(path.join(ROOT, ...parts), "utf8");
const catalog = (code: string) => JSON.parse(read("lib", "i18n", "messages", `${code}.json`)) as Record<string, string>;
const EN = catalog("en");
const DE = catalog("de");
const EM_DASH = String.fromCharCode(0x2014);
/** Arrows, checks, crosses, stars and triangles set as characters in place of drawn icons. */
const GLYPHS = new RegExp("[" + [[0x2190, 0x21ff], [0x2713, 0x2715], [0x2626, 0x2629], [0x2726, 0x2726], [0x2605, 0x2606], [0x25b2, 0x25bf]].map(([a, b]) => `${String.fromCharCode(a)}-${String.fromCharCode(b)}`).join("") + "]");

type Lesson = { id: string; intro: string; tryThis: string };
const lesson = (lessons as Lesson[]).find((l) => l.id === CROSS_FIGURE_LESSON)!;
const lessonDe = (lessonsDe as Lesson[]).find((l) => l.id === CROSS_FIGURE_LESSON)!;

/** Where each word first stands in a sentence, so the order can be compared. */
const positions = (sentence: string, words: string[]) => words.map((w) => sentence.toLowerCase().indexOf(w.toLowerCase()));
const ascending = (xs: number[]) => xs.every((x, i) => x >= 0 && (i === 0 || x > xs[i - 1]));

describe("the drawing follows the lesson", () => {
  it("belongs to a lesson that exists in both languages", () => {
    expect(lesson).toBeDefined();
    expect(lessonDe).toBeDefined();
  });

  it("joins and folds the fingers the lesson names", () => {
    expect(lesson.intro).toContain("Bring together the thumb and the first two fingers of the right hand, with their tips touching.");
    expect(lesson.intro).toContain("Fold the last two fingers, the ring finger and the little finger, flat against the palm.");
    expect(lesson.tryThis).toContain("Three fingers joined, two folded.");
  });

  it("numbers the four touches in the lesson's order, in English and in German", () => {
    const en = /Touch the forehead, then the abdomen, then the right shoulder, then the left shoulder\./.exec(lesson.intro);
    expect(en, "the English lesson's sentence moved").not.toBeNull();
    expect(CROSS_TOUCHES.map((t) => t.n)).toEqual([1, 2, 3, 4]);
    expect(ascending(positions(en![0], CROSS_TOUCHES.map((t) => t.lessonWord)))).toBe(true);
    expect(ascending(positions(lesson.tryThis, CROSS_TOUCHES.map((t) => t.lessonWord)))).toBe(true);

    const de = /Berühre die Stirn, dann den Leib, dann die rechte Schulter, dann die linke Schulter\./.exec(lessonDe.intro);
    expect(de, "the German lesson's sentence moved").not.toBeNull();
    expect(ascending(positions(de![0], CROSS_TOUCHES.map((t) => DE[t.key])))).toBe(true);
  });

  it("names them in the lesson's own words", () => {
    for (const t of CROSS_TOUCHES) expect(EN[t.key].toLowerCase(), t.key).toBe(t.lessonWord);
    expect(lesson.tryThis).toContain(EN[CROSS_FIGURE_KEYS.joined]);
    expect(lesson.intro.toLowerCase()).toContain(EN[CROSS_FIGURE_KEYS.hand].toLowerCase());
    expect(EN[CROSS_FIGURE_KEYS.folded]).toBe("Two fingers folded");
    // The German drawing uses the German lesson's words.
    expect(lessonDe.tryThis).toContain(DE[CROSS_FIGURE_KEYS.joined]);
    expect(lessonDe.tryThis).toContain("zwei eingelegt");
  });

  it("gives its accessible name every step, in order", () => {
    const name = EN[CROSS_FIGURE_KEYS.figure];
    expect(ascending(positions(name, ["thumb", "first two fingers", "ring", "little", "forehead", "abdomen", "right shoulder", "left shoulder"]))).toBe(true);
  });

  it("is marked for a future clergy review, and the queue names it", () => {
    expect(SIGN_OF_THE_CROSS_REVIEW.status).toBe("awaiting-clergy-review");
    expect(read("docs", "editorial-standards.md")).toContain("SIGN_OF_THE_CROSS_REVIEW");
  });
});

describe("the drawing's words", () => {
  it("are in all twenty-one languages, and translated, not copied", () => {
    expect(LOCALES.length).toBe(21);
    for (const { code } of LOCALES) {
      const words = catalog(code);
      const missing = CROSS_FIGURE_ALL_KEYS.filter((k) => !words[k] || !words[k].trim());
      expect(missing, `${code} is missing`).toEqual([]);
      if (code === "en") continue;
      const copied = CROSS_FIGURE_ALL_KEYS.filter((k) => EN[k].split(/\s+/).length > 1 && words[k] === EN[k]);
      expect(copied, `${code} still has English`).toEqual([]);
    }
  });

  it("hold no em dash, in any language", () => {
    for (const { code } of LOCALES) {
      const words = catalog(code);
      for (const k of CROSS_FIGURE_ALL_KEYS) expect((words[k] ?? "").includes(EM_DASH), `${code} ${k}`).toBe(false);
    }
  });
});

describe("the drawing", () => {
  const src = read("components", "prayers", "SignOfTheCrossFigure.tsx");
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  it("moves only on the app's own switch", () => {
    expect(code).toContain(':where([data-motion="full"])');
    expect(code).not.toMatch(/prefers-reduced-motion|matchMedia/);
  });

  it("eases without bounce or overshoot", () => {
    expect(code).not.toContain("ease-pop");
    for (const m of code.matchAll(/cubic-bezier\(([^)]+)\)/g)) {
      const [, y1, , y2] = m[1].split(",").map(Number);
      expect(y1 >= 0 && y1 <= 1 && y2 >= 0 && y2 <= 1, m[0]).toBe(true);
    }
  });

  it("is drawn in the app's own tokens, with no gold, no emoji and no glyph for an icon", () => {
    expect(code).not.toMatch(/gold|festal|premium/i);
    // The one literal colour is the white of the fade's mask, which is never seen.
    const literal = [...code.matchAll(/^.*#[0-9a-f]{3,8}\b.*$/gim)].map((m) => m[0].trim());
    expect(literal.every((line) => /^<stop .*stopColor="#fff"/.test(line)), literal.join("\n")).toBe(true);
    expect(GLYPHS.test(src)).toBe(false);
    expect(src.includes(EM_DASH)).toBe(false);
  });

  it("stands in the lesson it belongs to", () => {
    const page = read("app", "(app)", "prayers", "learning", "[lessonId]", "page.tsx");
    expect(page).toContain("<SignOfTheCrossFigure />");
    expect(page).toContain("CROSS_FIGURE_LESSON");
  });
});
