// St. John Chrysostom, Homilies on the Second Epistle to the Corinthians
// (NPNF1-12, Schaff, public domain). 30 homilies, verse-keyed.
//   Source: https://ccel.org/ccel/schaff/npnf112/cache/npnf112.txt
// Run from project root:  node scripts/ingest-chrysostom-2-corinthians.mjs

import { ingestHomilies, regionByLemma } from "./lib/npnf-homilies.mjs";

const SECOND_COR_VERSES = {
  1: 24, 2: 17, 3: 18, 4: 18, 5: 21, 6: 18, 7: 16,
  8: 24, 9: 15, 10: 18, 11: 33, 12: 21, 13: 14,
};

await ingestHomilies({
  srcUrl: "https://ccel.org/ccel/schaff/npnf112/cache/npnf112.txt",
  cacheName: "npnf112.txt",
  // 2 Cor runs from its Homily I to the trailing Indexes apparatus.
  getRegion: (t) => regionByLemma(t, /2 Cor\.\s+[IVXLCDMivxlcdm0-9]+\./, /Indexes/),
  lemmaRe: /^2 Cor\.\s+([IVXLCDMivxlcdm0-9]+)\.\s*([0-9][0-9,\s.–-]*)/,
  expectedHomilies: 30,
  prefaceCount: 0,
  author: "St. John Chrysostom",
  citation: "NPNF1-12",
  saintSlug: "john-chrysostom",
  workSlug: "homilies-on-2-corinthians",
  workTitle: "Homilies on the Second Epistle to the Corinthians",
  workSubtitle: "The complete thirty homilies",
  bookSlug: "2-corinthians",
  bookName: "2 Corinthians",
  source:
    "St. John Chrysostom, Homilies on the Second Epistle of St. Paul to the Corinthians. From the Nicene and Post-Nicene Fathers, Series 1, Vol. 12 (ed. Philip Schaff). Public domain.",
  workLabel: (n) => `Homilies on the Second Epistle to the Corinthians, Homily ${n}`,
  verseCounts: SECOND_COR_VERSES,
});
