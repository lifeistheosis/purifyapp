// St. John Chrysostom, Homilies on 2 Timothy (NPNF1-13, public domain).
// 10 homilies, verse-keyed.
import { ingestHomilies, regionBetweenHomilyI } from "./lib/npnf-homilies.mjs";

const VERSES = { 1: 18, 2: 26, 3: 17, 4: 22 };

await ingestHomilies({
  srcUrl: "https://ccel.org/ccel/schaff/npnf113/cache/npnf113.txt",
  cacheName: "npnf113.txt",
  getRegion: (t) => regionBetweenHomilyI(t, 6),
  lemmaRe: /^2 Timothy\s+([IVXLCDMivxlcdm0-9]+)\.\s*([0-9][0-9,\s.–-]*)/,
  expectedHomilies: 10,
  prefaceCount: 0,
  author: "St. John Chrysostom",
  citation: "NPNF1-13",
  saintSlug: "john-chrysostom",
  workSlug: "homilies-on-2-timothy",
  workTitle: "Homilies on the Second Epistle to Timothy",
  workSubtitle: "The complete ten homilies",
  bookSlug: "2-timothy",
  bookName: "2 Timothy",
  source:
    "St. John Chrysostom, Homilies on the Second Epistle to Timothy. From the Nicene and Post-Nicene Fathers, Series 1, Vol. 13 (ed. Philip Schaff). Public domain.",
  workLabel: (n) => `Homilies on the Second Epistle to Timothy, Homily ${n}`,
  verseCounts: VERSES,
});
