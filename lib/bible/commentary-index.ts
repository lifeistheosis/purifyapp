// Book slugs that ship with patristic commentary (data/bible/commentary/<slug>).
// Used to surface a small "Fathers" badge on the Bible index so the coverage
// is discoverable. Keep in sync with the commentary data directory; the
// `scripts/ingest-chrysostom-*` scripts add new books here as they are run.
export const COMMENTED_BOOKS: ReadonlySet<string> = new Set([
  // Old Testament (selected)
  "genesis",
  "exodus",
  "psalms",
  // Gospels + Acts
  "matthew",
  "john",
  "acts",
  // Pauline epistles (Chrysostom, complete per-verse except where noted)
  "romans",
  "galatians",
  "1-corinthians",
  "2-corinthians",
  "ephesians",
  "philippians",
  "colossians",
  "1-thessalonians",
  "2-thessalonians",
  "1-timothy",
  "2-timothy",
  "titus",
  "philemon",
  "hebrews",
  // Catholic epistles (Augustine, Ten Homilies on the First Epistle of John)
  "1-john",
]);

export function hasCommentary(slug: string): boolean {
  return COMMENTED_BOOKS.has(slug);
}
