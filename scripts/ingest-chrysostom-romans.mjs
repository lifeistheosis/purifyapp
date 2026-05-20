// St. John Chrysostom, Homilies on the Epistle to the Romans (NPNF1-11,
// Schaff, public domain). 32 homilies, verse-keyed via "Ver. N." markers.
//   Source: https://www.ccel.org/ccel/schaff/npnf111/cache/npnf111.txt
//   (npnf111 holds Acts homilies first, then Romans.)
// Run from project root:  node scripts/ingest-chrysostom-romans.mjs

import { ingestHomilies } from "./lib/npnf-homilies.mjs";

// Romans verse counts (KJV) for sanity warnings.
const ROMANS_VERSES = {
  1: 32, 2: 29, 3: 31, 4: 25, 5: 21, 6: 23, 7: 25, 8: 39,
  9: 33, 10: 21, 11: 36, 12: 21, 13: 14, 14: 23, 15: 33, 16: 27,
};

// The Romans block is the homily region whose first homily's lemma is "Rom.".
// It begins at that "Homily I." and ends at the trailing "Indexes" apparatus.
function getRegion(text) {
  const heads = [...text.matchAll(/^ {3}Homily I\.\s*$/gm)].map((m) => m.index);
  let start = -1;
  for (const idx of heads) {
    const after = text.slice(idx, idx + 160);
    if (/Rom\.\s+[IVXLCDMivxlcdm0-9]+\./.test(after)) {
      start = idx;
      break;
    }
  }
  if (start < 0) throw new Error("Could not locate Romans Homily I.");
  const end = text.indexOf("Indexes", start);
  return text.slice(start, end > start ? end : undefined);
}

await ingestHomilies({
  srcUrl: "https://www.ccel.org/ccel/schaff/npnf111/cache/npnf111.txt",
  cacheName: "npnf111.txt",
  getRegion,
  lemmaRe: /^Rom\.\s+([IVXLCDMivxlcdm0-9]+)\.\s*([0-9][0-9,\s.–-]*)/,
  expectedHomilies: 32,
  prefaceCount: 0,
  author: "St. John Chrysostom",
  citation: "NPNF1-11",
  saintSlug: "john-chrysostom",
  workSlug: "homilies-on-romans",
  workTitle: "Homilies on the Epistle to the Romans",
  workSubtitle: "The complete thirty-two homilies",
  bookSlug: "romans",
  bookName: "Romans",
  source:
    "St. John Chrysostom, Homilies on the Epistle of St. Paul the Apostle to the Romans. From the Nicene and Post-Nicene Fathers, Series 1, Vol. 11 (ed. Philip Schaff). Public domain.",
  workLabel: (n) => `Homilies on the Epistle to the Romans, Homily ${n}`,
  verseCounts: ROMANS_VERSES,
});
