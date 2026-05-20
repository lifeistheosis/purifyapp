// St. John Chrysostom, Homilies on Ephesians (NPNF1-13, public domain).
// 24 homilies, verse-keyed. Lemma form is "Chapter I. Verses 1-2".
//   Source: https://ccel.org/ccel/schaff/npnf113/cache/npnf113.txt
import { ingestHomilies, regionBetweenHomilyI } from "./lib/npnf-homilies.mjs";

const VERSES = { 1: 23, 2: 22, 3: 21, 4: 32, 5: 33, 6: 24 };

await ingestHomilies({
  srcUrl: "https://ccel.org/ccel/schaff/npnf113/cache/npnf113.txt",
  cacheName: "npnf113.txt",
  getRegion: (t) => regionBetweenHomilyI(t, 0),
  lemmaRe: [
    /^Chapter\s+([IVXLCDMivxlcdm]+)\.\s*Verses?\s*([0-9][0-9,\s.–-]*)/i,
    /^Ephesians\s+([IVXLCDMivxlcdm0-9]+)\.\s*([0-9][0-9,\s.–-]*)/,
  ],
  expectedHomilies: 24,
  prefaceCount: 0,
  author: "St. John Chrysostom",
  citation: "NPNF1-13",
  saintSlug: "john-chrysostom",
  workSlug: "homilies-on-ephesians",
  workTitle: "Homilies on the Epistle to the Ephesians",
  workSubtitle: "The complete twenty-four homilies",
  bookSlug: "ephesians",
  bookName: "Ephesians",
  source:
    "St. John Chrysostom, Homilies on the Epistle to the Ephesians. From the Nicene and Post-Nicene Fathers, Series 1, Vol. 13 (ed. Philip Schaff). Public domain.",
  workLabel: (n) => `Homilies on the Epistle to the Ephesians, Homily ${n}`,
  verseCounts: VERSES,
});
