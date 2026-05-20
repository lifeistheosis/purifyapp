// St. John Chrysostom, Homilies on Colossians (NPNF1-13, public domain).
// 12 homilies, verse-keyed.
import { ingestHomilies, regionBetweenHomilyI } from "./lib/npnf-homilies.mjs";

const VERSES = { 1: 29, 2: 23, 3: 25, 4: 18 };

await ingestHomilies({
  srcUrl: "https://ccel.org/ccel/schaff/npnf113/cache/npnf113.txt",
  cacheName: "npnf113.txt",
  getRegion: (t) => regionBetweenHomilyI(t, 2),
  lemmaRe: /^Colossians\s+([IVXLCDMivxlcdm0-9]+)\.\s*([0-9][0-9,\s.–-]*)/,
  expectedHomilies: 12,
  prefaceCount: 0,
  author: "St. John Chrysostom",
  citation: "NPNF1-13",
  saintSlug: "john-chrysostom",
  workSlug: "homilies-on-colossians",
  workTitle: "Homilies on the Epistle to the Colossians",
  workSubtitle: "The complete twelve homilies",
  bookSlug: "colossians",
  bookName: "Colossians",
  source:
    "St. John Chrysostom, Homilies on the Epistle to the Colossians. From the Nicene and Post-Nicene Fathers, Series 1, Vol. 13 (ed. Philip Schaff). Public domain.",
  workLabel: (n) => `Homilies on the Epistle to the Colossians, Homily ${n}`,
  verseCounts: VERSES,
});
