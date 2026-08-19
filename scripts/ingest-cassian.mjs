// St. John Cassian, the Institutes and the Conferences, from NPNF2-11 (Schaff,
// public domain).
//
// WHY THIS WORK. Cassian is one of the seventy-seven saints in
// lib/saints/saints.ts carrying `works: []`, and he is the one that matters
// most for an Orthodox library: he learned the ascetic tradition in Egypt,
// carried it to Gaul, and is the channel through which the desert reached the
// Latin West. The Philokalia's opening texts are his, in a translation that is
// still in copyright, so NPNF2-11 is the only public-domain English there is.
//
// Neither work is verse-keyed, so this writes readable works only and no
// commentary. That is the deliberate `commentaryMode: "none"` case: keying the
// Institutes to verses would mean inventing anchors nobody printed.
//
// THREE SECTIONS ARE MISSING AND ALWAYS WILL BE. The NPNF translators declined
// to render Institutes Book VI ("On the Spirit of Fornication": "We have
// thought best to omit altogether the translation of this book"), Conference
// XII ("On Chastity": "Not translated") and Conference XXII ("On Nocturnal
// Illusions": "This Conference is omitted"). The gaps are Victorian reticence,
// not a parse failure, and since this is the only public-domain English of
// Cassian they cannot be filled under the standing sourcing rule. The extractor
// prints the gap on every run so nobody has to rediscover why.
//
// Run from the project root:
//   node scripts/ingest-cassian.mjs

import { getText } from "./lib/npnf-homilies.mjs";
import { sectionsByChapter, sliceRegion, titleFor, writeWork } from "./lib/ccel-work.mjs";

const SRC_URL = "https://www.ccel.org/ccel/schaff/npnf211/cache/npnf211.txt";
const SAINT = "john-cassian";

const text = await getText("npnf211.txt", SRC_URL);

// ---- The Institutes ---------------------------------------------------------
// Books I to XII. The region runs from the first "Book I." to the title page of
// the Conferences, which is the next work in the volume.

// NPNF2-11 holds Sulpitius Severus and Vincent of Lerins as well, and all three
// authors open with a bare "Book I.", so the start marker carries Cassian's own
// first chapter title with it. Matching on "Book I." alone picked up Sulpitius'
// Sacred History and produced a work of 408 chapters across 11 books.
const institutesRegion = sliceRegion(
  text,
  /^[ \t]*Book I\.[ \t]*\r?\n[\s\S]{0,60}?Of the Dress of the Monks/m,
  /^[ \t]*The Conferences of John Cassian\.?[ \t]*$/m,
  { label: "Cassian Institutes" },
);

const institutes = sectionsByChapter(institutesRegion, { partWord: "Book" });
console.log(`Institutes: ${institutes.length} chapters across ${new Set(institutes.map((s) => s.part)).size} books`);

writeWork({
  saintSlug: SAINT,
  workSlug: "institutes",
  title: "The Institutes",
  subtitle: "The twelve books on the rules of the monasteries and the eight faults",
  source:
    "St. John Cassian, The Twelve Books on the Institutes of the Coenobia, and the Remedies for the Eight Principal Faults. From the Nicene and Post-Nicene Fathers, Series 2, Vol. 11 (ed. Philip Schaff). Public domain.",
  sections: institutes.map((s) => ({ n: s.n, title: titleFor(s, { partWord: "Book" }), paragraphs: s.paragraphs })),
});

// ---- The Conferences --------------------------------------------------------
// Twenty-four conferences, running to the volume's trailing index apparatus.

const conferencesRegion = sliceRegion(
  text,
  /^[ \t]*The Conferences of John Cassian\.?[ \t]*$/m,
  /^[ \t]{2,}Indexes[ \t]*$/m,
  { label: "Cassian Conferences" },
);

// The Conferences are not headed "Conference I." but "I. First Conference of
// Abbot Moses.", so the part pattern is given outright.
const conferences = sectionsByChapter(conferencesRegion, {
  partWord: "Conference",
  partPattern: /^[ \t]*([IVXLCDM]+)\.[ \t]+[^\n]*Conference of Abbot[^\n]*$/,
});
console.log(
  `Conferences: ${conferences.length} chapters across ${new Set(conferences.map((s) => s.part)).size} conferences`,
);

writeWork({
  saintSlug: SAINT,
  workSlug: "conferences",
  title: "The Conferences",
  subtitle: "Twenty-four conversations with the fathers of the Egyptian desert",
  source:
    "St. John Cassian, The Conferences. From the Nicene and Post-Nicene Fathers, Series 2, Vol. 11 (ed. Philip Schaff). Public domain.",
  sections: conferences.map((s) => ({
    n: s.n,
    title: titleFor(s, { partWord: "Conference" }),
    paragraphs: s.paragraphs,
  })),
});

console.log("St. John Cassian now ships his own words. Register both works in lib/saints/saints.ts.");
