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
//      thousand words in the source. 138 notes exceed 5,000 words. That is
//      real patristic text, so it is not deleted here, it is bounded: the count
//      may fall, never rise. Lower the ceiling as the re-ingest fixes each
//      work, and this test records the progress.

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
 * Measured 2026-08-09, after the artifact strip. This number may only go DOWN.
 * If a change makes it rise, an ingest has over-captured again.
 */
const KNOWN_LONG_NOTES = 138;

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
});
