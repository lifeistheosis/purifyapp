import { z } from "zod";

import type { Question } from "./types";

// The shape of one bank question, checked in three places from this one
// definition: scripts/quiz-import.ts before a file is accepted, bank.ts when
// the committed file is loaded (a malformed row is dropped rather than
// allowed to break the page), and the attempt route when it validates the
// answers a client sends against the question they answer.
//
// Zod rather than a hand-rolled checker because the answer shape depends on
// the type, and a discriminated union says that once instead of in prose.

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MMDD = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const text = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    // The editorial rule from docs/editorial-standards.md: never an em dash
    // in anything a reader sees. Enforced at import so it cannot reach the
    // page at all.
    .refine((s) => !s.includes("—"), "contains an em dash");

export const calendarAnchorSchema = z
  .object({
    saint: z.string().regex(SLUG).optional(),
    feast: z.string().regex(MMDD).optional(),
    reading: z
      .object({
        book: z.string().regex(SLUG),
        chapter: z.number().int().min(1).max(200),
      })
      .optional(),
  })
  .strict()
  .refine(
    (a) => a.saint !== undefined || a.feast !== undefined || a.reading !== undefined,
    "an anchor names a saint, a feast or a reading",
  );

const base = {
  id: z.string().uuid(),
  prompt: text(400),
  explanation: text(1200),
  // A site path. Its shape and its target are checked by sourceRef.ts; this
  // only refuses anything that is not a root-relative path.
  source_ref: z
    .string()
    .min(2)
    .max(200)
    .startsWith("/")
    .refine((s) => !s.startsWith("//") && !/[\s\0]/.test(s), "not a site path"),
  tags: z.array(z.string().regex(SLUG).max(40)).max(12),
  calendar_anchor: calendarAnchorSchema.nullable().optional(),
  reviewed_by: z.string().trim().min(1).max(120),
  published_at: z.string().regex(ISO_DATE).nullable().optional(),
  retired_at: z.string().regex(ISO_DATE).nullable().optional(),
};

export const questionSchema = z.discriminatedUnion("type", [
  z
    .object({
      ...base,
      type: z.literal("multiple_choice"),
      options: z.array(text(200)).length(4),
      answer: z.number().int().min(0).max(3),
    })
    .strict(),
  z
    .object({
      ...base,
      type: z.literal("true_false"),
      answer: z.boolean(),
    })
    .strict(),
  z
    .object({
      ...base,
      type: z.literal("fill_word"),
      answer: z.array(text(80)).min(1).max(12),
    })
    .strict(),
]);

export type ParsedQuestion = z.infer<typeof questionSchema>;

/** Narrow an unknown row to a Question, or explain why it is not one. */
export function parseQuestion(
  raw: unknown,
): { ok: true; question: Question } | { ok: false; errors: string[] } {
  const r = questionSchema.safeParse(raw);
  if (r.success) return { ok: true, question: r.data as Question };
  return {
    ok: false,
    errors: r.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`),
  };
}
