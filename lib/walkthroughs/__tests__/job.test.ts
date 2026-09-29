// The rules every chapter of the Job walkthrough is held to. The notes are
// written to accepted Orthodox teaching without per-note review (the owner,
// 2026-09-28), so what can be checked mechanically is checked here: every
// Father line is verbatim from the corpus, every quoted line is verbatim from
// our Septuagint, notes stay under fifty words, and nothing carries an em
// dash.

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { JOB, JOB_CHAPTER_COUNT } from "../job";
import { WALKTHROUGHS_LIVE } from "../flags";
import type { ChapterWalk, Speaker } from "../types";

const ROOT = process.cwd();
const squash = (s: string) => s.replace(/\s+/g, " ").trim();

function verses(n: number): Map<number, string> {
  const j = JSON.parse(fs.readFileSync(path.join(ROOT, `data/bible/job/${n}.json`), "utf8")) as {
    verses: { n: number; text: string }[];
  };
  return new Map(j.verses.map((v) => [v.n, v.text]));
}

function commentary(n: number): Record<string, { author: string; text: string }[]> {
  return JSON.parse(fs.readFileSync(path.join(ROOT, `data/bible/commentary/job/${n}.json`), "utf8"));
}

const SPEAKERS: readonly Speaker[] = ["narrator", "job", "wife", "devil", "eliphaz", "baldad", "sophar", "elihu", "lord"];
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

function everyString(c: ChapterWalk): string[] {
  return [
    c.title,
    c.prompt,
    ...c.cards.flatMap((k) => [k.title, k.hook, k.body, k.question, k.father?.excerpt ?? ""]),
    ...c.beats.map((b) => b.text),
    ...c.attribution.map((a) => a.quote),
  ];
}

describe("the Job walkthrough", () => {
  it("has its chapters in order from the first, with no gaps", () => {
    JOB.chapters.forEach((c, i) => expect(c.n, `position ${i}`).toBe(i + 1));
  });

  it("has all forty-two before it goes live", () => {
    if (WALKTHROUGHS_LIVE) expect(JOB.chapters.length).toBe(JOB_CHAPTER_COUNT);
  });

  it("files each chapter under the movement that covers it", () => {
    for (const c of JOB.chapters) {
      const m = JOB.movements.find((x) => c.n >= x.from && c.n <= x.to);
      expect(m?.id, `chapter ${c.n}`).toBe(c.movement);
    }
  });

  for (const c of JOB.chapters) {
    describe(`chapter ${c.n}`, () => {
      const text = verses(c.n);

      it("anchors every card on a verse that exists, once", () => {
        expect(c.cards.length).toBeGreaterThanOrEqual(2);
        const ids = new Set<string>();
        for (const k of c.cards) {
          expect(text.has(k.verse), k.id).toBe(true);
          expect(k.id).toBe(`job-${c.n}-${k.verse}`);
          expect(ids.has(k.id), k.id).toBe(false);
          ids.add(k.id);
        }
      });

      it("keeps every note under fifty words, and the hook to a line", () => {
        for (const k of c.cards) {
          expect(words(k.body), `${k.id} body`).toBeLessThan(50);
          expect(k.hook.length, `${k.id} hook`).toBeLessThanOrEqual(110);
          expect(k.question.trim().endsWith("?"), `${k.id} question`).toBe(true);
        }
      });

      it("quotes a Father only verbatim, from the corpus", () => {
        const corpus = commentary(c.n);
        for (const k of c.cards) {
          if (!k.father) continue;
          const entry = corpus[String(k.father.verse)]?.[k.father.index];
          expect(entry, `${k.id}: no entry at ${k.father.verse}[${k.father.index}]`).toBeTruthy();
          expect(squash(entry!.text), `${k.id} excerpt`).toContain(squash(k.father.excerpt));
          expect(k.father.excerpt.length, `${k.id} excerpt length`).toBeLessThanOrEqual(260);
        }
      });

      it("puts its beats in the order they happen", () => {
        expect(c.beats.length).toBeGreaterThanOrEqual(3);
        for (let i = 0; i < c.beats.length; i++) {
          expect(text.has(c.beats[i].verse), c.beats[i].id).toBe(true);
          if (i > 0) expect(c.beats[i].verse).toBeGreaterThan(c.beats[i - 1].verse);
        }
      });

      it("quotes the chapter verbatim when it asks who said a line", () => {
        expect(c.attribution.length).toBeGreaterThanOrEqual(1);
        for (const a of c.attribution) {
          expect(text.get(a.verse), `${a.id} verse`).toBeTruthy();
          expect(text.get(a.verse), `${a.id} quote`).toContain(a.quote);
          expect(a.choices).toContain(a.speaker);
          expect(new Set(a.choices).size).toBe(a.choices.length);
          for (const s of a.choices) expect(SPEAKERS).toContain(s);
        }
      });

      it("carries no em dash anywhere", () => {
        for (const s of everyString(c)) expect(s, s.slice(0, 60)).not.toContain("—");
      });
    });
  }
});
