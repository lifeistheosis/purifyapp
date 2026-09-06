// Study Collections: a collection is a tag with a name.
//
// The owner defines collections in data/catechism/collections.json, reviewed
// and committed like the bank. Ship an EMPTY file and every surface shows its
// quiet empty state; nothing here invents a collection or a question.
//
// Progress is a set, not a number: the ids of the collection's questions a
// reader has answered rightly, in any daily catechism or in practice. The
// set is unioned on every correct answer and never shrinks. Completion is
// "every currently published question carrying the tag is in the set",
// recomputed on read; the `completed_at` a store writes when that first
// becomes true is never cleared, so a bank that grows later cannot revoke
// a completion already made.
//
// Pure apart from the JSON import, so this ships in the client bundle (the
// You tab names completed collections from it), runs under plain Node in
// scripts/quiz-import.ts, and imports cleanly from the routes. It does not
// import select.ts on purpose: that module pulls node:crypto and the whole
// church calendar, neither of which belongs in a client bundle, and its
// relative imports do not resolve under the script alias hook.

import { z } from "zod";

import raw from "@/data/catechism/collections.json";
import { isCollectionTheme } from "@/lib/reader/readingModes";

import type { Question } from "./types";

export type Collection = {
  slug: string;
  name: string;
  description: string;
  tag: string;
  theme_id: string;
  sort_order: number;
};

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const text = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    // The editorial rule, enforced at the file like the bank's schema does.
    .refine((s) => !s.includes("\u2014"), "contains an em dash");

export const collectionSchema = z
  .object({
    slug: z.string().regex(SLUG, "slug: lowercase words joined by hyphens").max(64),
    name: text(80),
    description: text(400),
    tag: z.string().regex(SLUG, "tag: a lowercase slug, as on the questions").max(64),
    theme_id: z
      .string()
      .refine(isCollectionTheme, "theme_id: not a collection palette in READING_THEMES"),
    sort_order: z.number().int().min(0).max(10_000),
  })
  .strict();

export type ParseCollectionsResult =
  | { ok: true; collections: Collection[] }
  | { ok: false; errors: string[] };

/**
 * The whole file or nothing, the rule scripts/quiz-import.ts applies to the
 * bank. Every row against the schema, every slug unique, every theme_id a
 * collection palette the registry knows (which lib/reader/__tests__/prepaint
 * .test.ts in turn holds against the pre-paint list and the CSS token
 * blocks).
 */
export function parseCollections(input: unknown): ParseCollectionsResult {
  if (!Array.isArray(input)) return { ok: false, errors: ["not an array"] };
  const errors: string[] = [];
  const out: Collection[] = [];
  const slugs = new Set<string>();
  input.forEach((row, i) => {
    const r = collectionSchema.safeParse(row);
    if (!r.success) {
      for (const issue of r.error.issues) {
        errors.push(`row ${i}: ${issue.path.join(".") || "row"}: ${issue.message}`);
      }
      return;
    }
    if (slugs.has(r.data.slug)) {
      errors.push(`row ${i}: duplicate slug ${r.data.slug}`);
      return;
    }
    slugs.add(r.data.slug);
    out.push(r.data);
  });
  if (errors.length) return { ok: false, errors };
  out.sort((a, b) => a.sort_order - b.sort_order || a.slug.localeCompare(b.slug));
  return { ok: true, collections: out };
}

let cached: Collection[] | null = null;

/**
 * The committed collections, in sort order. A malformed row is dropped with
 * a warning rather than allowed to break a page; the test on the committed
 * file makes that warning a failure.
 */
export function loadCollections(): Collection[] {
  if (cached) return cached;
  const rows = Array.isArray(raw) ? (raw as unknown[]) : [];
  const out: Collection[] = [];
  const slugs = new Set<string>();
  rows.forEach((row, i) => {
    const r = collectionSchema.safeParse(row);
    if (!r.success) {
      console.warn(
        `[collections] collections.json row ${i} dropped: ${r.error.issues.map((x) => x.message).join("; ")}`,
      );
      return;
    }
    if (slugs.has(r.data.slug)) {
      console.warn(`[collections] collections.json row ${i} dropped: duplicate slug ${r.data.slug}`);
      return;
    }
    slugs.add(r.data.slug);
    out.push(r.data);
  });
  out.sort((a, b) => a.sort_order - b.sort_order || a.slug.localeCompare(b.slug));
  cached = out;
  return out;
}

export function getCollection(slug: string): Collection | null {
  return loadCollections().find((c) => c.slug === slug) ?? null;
}

/** Today's key in the UTC frame the bank's dates use. */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** The same rule as select.ts isEligible: published by `today`, not retired. */
function isPublished(q: Question, today: string): boolean {
  if (q.retired_at) return false;
  if (q.published_at && q.published_at.slice(0, 10) > today) return false;
  return true;
}

/** The currently published questions carrying `tag`, in bank order. */
export function tagQuestions(
  bank: readonly Question[],
  tag: string,
  today: string = todayIso(),
): Question[] {
  return bank.filter((q) => q.tags.includes(tag) && isPublished(q, today));
}

export type Progress = {
  /** How many of the collection's published questions are in the set. */
  done: number;
  /** How many published questions carry the tag today. */
  total: number;
  /** done === total, and total above zero. Recomputed on every read. */
  complete: boolean;
};

/**
 * Progress against the published questions. Ids in the set that carry the
 * tag no longer (retired, or edited out of the tag) still count for nothing
 * here and are still never removed from the set: the set is the reader's
 * record, the total is today's bank.
 */
export function progressFor(
  correctIds: Iterable<string>,
  questionIds: readonly string[],
): Progress {
  const have = new Set(correctIds);
  const done = questionIds.filter((id) => have.has(id)).length;
  const total = questionIds.length;
  return { done, total, complete: total > 0 && done === total };
}

export function isComplete(correctIds: Iterable<string>, questionIds: readonly string[]): boolean {
  return progressFor(correctIds, questionIds).complete;
}

/**
 * What a page ships to its client child: each collection with the ids of
 * its published questions, so the client can advance and complete a
 * collection with no server. Small: a few uuids per question.
 */
export type CollectionIndexEntry = Collection & { question_ids: string[] };

export function collectionIndex(
  collections: readonly Collection[],
  bank: readonly Question[],
  today: string = todayIso(),
): CollectionIndexEntry[] {
  return collections.map((c) => ({
    ...c,
    question_ids: tagQuestions(bank, c.tag, today).map((q) => q.id),
  }));
}

/**
 * The union of `add` into `have`, in `have` order then `add` order. The one
 * operation a progress set supports.
 */
export function unionIds(have: readonly string[], add: readonly string[]): string[] {
  const seen = new Set(have);
  const out = [...have];
  for (const id of add) {
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}
