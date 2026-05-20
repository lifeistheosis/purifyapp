// St. John Chrysostom, Homilies on the First Epistle to the Corinthians
// (NPNF1-12, Schaff, public domain). 44 homilies, verse-keyed.
//   Source: https://ccel.org/ccel/schaff/npnf112/cache/npnf112.txt
//   (npnf112 holds 1 Corinthians then 2 Corinthians.)
// Run from project root:  node scripts/ingest-chrysostom-1-corinthians.mjs

import { ingestHomilies, regionByLemma } from "./lib/npnf-homilies.mjs";

const FIRST_COR_VERSES = {
  1: 31, 2: 16, 3: 23, 4: 21, 5: 13, 6: 20, 7: 40, 8: 13,
  9: 27, 10: 33, 11: 34, 12: 31, 13: 13, 14: 40, 15: 58, 16: 24,
};

await ingestHomilies({
  srcUrl: "https://ccel.org/ccel/schaff/npnf112/cache/npnf112.txt",
  cacheName: "npnf112.txt",
  // 1 Cor runs from its Homily I to the "second epistle" section title.
  getRegion: (t) =>
    regionByLemma(
      t,
      /1 Cor\.\s+[IVXLCDMivxlcdm0-9]+\./,
      /second epistle of st\. paul the apostle/i,
    ),
  lemmaRe: /^1 Cor\.\s+([IVXLCDMivxlcdm0-9]+)\.\s*([0-9][0-9,\s.–-]*)/,
  expectedHomilies: 44,
  prefaceCount: 0,
  author: "St. John Chrysostom",
  citation: "NPNF1-12",
  saintSlug: "john-chrysostom",
  workSlug: "homilies-on-1-corinthians",
  workTitle: "Homilies on the First Epistle to the Corinthians",
  workSubtitle: "The complete forty-four homilies",
  bookSlug: "1-corinthians",
  bookName: "1 Corinthians",
  source:
    "St. John Chrysostom, Homilies on the First Epistle of St. Paul to the Corinthians. From the Nicene and Post-Nicene Fathers, Series 1, Vol. 12 (ed. Philip Schaff). Public domain.",
  workLabel: (n) => `Homilies on the First Epistle to the Corinthians, Homily ${n}`,
  verseCounts: FIRST_COR_VERSES,
});
