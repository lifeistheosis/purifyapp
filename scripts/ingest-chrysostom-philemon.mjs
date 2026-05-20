// St. John Chrysostom, Homilies on Philemon (NPNF1-13, public domain).
// 3 homilies, verse-keyed. Last book in the volume → end at Indexes.
import { ingestHomilies, regionBetweenHomilyI } from "./lib/npnf-homilies.mjs";

const VERSES = { 1: 25 };

await ingestHomilies({
  srcUrl: "https://ccel.org/ccel/schaff/npnf113/cache/npnf113.txt",
  cacheName: "npnf113.txt",
  getRegion: (t) => regionBetweenHomilyI(t, 8, /Indexes/),
  lemmaRe: /^Philemon\s+([IVXLCDMivxlcdm0-9]+)\.\s*([0-9][0-9,\s.–-]*)/,
  expectedHomilies: 3,
  prefaceCount: 1,
  author: "St. John Chrysostom",
  citation: "NPNF1-13",
  saintSlug: "john-chrysostom",
  workSlug: "homilies-on-philemon",
  workTitle: "Homilies on the Epistle to Philemon",
  workSubtitle: "The complete three homilies",
  bookSlug: "philemon",
  bookName: "Philemon",
  source:
    "St. John Chrysostom, Homilies on the Epistle to Philemon. From the Nicene and Post-Nicene Fathers, Series 1, Vol. 13 (ed. Philip Schaff). Public domain.",
  workLabel: (n) => `Homilies on the Epistle to Philemon, Homily ${n}`,
  verseCounts: VERSES,
});
