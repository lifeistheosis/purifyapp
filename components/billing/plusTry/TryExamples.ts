// The words of the previews' example entries (the journal, the Florilegium):
// a Father's line the reading plans already carry, word for word, with its
// author and work (data/plans/sayings.json, read with the plans'
// lib/plans/guide.ts). Never invented, and always shown with its author and
// the Example mark, never as the reader's own (lib/premium/plusTry.ts,
// TRY_EXAMPLES).

import sayings from "@/data/plans/sayings.json";

import type { TryExample } from "@/lib/premium/plusTry";

export type ExampleSaying = { text: string; author: string; work: string };

const BY_PLAN = sayings as unknown as Record<string, Record<string, ExampleSaying>>;

/** The Father's line an example names, or null if the plans no longer carry it. */
export function exampleSaying(example: TryExample): ExampleSaying | null {
  const s = BY_PLAN[example.plan]?.[String(example.day)];
  return s && s.text && s.author ? { text: s.text, author: s.author, work: s.work } : null;
}
