// Book slugs that ship with patristic commentary (data/bible/commentary/<slug>).
// Used to surface a small "Fathers" badge on the Bible index so the coverage
// is discoverable.
//
// This list is a second source of truth beside the data directory, and it has
// already fallen behind once: the Catena Aurea shipped 2,948 notes for Mark and
// this file did not name it, so every one of them was live and unreachable. An
// ingest that writes data is not finished until the book appears here.
// lib/bible/__tests__/commentaryIndex.test.ts now fails when the two disagree.
export const COMMENTED_BOOKS: ReadonlySet<string> = new Set([
  // Old Testament (selected)
  "genesis",
  "exodus",
  "1-samuel",
  "psalms",
  // Gospels + Acts
  "matthew",
  "mark",
  // St. Cyril of Alexandria, the great surviving commentary on Luke, which
  // reaches us whole only through a Syriac version.
  "luke",
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
  // Revelation (Victorinus of Pettau, the earliest surviving commentary)
  "revelation",
]);

export function hasCommentary(slug: string): boolean {
  return COMMENTED_BOOKS.has(slug);
}
