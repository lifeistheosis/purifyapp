import type { ChantIndexRow } from "./types";

/**
 * The covers on the chants door (1.9, build 98 note 3: "I wanted this design
 * revamped it doesn't fit its purpose"). The door on Prayers shows what is
 * inside the library, the chants' own covers in one row, and no play mark: a
 * tap opens a page and plays nothing.
 *
 * The Prayer Rope Anthem stands first, as the door's first comment intended
 * ("the Prayer Rope Anthem first among them"). After it the chants in the
 * library's own order (newest first), turned so that two chants that wear one
 * picture do not stand side by side where another order avoids it: the two
 * Psalms both wear King David, and a shelf of four reads Trinity, David,
 * Anastasis, David. A chant with no cover is not on the shelf.
 *
 * Pure, and handed only what it reads, so the Prayers page can ask it on the
 * server and give the door a few addresses (AGENTS.md, "a page carries what
 * it shows"). lib/chants/__tests__/shelf.test.ts holds it to the library.
 */
export type ShelfCover = { slug: string; src: string };

/** The chant that leads the shelf. */
export const SHELF_FIRST = "prayer-rope-anthem";

/** How many covers the shelf holds at the most: the row runs off the card's end before a sixth would show. */
export const SHELF_MOST = 5;

/** What the shelf reads of a chant: its slug and its cover's address (a row of the index has both). */
type Shelved = Pick<ChantIndexRow, "slug"> & { cover?: { src: string } };

export function chantShelf(index: readonly Shelved[], most = SHELF_MOST): ShelfCover[] {
  const covered = index.flatMap((r) => (r.cover ? [{ slug: r.slug, src: r.cover.src }] : []));
  const first = covered.find((c) => c.slug === SHELF_FIRST);
  const rest = covered.filter((c) => c !== first);
  const shelf: ShelfCover[] = first ? [first] : [];
  while (rest.length > 0 && shelf.length < most) {
    const last = shelf[shelf.length - 1]?.src;
    // Of the pictures that differ from the one before, the one most chants
    // still to come wear goes next, so its copies are spread out; the
    // library's order decides between equals.
    const copies = (src: string) => rest.filter((c) => c.src === src).length;
    const differing = rest.filter((c) => c.src !== last);
    const pool = differing.length > 0 ? differing : rest;
    const next = pool.reduce((best, c) => (copies(c.src) > copies(best.src) ? c : best), pool[0]);
    shelf.push(next);
    rest.splice(rest.indexOf(next), 1);
  }
  return shelf;
}
