import "server-only";

// Which books may show the interlinear at all.
//
// This is a DATA-INTEGRITY gate, not a feature flag. A book belongs here when
// the interlinear would show the reader text that is not the text they asked
// for. Presenting the wrong Greek beside the right English is worse than
// presenting no Greek: the reader has no way to know, and the whole point of
// an interlinear is that it can be trusted word for word.
//
// The rule the gate enforces is all-or-nothing. A book that is blocked shows
// no Greek column, no English tagging, and no interlinear toggle, so there is
// never a half-built experience whose missing half looks like a loading state.
// The ordinary chapter text is completely unaffected.
//
// ── Currently blocked ──────────────────────────────────────────────────────
//
// philemon — data/bible/english-tagged/philemon/ was written by an ingest that
//   carried its accumulator across a book boundary. `1.json` held 55 entries:
//   Philemon 1-25 followed by Philippians 1:1-30, and `{2,3,4}.json` were
//   Philippians 2-4 under a Philemon path. Because the reader builds its token
//   map as `englishTokensByNum[v.n] = v.tokens` (last write wins), the English
//   side of Philemon 1-25 rendered PHILIPPIANS. The corrupt files are deleted;
//   Philemon stays blocked until a regenerated set is validated, because with
//   them gone it would otherwise fall back to a Greek-only column.
//
// Removing a book from this list requires the regenerated data to pass
// lib/bible/__tests__/interlinearData.test.ts, which is the point of that test.
const BLOCKED_BOOKS: ReadonlySet<string> = new Set(["philemon"]);

// The Old Testament books with no Greek in data/bible/original (Swete's
// Septuagint does not reach them here): nothing to set beside the English.
const NO_GREEK_OT: ReadonlySet<string> = new Set(["ezra", "esther", "2-maccabees", "prayer-of-manasseh", "2-esdras"]);

/**
 * True when the interlinear may be offered for this book.
 *
 * The Old Testament joined on 2026-09-30, at the owner's asking: the
 * Septuagint is the Church's Old Testament, and Purify's English Old
 * Testament is Brenton's translation of it. It is a plainer interlinear than
 * the New Testament's: Swete's Greek carries Strong's numbers but no parsing,
 * and there is no English tagging, so a Greek word opens its dictionary entry
 * and the English beside it is the verse, not word for word.
 *
 * Per book only. Swete and Brenton do not always divide the text alike, so
 * the chapter page also asks greekAlignment (lib/bible/greekText.ts) and
 * leaves the Greek out of a chapter where it would stand beside the wrong
 * verse: about one chapter in four, as of 2026-09-30.
 */
export function interlinearAvailable(
  bookSlug: string,
  testament: string,
): boolean {
  if (testament !== "NT") return !NO_GREEK_OT.has(bookSlug);
  return !BLOCKED_BOOKS.has(bookSlug);
}

/** Exposed for the data-integrity test. */
export function blockedInterlinearBooks(): string[] {
  return [...BLOCKED_BOOKS];
}
