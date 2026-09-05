// Today's Catechism: the shapes shared by the bank, the selector, the window
// the page bakes for the native export, the client, and the attempt route.
//
// Nothing in here imports anything, on purpose: the client bundle for
// /catechism reads these types, and so does scripts/quiz-import.ts under plain
// Node, so this file has to be safe in both.

export type QuestionType = "multiple_choice" | "true_false" | "fill_word";

/** The reader's calendar reckoning, as lib/calendar/orthodox.ts names it. */
export type Reckoning = "new" | "old";

/**
 * What a question can hang off in the church year. A question carrying one
 * of these is a candidate for the day's anchor slot when the day matches.
 *
 *   saint    a slug in lib/saints/saints.ts, matched against the SHIFTED
 *            day's commemorations (the menologion moves with the reckoning)
 *   feast    a fixed "MM-DD" key, matched against the SHIFTED day
 *   reading  a book slug and chapter, matched against the CIVIL day's
 *            appointed readings (the paschal cycle does not move)
 *
 * The asymmetry mirrors lib/calendar/useChurchDay.ts and is not optional.
 */
export type CalendarAnchor = {
  saint?: string;
  feast?: string;
  reading?: { book: string; chapter: number };
};

/**
 * One reviewed question, as it sits in data/catechism/questions.json.
 *
 * `answer` by type:
 *   multiple_choice  the 0-based index into `options` (exactly four)
 *   true_false       a boolean
 *   fill_word        a non-empty list of accepted spellings; the first is the
 *                    one shown after answering, the rest are alternates
 *
 * `source_ref` is a site path into free content, resolved and checked by
 * lib/catechism/sourceRef.ts. `tags` are free-form study tags and are the
 * hook Study Collections will attach to: a collection is a tag with a name.
 */
export type Question = {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: string[];
  answer: number | boolean | string[];
  explanation: string;
  source_ref: string;
  tags: string[];
  calendar_anchor?: CalendarAnchor | null;
  reviewed_by: string;
  published_at?: string | null;
  retired_at?: string | null;
};

/** A source_ref after resolution: where it goes and what to call it. */
export type SourceRefKind =
  | "saint"
  | "work"
  | "heresy"
  | "council"
  | "topic"
  | "bible"
  | "prayer";

export type ResolvedSource = {
  kind: SourceRefKind;
  href: string;
  label: string;
};

/**
 * The question as the client receives it. The answer travels too, so the
 * page can grade offline and show the explanation without a server; the
 * attempt route grades again for the score it records. Review metadata and
 * the calendar anchor stay behind: the client does not need them, and the
 * window is serialised into the native bundle once per question.
 */
export type ClientQuestion = {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: string[];
  answer: number | boolean | string[];
  explanation: string;
  tags: string[];
  source: ResolvedSource;
};

/**
 * The date-keyed window a page bakes: one entry per civil date, each holding
 * the five ids for both reckonings, plus every question those ids name, once.
 * Keys are "YYYY-MM-DD" in the UTC frame the calendar lookups use.
 */
export type DailyWindow = {
  days: Record<string, Record<Reckoning, string[]>>;
  questions: Record<string, ClientQuestion>;
};

/** What a reader gave for one question. */
export type Answer = number | boolean | string;

export type AttemptAnswer = {
  question_id: string;
  answer: Answer;
  correct: boolean;
};

export const QUESTIONS_PER_DAY = 5;

/** Below this many eligible questions the anchor slot is skipped. */
export const ANCHOR_MIN_BANK = 35;

/** Days a question is kept out of the draw after it was shown. */
export const NO_REPEAT_DAYS = 7;
