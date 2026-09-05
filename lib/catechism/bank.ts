import "server-only";

import raw from "@/data/catechism/questions.json";
import { loadAllTopics } from "@/lib/topics/topics";

import { parseQuestion } from "./schema";
import { resolveSourceRef, type Registries } from "./sourceRef";
import type { ClientQuestion, DailyWindow, Question } from "./types";
import { WINDOW_DAYS, buildDailyWindow, windowKeys, windowStart } from "./window";

/**
 * The question bank, as the server sees it.
 *
 * data/catechism/questions.json is canonical: reviewed, versioned in git like
 * data/topics/*.json, written only by scripts/quiz-import.ts. The database
 * copy in quiz_questions exists for the admin correct-rate view and never
 * feeds a page. Ship an EMPTY bank and every surface shows its quiet empty
 * state; nothing here invents a question.
 *
 * A malformed row is dropped with a warning rather than allowed to break the
 * page. The import script refuses the file before it gets here, so a drop
 * means someone edited the JSON by hand.
 */

let cached: Question[] | null = null;

export function loadBank(): Question[] {
  if (cached) return cached;
  const rows = Array.isArray(raw) ? (raw as unknown[]) : [];
  const out: Question[] = [];
  const seen = new Set<string>();
  rows.forEach((row, i) => {
    const r = parseQuestion(row);
    if (!r.ok) {
      console.warn(`[catechism] questions.json row ${i} dropped: ${r.errors.join("; ")}`);
      return;
    }
    if (seen.has(r.question.id)) {
      console.warn(`[catechism] questions.json row ${i} dropped: duplicate id ${r.question.id}`);
      return;
    }
    seen.add(r.question.id);
    out.push(r.question);
  });
  cached = out;
  return out;
}

/** Whether there is anything to show. Gates the Today card and the onboarding line. */
export function bankHasQuestions(): boolean {
  return loadBank().length > 0;
}

/** The registries a source_ref resolves against, with the topic titles read once. */
export async function bankRegistries(): Promise<Registries> {
  const topics = await loadAllTopics();
  const titles = new Map(topics.map((t) => [t.slug, t.title]));
  return { topicTitle: (slug) => titles.get(slug) ?? null };
}

/** The question as the client receives it, or null when its source is gone. */
export function toClientQuestion(q: Question, registries: Registries): ClientQuestion | null {
  const source = resolveSourceRef(q.source_ref, registries);
  if (!source) {
    console.warn(`[catechism] ${q.id}: source_ref ${q.source_ref} does not resolve`);
    return null;
  }
  return {
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    options: q.options,
    answer: q.answer,
    explanation: q.explanation,
    tags: q.tags,
    source,
  };
}

/** The window the page ships: WINDOW_DAYS from yesterday, both reckonings. */
export async function getDailyWindow(now: Date = new Date()): Promise<DailyWindow> {
  const bank = loadBank();
  if (bank.length === 0) return { days: {}, questions: [] };
  const registries = await bankRegistries();
  return buildDailyWindow(bank, windowKeys(windowStart(now), WINDOW_DAYS), (q) =>
    toClientQuestion(q, registries),
  );
}
