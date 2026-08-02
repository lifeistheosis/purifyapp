// Verbatim public-domain primary texts for the August menologion.
//
//   node scripts/ingest-august-works.mjs
//
// The shell in the authoring environment has no outbound DNS, so this script
// is written there and run by the owner. It fetches from Wikisource, which
// carries clean transcriptions of the Ante-Nicene and Nicene/Post-Nicene
// Fathers, writes the JSON files under data/saints/, and then prints the
// exact `Work` entries to paste into lib/saints/saints.ts.
//
// Nothing is registered before the text exists. That ordering is deliberate:
// a work registered without its file renders a 404 on a page the saint's
// profile links to, and lib/saints/__tests__/saints.integrity.test.ts fails
// the build if it ever happens.
//
// See docs/editorial/august-menologion.md for the whole workstream.

import {
  fetchWikitext,
  splitNumberedChapters,
  toParagraphs,
  writeWriting,
} from "./lib/wikisource.mjs";

const ANF5 = "Ante-Nicene_Fathers/Volume_V/Cyprian";
const NPNF21 = "Nicene_and_Post-Nicene_Fathers:_Series_II/Volume_I";

const ANF5_CITE =
  "Translated by Robert Ernest Wallis. Ante-Nicene Fathers, Vol. 5 " +
  "(ed. Alexander Roberts, James Donaldson and A. Cleveland Coxe, 1886). " +
  "Public domain. Source text via Wikisource. Schaff's editorial footnotes " +
  "are omitted; the text is Cyprian's, unabridged.";

const JOBS = [
  {
    saint: "cyprian-of-carthage",
    slug: "the-life-and-passion-of-cyprian",
    blurb:
      "The deacon who followed him into exile writes down what the layfolk already had: the conversion, the election, the flight and its defense, the exile at Curubis, and the field of Sextus.",
    topics: ["Martyrdom","Repentance","The Church","Courage"],
    title: "The Life and Passion of Cyprian",
    subtitle: "By Pontius the Deacon, who was with him",
    page: `${ANF5}/The_Life_and_Passion_of_Cyprian,_Bishop_and_Martyr._By_Pontius_the_Deacon`,
    expected: 19,
    source:
      "Pontius the Deacon, The Life and Passion of Cyprian, Bishop and Martyr. " +
      ANF5_CITE +
      " Written shortly after 258 by Cyprian's own deacon, who followed him into " +
      "exile and was present at the end. It is the earliest surviving Christian " +
      "biography of a bishop.",
    framing:
      "Pontius was Cyprian's deacon. He went with him into exile at Curubis and he was at Carthage when the sentence was carried out. He wrote this within a few years of the death, and he says at the start why: that the layfolk and the catechumens who had died in the persecution had their acts written down, and that it would be shameful if the bishop who taught them had none.",
  },
  {
    saint: "cyprian-of-carthage",
    slug: "on-the-unity-of-the-church",
    blurb:
      "The treatise the whole later argument about what the Church is has to go through. One light and many rays, one root and many branches, one source and many streams, and a garment the soldiers would not tear.",
    topics: ["The Church","Unity","Schism","Baptism"],
    title: "On the Unity of the Church",
    subtitle: "Read at the Council of Carthage, 251",
    page: `${ANF5}/The_Treatises_of_Cyprian/On_the_Unity_of_the_Church`,
    expected: 27,
    source:
      "St. Cyprian of Carthage, On the Unity of the Church (Treatise I), written 251. " +
      ANF5_CITE,
    framing:
      "Written in the year the two schisms broke at once, the lax one at Carthage under Novatus and Felicissimus, the rigorist one at Rome under Novatian, and read aloud to the Council of Carthage in the spring of 251. Its images have outlived the quarrel that produced them: the sun with many rays and one light, the tree with many branches and one root, the spring with many streams and one source, and the seamless garment that the soldiers would not tear.",
  },
  {
    saint: "cyprian-of-carthage",
    slug: "on-the-lords-prayer",
    blurb:
      "The oldest Latin commentary on the Our Father, taken a phrase at a time, asking of each one what it commits the person praying it to.",
    topics: ["Prayer","The Our Father","Forgiveness","Daily Bread"],
    title: "On the Lord's Prayer",
    subtitle: "The oldest Latin commentary on the Our Father",
    // Literal apostrophe, NOT %27: fetchWikitext runs encodeURIComponent over
    // this, so a pre-encoded title gets double-encoded to %2527 and 404s.
    page: `${ANF5}/The_Treatises_of_Cyprian/On_the_Lord's_Prayer`,
    expected: 36,
    source:
      "St. Cyprian of Carthage, On the Lord's Prayer (Treatise IV), written c. 252. " +
      ANF5_CITE,
    framing:
      "Cyprian takes the prayer a phrase at a time and asks, of each one, what it commits the person praying it to. He is the first Latin writer to do this, and Tertullian before him and Augustine long after both worked from the pattern he set here.",
  },
  {
    saint: "cyprian-of-carthage",
    slug: "on-the-mortality",
    blurb:
      "Written with the dead in the streets of Carthage, for Christians who found they were afraid of dying in a bed and were ashamed of it.",
    topics: ["Death","Hope","Fear","Resurrection"],
    title: "On the Mortality",
    subtitle: "Written in the plague at Carthage, 252",
    page: `${ANF5}/The_Treatises_of_Cyprian/On_the_Mortality`,
    expected: 26,
    source:
      "St. Cyprian of Carthage, On the Mortality (Treatise VII), written c. 252 " +
      "during the plague at Carthage. " +
      ANF5_CITE,
    framing:
      "The dead were in the streets of Carthage and the sick were being put out of doors by their own households. Cyprian had the church of the city organized into burial and nursing parties who did not ask whose the bodies were. He wrote this for Christians who found that they were afraid, and who were ashamed of being afraid because they had spent years saying they wanted to be with Christ.",
  },
  {
    saint: "thaddeus-of-edessa",
    slug: "the-abgar-documents",
    blurb:
      "Eusebius says he took these out of the public record office of Edessa and translated them: a king writing to Christ, a reply, and the mission of Thaddeus to the city.",
    topics: ["Apostles","Mission","Faith","Healing"],
    title: "The Abgar Documents",
    subtitle: "Eusebius, Church History I.13, from the archive of Edessa",
    page: `${NPNF21}/Church_History_of_Eusebius/Book_I/Chapter_13`,
    expected: 20,
    source:
      "Eusebius of Caesarea, Church History, Book I, Chapter 13, translated by " +
      "Arthur Cushman McGiffert. Nicene and Post-Nicene Fathers, Series 2, Vol. 1 " +
      "(ed. Philip Schaff and Henry Wace, 1890). Public domain. Source text via " +
      "Wikisource. Eusebius states that he is translating documents preserved in " +
      "the public record office of the city of Edessa.",
    framing:
      "This is the oldest written form of the tradition the Church commemorates on the twenty first of August, and Eusebius is explicit about his method: he says he took the documents out of the Edessene archive and translated them from Syriac. Historians read the correspondence as a document of the church of Edessa rather than a transcript of a first-century exchange. It is printed here as Eusebius printed it, and the reader is left to weigh it.",
  },
];

let failures = 0;
const registered = [];

for (const job of JOBS) {
  console.log(`\n${job.saint} / ${job.slug}`);
  try {
    const wikitext = await fetchWikitext(job.page);
    const paragraphs = toParagraphs(wikitext);
    const chapters = splitNumberedChapters(paragraphs, {
      expected: job.expected,
      work: job.slug,
    });

    const sections = chapters.map((c) => ({
      n: c.n,
      title: `Chapter ${c.n}`,
      ...(c.n === 1 && job.framing ? { framing: job.framing } : {}),
      paragraphs: c.paragraphs,
    }));

    const { words } = await writeWriting({
      saint: job.saint,
      slug: job.slug,
      title: job.title,
      subtitle: job.subtitle,
      source: job.source,
      sections,
    });
    registered.push({ ...job, words, sections: sections.length });
  } catch (err) {
    failures++;
    console.error(`  FAILED: ${err.message}`);
  }
}

if (registered.length) {
  console.log(
    "\n\nPaste these into the matching saint's works[] array in lib/saints/saints.ts,\n" +
      "then run: npx vitest run lib/saints/__tests__/saints.integrity.test.ts\n",
  );
  for (const r of registered) {
    console.log(`// ${r.saint}`);
    console.log("      {");
    console.log(`        slug: ${JSON.stringify(r.slug)},`);
    console.log(`        title: ${JSON.stringify(r.title)},`);
    console.log(`        subtitle: ${JSON.stringify(r.subtitle)},`);
    console.log(`        blurb:`);
    console.log(`          ${JSON.stringify(r.blurb)},`);
    console.log(`        topics: ${JSON.stringify(r.topics)},`);
    console.log("      },");
  }
}

console.log(
  `\n${registered.length} of ${JOBS.length} works written` +
    (failures ? `, ${failures} failed` : ""),
);
process.exit(failures ? 1 : 0);
