// St. John Chrysostom, Homilies on the Acts of the Apostles (NPNF1-11).
// 55 homilies. Acts lacks "Ver." markers, so this produces the readable
// WORK only (commentaryMode "none") — the curated per-verse Acts rail notes
// that already exist are left untouched.
//   Source: https://ccel.org/ccel/schaff/npnf111/cache/npnf111.txt
import { ingestHomilies, regionByLemma } from "./lib/npnf-homilies.mjs";

await ingestHomilies({
  srcUrl: "https://ccel.org/ccel/schaff/npnf111/cache/npnf111.txt",
  cacheName: "npnf111.txt",
  getRegion: (t) =>
    regionByLemma(
      t,
      /Acts\s+[IVXLCDMivxlcdm0-9]+\./,
      /epistle of st\. paul the apostle/i,
    ),
  lemmaRe: /^Acts\s+([IVXLCDMivxlcdm0-9]+)\.\s*([0-9][0-9,\s.–-]*)/,
  expectedHomilies: 55,
  prefaceCount: 0,
  commentaryMode: "none",
  author: "St. John Chrysostom",
  citation: "NPNF1-11",
  saintSlug: "john-chrysostom",
  workSlug: "homilies-on-acts",
  workTitle: "Homilies on the Acts of the Apostles",
  workSubtitle: "The complete fifty-five homilies",
  bookSlug: "acts",
  bookName: "Acts",
  source:
    "St. John Chrysostom, Homilies on the Acts of the Apostles. From the Nicene and Post-Nicene Fathers, Series 1, Vol. 11 (ed. Philip Schaff). Public domain.",
  workLabel: (n) => `Homilies on the Acts of the Apostles, Homily ${n}`,
});
