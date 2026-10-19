/**
 * The journal as one list (1.7, the owner's note 23): the notes a reader
 * wrote on verses (lib/bible/journal.ts) and the entries written in the
 * journal itself (lib/journal/entries.ts), newest first, by the day they
 * were written, with the kinds to filter by and the questions a reading plan
 * left waiting.
 *
 * Pure: the screen passes in what it has read.
 */

import type { JournalEntry } from "@/lib/bible/journal";
import type { PlansState } from "@/lib/plans/progress";

import type { JournalKind, JournalPrompt, JournalRecord, JournalSource } from "./entries";

export type JournalItem = {
  /** The row's key: `note:<book>:<chapter>:<verse>` or `rec:<id>`. */
  key: string;
  kind: JournalKind;
  body: string;
  /** When it was written (ISO), or null for a note from before notes were dated. */
  at: string | null;
  source?: JournalSource;
  prompt?: JournalPrompt;
  /** The entry, when it is one of the journal's own. */
  record: JournalRecord | null;
  /** The verse note, when it is one. */
  note: JournalEntry | null;
};

export type JournalFilter = "all" | JournalKind;
export const JOURNAL_FILTERS: readonly JournalFilter[] = ["all", "reflection", "prayer", "question"];

/** A verse note's key in the list, and the composer's `editing` for it. */
export function noteKey(book: string, chapter: number, verse: number): string {
  return `note:${book}:${chapter}:${verse}`;
}

/** Everything written, newest first; undated notes last, in the order found. */
export function journalFeed(notes: readonly JournalEntry[], records: readonly JournalRecord[]): JournalItem[] {
  const items: JournalItem[] = [];
  for (const n of notes) {
    items.push({
      key: noteKey(n.book, n.chapter, n.verse),
      kind: "reflection",
      body: n.note,
      at: n.at,
      source: { type: "verse", book: n.book, chapter: n.chapter, verse: n.verse, label: "" },
      record: null,
      note: n,
    });
  }
  for (const r of records) {
    if (r.deletedAt) continue;
    items.push({
      key: `rec:${r.id}`,
      kind: r.kind,
      body: r.body,
      at: r.createdAt,
      source: r.source,
      prompt: r.prompt,
      record: r,
      note: null,
    });
  }
  return items.sort((a, b) => {
    if (a.at && b.at) return Date.parse(b.at) - Date.parse(a.at);
    if (a.at) return -1;
    if (b.at) return 1;
    return 0;
  });
}

/**
 * The reader's own calendar day for a moment, `YYYY-MM-DD`, in the zone the
 * device is in: an entry written at 00:30 belongs to the day it was written
 * on there, not to the UTC day. The same civil day a plan's day is filed
 * under (lib/rhythm/dayKey.ts).
 */
export function localDayKey(iso: string): string | null {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Group by the day written, keeping the list's order; undated in a group of its own. */
export function byDay(items: readonly JournalItem[]): { day: string; items: JournalItem[] }[] {
  const groups: { day: string; items: JournalItem[] }[] = [];
  for (const item of items) {
    const day = (item.at && localDayKey(item.at)) || "undated";
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(item);
    else {
      const earlier = groups.find((g) => g.day === day);
      if (earlier) earlier.items.push(item);
      else groups.push({ day, items: [item] });
    }
  }
  return groups;
}

export function filterKind(items: readonly JournalItem[], filter: JournalFilter): JournalItem[] {
  return filter === "all" ? [...items] : items.filter((i) => i.kind === filter);
}

/** The kinds worth a chip: All, then each kind that has an entry. */
export function journalChips(items: readonly JournalItem[]): JournalFilter[] {
  const chips: JournalFilter[] = ["all"];
  for (const f of JOURNAL_FILTERS) if (f !== "all" && items.some((i) => i.kind === f)) chips.push(f);
  return chips;
}

/** Seven gentle prompts for an empty journal, one for each day of the week. */
export const EMPTY_PROMPTS = 7;

export function emptyPromptKey(date: Date): string {
  return `journal.prompt.${date.getDay() % EMPTY_PROMPTS}`;
}

export type PlanQuestion = { key: string; text: string };

export type WaitingQuestions = {
  planId: string;
  /** The plan's day, from 0. */
  day: number;
  /** The reader's civil day it was read on. */
  readOn: string;
  questions: PlanQuestion[];
};

/** Questions left waiting this long after their day are not asked any more. */
export const PROMPT_DAYS = 14;

/**
 * The questions of the reading plan day read most recently, still waiting
 * for an answer: never a backlog of every day ever read. None when that day
 * was put aside ("Not now"), when every question has an answer, or when it
 * was read more than two weeks ago. `questionsOf` gives a day's questions
 * from the plan's guide (lib/plans/guide.ts), in the reader's language.
 */
export function planPrompts(
  state: PlansState,
  records: readonly JournalRecord[],
  dismissed: readonly string[],
  questionsOf: (planId: string, day: number) => PlanQuestion[] | null,
  now: Date = new Date(),
): WaitingQuestions | null {
  let latest: { planId: string; day: number; on: string } | null = null;
  for (const [planId, progress] of Object.entries(state)) {
    for (const [index, on] of Object.entries(progress?.done ?? {})) {
      const day = Number(index);
      if (!Number.isInteger(day) || typeof on !== "string") continue;
      if (!latest || on > latest.on || (on === latest.on && day > latest.day && planId === latest.planId)) {
        latest = { planId, day, on };
      }
    }
  }
  if (!latest) return null;
  const today = localDayKey(now.toISOString());
  if (today) {
    const age = (Date.parse(`${today}T12:00:00Z`) - Date.parse(`${latest.on}T12:00:00Z`)) / 86_400_000;
    if (!Number.isFinite(age) || age > PROMPT_DAYS) return null;
  }
  if (dismissed.includes(`${latest.planId}:${latest.day}`)) return null;
  const all = questionsOf(latest.planId, latest.day);
  if (!all || all.length === 0) return null;
  const answered = new Set(
    records
      .filter((r) => !r.deletedAt && r.source?.type === "plan-day" && r.source.planId === latest!.planId && r.source.day === latest!.day)
      .map((r) => r.prompt?.key)
      .filter((k): k is string => !!k),
  );
  const questions = all.filter((q) => !answered.has(q.key));
  return questions.length ? { planId: latest.planId, day: latest.day, readOn: latest.on, questions } : null;
}
