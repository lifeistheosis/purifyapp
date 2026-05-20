// St. John Chrysostom, Homilies on 2 Thessalonians (NPNF1-13, public domain).
// 5 homilies, verse-keyed. Homily I opens with an "Argument." (no lemma).
import { ingestHomilies, regionBetweenHomilyI } from "./lib/npnf-homilies.mjs";

const VERSES = { 1: 12, 2: 17, 3: 18 };

await ingestHomilies({
  srcUrl: "https://ccel.org/ccel/schaff/npnf113/cache/npnf113.txt",
  cacheName: "npnf113.txt",
  getRegion: (t) => regionBetweenHomilyI(t, 4),
  lemmaRe: /^2 Thessalonians\s+([IVXLCDMivxlcdm0-9]+)\.\s*([0-9][0-9,\s.–-]*)/,
  expectedHomilies: 5,
  prefaceCount: 1,
  author: "St. John Chrysostom",
  citation: "NPNF1-13",
  saintSlug: "john-chrysostom",
  workSlug: "homilies-on-2-thessalonians",
  workTitle: "Homilies on the Second Epistle to the Thessalonians",
  workSubtitle: "The complete five homilies",
  bookSlug: "2-thessalonians",
  bookName: "2 Thessalonians",
  source:
    "St. John Chrysostom, Homilies on the Second Epistle to the Thessalonians. From the Nicene and Post-Nicene Fathers, Series 1, Vol. 13 (ed. Philip Schaff). Public domain.",
  workLabel: (n) => `Homilies on the Second Epistle to the Thessalonians, Homily ${n}`,
  verseCounts: VERSES,
});
