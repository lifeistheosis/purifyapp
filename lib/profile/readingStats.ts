// What a reader has gathered: highlights, notes and bookmarks.
//
// The counting is split out from the reading so it can be tested. The rest
// of this file walks localStorage, which no test in this repo can do
// (vitest runs in a node environment on purpose, see vitest.config.ts), but
// `countAnnotations` takes the entries and is pure.
//
// This existed twice, in components/mobile/YouMobile.tsx and
// components/profile/ProfileStats.tsx, as two textually different scans of
// the same keys with the same rules. Two copies of a counter is two
// answers waiting to disagree.

export type AnnotationCounts = {
  /** Highlighted verses, from purify:bible:* */
  verses: number;
  /** Highlighted paragraphs of the Fathers, from purify:saint:* */
  paragraphs: number;
  /** Notes written, across both. */
  notes: number;
};

const BIBLE_PREFIX = "purify:bible:";
const SAINT_PREFIX = "purify:saint:";

export const BOOKMARKS_KEY = "purify:bookmarks";

/**
 * Count highlights and notes from localStorage entries.
 *
 * Anything that does not parse is skipped rather than thrown, because a
 * single corrupt entry must not blank a reader's whole tally. Keys under
 * `purify:bible:` that are not annotations (the last-read pointer, the
 * testament tab, the highlight legend) carry neither `highlighted` nor
 * `note`, so they fall through without a special case.
 */
export function countAnnotations(
  entries: Iterable<[string, string | null]>,
): AnnotationCounts {
  let verses = 0;
  let paragraphs = 0;
  let notes = 0;

  for (const [key, raw] of entries) {
    const isBible = key.startsWith(BIBLE_PREFIX);
    const isSaint = key.startsWith(SAINT_PREFIX);
    if (!isBible && !isSaint) continue;

    let value: unknown;
    try {
      value = JSON.parse(raw ?? "{}");
    } catch {
      continue;
    }
    if (!value || typeof value !== "object") continue;
    const v = value as { highlighted?: unknown; note?: unknown };

    if (v.highlighted) {
      if (isBible) verses++;
      else paragraphs++;
    }
    if (typeof v.note === "string" && v.note.trim().length > 0) notes++;
  }

  return { verses, paragraphs, notes };
}

/** Every localStorage pair, for handing to countAnnotations. */
function* storageEntries(): Generator<[string, string | null]> {
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key) yield [key, window.localStorage.getItem(key)];
  }
}

/** Reads localStorage. Returns zeroes on the server or if storage is blocked. */
export function readAnnotationCounts(): AnnotationCounts {
  if (typeof window === "undefined") {
    return { verses: 0, paragraphs: 0, notes: 0 };
  }
  try {
    return countAnnotations(storageEntries());
  } catch {
    return { verses: 0, paragraphs: 0, notes: 0 };
  }
}
