// Where each line of Scripture a reading plan's guide quotes stands (1.8).
//
// The owner, 2026-10-17: "Whatever quote, the father, or scripture ... you
// can easily see where it comes from." The guide's intros and questions
// quote the day's chapters between single marks; data/plans/guide/cites.json
// (written by scripts/cite-plan-guide.mjs) names the verses of the app's
// Bible that hold each one, word for word, or the passage a line is close to
// and how it differs. The plan's card numbers each quoted line where it
// stands and lists its verse under the intro; a question shows the verse it
// quotes under it.
//
// What a reader would notice if this broke: a line from a psalm with no way
// to its verse, a verse that does not say it, or a question that changes the
// words of the Gospel presented as the Gospel's own.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import cites from "@/data/plans/guide/cites.json";
import en from "@/data/plans/guide/en.json";

import { dayGuide, guideShown, type GuideCites, type GuideContent } from "../guide";
import { READING_PLANS } from "../plans";

const ROOT = process.cwd();
const guide = en as GuideContent;
const placed = cites as GuideCites;

/** The same reading of the guide's quotation marks as scripts/cite-plan-guide.mjs. */
const QUOTED = /(?:^|[\s(])'((?:[^']|'(?=[a-z]))+?)'(?=[\s.,;:?!)]|$)/g;
const words = (s: string) =>
  s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
const verses = (book: string, chapter: number, from: number, to = from) =>
  (JSON.parse(fs.readFileSync(path.join(ROOT, "data", "bible", book, `${chapter}.json`), "utf8")) as { verses: { n: number; text: string }[] }).verses
    .filter((v) => v.n >= from && v.n <= to)
    .map((v) => v.text)
    .join(" ");

describe("a line of Scripture in a reading plan's guide", () => {
  it("is placed, every one, and nothing else is", () => {
    let n = 0;
    for (const plan of READING_PLANS) {
      (guide[plan.id]?.days ?? []).forEach((d, i) => {
        for (const field of ["intro", "q"] as const) {
          const quoted = [...(d?.[field] ?? "").matchAll(QUOTED)].map((m) => m[1].trim());
          const list = placed[plan.id]?.[String(i + 1)]?.[field] ?? [];
          expect(list.map((q) => q.words), `${plan.id} day ${i + 1} ${field}`).toEqual(quoted);
          n += quoted.length;
        }
      });
      // The pool's questions are asked on any day, and quote nothing.
      for (const q of guide[plan.id]?.pool ?? []) expect([...q.matchAll(QUOTED)], q).toEqual([]);
    }
    expect(n).toBe(206);
  });

  it("names verses that say it, word for word, or says it is not word for word, and how", () => {
    let close = 0;
    for (const [planId, days] of Object.entries(placed)) {
      for (const [day, fields] of Object.entries(days ?? {})) {
        for (const q of [...(fields?.intro ?? []), ...(fields?.q ?? [])]) {
          const where = `${planId} day ${day}: ${q.words}`;
          if (q.cite.kind === "scripture") {
            expect(words(verses(q.cite.book, q.cite.chapter, q.cite.from, q.cite.to)), where).toContain(words(q.words));
          } else {
            close++;
            expect(q.cite.of.kind, where).toBe("scripture");
            const of = q.cite.of as { book: string; chapter: number; from: number; to?: number };
            expect(words(verses(of.book, of.chapter, of.from, of.to)).includes(words(q.words)), where).toBe(false);
            expect(q.cite.differs.trim().length, where).toBeGreaterThan(30);
          }
        }
      }
    }
    // Mark 3:14 shortened, the thief's words as the prayers before Communion say them, John 11:25-26 joined.
    expect(close).toBe(3);
  });

  it("is numbered where it stands, with its verse and its Bible, where the words are the English ones", () => {
    const day = dayGuide(guide, guide, "psalter", 1, placed)!;
    expect(day.introSources.map((s) => [s.n, s.words])).toEqual([
      [1, "How long, O Lord?"],
      [2, "thou wilt not leave my soul in hell"],
    ]);
    expect(day.introSources[0].shown).toEqual({ kind: "scripture", href: "/bible/psalms/12#v1", book: "psalms", reference: "12:1", translation: "brenton" });
    const lazarus = dayGuide(guide, guide, "gospels", 78, placed)!;
    expect(lazarus.questions[0].sources).toEqual([
      { kind: "inexact", of: { kind: "scripture", href: "/bible/john/11#v25-26", book: "john", reference: "11:25-26", translation: "kjv" } },
    ]);
    // A translation's words carry none of the English's verses.
    const greek: GuideContent = { psalter: { pool: [], days: [null, { intro: "Ἕως πότε, Κύριε;", q: "Τι;" }] } };
    const translated = dayGuide(greek, guide, "psalter", 1, placed)!;
    expect(translated.introSources).toEqual([]);
    expect(translated.questions[0].sources).toBeUndefined();
    expect(guideShown({ kind: "scripture", book: "matthew", chapter: 5, from: 8 })).toMatchObject({ translation: "kjv", reference: "5:8" });
  });

  it("is shown on the day's card and under its question", () => {
    const card = fs.readFileSync(path.join(ROOT, "components/plans/PlanTodayCard.tsx"), "utf8");
    expect(card).toContain("marked(guide.intro, guide.introSources, PLAN_SOURCE)");
    expect(card).toContain("<SourceList ");
    const questions = fs.readFileSync(path.join(ROOT, "components/plans/PlanQuestions.tsx"), "utf8");
    expect(questions).toContain("<SourceLine key={k} cite={s}");
    const plan = fs.readFileSync(path.join(ROOT, "components/plans/PlanClient.tsx"), "utf8");
    // The verses come with the page (lib/plans/words.ts, the owner's note 42 of build 80).
    expect(plan).toContain("usePlanGuide(locale, true, words)");
  });
});
