// Where the electronic Brenton differs from the printed book, and the printed
// words that go back in.
//
// Why this exists
//
// scripts/ingest-bible.mjs reads Brenton's Septuagint from bolls.life
// (translation LXXE) and overwrites data/bible/<book>/<chapter>.json. That
// electronic text has slips the printed book does not have. Job 1:1 reached
// readers as "and than man was true" until 2026-10-06, and ten more were
// found that day, most of them by reading the lines beside a fix. Each was put
// right in its chapter file, and a re-run of the ingest would have put every
// one of them back and said nothing.
//
// So the ingest applies this list to each chapter after it fetches it. An
// entry restores the printed word. It never edits Brenton: the rule is
// public-domain text, verbatim (docs/editorial-standards.md).
//
// The printed book
//
// Bagster's printing of 1900, scanned by archive.org as the item named in
// PRINTED_BOOK. `leaf` and `crop` open the lines themselves; pageUrl() builds
// the address. The two archive.org items dated 1851 are uploads of the
// electronic text, slips included. They are not evidence.
//
// To add an entry
//
// Read the verse on the page first. `wrong` is what the source serves and
// `printed` is what the page has, each with enough words around it to stand
// exactly once in the verse. Then pin the reading in
// lib/bible/__tests__/brentonCorrections.test.ts, which refuses a correction
// that has no pin. An entry that no longer fits the source stops the ingest:
// read the page again, then change the entry or take it off.

/**
 * @typedef {{
 *   book: string, chapter: number, verse: number,
 *   wrong: string, printed: string,
 *   leaf: number, crop: string,
 * }} BrentonCorrection
 */

/** The archive.org item the `leaf` numbers belong to. */
export const PRINTED_BOOK = "septuagintversio1900bren";

/**
 * In the order of the printed book.
 *
 * @type {BrentonCorrection[]}
 */
export const BRENTON_CORRECTIONS = [
  {
    book: "genesis", chapter: 40, verse: 8,
    wrong: "through god? tell them than to me",
    printed: "through God? tell them then to me",
    leaf: 65, crop: "x1500_y3050",
  },
  {
    book: "1-samuel", chapter: 24, verse: 7,
    wrong: "do this ting to my lord",
    printed: "do this thing to my lord",
    leaf: 401, crop: "x1500_y2300",
  },
  {
    // Capitals only: the page has neither.
    book: "1-samuel", chapter: 24, verse: 17,
    wrong: "thy voice, Son David? And Saul",
    printed: "thy voice, son David? and Saul",
    leaf: 402, crop: "x200_y1000",
  },
  {
    book: "1-samuel", chapter: 24, verse: 18,
    wrong: "more righteous that I",
    printed: "more righteous than I",
    leaf: 402, crop: "x200_y1000",
  },
  {
    book: "1-samuel", chapter: 24, verse: 20,
    wrong: "as thou has done this day",
    printed: "as thou hast done this day",
    leaf: 402, crop: "x200_y1400",
  },
  {
    // Spelling only: Brenton's is the English one.
    book: "1-samuel", chapter: 26, verse: 17,
    wrong: "And Saul recognized the voice",
    printed: "And Saul recognised the voice",
    leaf: 406, crop: "x100_y300",
  },
  {
    book: "job", chapter: 1, verse: 1,
    wrong: "and than man was true",
    printed: "and that man was true",
    leaf: 677, crop: "x1500_y800",
  },
  {
    book: "job", chapter: 1, verse: 16,
    wrong: "the shepherds like wise",
    printed: "the shepherds likewise",
    leaf: 678, crop: "x60_y300",
  },
  {
    book: "psalms", chapter: 118, verse: 99,
    wrong: "testimonies are my medication",
    printed: "testimonies are my meditation",
    leaf: 785, crop: "x1500_y1550",
  },
  {
    book: "psalms", chapter: 118, verse: 100,
    wrong: "understand more that the aged",
    printed: "understand more than the aged",
    leaf: 785, crop: "x1500_y1550",
  },
  {
    book: "1-maccabees", chapter: 1, verse: 63,
    wrong: "Wherefore the rather to die",
    printed: "Wherefore they chose rather to die",
    leaf: 1293, crop: "x1400_y3400",
  },
];

/**
 * The lines on the printed page, as a picture: 1450 by 520 cut from a page
 * of 3005 by 3968.
 *
 * @param {BrentonCorrection} c
 */
export function pageUrl(c) {
  return `https://archive.org/download/${PRINTED_BOOK}/page/leaf${c.leaf}_${c.crop}_w1450_h520.jpg`;
}

/**
 * Puts the printed words into one chapter as the ingest has just built it.
 * `verses` is changed in place. Returns the entries it applied, so the caller
 * can tell at the end of a run that none was left over.
 *
 * Throws, which stops the ingest before the chapter is written, when an entry
 * no longer fits what the source serves: the verse is gone, or the wrong
 * words do not stand in it exactly once. That is the point of it. A source
 * that has changed is read against the page again, never patched blind, and
 * that holds even when the source now has the printed words: the entry is
 * then taken off by a person who has looked.
 *
 * @param {string} book
 * @param {number} chapter
 * @param {{ n: number, text: string }[]} verses
 * @param {BrentonCorrection[]} [corrections]
 * @returns {BrentonCorrection[]}
 */
export function applyBrentonCorrections(book, chapter, verses, corrections = BRENTON_CORRECTIONS) {
  const applied = [];
  for (const c of corrections) {
    if (c.book !== book || c.chapter !== chapter) continue;
    const where = `${c.book} ${c.chapter}:${c.verse}`;
    const reread = `Read the page again (${pageUrl(c)}), then change the entry in scripts/lib/brenton-corrections.mjs or take it off.`;
    const verse = verses.find((v) => v.n === c.verse);
    if (!verse) {
      throw new Error(`Brenton correction for ${where}: the source has no verse ${c.verse} in this chapter. ${reread}`);
    }
    const hits = verse.text.split(c.wrong).length - 1;
    if (hits !== 1) {
      const found = verse.text.includes(c.printed)
        ? `It already has the printed words "${c.printed}", so the source may have been corrected.`
        : `It reads: "${verse.text}"`;
      throw new Error(
        `Brenton correction for ${where}: the source has the wrong words "${c.wrong}" ${hits} times, not once. ${found} ${reread}`,
      );
    }
    verse.text = verse.text.split(c.wrong).join(c.printed);
    applied.push(c);
  }
  return applied;
}

/**
 * The entries a whole run never reached: a book or chapter the list names
 * and the ingest did not fetch. A correction that is never applied is as
 * silent as no correction, so the ingest ends on this.
 *
 * @param {Iterable<BrentonCorrection>} applied
 * @param {BrentonCorrection[]} [corrections]
 * @returns {BrentonCorrection[]}
 */
export function correctionsLeftOver(applied, corrections = BRENTON_CORRECTIONS) {
  const done = new Set(applied);
  return corrections.filter((c) => !done.has(c));
}
