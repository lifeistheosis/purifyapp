// St. John Chrysostom, Homilies on the Epistle to the Hebrews (NPNF1-14,
// Schaff, public domain). 34 homilies, verse-keyed via "Ver. N." markers.
//   Source: https://www.ccel.org/ccel/schaff/npnf114/cache/npnf114.txt
//   (npnf114 holds the 88 John homilies first, then the Hebrews homilies.)
// Run from project root:  node scripts/ingest-chrysostom-hebrews.mjs

import { ingestHomilies } from "./lib/npnf-homilies.mjs";

const HEBREWS_VERSES = {
  1: 14, 2: 18, 3: 19, 4: 16, 5: 14, 6: 20, 7: 28,
  8: 13, 9: 28, 10: 39, 11: 40, 12: 29, 13: 25,
};

// Hebrews homilies live after the John block. The American-reviser note marks
// the John/Hebrews boundary; the Hebrews "Homily I." follows shortly after.
function getRegion(text) {
  const boundary = text.indexOf("by the american reviser");
  if (boundary < 0) throw new Error("Could not find John/Hebrews boundary");
  const heads = [...text.matchAll(/^ {3}Homily I\.\s*$/gm)]
    .map((m) => m.index)
    .filter((i) => i > boundary);
  if (!heads.length) throw new Error("Could not locate Hebrews Homily I.");
  const start = heads[0];
  const end = text.indexOf("Indexes", start);
  return text.slice(start, end > start ? end : undefined);
}

await ingestHomilies({
  srcUrl: "https://www.ccel.org/ccel/schaff/npnf114/cache/npnf114.txt",
  cacheName: "npnf114.txt",
  getRegion,
  lemmaRe: /^Hebrews\s+([IVXLCDMivxlcdm0-9]+)\.\s*([0-9][0-9,\s.–-]*)/,
  expectedHomilies: 34,
  prefaceCount: 0,
  author: "St. John Chrysostom",
  citation: "NPNF1-14",
  saintSlug: "john-chrysostom",
  workSlug: "homilies-on-hebrews",
  workTitle: "Homilies on the Epistle to the Hebrews",
  workSubtitle: "The complete thirty-four homilies",
  bookSlug: "hebrews",
  bookName: "Hebrews",
  source:
    "St. John Chrysostom, Homilies on the Epistle to the Hebrews. From the Nicene and Post-Nicene Fathers, Series 1, Vol. 14 (ed. Philip Schaff). Public domain.",
  workLabel: (n) => `Homilies on the Epistle to the Hebrews, Homily ${n}`,
  verseCounts: HEBREWS_VERSES,
});
