/**
 * Sections that took a number of their own in 1.9 (docs/audit/findings.yaml,
 * F-49; quick win 15 of his "everything in 1.9", 2026-11-10).
 *
 * St Cyril on Luke stood twice as two sections under one number: Sermon 29
 * and, after it, the fragments of Sermon 29 from another manuscript; Sermon 96
 * and, after it, the Catena's extracts that stand for the end of Sermon 96,
 * all of Sermon 97 and the start of 98. Roger Pearse's own contents name them
 * so ("Fragments from Sermon 29"; "Catena extracts replacing end of sermon
 * 96, all of sermon 97, start of sermon 98"). A reader's highlight, note and
 * section bookmark are kept by the section's number, so one made on either
 * half showed on both. The second halves are numbered 1029 and 97 now, and
 * titled "Sermon 29, the fragments" and "Sermon 97, from the Catena", so the
 * library still reads their sermon from the title (lib/saints/divisions.ts).
 *
 * A mark made before cannot be told apart: it says 29, not which half. So it
 * goes on showing where it showed, on both halves, until it is changed; a
 * change made on a second half is that half's own copy, and taking a mark
 * off takes it off both halves, as it always did. A mark made since is the
 * half's it was made on. "Before" is before this phone first had the halves
 * apart (splitSeenAt), so a mark made on a phone still on 1.8, where the
 * halves were one, counts as made on both. No stored mark is rewritten, on
 * the phone or on the server, so nothing a reader kept moves
 * (lib/saints/annotations.ts, placeOf; lib/bookmarks.ts, matches).
 */
const SHARED_BEFORE: Readonly<Record<string, Readonly<Record<number, number>>>> = {
  "cyril-of-alexandria/commentary-on-luke": { 1029: 29, 97: 96 },
};

/** The number a section shared with the one before it until 1.9, where it did. */
export function sharedBefore(saintSlug: string, workSlug: string, sectionN: number): number | undefined {
  return SHARED_BEFORE[`${saintSlug}/${workSlug}`]?.[sectionN];
}

/** Every section that shared a number, for the tests. */
export function sharedSections(): readonly { work: string; sectionN: number; before: number }[] {
  return Object.entries(SHARED_BEFORE).flatMap(([work, pairs]) =>
    Object.entries(pairs).map(([n, before]) => ({ work, sectionN: Number(n), before })),
  );
}

const SEEN_KEY = "purify:saints:sharedSplitAt";

/**
 * When this phone first had the second halves numbered apart (ms since the
 * epoch), set the first time it reads a mark of a work that has them: a
 * reader marks nothing before reading, so every mark made here since is
 * later. 0 where the phone keeps nothing, and then nothing counts as before.
 */
export function splitSeenAt(): number {
  if (typeof window === "undefined") return 0;
  try {
    const had = Number(window.localStorage.getItem(SEEN_KEY));
    if (had > 0) return had;
    const now = Date.now();
    window.localStorage.setItem(SEEN_KEY, String(now));
    return now;
  } catch {
    return 0;
  }
}

/** Mark that this phone has read a work with shared halves now, if it has them. */
export function seeSplit(saintSlug: string, workSlug: string): void {
  if (`${saintSlug}/${workSlug}` in SHARED_BEFORE) splitSeenAt();
}

/**
 * Whether a mark kept at `at` (an ISO time or ms; none on one kept before
 * 1.7, which is older than any of this) was made before the halves were
 * apart here.
 */
export function fromBeforeSplit(at: string | number | null | undefined): boolean {
  const seen = splitSeenAt();
  if (seen <= 0) return false;
  if (at === undefined || at === null || at === "") return true;
  const t = typeof at === "number" ? at : Date.parse(at);
  return Number.isFinite(t) && t < seen;
}
