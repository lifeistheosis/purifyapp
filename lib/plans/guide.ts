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

import type { CommentaryAt } from "@/lib/bible/commentaryWorks";
import { getPlan } from "./plans";

export type GuideDay = { intro?: string; q?: string };
export type PlanGuideText = { pool?: string[]; days?: (GuideDay | null)[] };
export type GuideContent = Record<string, PlanGuideText | undefined>;

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

export type GuideQuestion = { key: string; text: string };

export type DayGuide = {
  intro: string | null;
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
 * does not have.
 */
export function dayGuide(own: GuideContent | null, en: GuideContent, planId: string, index: number): DayGuide | null {
  const plan = getPlan(planId);
  if (!plan || !Number.isInteger(index) || index < 0 || index >= plan.days.length) return null;
  let english = false;
  const ownIntro = own?.[planId]?.days?.[index]?.intro?.trim() || null;
  const enIntro = en[planId]?.days?.[index]?.intro?.trim() || null;
  const intro = ownIntro ?? enIntro;
  if (!ownIntro && enIntro && own !== en) english = true;
  const poolSize = en[planId]?.pool?.length ?? 0;
  const questions: GuideQuestion[] = [];
  for (const key of questionKeys(planId, index, poolSize)) {
    const mine = textFor(own, planId, key);
    const theirs = textFor(en, planId, key);
    const text = mine ?? theirs;
    if (!text) continue;
    if (!mine && own !== en) english = true;
    questions.push({ key, text });
  }
  return { intro, questions, english };
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
