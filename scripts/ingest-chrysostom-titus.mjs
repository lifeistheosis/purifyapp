// St. John Chrysostom, Homilies on Titus (NPNF1-13, public domain).
// 6 homilies, verse-keyed.
import { ingestHomilies, regionBetweenHomilyI } from "./lib/npnf-homilies.mjs";

const VERSES = { 1: 16, 2: 15, 3: 15 };

await ingestHomilies({
  srcUrl: "https://ccel.org/ccel/schaff/npnf113/cache/npnf113.txt",
  cacheName: "npnf113.txt",
  getRegion: (t) => regionBetweenHomilyI(t, 7),
  lemmaRe: /^Titus\s+([IVXLCDMivxlcdm0-9]+)\.\s*([0-9][0-9,\s.–-]*)/,
  expectedHomilies: 6,
  prefaceCount: 0,
  author: "St. John Chrysostom",
  citation: "NPNF1-13",
  saintSlug: "john-chrysostom",
  workSlug: "homilies-on-titus",
  workTitle: "Homilies on the Epistle to Titus",
  workSubtitle: "The complete six homilies",
  bookSlug: "titus",
  bookName: "Titus",
  source:
    "St. John Chrysostom, Homilies on the Epistle to Titus. From the Nicene and Post-Nicene Fathers, Series 1, Vol. 13 (ed. Philip Schaff). Public domain.",
  workLabel: (n) => `Homilies on the Epistle to Titus, Homily ${n}`,
  verseCounts: VERSES,
});
