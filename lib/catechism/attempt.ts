// The attempt route's rule, as a pure function over injected writes.
//
// app/api/catechism/attempt/route.ts does the HTTP: auth, rate limit, CORS.
// Everything it then decides is here, so a unit test can drive the whole
// rule with an in-memory table and never needs a Supabase client.
//
// The server does not trust the client's list of questions. It re-derives
// the day's set from the bank with the same pickDaily the page used, grades
// against the bank, and records ITS score. A client can only say which of
// the day's five it answered and what it typed.

import { z } from "zod";

import { daysBetweenIso, isIsoDate } from "./dates";
import { isCorrect } from "./grade";
import { pickDaily, type CalendarLookup } from "./select";
import { QUESTIONS_PER_DAY, type AttemptAnswer, type Question, type Reckoning } from "./types";

/** /api/catechism/attempt POST body. */
export const attemptSchema = z.object({
  id: z.string().uuid(),
  date: z.string().refine(isIsoDate, "YYYY-MM-DD"),
  reckoning: z.enum(["new", "old"]),
  answers: z
    .array(
      z.object({
        question_id: z.string().uuid(),
        answer: z.union([z.number().int().min(0).max(3), z.boolean(), z.string().max(120)]),
      }),
    )
    .min(1)
    .max(QUESTIONS_PER_DAY),
});

export type AttemptInput = z.infer<typeof attemptSchema>;

/**
 * How far from the server's UTC day an attempt's date may sit. Wide enough
 * for every timezone and a phone that finished last night's five this
 * morning; narrow enough that nobody backfills a year. Not an expiry: the
 * window the page ships is the only thing that decides what a reader can
 * answer, and it shows no "missed".
 */
export const DATE_TOLERANCE_DAYS = 3;

export type AttemptRow = {
  id: string;
  user_id: string;
  date: string;
  reckoning: Reckoning;
  answers: AttemptAnswer[];
  score: number;
  completed_at: string;
};

export type WriteError = { code?: string | null; message?: string | null } | null;

export type AttemptDeps = {
  bank: readonly Question[];
  /** The server's UTC day, "YYYY-MM-DD". */
  today: string;
  /** Insert under RLS as the user. Resolves with the driver's error, never throws. */
  insert: (row: AttemptRow) => Promise<{ error: WriteError }>;
  /** Bump the aggregate counters. Best effort; a failure is logged, not returned. */
  bump: (shown: string[], correct: string[]) => Promise<void>;
  /** Record the day's set in quiz_daily. Best effort. */
  recordDaily?: (date: string, reckoning: Reckoning, ids: string[]) => Promise<void>;
  calendar?: CalendarLookup;
};

export type AttemptOutcome =
  | { ok: true; status: 200; score: number; total: number }
  | { ok: false; status: 400 | 409 | 503; error: string };

const UNIQUE_VIOLATION = "23505";

export function isTableAbsentError(err: WriteError): boolean {
  if (!err) return false;
  if (err.code === "42P01" || err.code === "PGRST205") return true;
  const m = err.message ?? "";
  return /schema cache/i.test(m) && /could not find the table/i.test(m);
}

export async function handleAttempt(
  deps: AttemptDeps,
  body: unknown,
  userId: string,
): Promise<AttemptOutcome> {
  const parsed = attemptSchema.safeParse(body);
  if (!parsed.success) return { ok: false, status: 400, error: "invalid" };
  const { id, date, reckoning, answers } = parsed.data;

  if (Math.abs(daysBetweenIso(deps.today, date)) > DATE_TOLERANCE_DAYS) {
    return { ok: false, status: 400, error: "date out of range" };
  }

  const set = pickDaily(deps.bank, date, reckoning, deps.calendar);
  if (set.length === 0) return { ok: false, status: 400, error: "no set for that day" };
  if (answers.length > set.length) {
    return { ok: false, status: 400, error: "answers longer than the set" };
  }
  const inSet = new Set(set);
  const seen = new Set<string>();
  for (const a of answers) {
    if (!inSet.has(a.question_id) || seen.has(a.question_id)) {
      return { ok: false, status: 400, error: "answer is not for the day's set" };
    }
    seen.add(a.question_id);
  }

  const byId = new Map(deps.bank.map((q) => [q.id, q]));
  const graded: AttemptAnswer[] = answers.map((a) => {
    const q = byId.get(a.question_id);
    return {
      question_id: a.question_id,
      answer: a.answer,
      correct: q ? isCorrect(q, a.answer) : false,
    };
  });
  const score = graded.filter((g) => g.correct).length;

  const { error } = await deps.insert({
    id,
    user_id: userId,
    date,
    reckoning,
    answers: graded,
    score,
    completed_at: new Date().toISOString(),
  });
  if (error) {
    if (error.code === UNIQUE_VIOLATION) return { ok: false, status: 409, error: "already recorded" };
    if (isTableAbsentError(error)) return { ok: false, status: 503, error: "unavailable" };
    console.error("[catechism] attempt insert failed", error.message);
    return { ok: false, status: 503, error: "unavailable" };
  }

  try {
    await deps.bump(
      graded.map((g) => g.question_id),
      graded.filter((g) => g.correct).map((g) => g.question_id),
    );
  } catch (e) {
    console.warn("[catechism] stats bump failed", (e as Error).message);
  }
  if (deps.recordDaily) {
    try {
      await deps.recordDaily(date, reckoning, set);
    } catch (e) {
      console.warn("[catechism] quiz_daily write failed", (e as Error).message);
    }
  }

  return { ok: true, status: 200, score, total: set.length };
}
