// St. John Chrysostom, Homilies on Philippians (NPNF1-13, public domain).
// 15 homilies, verse-keyed.
import { ingestHomilies, regionBetweenHomilyI } from "./lib/npnf-homilies.mjs";

const VERSES = { 1: 30, 2: 30, 3: 21, 4: 23 };

await ingestHomilies({
  srcUrl: "https://ccel.org/ccel/schaff/npnf113/cache/npnf113.txt",
  cacheName: "npnf113.txt",
  getRegion: (t) => regionBetweenHomilyI(t, 1),
  lemmaRe: /^Philippians\s+([IVXLCDMivxlcdm0-9]+)\.\s*([0-9][0-9,\s.–-]*)/,
  expectedHomilies: 15,
  prefaceCount: 0,
  author: "St. John Chrysostom",
  citation: "NPNF1-13",
  saintSlug: "john-chrysostom",
  workSlug: "homilies-on-philippians",
  workTitle: "Homilies on the Epistle to the Philippians",
  workSubtitle: "The complete fifteen homilies",
  bookSlug: "philippians",
  bookName: "Philippians",
  source:
    "St. John Chrysostom, Homilies on the Epistle to the Philippians. From the Nicene and Post-Nicene Fathers, Series 1, Vol. 13 (ed. Philip Schaff). Public domain.",
  workLabel: (n) => `Homilies on the Epistle to the Philippians, Homily ${n}`,
  verseCounts: VERSES,
});
