// Collection progress kept on the device: one set of question ids per
// collection, plus the moment it was first complete.
//
// Same idiom as lib/catechism/local.ts: localStorage plus an in-tab event,
// no hooks, so the You tab can list completed collections without pulling
// any quiz code with it. Every write is a union. Nothing here removes an id,
// clears a completed_at, or resets a collection, and there is no code path
// that could: the store has an add and a merge, and that is all.
//
// Signed in, the same set lives in collection_progress under the reader's
// own row. The sign-in bridge (components/profile/ProfilePrefsBridge.tsx)
// runs syncCollectionProgressOnSignIn from lib/catechism/progressSync.ts:
// the device pushes what it holds and the server unions it, then the
// account's rows fill whatever the device lacks. Neither side ever shrinks.

import { isComplete, unionIds, type CollectionIndexEntry } from "./collections";

const KEY = "purify:catechism:collections";

/** Fired in-tab whenever a set changes. */
export const COLLECTIONS_EVENT = "purify:catechism:collections";

export type LocalCollectionProgress = {
  /** The collection's question ids answered rightly, in the order they landed. */
  ids: string[];
  /** When the set first covered every published question. Never cleared. */
  completed_at: string | null;
};

export type LocalProgressMap = Record<string, LocalCollectionProgress>;

function emit() {
  try {
    window.dispatchEvent(new CustomEvent(COLLECTIONS_EVENT));
  } catch {
    /* ignore */
  }
}

function sane(v: unknown): v is LocalCollectionProgress {
  return (
    !!v &&
    typeof v === "object" &&
    Array.isArray((v as LocalCollectionProgress).ids) &&
    ((v as LocalCollectionProgress).completed_at === null ||
      typeof (v as LocalCollectionProgress).completed_at === "string")
  );
}

export function readCollectionProgress(): LocalProgressMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: LocalProgressMap = {};
    for (const [slug, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (sane(v)) out[slug] = { ids: v.ids.filter((x) => typeof x === "string"), completed_at: v.completed_at };
    }
    return out;
  } catch {
    return {};
  }
}

function write(map: LocalProgressMap): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* private mode: the set holds for this page view only */
  }
  emit();
}

/**
 * Union `ids` into a collection's set and, when `questionIds` (the
 * collection's currently published questions) is given and now covered,
 * stamp completed_at if it was not already set. Returns the new state.
 */
export function addCorrectIds(
  slug: string,
  ids: readonly string[],
  questionIds?: readonly string[],
  now: Date = new Date(),
): LocalCollectionProgress {
  const map = readCollectionProgress();
  const prev = map[slug] ?? { ids: [], completed_at: null };
  const next: LocalCollectionProgress = {
    ids: unionIds(prev.ids, ids),
    completed_at: prev.completed_at,
  };
  if (!next.completed_at && questionIds && isComplete(next.ids, questionIds)) {
    next.completed_at = now.toISOString();
  }
  const changed =
    next.ids.length !== prev.ids.length || next.completed_at !== prev.completed_at;
  if (changed || !map[slug]) {
    map[slug] = next;
    write(map);
  }
  return next;
}

/**
 * The completion path's one call: every collection whose published
 * questions include a correctly answered id advances. Returns the slugs
 * that gained something, so the caller can post exactly those.
 */
export function recordCorrectAnswers(
  index: readonly CollectionIndexEntry[],
  correctIds: readonly string[],
  now: Date = new Date(),
): { slug: string; ids: string[]; progress: LocalCollectionProgress }[] {
  if (correctIds.length === 0) return [];
  const out: { slug: string; ids: string[]; progress: LocalCollectionProgress }[] = [];
  for (const c of index) {
    const inCollection = new Set(c.question_ids);
    const gained = correctIds.filter((id) => inCollection.has(id));
    if (gained.length === 0) continue;
    const progress = addCorrectIds(c.slug, gained, c.question_ids, now);
    out.push({ slug: c.slug, ids: gained, progress });
  }
  return out;
}

/**
 * Re-read completion against today's index. A set that already covers a
 * collection (the bank shrank, or the ids landed before the page carried
 * the index) gets its completed_at now; nothing is ever taken away.
 */
export function settleCompletion(index: readonly CollectionIndexEntry[], now: Date = new Date()): void {
  const map = readCollectionProgress();
  let changed = false;
  for (const c of index) {
    const p = map[c.slug];
    if (!p || p.completed_at) continue;
    if (isComplete(p.ids, c.question_ids)) {
      p.completed_at = now.toISOString();
      changed = true;
    }
  }
  if (changed) write(map);
}

export type RemoteProgressRow = {
  slug: string;
  correct_question_ids: string[] | null;
  completed_at: string | null;
};

/**
 * Fill from the account's rows: union the ids, and take a completed_at the
 * device lacks. The device's own completed_at is kept when both exist,
 * because it is the earlier of the two whenever they differ.
 */
export function mergeRemoteProgress(rows: readonly RemoteProgressRow[]): void {
  if (rows.length === 0) return;
  const map = readCollectionProgress();
  let changed = false;
  for (const r of rows) {
    if (!r.slug) continue;
    const prev = map[r.slug] ?? { ids: [], completed_at: null };
    const ids = unionIds(prev.ids, r.correct_question_ids ?? []);
    const completed_at = prev.completed_at ?? r.completed_at ?? null;
    if (ids.length !== prev.ids.length || completed_at !== prev.completed_at || !map[r.slug]) {
      map[r.slug] = { ids, completed_at };
      changed = true;
    }
  }
  if (changed) write(map);
}

/** The collections this device has seen through, oldest first. */
export function completedCollections(): { slug: string; completed_at: string }[] {
  return Object.entries(readCollectionProgress())
    .filter((e): e is [string, LocalCollectionProgress & { completed_at: string }] => !!e[1].completed_at)
    .map(([slug, p]) => ({ slug, completed_at: p.completed_at }))
    .sort((a, b) => a.completed_at.localeCompare(b.completed_at));
}
