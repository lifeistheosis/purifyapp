// St. John Chrysostom, Homilies on 1 Thessalonians (NPNF1-13, public domain).
// 11 homilies, verse-keyed.
import { ingestHomilies, regionBetweenHomilyI } from "./lib/npnf-homilies.mjs";

const VERSES = { 1: 10, 2: 20, 3: 13, 4: 18, 5: 28 };

await ingestHomilies({
  srcUrl: "https://ccel.org/ccel/schaff/npnf113/cache/npnf113.txt",
  cacheName: "npnf113.txt",
  getRegion: (t) => regionBetweenHomilyI(t, 3),
  lemmaRe: /^1 Thessalonians\s+([IVXLCDMivxlcdm0-9]+)\.\s*([0-9][0-9,\s.–-]*)/,
  expectedHomilies: 11,
  prefaceCount: 0,
  author: "St. John Chrysostom",
  citation: "NPNF1-13",
  saintSlug: "john-chrysostom",
  workSlug: "homilies-on-1-thessalonians",
  workTitle: "Homilies on the First Epistle to the Thessalonians",
  workSubtitle: "The complete eleven homilies",
  bookSlug: "1-thessalonians",
  bookName: "1 Thessalonians",
  source:
    "St. John Chrysostom, Homilies on the First Epistle to the Thessalonians. From the Nicene and Post-Nicene Fathers, Series 1, Vol. 13 (ed. Philip Schaff). Public domain.",
  workLabel: (n) => `Homilies on the First Epistle to the Thessalonians, Homily ${n}`,
  verseCounts: VERSES,
});
