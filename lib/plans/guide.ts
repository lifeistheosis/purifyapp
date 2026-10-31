/**
 * What a reading plan says around each day (1.7, the owner's note 22: "notes
 * and questions that pop up ... guided and welcoming"): a short intro of what
 * to watch for, the day's own question and one from the plan's pool, and, on
 * some days, one saying of the Fathers on the passage.
 *
 * The words are content, not interface, so they live in their own files and
 * not in the message catalogs every page loads:
 *   data/plans/guide/<locale>.json  { [planId]: { pool: string[], days: [{ intro, q }] } }
 *   data/plans/sayings.json         { [planId]: { [day]: Saying } }, English
 * A plan page loads its reader's language and English; a day a language has
 * not reached yet is shown in English, and says so.
 *
 * Every intro and question is written as canonically as possible and is
 * marked for a future clergy review (docs/editorial-standards.md, item 11 of
 * the clergy queue); nothing in them adds to what the passage says. Every
 * saying is copied word for word from a public-domain translation already in
 * the app, with its author, work and citation (lib/plans/__tests__/
 * guide.test.ts holds each one to its source). A day with no such saying has
 * none: none is ever written for it.
 */

import { getBook } from "@/lib/bible/books";
import type { CommentaryAt } from "@/lib/bible/commentaryWorks";
import { scriptureHref, scriptureReference, type InexactCite, type ScriptureCite, type ShownCite } from "@/lib/citations/cite";
import { getPlan } from "./plans";

export type GuideDay = { intro?: string; q?: string };
export type PlanGuideText = { pool?: string[]; days?: (GuideDay | null)[] };
export type GuideContent = Record<string, PlanGuideText | undefined>;

/**
 * Where each line of Scripture the English guide quotes stands (1.8,
 * data/plans/guide/cites.json, written by scripts/cite-plan-guide.mjs): the
 * verses of the app's Bible, or the passage a line is close to. By plan,
 * then day (from 1), then the intro and the day's own question.
 */
export type GuideCite = { words: string; cite: ScriptureCite | InexactCite };
export type GuideCites = Record<string, Record<string, { intro?: GuideCite[]; q?: GuideCite[] } | undefined> | undefined>;

/** A quoted line of a day's words, numbered where it stands, with its line. */
export type GuideSource = { words: string; n: number; shown: ShownCite };

/** The line under a quoted verse, on the device: no file is read for it. */
export function guideShown(c: ScriptureCite | InexactCite): ShownCite | null {
  const scripture = (s: ScriptureCite): Extract<ShownCite, { kind: "scripture" }> | null => {
    const book = getBook(s.book);
    if (!book) return null;
    return { kind: "scripture", href: scriptureHref(s), book: s.book, reference: scriptureReference(s), translation: book.source === "kjv-pd" ? "kjv" : "brenton" };
  };
  if (c.kind === "scripture") return scripture(c);
  const of = c.of.kind === "scripture" ? scripture(c.of) : null;
  return of ? { kind: "inexact", of } : null;
}

export type Saying = {
  text: string;
  author: string;
  work: string;
  citation: string;
  /**
   * Where the words stand in the library's copy of the work, for a saying
   * cut from a work the library holds (1.8, scripts/place-commentary.mjs):
   * its line names the place exactly and opens it (lib/bible/commentaryWorks.ts).
   */
  at?: CommentaryAt;
  /** The file the words are copied from, for the verbatim test. */
  from: string;
};
export type SayingsContent = Record<string, Record<string, Saying | undefined> | undefined>;

/**
 * A plan's own words, handed to its page at build (lib/plans/words.ts): its
 * English guide, where the verses that guide quotes stand, and the Fathers'
 * sayings, for that plan alone.
 */
export type PlanWords = { en: GuideContent; cites: GuideCites; sayings: SayingsContent };

export type GuideQuestion = {
  key: string;
  text: string;
  /** The line under each verse the question quotes (1.8), where its words are the English ones. */
  sources?: ShownCite[];
};

export type DayGuide = {
  intro: string | null;
  /** The verses the intro quotes, numbered where they stand (1.8), where its words are the English ones. */
  introSources: GuideSource[];
  questions: GuideQuestion[];
  /** Some of it is the English, the reader's language not having it yet. */
  english: boolean;
};

/** The day's own question, then one from the plan's pool, turning with the days. */
export const QUESTIONS_PER_DAY = 2;

/** The keys of a day's questions: they name an answer in the journal, in any language. */
export function questionKeys(planId: string, index: number, poolSize: number): string[] {
  const keys = [`${planId}.d${index + 1}.q`];
  if (poolSize > 0) keys.push(`${planId}.q.${(index % poolSize) + 1}`);
  return keys;
}

function textFor(content: GuideContent | null, planId: string, key: string): string | null {
  const plan = content?.[planId];
  if (!plan) return null;
  const day = /\.d(\d+)\.q$/.exec(key);
  if (day) return plan.days?.[Number(day[1]) - 1]?.q?.trim() || null;
  const pool = /\.q\.(\d+)$/.exec(key);
  if (pool) return plan.pool?.[Number(pool[1]) - 1]?.trim() || null;
  return null;
}

/**
 * A day's intro and questions, in the reader's language where it has them
 * (`own`) and in English (`en`) where it does not. Null for a day the plan
 * does not have. Where the words are the English ones, the verses they quote
 * come with them (`cites`); a translation's words are not the English's, and
 * carry none until their own are placed.
 */
export function dayGuide(own: GuideContent | null, en: GuideContent, planId: string, index: number, cites?: GuideCites | null): DayGuide | null {
  const plan = getPlan(planId);
  if (!plan || !Number.isInteger(index) || index < 0 || index >= plan.days.length) return null;
  let english = false;
  const ownIntro = own?.[planId]?.days?.[index]?.intro?.trim() || null;
  const enIntro = en[planId]?.days?.[index]?.intro?.trim() || null;
  const intro = ownIntro ?? enIntro;
  if (!ownIntro && enIntro && own !== en) english = true;
  const placed = cites?.[planId]?.[String(index + 1)];
  const englishIntro = intro !== null && intro === enIntro;
  const introSources: GuideSource[] = [];
  if (englishIntro && intro) {
    // Numbered in the order they stand.
    const found = (placed?.intro ?? []).map((q) => ({ q, at: intro.indexOf(q.words) })).filter(({ at }) => at >= 0).sort((a, b) => a.at - b.at);
    for (const { q } of found) {
      const shown = guideShown(q.cite);
      if (shown) introSources.push({ words: q.words, n: introSources.length + 1, shown });
    }
  }
  const poolSize = en[planId]?.pool?.length ?? 0;
  const questions: GuideQuestion[] = [];
  for (const key of questionKeys(planId, index, poolSize)) {
    const mine = textFor(own, planId, key);
    const theirs = textFor(en, planId, key);
    const text = mine ?? theirs;
    if (!text) continue;
    if (!mine && own !== en) english = true;
    // Only the day's own question quotes: the pool's are asked on any day.
    const quoted = text === theirs && /\.d\d+\.q$/.test(key) ? (placed?.q ?? []).filter((q) => text.includes(q.words)) : [];
    const sources = quoted.map((q) => guideShown(q.cite)).filter((s): s is ShownCite => s !== null);
    questions.push(sources.length ? { key, text, sources } : { key, text });
  }
  return { intro, introSources, questions, english };
}

/** The saying for a day, if the day has one. */
export function sayingFor(sayings: SayingsContent | null, planId: string, index: number): Saying | null {
  return sayings?.[planId]?.[String(index + 1)] ?? null;
}

/** The first sentence of an intro, for tomorrow's look ahead. */
export function firstLine(text: string | null): string | null {
  if (!text) return null;
  const m = /^(.+?[.!?;])(\s|$)/u.exec(text.trim());
  return (m ? m[1] : text).trim();
}
