// St. John Chrysostom, Homilies on the Gospel of St. Matthew (NPNF1-10,
// Schaff, public domain). 90 homilies (Homily I is the preface). Vol. 10 is
// Matthew only, so the region runs from the first "Homily I." to the trailing
// Indexes.
//
// Matthew, like Acts, lacks the line-leading "Ver. N." markers the John
// pipeline uses, so splitByVerse yields one chunk per homily anchored at the
// homily's lemma start verse. We therefore use commentaryMode "per-verse"
// knowingly: each homily becomes one verse-note at the opening verse of the
// passage it expounds (coarser than John, but real, cited, public-domain text;
// no fabricated verse mapping). The helper merges these into the existing
// curated Matthew rail notes, keeping all other Fathers and replacing only this
// author's prior Homilies-on-Matthew notes.
//
// Source: https://www.ccel.org/ccel/schaff/npnf110/cache/npnf110.txt
// Run from the project root: node scripts/ingest-chrysostom-matthew.mjs
import { ingestHomilies, regionBetweenHomilyI } from "./lib/npnf-homilies.mjs";

// Matthew per-chapter verse counts (KJV) for the sanity warnings.
const MATTHEW_VERSES = {
  1: 25, 2: 23, 3: 17, 4: 25, 5: 48, 6: 34, 7: 29, 8: 34, 9: 38, 10: 42,
  11: 30, 12: 50, 13: 58, 14: 36, 15: 39, 16: 28, 17: 27, 18: 35, 19: 30,
  20: 34, 21: 46, 22: 46, 23: 39, 24: 51, 25: 46, 26: 75, 27: 66, 28: 20,
};

await ingestHomilies({
  srcUrl: "https://www.ccel.org/ccel/schaff/npnf110/cache/npnf110.txt",
  cacheName: "npnf110.txt",
  // Vol. 10 holds only Matthew: from the first "Homily I." to the Indexes.
  getRegion: (t) => regionBetweenHomilyI(t, 0),
  lemmaRe: /^Matt\.\s+([IVXLCDMivxlcdm0-9]+)\.\s*([0-9][0-9,\s.–-]*)/,
  // The work has 90 homilies, but this CCEL transcription is missing the
  // standalone section headers for Homilies 53, 54, 58, and 79 (their text is
  // merged into the preceding homily). So only 86 headers parse. Homily numbers
  // are taken from the roman numeral (see parseHomilies), so the 86 we do parse
  // keep their true numbers — there are simply four gaps.
  expectedHomilies: 86,
  prefaceCount: 1,
  commentaryMode: "per-verse",
  author: "St. John Chrysostom",
  citation: "NPNF1-10",
  saintSlug: "john-chrysostom",
  workSlug: "homilies-on-matthew",
  workTitle: "Homilies on the Gospel of Matthew",
  workSubtitle: "The complete ninety homilies",
  bookSlug: "matthew",
  bookName: "Matthew",
  source:
    "St. John Chrysostom, Homilies on the Gospel of St. Matthew. From the Nicene and Post-Nicene Fathers, Series 1, Vol. 10 (ed. Philip Schaff). Public domain.",
  workLabel: (n) => `Homilies on the Gospel of St. Matthew, Homily ${n}`,
  verseCounts: MATTHEW_VERSES,
});
