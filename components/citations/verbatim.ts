/**
 * Words the app did not write: a Father's, a council's, quoted as their
 * public-domain edition prints them (docs/editorial-standards.md: verbatim).
 * The app's own words never carry an em dash (CLAUDE.md), and
 * scripts/mock-check.mjs fails a screen that shows one; an edition's text
 * keeps its own (the NPNF prints one after "Chapter I."), so the piece that
 * holds such words says so on itself, with the reason, and the check lists
 * it instead of failing. Spread on the element that holds the quoted words, and on
 * nothing of the app's own.
 */
export const VERBATIM = {
  "data-mock-allow": "emdash",
  "data-mock-why": "words quoted as their edition prints them",
} as const;
