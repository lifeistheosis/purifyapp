import { z } from "zod";

import { timingFits } from "./cleared";
import { timingSchema } from "./schema";
import type { ChantLine, ChantTiming } from "./types";

/**
 * What the admin may write about a chant version's cleared words (build 86
 * note 78), checked before anything reaches the table: app/api/admin/
 * chant-words. The words and their timing must agree line for line and word
 * for word, a clearance is a name, a day and the reply as it came, and the
 * switch turns on only what is complete (the table holds the same rule).
 */
const name = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "a date, YYYY-MM-DD");

export const clearedLineSchema = z
  .object({
    text: z.string().trim().min(1).max(2000),
    translit: z.string().trim().min(1).max(2000).optional(),
    en: z.string().trim().min(1).max(2000).optional(),
  })
  .strict();

export const ClearedWordsInput = z
  .object({
    action: z.literal("save"),
    slug: name,
    variant: name,
    lines: z.array(clearedLineSchema).min(1).max(600),
    timing: timingSchema,
    wordsSource: z.string().trim().min(10).max(2000),
    clearedBy: z.string().trim().min(2).max(300),
    clearedOn: day,
    reply: z.string().trim().min(2).max(20000),
  })
  .superRefine((v, ctx) => {
    if (!timingFits(v.lines as ChantLine[], v.timing as ChantTiming)) {
      ctx.addIssue({
        code: "custom",
        path: ["timing"],
        message: "The timing must be line for line these words (and word for word where it times words).",
      });
    }
  });

export const ChantWordsAction = z.discriminatedUnion("action", [
  ClearedWordsInput,
  z.object({ action: z.literal("switch"), slug: name, variant: name, on: z.boolean() }).strict(),
  z.object({ action: z.literal("delete"), slug: name, variant: name }).strict(),
]);

export type ChantWordsActionInput = z.infer<typeof ChantWordsAction>;
