// The progress route's rule, as a pure function over injected reads and
// writes, the way lib/catechism/attempt.ts is for attempts.
//
// app/api/catechism/progress/route.ts does the HTTP: auth, rate limit, CORS.
// Everything it then decides is here, so a unit test can drive the whole
// rule with an in-memory table.
//
// What the server trusts and what it does not. A client says which of a
// collection's questions it answered rightly. The server keeps only the ids
// that are questions in the bank carrying the collection's tag (published or
// since retired, because the answer was right when it was given), unions
// them into the reader's row, and never removes one. Completion is
// recomputed against the questions published today; completed_at is
// written the first time that is true and never cleared afterwards, so a
// bank that grows cannot revoke a completion.
//
// A reader can only ever add to their own set, and the palette that pairs
// with a collection is gated on the entitlement, not on this table, so an
// invented id list buys nothing but a line on their own account page.

import { z } from "zod";

import { progressFor, tagQuestions, unionIds, type Collection } from "./collections";
import type { Question } from "./types";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** /api/catechism/progress POST body. */
export const progressSchema = z.object({
  entries: z
    .array(
      z.object({
        slug: z.string().regex(SLUG).max(64),
        question_ids: z.array(z.string().uuid()).min(1).max(2000),
      }),
    )
    .min(1)
    .max(50),
});

export type ProgressInput = z.infer<typeof progressSchema>;

export type ProgressRow = {
  user_id: string;
  slug: string;
  correct_question_ids: string[];
  completed_at: string | null;
};

export type WriteError = { code?: string | null; message?: string | null } | null;

export type ProgressDeps = {
  collections: readonly Collection[];
  bank: readonly Question[];
  /** The server's UTC day, "YYYY-MM-DD". */
  today: string;
  /** The reader's rows for these slugs, under RLS. Resolves with the driver's error, never throws. */
  read: (slugs: string[]) => Promise<{ rows: ProgressRow[]; error: WriteError }>;
  /** Upsert under RLS as the user, on (user_id, slug). */
  upsert: (rows: ProgressRow[]) => Promise<{ error: WriteError }>;
  now?: Date;
};

export type ProgressState = {
  slug: string;
  done: number;
  total: number;
  completed_at: string | null;
};

export type ProgressOutcome =
  | { ok: true; status: 200; progress: ProgressState[] }
  | { ok: false; status: 400 | 503; error: string };

export function isTableAbsentError(err: WriteError): boolean {
  if (!err) return false;
  if (err.code === "42P01" || err.code === "PGRST205") return true;
  const m = err.message ?? "";
  return /schema cache/i.test(m) && /could not find the table/i.test(m);
}

/**
 * Union `incoming` into `existing` for one collection and decide the row
 * that results. Pure; exported so the test can hold the invariants
 * directly: the set never shrinks, and completed_at once set is kept.
 */
export function applyProgress(
  collection: Collection,
  bank: readonly Question[],
  today: string,
  existing: ProgressRow | null,
  incoming: readonly string[],
  userId: string,
  now: Date,
): { row: ProgressRow; state: ProgressState } {
  const tagged = new Set(bank.filter((q) => q.tags.includes(collection.tag)).map((q) => q.id));
  const accepted = incoming.filter((id) => tagged.has(id));
  const ids = unionIds(existing?.correct_question_ids ?? [], accepted);
  const published = tagQuestions(bank, collection.tag, today).map((q) => q.id);
  const p = progressFor(ids, published);
  const completed_at = existing?.completed_at ?? (p.complete ? now.toISOString() : null);
  const row: ProgressRow = {
    user_id: userId,
    slug: collection.slug,
    correct_question_ids: ids,
    completed_at,
  };
  return { row, state: { slug: collection.slug, done: p.done, total: p.total, completed_at } };
}

export async function handleProgress(
  deps: ProgressDeps,
  body: unknown,
  userId: string,
): Promise<ProgressOutcome> {
  const parsed = progressSchema.safeParse(body);
  if (!parsed.success) return { ok: false, status: 400, error: "invalid" };
  const now = deps.now ?? new Date();

  // Unknown slugs are dropped, not refused: a client built before a
  // collection was withdrawn may still name it, and that is not its fault.
  const known = new Map(deps.collections.map((c) => [c.slug, c]));
  const entries = parsed.data.entries.filter((e) => known.has(e.slug));
  if (entries.length === 0) return { ok: true, status: 200, progress: [] };

  const { rows: existing, error: readErr } = await deps.read(entries.map((e) => e.slug));
  if (readErr) {
    if (isTableAbsentError(readErr)) return { ok: false, status: 503, error: "unavailable" };
    console.error("[collections] progress read failed", readErr.message);
    return { ok: false, status: 503, error: "unavailable" };
  }
  const byslug = new Map(existing.map((r) => [r.slug, r]));

  const rows: ProgressRow[] = [];
  const progress: ProgressState[] = [];
  for (const e of entries) {
    const c = known.get(e.slug) as Collection;
    const { row, state } = applyProgress(
      c,
      deps.bank,
      deps.today,
      byslug.get(e.slug) ?? null,
      e.question_ids,
      userId,
      now,
    );
    rows.push(row);
    progress.push(state);
  }

  const { error } = await deps.upsert(rows);
  if (error) {
    if (isTableAbsentError(error)) return { ok: false, status: 503, error: "unavailable" };
    console.error("[collections] progress upsert failed", error.message);
    return { ok: false, status: 503, error: "unavailable" };
  }
  return { ok: true, status: 200, progress };
}
