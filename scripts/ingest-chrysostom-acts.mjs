// St. John Chrysostom, Homilies on the Acts of the Apostles (NPNF1-11,
// Schaff, public domain). 55 homilies. NPNF1-11 holds Acts first and then the
// Homilies on Romans, so the region runs from the first "Acts I." lemma to the
// start of the Romans epistle.
//
// Acts, like Matthew, lacks the line-leading "Ver. N." markers the John
// pipeline uses, so splitByVerse yields one chunk per homily anchored at the
// homily's lemma start verse. We therefore use commentaryMode "per-verse"
// knowingly: each homily becomes one verse-note at the opening verse of the
// passage it expounds (coarser than John, but real, cited, public-domain text;
// no fabricated verse mapping). The helper merges these into the existing
// curated Acts rail notes, keeping all other Fathers and replacing only this
// author's prior Homilies-on-Acts notes (the prior hand-curated Chrysostom
// summaries are superseded by the verbatim text).
//
// Source: https://ccel.org/ccel/schaff/npnf111/cache/npnf111.txt
// Run from the project root: node scripts/ingest-chrysostom-acts.mjs
import { ingestHomilies, regionByLemma } from "./lib/npnf-homilies.mjs";

// Acts per-chapter verse counts (KJV) for the sanity warnings.
const ACTS_VERSES = {
 1: 26, 2: 47, 3: 26, 4: 37, 5: 42, 6: 15, 7: 60, 8: 40, 9: 43, 10: 48,
 11: 30, 12: 25, 13: 52, 14: 28, 15: 41, 16: 40, 17: 34, 18: 28, 19: 41,
 20: 38, 21: 40, 22: 30, 23: 35, 24: 27, 25: 27, 26: 32, 27: 44, 28: 31,
};

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
 commentaryMode: "per-verse",
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
 verseCounts: ACTS_VERSES,
});
