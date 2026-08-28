import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Scan artifacts must never reach a reader inside text the app calls verbatim.
 *
 * ── Why this exists ─────────────────────────────────────────────────────
 *
 * Every hosted work in Purify is ingested from a public-domain scan, and the
 * app tells the reader so: `data/prayers/rules/pre-communion.json` states
 * "Text verbatim, including Hapgood's spelling and punctuation". That promise
 * was not being kept. Six characters of OCR wreckage had shipped:
 *
 *   "For what evil is there that I have not done.■■ What sin is there that I
 *    have not committed.-" What evil thing is there that I have not meditated
 *    in my soul } I am guilty..."   (A Prayer of Simeon Metaphrastes)
 *
 * Three question marks destroyed by the archive.org OCR and replaced with two
 * black squares, a hyphen-and-quote, and a closing brace; plus "Holy_Spirit"
 * with an underscore where the space belongs. Two more were in St John of
 * Damascus, where NPNF marks footnotes as `^[2465]` and the ingest stripped the
 * bracketed number but left the caret standing in the prose.
 *
 * The existing guards did not and could not catch these. The hyphenation
 * resolver in scripts/ingest-hapgood-communion.mjs is thorough about words and
 * refuses to guess at one it cannot find, but it never looks at punctuation,
 * which is exactly where all six got through. Nothing else reads the corpus
 * looking for damage.
 *
 * ── Why a scan and not a schema ─────────────────────────────────────────
 *
 * These files are valid JSON and every required field is present. The damage is
 * inside prose, so only reading the prose finds it. This is a ratchet: it costs
 * one pass over the corpus and it fails the build the next time a scan artifact
 * is ingested, which is the only moment it is cheap to fix.
 *
 * ── On false positives ──────────────────────────────────────────────────
 *
 * Underscores are legitimate inside the archive.org and CCEL filenames that
 * `source` fields cite (".../historycouncilf00nealgoog_djvu.txt"), so a match is
 * ignored when it sits inside a URL-shaped token. Everything else here is a
 * character that has no business in an English devotional text at all.
 */

const ROOT = path.resolve(__dirname, "..", "..", "..");

/** The content trees that are presented to readers as sourced text. */
const TREES = ["data/prayers", "data/saints", "data/theology", "data/bible"];

type Artifact = {
  label: string;
  pattern: RegExp;
  /** Return true when this particular match is legitimate. */
  allow?: (match: string, whole: string) => boolean;
  /** A string this class must match. Proves the class is still wired up. */
  sample: string;
};

const ARTIFACTS: Artifact[] = [
  {
    // The DjVu OCR emits these where it cannot resolve a glyph. Two of them
    // stood in for a question mark in the Metaphrastes prayer.
    label: "black square (unresolved OCR glyph)",
    pattern: /■/g,
    sample: "I have not done.■■ What sin",
  },
  {
    // "Holy_Spirit". Legitimate only inside a cited source filename.
    label: "underscore where a space belongs",
    pattern: /[A-Za-z]_[A-Za-z]/g,
    sample: "offended thy Holy_Spirit, and",
    allow: (_m, whole) => /https?:\/\/|_djvu|\.txt|\.htm/.test(whole),
  },
  {
    // "...meditated in my soul }". A brace never terminates a sentence.
    label: "brace standing in for punctuation",
    pattern: /[a-z]\s\}/g,
    sample: "meditated in my soul } I am",
  },
  {
    // "...I have not committed.-\"" is a mangled question mark.
    label: "dot-hyphen-quote (mangled question mark)",
    pattern: /\.-"/g,
    sample: 'I have not committed.-" What',
  },
  {
    // A residual NPNF footnote marker, left when ^[2465] lost its number.
    label: "caret (residual footnote marker)",
    pattern: /[a-z]\s\^/g,
    sample: "the holy Mother of God ^. And",
  },
  {
    // Raw entities mean the text was read as markup somewhere upstream.
    label: "unescaped HTML entity",
    pattern: /&(quot|amp|lt|gt|#\d+);/g,
    sample: "Sermon 8, &amp; 9: Luke",
  },
];

/**
 * The union of every ARTIFACTS pattern, run against raw file text as a filter.
 * Keep it in step with the list above: anything matchable there must be
 * matchable here, or the slow path never sees the file.
 */
const PRE = /[■^]|&(quot|amp|lt|gt|#\d)|[A-Za-z]_[A-Za-z]|\.-"|[a-z]\s\}/;

function jsonFiles(dir: string): string[] {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  const out: string[] = [];
  const walk = (d: string) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.name.endsWith(".json")) out.push(p);
    }
  };
  walk(abs);
  return out;
}

/** Every string value in a parsed JSON document. */
function strings(value: unknown, into: string[]): string[] {
  if (typeof value === "string") into.push(value);
  else if (value && typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) {
      strings(v, into);
    }
  }
  return into;
}

describe("the shipped corpus carries no scan artifacts", () => {
  const files = TREES.flatMap(jsonFiles);

  it("has a corpus to scan at all", () => {
    // Without this, a wrong ROOT would make every assertion below pass by
    // finding nothing, which is the failure mode this whole file exists to
    // prevent elsewhere.
    expect(files.length).toBeGreaterThan(100);
  });

  it("keeps every artifact class reachable through the pre-filter", () => {
    /**
     * The pre-filter is an optimisation that can silently disable a class: add
     * a pattern to ARTIFACTS, forget to widen PRE, and that class never runs
     * because the file is skipped before it is ever parsed. The scan would stay
     * green while checking less than it claims, which is the exact failure this
     * whole file exists to prevent. So each class carries a sample it must
     * match, and the sample must survive the pre-filter too.
     */
    for (const { label, pattern, sample } of ARTIFACTS) {
      pattern.lastIndex = 0;
      expect(pattern.test(sample), `${label}: its own sample does not match`).toBe(
        true,
      );
      expect(
        PRE.test(sample),
        `${label}: PRE does not match its sample, so files carrying this ` +
          `artifact are skipped before the class is ever applied. Widen PRE.`,
      ).toBe(true);
    }
  });

  it("contains none of the artifact classes that reached readers once", () => {
    const found: string[] = [];

    for (const file of files) {
      const raw = fs.readFileSync(file, "utf8");
      // Cheap pre-filter. The corpus is 4,692 files and 104 MB, nearly all of
      // it the verse-by-verse commentary, and walking every one of its 2.4
      // million strings through six regexes took 68 seconds under a parallel
      // suite and timed the test out. One pass over the raw bytes drops that to
      // 15 candidate files. PRE is deliberately looser than ARTIFACTS (it
      // matches JSON's own braces too); a false positive here only costs the
      // slow path on one file, while a false negative would hide real damage,
      // so every class below must stay representable in this union.
      if (!PRE.test(raw)) continue;

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        continue; // malformed JSON is another test's problem
      }
      for (const text of strings(parsed, [])) {
        for (const { label, pattern, allow } of ARTIFACTS) {
          pattern.lastIndex = 0;
          for (const m of text.matchAll(pattern)) {
            if (allow?.(m[0], text)) continue;
            const at = m.index ?? 0;
            const context = text.slice(Math.max(0, at - 45), at + 30);
            found.push(
              `${path.relative(ROOT, file)}\n    [${label}] ...${context}...`,
            );
          }
        }
      }
    }

    expect(
      found,
      found.length
        ? `Scan artifacts are present in text the app presents as verbatim:\n\n  ${found.join("\n  ")}\n\n` +
            `Repair them against the source volume rather than deleting the ` +
            `character: each one stands where a real mark was printed.`
        : "",
    ).toEqual([]);
    // Reading 104 MB is the floor here and it is I/O bound, so the wall clock
    // depends on what else the suite is doing. Standalone it is about 4
    // seconds; sharing a machine with 140 other test files it has been seen at
    // 68. It passed at 25s on one run and timed out at the 30s default on the
    // next, which is a flake, not a finding. The number below is not a
    // performance target, it is far enough above the worst observed run that a
    // failure here means a real artifact rather than a busy disk.
  }, 180_000);
});
