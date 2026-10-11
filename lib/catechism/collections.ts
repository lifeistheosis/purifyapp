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
// You tab names completed collections from it, and the profile bridge that
// runs on every screen reaches it), runs under plain Node in
// scripts/quiz-import.ts, and imports cleanly from the routes. For that
// reason it imports no zod: the schema lives in ./collectionsSchema.ts, and
// until 1.6 it lived here and cost every cold open 263 KB. It does not
// import select.ts on purpose: that module pulls node:crypto and the whole
// church calendar, neither of which belongs in a client bundle, and its
// relative imports do not resolve under the script alias hook.

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

/** A slug, and a tag as the questions carry it: lowercase words joined by hyphens. */
export const COLLECTION_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const EM_DASH = String.fromCharCode(0x2014);
const FIELDS = ["slug", "name", "description", "tag", "theme_id", "sort_order"];

/** A line of words: trimmed, not empty, within its length, and with no em dash. */
function words(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > max || trimmed.includes(EM_DASH)) return null;
  return trimmed;
}

/**
 * One row of the file as a collection, or why it is not one.
 *
 * The rules are collectionSchema's (./collectionsSchema.ts), written out by
 * hand because this module ships in the client bundle and that one brings
 * zod with it. A row has exactly the six fields, and each is what the
 * schema says it is. The test beside the two holds them to the same answer.
 */
export function readCollection(
  row: unknown,
): { ok: true; collection: Collection } | { ok: false; why: string } {
  const bad = (why: string) => ({ ok: false as const, why });
  if (typeof row !== "object" || row === null || Array.isArray(row)) return bad("not an object");
  const r = row as Record<string, unknown>;
  const extra = Object.keys(r).find((k) => !FIELDS.includes(k));
  if (extra) return bad(`unknown field ${extra}`);
  if (typeof r.slug !== "string" || r.slug.length > 64 || !COLLECTION_SLUG.test(r.slug)) {
    return bad("slug: lowercase words joined by hyphens");
  }
  const name = words(r.name, 80);
  if (name === null) return bad("name: one to 80 characters, no em dash");
  const description = words(r.description, 400);
  if (description === null) return bad("description: one to 400 characters, no em dash");
  if (typeof r.tag !== "string" || r.tag.length > 64 || !COLLECTION_SLUG.test(r.tag)) {
    return bad("tag: a lowercase slug, as on the questions");
  }
  if (typeof r.theme_id !== "string" || !isCollectionTheme(r.theme_id)) {
    return bad("theme_id: not a collection palette in READING_THEMES");
  }
  const order = r.sort_order;
  if (typeof order !== "number" || !Number.isInteger(order) || order < 0 || order > 10_000) {
    return bad("sort_order: a whole number from 0 to 10000");
  }
  return {
    ok: true,
    collection: { slug: r.slug, name, description, tag: r.tag, theme_id: r.theme_id, sort_order: order },
  };
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
    const r = readCollection(row);
    if (!r.ok) {
      console.warn(`[collections] collections.json row ${i} dropped: ${r.why}`);
      return;
    }
    if (slugs.has(r.collection.slug)) {
      console.warn(`[collections] collections.json row ${i} dropped: duplicate slug ${r.collection.slug}`);
      return;
    }
    slugs.add(r.collection.slug);
    out.push(r.collection);
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
