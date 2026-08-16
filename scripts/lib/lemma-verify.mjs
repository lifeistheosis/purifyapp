// Verify a lemma against the Scripture this app already ships, rather than
// recognising it by its shape.
//
// WHY THIS EXISTS. An ingest that finds its verse anchors with a regex is
// guessing about typography. A line like "  19. And Joseph..." is
// indistinguishable from ordinary numbered prose inside a Father's commentary,
// and the first version of the Catena ingest proved it: it produced a note
// anchored at Matthew 3:19, in a chapter with seventeen verses. A tighter regex
// would only have been a better guess, and would have broken on the next
// volume.
//
// So a lemma is not recognised, it is VERIFIED. We already ship the verse it
// quotes: data/bible/<slug>/<n>.json holds the text, and a 19th century lemma
// is the Authorised Version with light variation. A candidate is accepted only
// when its words actually match the verse it claims to be. A wrong anchor
// becomes structurally impossible, because there is nothing for it to match.
//
// That also settles chapter boundaries by evidence rather than inference. When
// a candidate fails against the current chapter but matches the opening of the
// next, the boundary is proven rather than guessed from a verse-number reset.
// That is how Matthew's missing headings for chapters 1, 11 and 15 were
// recovered.
//
// CALIBRATION ORACLE. Extracted verbatim from scripts/ingest-catena-aurea.mjs,
// where it was proved on Mark and Matthew. Mark is a free labelled test set:
//
//   node scripts/ingest-catena-aurea.mjs --book mark
//
// must report 679 of 679 lemmas verified and leave data/bible/commentary/mark/
// byte-identical to what is committed. Any change to the constants or the
// matcher that moves either number is wrong. Do not retune the constants
// blindly.
//
// Every consumer runs from the project root, so data paths here are relative to
// the working directory, matching the rest of scripts/.

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

// How much of a candidate's opening has to appear in the verse it claims to be.
// A 19th century text modernises spelling and sometimes trims the quotation, so
// this is overlap and never equality.
export const MATCH_TOKENS = 8;
export const MATCH_THRESHOLD = 0.5;
// Below this share of verified lemmas the matching is broken, not the data.
export const MIN_VERIFIED_RATE = 0.9;

/** Bare words, so a printed lemma and the shipped Scripture can be compared. */
export function words(s) {
  return String(s)
    .toLowerCase()
    .replace(/\[[^\]]*\]/g, " ") // drop the transcription's [Mal 3:1] refs
    .replace(/&[a-z]+;/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** The shipped Scripture: chapter -> (verse -> word-set). */
export function loadScripture(bookSlug) {
  const dir = path.join(ROOT, "data", "bible", bookSlug);
  if (!fs.existsSync(dir)) {
    throw new Error(
      `lemma-verify: no shipped Scripture at ${path.relative(ROOT, dir)}. ` +
        `Nothing can be verified against a book we do not carry.`,
    );
  }
  const byChapter = new Map();
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) {
    const doc = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    const verses = new Map();
    for (const v of doc.verses ?? []) verses.set(v.n, new Set(words(v.text).split(" ")));
    byChapter.set(doc.chapter, verses);
  }
  if (!byChapter.size) throw new Error(`lemma-verify: ${bookSlug} has no chapters on disk.`);
  return byChapter;
}

/**
 * Bind the matcher to one book's shipped text.
 *
 * Returns `score(quoted, chapter, verse)` and `verifyAnchor(quoted, n,
 * chapter)`, the two calls the Catena ingest was built around.
 */
export function createLemmaVerifier(bookSlug, scripture = loadScripture(bookSlug)) {
  /** Share of the candidate's opening words that appear in that verse. */
  function score(quoted, chapter, verse) {
    const verses = scripture.get(chapter);
    if (!verses) return 0;
    const target = verses.get(verse);
    if (!target) return 0;
    const q = words(quoted).split(" ").filter(Boolean).slice(0, MATCH_TOKENS);
    if (!q.length) return 0;
    let hit = 0;
    for (const w of q) if (target.has(w)) hit++;
    return hit / q.length;
  }

  /**
   * Is this candidate really verse `n`? Tries `chapter` first, then
   * `chapter + 1`, so a chapter heading missing from the source is proven by
   * the text rather than inferred from a verse-number reset.
   *
   * -> { ok, chapter, score }. `chapter` is where it verified, which may be one
   * past the chapter it was asked about.
   */
  function verifyAnchor(quoted, n, chapter) {
    let hit = score(quoted, chapter, n);
    let target = chapter;
    if (hit < MATCH_THRESHOLD) {
      const next = score(quoted, chapter + 1, n);
      if (next >= MATCH_THRESHOLD) {
        hit = next;
        target = chapter + 1;
      }
    }
    return { ok: hit >= MATCH_THRESHOLD, chapter: target, score: hit };
  }

  return { bookSlug, scripture, score, verifyAnchor };
}

// ---- Alignment reporting ----------------------------------------------------
// docs/editorial-standards.md is binding: "any future ingest must print
// alignment stats, and unmatched sections should be written to a review file."
// Printing alone leaves nothing to read afterwards, so both live here and every
// ingest that verifies gets them for free.

const REVIEW_DIR = path.join("docs", "editorial", "ingest-review");

/**
 * Collects what verified, what did not, and what could not be named, then
 * prints the stats line and writes the review file.
 */
export function createAlignmentReport({ label, command, source }) {
  const unmatched = [];
  const flagged = [];
  const unnamed = new Map();
  let verified = 0;

  return {
    pass() {
      verified++;
    },
    fail(entry) {
      unmatched.push(entry);
    },
    /**
     * Something that needs a person, not a gate. Flags do not count toward the
     * verified rate, because they are not candidates the matcher chose between:
     * they are places where a printed reference and our own arrangement of the
     * text disagree, and only an editor can say which is right.
     */
    flag(entry) {
      flagged.push(entry);
    },
    /** A label the speaker map does not know. Folded, never written as an author. */
    unnamedLabel(name) {
      unnamed.set(name, (unnamed.get(name) ?? 0) + 1);
    },
    get counts() {
      return { verified, rejected: unmatched.length, flagged: flagged.length, unnamed: unnamed.size };
    },
    /** Unmapped labels, commonest first, so a caller can print its own tally. */
    unnamedEntries() {
      return [...unnamed.entries()].sort((a, b) => b[1] - a[1]);
    },
    rate() {
      return verified / (verified + unmatched.length || 1);
    },
    /** True when the matcher is broken rather than the data being messy. */
    belowFloor() {
      return this.rate() < MIN_VERIFIED_RATE;
    },
    print({ explain = false } = {}) {
      const rate = this.rate();
      console.log(
        `lemmas: ${verified} verified against the shipped text, ${unmatched.length} rejected as prose ` +
          `(${(rate * 100).toFixed(1)}% verified).`,
      );
      if (rate < MIN_VERIFIED_RATE || explain) {
        console.log("");
        console.log("Rejected candidates (highest scoring first), to judge whether the matcher or the data is at fault:");
        unmatched
          .slice()
          .sort((a, b) => Number(b.hit) - Number(a.hit))
          .slice(0, 20)
          .forEach((r) => console.log(`  ${r.chapter}:${String(r.n).padStart(3)}  score ${r.hit}  "${r.quoted}"`));
        console.log("");
      }
    },
    /**
     * Write the review file. Deliberately carries no timestamp: a re-run of the
     * same ingest against the same source should leave the tree clean, so a
     * changed review file always means changed evidence.
     */
    writeReview(slug) {
      const rate = this.rate();
      const lines = [
        `# ${label}`,
        "",
        "Generated by an ingest script. Do not hand-edit: regenerate with",
        "",
        "```",
        command,
        "```",
        "",
        source ? `Source: ${source}` : null,
        source ? "" : null,
        "## Alignment",
        "",
        "| Measure | Count |",
        "|---|---|",
        `| Lemmas verified against the shipped text | ${verified} |`,
        `| Candidates rejected as ordinary prose | ${unmatched.length} |`,
        `| Verified rate | ${(rate * 100).toFixed(1)}% |`,
        `| Floor before the matcher is called broken | ${(MIN_VERIFIED_RATE * 100).toFixed(0)}% |`,
        "",
      ].filter((l) => l !== null);

      lines.push("## Unmatched candidates", "");
      if (!unmatched.length) {
        lines.push("None. Every candidate matched the verse it claimed to be.", "");
      } else {
        lines.push(
          "Each of these looked like a lemma and did not match the verse it claimed.",
          "They were kept as commentary under the preceding anchor, so no text was lost;",
          "what needs review is only whether the anchor above them is right.",
          "",
          "| Chapter:verse claimed | Score | Opening |",
          "|---|---|---|",
        );
        for (const r of unmatched.slice().sort((a, b) => Number(b.hit) - Number(a.hit))) {
          lines.push(`| ${r.chapter}:${r.n} | ${r.hit} | ${String(r.quoted).replace(/\|/g, "\\|")} |`);
        }
        lines.push("");
      }

      if (flagged.length) {
        lines.push(
          "## Lemmas needing an editor",
          "",
          "The reference printed by the source and the arrangement of the text we ship",
          "disagree here. Nothing was moved on a guess. Each one ends either in a",
          "`verseRemap` entry naming the arrangement it reconciles, or in a decision that",
          "the printed reference is right and ours is the odd one.",
          "",
          "| Anchor as printed | Section | What the text says | Opening |",
          "|---|---|---|---|",
        );
        for (const f of flagged) {
          const cell = (v) => String(v ?? "").replace(/\|/g, "\\|");
          lines.push(`| ${cell(f.where)} | ${cell(f.homily)} | ${cell(f.detail)} | ${cell(f.quoted)} |`);
        }
        lines.push("");
      }

      lines.push("## Unrecognised speaker labels", "");
      if (!unnamed.size) {
        lines.push("None.", "");
      } else {
        lines.push(
          "These were folded into the preceding note and never written as authors.",
          "A label left unmapped misattributes rather than omits, so anything here",
          "with a real count belongs in the speaker map.",
          "",
          "| Label | Times seen |",
          "|---|---|",
        );
        for (const [name, n] of [...unnamed.entries()].sort((a, b) => b[1] - a[1])) {
          lines.push(`| ${name} | ${n} |`);
        }
        lines.push("");
      }

      const file = path.join(ROOT, REVIEW_DIR, `${slug}.md`);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, lines.join("\n"), "utf8");
      return path.join(REVIEW_DIR, `${slug}.md`);
    },
  };
}
