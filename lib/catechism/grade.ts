// Grading, shared by the page (which grades offline so the explanation can
// show without a server) and the attempt route (which grades again for the
// score it records). No imports: this ships in the client bundle.

import type { Answer, QuestionType } from "./types";

type Gradable = { type: QuestionType; answer: number | boolean | string[] };

/**
 * A typed answer, reduced to what the reader meant: case folded, diacritics
 * stripped, punctuation dropped, whitespace collapsed. "Théotokos." and
 * "theotokos" are the same word.
 */
export function normalizeWord(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** Whether `given` answers the question. A wrong SHAPE is simply wrong. */
export function isCorrect(q: Gradable, given: Answer): boolean {
  switch (q.type) {
    case "multiple_choice":
      return typeof given === "number" && given === q.answer;
    case "true_false":
      return typeof given === "boolean" && given === q.answer;
    case "fill_word": {
      if (typeof given !== "string" || !Array.isArray(q.answer)) return false;
      const want = normalizeWord(given);
      if (!want) return false;
      return q.answer.some((a) => normalizeWord(a) === want);
    }
  }
}
