// Multi-reference parser for the Bible search bar.
//
// Splits a user's query like:
//   "1 Tim 2:5, Prov 8:7, John 2:21"
//   "John 3:16-18; Psalm 23"
// into a list of concrete `SearchHit`s — one per resolvable segment.
//
// Single-reference inputs (no comma or semicolon) return an empty array
// here; those continue to flow through the existing single-result
// path in BibleSearch. Multi-mode is opt-in by punctuation.
//
// Hidden v10.0 setup: this parser is the reuse target for the Catena
// framework — every "show me all the Father commentary on these
// verses" query will route through the same normalization.

import { searchBible, type SearchHit } from "./books";

/**
 * A single parsed Bible reference. Narrower than `SearchHit` because we
 * drop bare-book hits before returning — every entry has a chapter
 * (and possibly verse / range). Lets the result page index `.chapter`
 * without further narrowing.
 */
export type Reference = Exclude<SearchHit, { kind: "book" }>;

/**
 * Detect whether a query is intended as a multi-reference query.
 * The contract is simple: a comma or semicolon separator means the user
 * is asking for multiple things at once. We do NOT try to be clever
 * about whitespace alone — "John 1 John 2" should fail loudly, not
 * silently expand.
 */
export function isMultiReferenceQuery(input: string): boolean {
  return /[,;]/.test(input);
}

/**
 * Parse a multi-reference query into the list of hits the result page
 * will render.
 *
 * Behaviour:
 * - Splits on `,` or `;` (whitespace around is ignored).
 * - For each segment, runs the existing `searchBible` and keeps the
 *   top hit IF it resolved past a bare book (i.e. verse / range /
 *   chapter). Bare-book hits mean the segment was ambiguous, so we
 *   drop them rather than route the user to chapter 1 of something
 *   they didn't actually ask for.
 * - Returns an empty array for single-reference inputs (no separator).
 * - Returns whatever subset of segments resolved; the result page
 *   shows unresolved segments as a quiet "could not resolve" row.
 *
 * Examples:
 *   "1 Tim 2:5, Prov 8:7, John 2:21"
 *     -> [verse(1tim, 2, 5), verse(prov, 8, 7), verse(john, 2, 21)]
 *   "John 3:16-18; Psalm 23"
 *     -> [range(john, 3, 16, 18), chapter(psalms, 23)]
 *   "John 3:16"
 *     -> [] (single-ref, not multi-mode)
 */
export function parseReferences(input: string): Reference[] {
  if (!isMultiReferenceQuery(input)) return [];

  const segments = input
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (segments.length === 0) return [];

  const refs: Reference[] = [];
  for (const seg of segments) {
    // Top hit only. searchBible returns up to N suggestions ranked by
    // its fuzzy match; for a known multi-ref segment we trust the top.
    const hits = searchBible(seg, 1);
    if (hits.length === 0) continue;
    const hit = hits[0];
    // Only keep concrete locations. A bare book result here means
    // searchBible couldn't find a chapter number — almost certainly a
    // typo or unsupported abbreviation. Drop it so the result page can
    // flag the segment as unresolved instead of silently sending the
    // reader to chapter 1.
    if (hit.kind === "verse" || hit.kind === "range" || hit.kind === "chapter") {
      refs.push(hit);
    }
  }
  return refs;
}

/**
 * Companion to `parseReferences` that ALSO returns the original raw
 * segment text alongside each hit (or null for unresolved segments).
 * Used by the result page to render "we couldn't find this" rows so
 * the user can see exactly which part of their query failed.
 */
export type ParsedSegment = {
  raw: string;
  hit: Reference | null;
};

export function parseReferencesVerbose(input: string): ParsedSegment[] {
  if (!isMultiReferenceQuery(input)) return [];

  const segments = input
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);

  return segments.map((raw) => {
    const hits = searchBible(raw, 1);
    const top = hits[0];
    const hit =
      top && (top.kind === "verse" || top.kind === "range" || top.kind === "chapter")
        ? top
        : null;
    return { raw, hit };
  });
}
