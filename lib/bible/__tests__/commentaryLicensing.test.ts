// Every patristic note must rest on a public-domain translation.
//
// docs/editorial-standards.md is binding: public-domain sources only, quoted
// verbatim, cited per note. The citation field records which translation a
// note came from, and that field is the only thing standing between the app
// and a copyright claim, because nothing else in the pipeline knows the
// difference between Schaff 1886 and a 2008 university press edition.
//
// Public domain, and therefore always allowed:
//   NPNF#-#  Nicene and Post-Nicene Fathers (Schaff, 1886-1900)
//   ANF#     Ante-Nicene Fathers (1885-1887)
//   LFC #    Library of the Fathers (Pusey, Oxford, 1838-1885)
//   Catena Aurea (Oxford, Rivington, 1842)
//            Aquinas's Golden Chain in the Oxford translation. Named in full
//            rather than by series number: it belongs to the same Tractarian
//            Oxford effort as LFC, but its volumes were not numbered in that
//            series, and inventing a number here would be the kind of tidy
//            fiction this file exists to prevent. The 1842 imprint is what
//            makes it public domain, and the string carries that date.
//   Morals on the Book of Job (Oxford, Parker, 1844)
//            St. Gregory the Great's Moralia, in the Library of the Fathers
//            translation. Named in full rather than "LFC N" because the series
//            number for these volumes is not something this repository has
//            verified, and a guessed number is exactly what this file refuses.
//            The 1844 to 1850 imprint carries the public-domain claim.
//   Commentary on Luke (Oxford, Payne Smith, 1859)
//            St. Cyril of Alexandria on Luke, translated from the Syriac by
//            R. Payne Smith and printed at the University Press. Named in full
//            for the same reason as the Catena: it was an Oxford imprint of the
//            same era but not a numbered Library of the Fathers volume, so
//            citing it as "LFC 48" would be an invented number. Public domain
//            twice over, by the 1859 imprint and by Payne Smith's death in 1895.
//
// NOT public domain:
//   FOTC #   Fathers of the Church, CUA Press, ongoing
//   ACW #    Ancient Christian Writers, Paulist/Newman, ongoing
//   GNO #.#  Gregorii Nysseni Opera, Brill critical edition
//   PG #     Migne's Greek is public domain, but the ENGLISH shown beside it
//            is not, and PG cites no English translation at all
//
// Two notes were removed rather than re-sourced, because no public-domain
// English of either passage exists and so there was nothing to re-source to:
// Chrysostom's Homilies on Genesis (FOTC 74, Hill 1986 — "considerateness" is
// Hill's signature rendering of synkatabasis, and NPNF never contained these
// homilies) and Jerome's Commentary on Matthew (FOTC 117, Scheck 2008).
//
// The six below are third-person editorial digests rather than quotations,
// which editorial-standards.md:11 permits with a citation. They are listed
// here rather than removed because whether a digest may rest on a copyrighted
// basis is an editorial judgement, not an engineering one, and it is queued
// for review. The list may only shrink.

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DIR = path.join(ROOT, "data/bible/commentary");

const PUBLIC_DOMAIN =
  /^(NPNF\d-\d+|ANF\d+|LFC \d+|Catena Aurea \(Oxford, Rivington, 1842\)|Commentary on Luke \(Oxford, Payne Smith, 1859\)|Morals on the Book of Job \(Oxford, Parker, 1844\))/;

/**
 * Notes still citing a non-public-domain series, pending editorial review.
 * Each entry is `book/chapter :: verse :: citation`. Do not add to this list.
 */
const PENDING_REVIEW = new Set([
  "acts/17 :: 28 :: PG 91",
  "acts/4 :: 32 :: FOTC 9",
  "john/17 :: 21 :: PG 91",
  "matthew/5 :: 3 :: GNO 7.2",
  "matthew/6 :: 9 :: GNO 7.2",
  "matthew/6 :: 33 :: ACW 21",
]);

type Note = { author: string; work: string; citation: string; text: string };

function everyNote(): { id: string; note: Note }[] {
  const out: { id: string; note: Note }[] = [];
  for (const book of fs.readdirSync(DIR)) {
    const bookDir = path.join(DIR, book);
    if (!fs.statSync(bookDir).isDirectory()) continue;
    for (const file of fs.readdirSync(bookDir)) {
      if (!file.endsWith(".json")) continue;
      const chapter = file.replace(".json", "");
      const j = JSON.parse(
        fs.readFileSync(path.join(bookDir, file), "utf8"),
      ) as Record<string, Note[]>;
      for (const [verse, notes] of Object.entries(j)) {
        for (const note of notes) {
          out.push({ id: `${book}/${chapter} :: ${verse} :: ${note.citation}`, note });
        }
      }
    }
  }
  return out;
}

const NOTES = everyNote();

describe("commentary licensing", () => {
  it("has notes to check", () => {
    expect(NOTES.length).toBeGreaterThan(4000);
  });

  it("every note carries author, work, citation and text", () => {
    const bad = NOTES.filter(
      ({ note }) =>
        !note.author?.trim() ||
        !note.work?.trim() ||
        !note.citation?.trim() ||
        !note.text?.trim(),
    ).map(({ id }) => id);
    expect(bad, bad.slice(0, 10).join("\n  ")).toEqual([]);
  });

  it("cites only public-domain series, apart from the queued exceptions", () => {
    const offenders = NOTES.filter(
      ({ id, note }) =>
        !PUBLIC_DOMAIN.test(note.citation) && !PENDING_REVIEW.has(id),
    ).map(({ id }) => id);
    expect(
      offenders,
      `A note may only rest on a public-domain translation (NPNF, ANF, LFC). ` +
        `If there is no public-domain English of a passage, the note cannot ` +
        `be re-sourced and must be removed.\n  ` + offenders.join("\n  "),
    ).toEqual([]);
  });

  it("the two removed FOTC notes have not come back", () => {
    const returned = NOTES.filter(({ note }) =>
      /^FOTC (74|117)\b/.test(note.citation),
    ).map(({ id }) => id);
    expect(returned, returned.join("\n  ")).toEqual([]);
  });

  it("the pending-review list only ever shrinks", () => {
    // Every id in the list must still exist. A stale entry means a note was
    // resolved and the list was not updated, which lets a future addition
    // hide behind it.
    const ids = new Set(NOTES.map((n) => n.id));
    const stale = [...PENDING_REVIEW].filter((id) => !ids.has(id));
    expect(
      stale,
      `Resolved. Remove from PENDING_REVIEW:\n  ${stale.join("\n  ")}`,
    ).toEqual([]);
  });
});
