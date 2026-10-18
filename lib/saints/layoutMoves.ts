"use client";

import { addTombstone, dropTombstone } from "@/lib/sync/tombstones";

/**
 * Highlights and notes kept under a work's old layout, moved to where the
 * same paragraph stands now (1.8).
 *
 * A reader's highlight or note on a Father's paragraph is kept by section and
 * paragraph (lib/saints/annotations.ts: purify:saint:{saint}:{work}:{n}:{i}),
 * here and on the server. So when a work's file is laid out again, a
 * paragraph's words stay the same and its address changes, and what a reader
 * marked on it must follow it.
 *
 * The Confessions (1.8): until now Book I was cut into ten groups of four
 * paragraphs under titles of our own ("Opening invocation", "Reflection 2"
 * ... "Reflection 10"). It is now one section, Book I, holding the same 38
 * paragraphs in the same order, with the book's own chapters and sections
 * laid over them (lib/saints/divisions.ts). Old section n, paragraph i is new
 * section 1, paragraph (n - 1) * 4 + i; section 1 is where it was.
 *
 * What moves: the value goes to its new key unless a newer one is there
 * already, the old key goes, and a tombstone for the old place tells the
 * sync to delete the server's copy (lib/sync/tombstones.ts), while the event
 * for the new place has it pushed. It runs each time the work is opened, so
 * a copy the sync brings back from another device before that device has
 * moved its own is moved too.
 *
 * St Justin's Dialogue with Trypho (1.8): chapter 61 ran on inside section
 * 60 as its paragraphs 4 (the edition's heading) and 5, and is now its own
 * section, 143; section 116 was a second copy of section 115 and is gone.
 * Every other section keeps its number. Old section 60, paragraph 4 or 5 is
 * new section 143, paragraph 0; old section 116, paragraph i is section 115,
 * paragraph i.
 *
 * KEEP IN STEP WITH THE FILE. A move reads old addresses that no longer
 * exist in the work: whole sections (`oldSections`), or the paragraphs past
 * the end of a section that is shorter now (`oldParagraphs`). If a later
 * change gives the work a section 2 again (the Confessions' Book II, say),
 * these moves would carry its highlights into Book I: retire the move, or
 * give the new books numbers past the old ones, first. (So Books II to XIII
 * of the Confessions came, in 1.8, as sections 102 to 113.)
 * lib/saints/__tests__/layoutMoves.test.ts fails until that is done.
 */

type Move = (n: number, i: number) => { n: number; i: number } | null;

export const LAYOUT_MOVES: Readonly<
  Record<string, { since: string; oldSections: readonly number[]; oldParagraphs?: readonly (readonly [number, number])[]; move: Move }>
> = {
  "augustine-of-hippo/confessions": {
    since: "1.8",
    oldSections: [2, 3, 4, 5, 6, 7, 8, 9, 10],
    move: (n, i) => (n >= 2 && n <= 10 && Number.isInteger(i) && i >= 0 && i < 4 ? { n: 1, i: (n - 1) * 4 + i } : null),
  },
  "justin-martyr/dialogue-with-trypho": {
    since: "1.8",
    oldSections: [116],
    oldParagraphs: [
      [60, 4],
      [60, 5],
    ],
    move: (n, i) => (n === 60 && (i === 4 || i === 5) ? { n: 143, i: 0 } : n === 116 && Number.isInteger(i) && i >= 0 ? { n: 115, i } : null),
  },
};

const PREFIX = "purify:saint:";

/** Which of two stored values changed last, by their `at`; an undated one counts as older. */
function newer(a: string, b: string): boolean {
  try {
    const at = (JSON.parse(a) as { at?: string }).at;
    const bt = (JSON.parse(b) as { at?: string }).at;
    if (!bt) return true;
    if (!at) return false;
    return Date.parse(at) > Date.parse(bt);
  } catch {
    return false;
  }
}

/** Move this work's highlights and notes from its old layout. Returns how many moved. */
export function moveLegacyAnnotations(saintSlug: string, workSlug: string): number {
  const entry = LAYOUT_MOVES[`${saintSlug}/${workSlug}`];
  if (!entry || typeof window === "undefined") return 0;
  const head = `${PREFIX}${saintSlug}:${workSlug}:`;
  let moved = 0;
  try {
    const store = window.localStorage;
    const keys: string[] = [];
    for (let k = 0; k < store.length; k++) {
      const key = store.key(k);
      if (key && key.startsWith(head)) keys.push(key);
    }
    for (const key of keys) {
      const [nPart, iPart] = key.slice(head.length).split(":");
      const n = Number(nPart);
      const i = Number(iPart);
      const to = entry.move(n, i);
      if (!to) continue;
      const toKey = `${head}${to.n}:${to.i}`;
      const value = store.getItem(key);
      const there = store.getItem(toKey);
      if (value && (!there || newer(value, there))) store.setItem(toKey, value);
      store.removeItem(key);
      addTombstone("annotations", "saint-paragraph", { saintSlug, workSlug, sectionN: n, paragraphIdx: i });
      dropTombstone("annotations", "saint-paragraph", { saintSlug, workSlug, sectionN: to.n, paragraphIdx: to.i });
      let data: unknown = {};
      try {
        data = JSON.parse(store.getItem(toKey) ?? "{}");
      } catch {
        data = {};
      }
      window.dispatchEvent(
        new CustomEvent("purify:annotation", {
          detail: { kind: "saint-paragraph", saintSlug, workSlug, sectionN: to.n, paragraphIdx: to.i, data },
        }),
      );
      moved += 1;
    }
  } catch {
    /* storage may be unavailable: nothing to move */
  }
  return moved;
}
