/**
 * A part of a work that became a work of its own (1.8, round 6, the owner's
 * note 79 and sheet r3-29), and the reader's places carried after it.
 *
 * St John Cassian's Seven Books on the Incarnation of the Lord, against
 * Nestorius, follow the Conferences in NPNF II 11, and the ingest filed them
 * in the Conferences' file as "Conference 24, Chapter n": sections 493 to
 * 603, each book's chapters counted from 1 again at 493, 499, 506, 522, 535,
 * 550 and 573, so "All 603 chapters" counted 111 that are not the
 * Conferences. They are their own work now, /saints/john-cassian/on-the-
 * incarnation: its Preface (which stood as paragraph 8 of Conference 24,
 * Chapter 26, section 492, under the treatise's title page) is section 1,
 * and old section n is new section n - 491 (Book 1, Chapter 1 is 2; Book 7,
 * Chapter 31 is 112), every paragraph at its own index.
 *
 * What a reader kept under the old address follows it (carryMovedPlaces):
 *  - highlights and notes, here and on the server (lib/saints/layoutMoves.ts,
 *    moveAnnotations: the old key tombstoned, the new one pushed);
 *  - bookmarks on a chapter (lib/bookmarks.ts, moveWritingSectionBookmarks);
 *  - the kept place (lib/reader/position.ts) and the reading room's progress
 *    (lib/reading/progress.ts): one in the books is the new work's, and the
 *    Conferences, read through to get there, are finished;
 *  - an old link, /saints/john-cassian/conferences#s503 or #p-503-1, lands
 *    on the same chapter of the new work (movedAddress, used by
 *    components/saints/MovedPlace.tsx).
 * It runs as any page of the app opens and again after the sync's pull, so a
 * copy another device still keeps under the old address is carried as it
 * arrives; each step is idempotent.
 *
 * KEEP IN STEP WITH THE FILES. The moves read old addresses the Conferences
 * no longer have (`oldSections`, and the Preface's slot, now empty): if a
 * later change gives the Conferences a section 493 again, retire this first.
 * lib/saints/__tests__/workMoves.test.ts fails until that is done.
 *
 * No React here, and the pure parts take no storage: the test holds them.
 */

import type { Move } from "./layoutMoves";

export type WorkMove = {
  since: string;
  from: { saintSlug: string; workSlug: string; sections: number };
  to: { saintSlug: string; workSlug: string; title: string; sections: number };
  /** Old sections that left whole, by number: none may be the old work's again. */
  oldSections: readonly number[];
  /** Old paragraphs whose words left and whose slot stays behind, empty. */
  emptied: readonly (readonly [number, number])[];
  /** Where an old paragraph stands in the new work; null for one that stayed. */
  move: Move;
  /** Where an old section stands in the new work, as a whole; null for one that stayed. */
  moveSection: (n: number) => number | null;
  /** An old section's title as the new work names it (a bookmark keeps the title it was saved with). */
  retitle: (n: number, title: string) => string;
};

const INCARNATION_FIRST = 493;
const INCARNATION_LAST = 603;
/** The first section of each of the seven books, in the old numbering. */
const INCARNATION_BOOKS = [493, 499, 506, 522, 535, 550, 573] as const;
const bookOf = (n: number) => INCARNATION_BOOKS.filter((b) => b <= n).length;
const inBooks = (n: number) => Number.isInteger(n) && n >= INCARNATION_FIRST && n <= INCARNATION_LAST;

export const WORK_MOVES: readonly WorkMove[] = [
  {
    since: "1.8",
    from: { saintSlug: "john-cassian", workSlug: "conferences", sections: 492 },
    to: { saintSlug: "john-cassian", workSlug: "on-the-incarnation", title: "On the Incarnation of the Lord", sections: 112 },
    oldSections: Array.from({ length: INCARNATION_LAST - INCARNATION_FIRST + 1 }, (_, k) => INCARNATION_FIRST + k),
    emptied: [[492, 8]],
    move: (n, i) => {
      if (!Number.isInteger(i) || i < 0) return null;
      if (inBooks(n)) return { n: n - (INCARNATION_FIRST - 2), i };
      // The Preface, under the treatise's title page at the foot of Conference 24, Chapter 26.
      if (n === 492 && i === 8) return { n: 1, i: 0 };
      return null;
    },
    moveSection: (n) => (inBooks(n) ? n - (INCARNATION_FIRST - 2) : null),
    retitle: (n, title) => title.replace(/^Conference 24, Chapter (\d+)\b/, (_, c: string) => `Book ${bookOf(n)}, Chapter ${c}`),
  },
];

/** The moves out of a work, "saint/work". */
export function movesOutOf(saintSlug: string, workSlug: string): readonly WorkMove[] {
  return WORK_MOVES.filter((m) => m.from.saintSlug === saintSlug && m.from.workSlug === workSlug);
}

/** The moves into a work. */
export function movesInto(saintSlug: string, workSlug: string): readonly WorkMove[] {
  return WORK_MOVES.filter((m) => m.to.saintSlug === saintSlug && m.to.workSlug === workSlug);
}

/**
 * Where an old address lands now: a link to a section (#s503) or a paragraph
 * (#p-503-1) of a part that left its work, as the same place in the new one.
 * Null for any other address, which stays where it is. The trailing slash of
 * the address it was given is kept (the apps' pages end in one).
 */
export function movedAddress(pathname: string, hash: string): string | null {
  const page = /^\/saints\/([a-z0-9-]+)\/([a-z0-9-]+)(\/?)$/.exec(pathname);
  if (!page) return null;
  const [, saintSlug, workSlug, slash] = page;
  const at = /^#(?:s(\d+)|p-(\d+)-(\d+))$/.exec(hash);
  if (!at) return null;
  for (const m of movesOutOf(saintSlug, workSlug)) {
    const base = `/saints/${m.to.saintSlug}/${m.to.workSlug}${slash}`;
    if (at[1] !== undefined) {
      const n = m.moveSection(Number(at[1]));
      if (n !== null) return `${base}#s${n}`;
    } else {
      const to = m.move(Number(at[2]), Number(at[3]));
      if (to) return `${base}#p-${to.n}-${to.i}`;
    }
  }
  return null;
}
