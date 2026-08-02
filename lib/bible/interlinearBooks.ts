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

/**
 * True when the interlinear may be offered for this book.
 *
 * `testament` carries the existing NT-only rule: the LXX ships Strong's on
 * most tokens but no morphological parse, and the English tagging is NT-only,
 * so the OT half of the interlinear has never been offered. That restriction
 * lives here now rather than inline, so lifting it is a deliberate edit to a
 * documented gate rather than a boolean flipped in a page component.
 */
export function interlinearAvailable(
  bookSlug: string,
  testament: string,
): boolean {
  if (testament !== "NT") return false;
  return !BLOCKED_BOOKS.has(bookSlug);
}

/** Exposed for the data-integrity test. */
export function blockedInterlinearBooks(): string[] {
  return [...BLOCKED_BOOKS];
}
