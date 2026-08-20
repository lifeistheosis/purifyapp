// The commentary corpus must contain patristic text and nothing else.
//
// This exists because it did not. Two notes shipped to production ending in
// the CCEL scraper's trailing link index: `data/bible/commentary/john/21.json`
// v19 carried 3,371 numbered `file:///ccel/...` entries, and
// `psalms/150.json` v5 carried 19,141 words of them, 76% of that note. Both
// rendered to readers as St Augustine's commentary on a verse. Nothing caught
// it: the files parsed, the types matched, the page rendered, and the only
// symptom was that a reader scrolling Augustine eventually reached a wall of
// local file paths.
//
// A reader reported the commentary as "too long", which is how this surfaced.
// The length was real, but the tail was not text at all.
//
// Two assertions, doing different jobs:
//
//   1. NO SCRAPER ARTIFACTS. A hard invariant. `file:///` and the CCEL
//      `Page_NNN` anchor form cannot occur in a public-domain translation and
//      must never appear again.
//   2. A RATCHET ON OVER-CAPTURE. Separate defect, same symptom: the ingest
//      attached far more than the work a note declares. `john/21.json` v19
//      still holds 90,758 words under the title "Tractate 124", which is a few
//      thousand words in the source. 131 notes exceed 5,000 words. That is
//      real patristic text, so it is not deleted here, it is bounded: the count
//      may fall, never rise. Lower the ceiling as the re-ingest fixes each
//      work, and this test records the progress.
//
//      A long note is not by itself a defect, and the ratchet is a smell test
//      rather than a verdict. The corpus's longest, `matthew/15.json` v21 at
//      11,054 words, has now been checked three times and is genuine: one
//      continuous Homily 52 of Chrysostom on Matthew, with a 250-word signed
//      editor's footnote at the end that the cleaner declines to touch. It
//      cannot be brought under the threshold by cleaning, only by splitting a
//      homily across verses, which would be worse. Do not investigate it a
//      fourth time.
//
//      What the ratchet could not see is the reason for the third describe
//      block below: `matthew/7.json` v21 carried 1,158 words of another book's
//      title page while sitting at 2,989 words, comfortably under the
//      threshold. Size is a proxy. The markers are the real test.

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(process.cwd(), "data/bible/commentary");

type Note = { author?: string; work?: string; text?: string };

function everyNote(): { file: string; verse: string; note: Note }[] {
  const out: { file: string; verse: string; note: Note }[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(p);
      } else if (entry.name.endsWith(".json")) {
        const byVerse = JSON.parse(fs.readFileSync(p, "utf8")) as Record<string, Note[]>;
        const rel = path.relative(ROOT, p).replace(/\\/g, "/");
        for (const verse of Object.keys(byVerse)) {
          for (const note of byVerse[verse] ?? []) out.push({ file: rel, verse, note });
        }
      }
    }
  };
  if (fs.existsSync(ROOT)) walk(ROOT);
  return out;
}

const NOTES = everyNote();
const words = (s: string) => s.trim().split(/\s+/).length;

/** Notes above this are known over-capture, tracked by the ratchet below. */
const LONG_WORDS = 5_000;

/**
 * Measured 2026-08-19, after the encoding and back-matter work. This number
 * may only go DOWN. If a change makes it rise, an ingest has over-captured
 * again.
 *
 * 138 when it was first set, 132 by the time anyone looked again, and 131 now:
 * cutting the endnote lists out of the ten homilies on 1 John took
 * 1-john/2.json v27 from 5,253 words to 4,772, and it was the only one of the
 * ten close enough to the line to cross it.
 *
 * Set to the measured number with no headroom, deliberately. Slack is how a
 * ratchet quietly stops ratcheting, which is what let the count sit six below
 * the ceiling with nothing noticing.
 */
const KNOWN_LONG_NOTES = 131;

describe("commentary corpus integrity", () => {
  it("has notes to check at all", () => {
    // Guards the walker itself: a silent path change would make every other
    // assertion here pass over an empty set.
    expect(NOTES.length).toBeGreaterThan(4_000);
  });

  it("ships no scraper link index", () => {
    const offenders = NOTES.filter(({ note }) => (note.text ?? "").includes("file:///")).map(
      ({ file, verse, note }) => `${file} v${verse} (${note.author ?? "?"})`,
    );
    expect(offenders, offenders.join("\n  ")).toEqual([]);
  });

  it("ships no CCEL page anchors", () => {
    const offenders = NOTES.filter(({ note }) => /Page_\d+/.test(note.text ?? "")).map(
      ({ file, verse }) => `${file} v${verse}`,
    );
    expect(offenders, offenders.join("\n  ")).toEqual([]);
  });

  it("never grows the set of over-captured notes", () => {
    const long = NOTES.filter(({ note }) => note.text && words(note.text) > LONG_WORDS);
    const worst = [...long]
      .sort((a, b) => words(b.note.text ?? "") - words(a.note.text ?? ""))
      .slice(0, 3)
      .map(({ file, verse, note }) => `${file} v${verse} ${words(note.text ?? "")}w`)
      .join(", ");
    expect(long.length, `worst: ${worst}`).toBeLessThanOrEqual(KNOWN_LONG_NOTES);
  });

  it("keeps attribution on every note", () => {
    // A note without an author is unattributable text presented as a Father's.
    const offenders = NOTES.filter(({ note }) => !note.author?.trim()).map(
      ({ file, verse }) => `${file} v${verse}`,
    );
    expect(offenders, offenders.join("\n  ")).toEqual([]);
  });

  // Three shapes of back matter that reached production under a Father's name,
  // found 2026-08-19. None of them was catchable by the two cleaners, because
  // the cleaners look for footnote apparatus and these are not that: they are
  // whole regions of a different document that a slice swallowed.
  //
  // Unlike the ratchet above these are hard invariants, because none of this
  // material is patristic text at all and there is no legitimate quantity of
  // it. The word counts are what they were before the fix.
  describe("carries no back matter from another document", () => {
    it("ships no title page of a following work", () => {
      // CCEL sets a title page as an ALL-CAPS author line over lowercase title
      // and translator lines. matthew/7 v21 carried 1,158 words of the front
      // matter of Augustine's Harmony of the Gospels, and 1-john/5 v1 ended in
      // the title page of his Soliloquies.
      const offenders = NOTES.filter(
        ({ note }) =>
          /\n\s*(?:St\.\s+)?[A-Z]{4,}[^\n]{0,40}:\s*\n/.test(note.text ?? "") &&
          /\n\s*translated by\s*\n/.test(note.text ?? ""),
      ).map(({ file, verse, note }) => `${file} v${verse} (${note.author ?? "?"})`);
      expect(offenders, offenders.join("\n  ")).toEqual([]);
    });

    it("ships no endnote reference list", () => {
      // A rule followed by the numbered footnote definitions the body pointed
      // at. All ten homilies on 1 John carried one, 10,857 words in total,
      // reading as bare paragraphs like "Ps. cxix. 85." under Augustine.
      const offenders = NOTES.filter(({ note }) => {
        const m = (note.text ?? "").match(/_{20,}/);
        if (!m) return false;
        const after = (note.text ?? "").slice(m.index).replace(/_+/g, "").trim();
        const paras = after.split(/\n\n+/).filter((p) => p.trim());
        if (paras.length < 4) return false;
        const short = paras.filter((p) => p.trim().split(/\s+/).length <= 40).length;
        return short / paras.length >= 0.75;
      }).map(({ file, verse, note }) => `${file} v${verse} (${note.author ?? "?"})`);
      expect(offenders, offenders.join("\n  ")).toEqual([]);
    });

    it("ships no editor's appended note", () => {
      // job/38 v33 carried 1,094 words of the 1844 Oxford editor arguing about
      // the procession of the Spirit, under St Gregory's name.
      const offenders = NOTES.filter(({ note }) =>
        /Note from[^\n]{0,60}above:/.test(note.text ?? ""),
      ).map(({ file, verse, note }) => `${file} v${verse} (${note.author ?? "?"})`);
      expect(offenders, offenders.join("\n  ")).toEqual([]);
    });
  });
});
