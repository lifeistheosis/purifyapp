// St. John Chrysostom, Homilies on 1 Timothy (NPNF1-13, public domain).
// 18 homilies, verse-keyed.
import { ingestHomilies, regionBetweenHomilyI } from "./lib/npnf-homilies.mjs";

const VERSES = { 1: 20, 2: 15, 3: 16, 4: 16, 5: 25, 6: 21 };

await ingestHomilies({
  srcUrl: "https://ccel.org/ccel/schaff/npnf113/cache/npnf113.txt",
  cacheName: "npnf113.txt",
  getRegion: (t) => regionBetweenHomilyI(t, 5),
  lemmaRe: /^1 Timothy\s+([IVXLCDMivxlcdm0-9]+)\.\s*([0-9][0-9,\s.–-]*)/,
  expectedHomilies: 18,
  prefaceCount: 0,
  author: "St. John Chrysostom",
  citation: "NPNF1-13",
  saintSlug: "john-chrysostom",
  workSlug: "homilies-on-1-timothy",
  workTitle: "Homilies on the First Epistle to Timothy",
  workSubtitle: "The complete eighteen homilies",
  bookSlug: "1-timothy",
  bookName: "1 Timothy",
  source:
    "St. John Chrysostom, Homilies on the First Epistle to Timothy. From the Nicene and Post-Nicene Fathers, Series 1, Vol. 13 (ed. Philip Schaff). Public domain.",
  workLabel: (n) => `Homilies on the First Epistle to Timothy, Homily ${n}`,
  verseCounts: VERSES,
});
