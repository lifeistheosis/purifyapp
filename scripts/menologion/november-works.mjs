// November's works: the saints' own writings, whole, in the printed English
// (docs/1.9-build/notes/november-saints.md, push 2).
//
// Read by `node scripts/ingest-witness-lives.mjs november --works`. Each work
// is cut from CCEL's transcription of the printed volume and split at the
// edition's own chapter headings (`chapters`); every word is compared with
// archive.org's text of scans of the same volume, and a word the scans read
// otherwise is settled on the page image (`fix` for CCEL's slip, `ocr` for
// the scans' misreading), as November's Lives were.

/** archive.org scans of each printed volume. */
const SCAN = {
  // The volume Allan Menzies edited in 1896, the ninth of the American
  // series (not the index volume that once carried the number).
  anf09: ["antenicenefather0009alla", "antenicenefather09robe"],
  anf06: ["antenicenefather06robeuoft", "antenicenefather06buff"],
};

export const WORKS = [
  {
    saint: "clement-of-rome",
    slug: "first-epistle-to-the-corinthians",
    title: "The First Epistle to the Corinthians",
    subtitle: "The letter of the Church of Rome to the Church of Corinth",
    source:
      "St. Clement of Rome, The First Epistle to the Corinthians, in the translation of Alexander Roberts and James Donaldson (Ante-Nicene Fathers 1, 1885), completed and revised by John Keith from the manuscript found after that volume (Ante-Nicene Fathers 9, ed. Allan Menzies, 1896), public domain. CCEL's transcription read word for word against archive.org's scans of the same volume; where they differ, the printed page is followed. The editors' footnotes are left out; the chapters and their titles are as printed.",
    originalLanguage: "grc",
    passages: [
      {
        vol: "anf09",
        from: "Chapter I.--The Salutation.  Praise of the Corinthians Before the",
        to: "Introductory Notice.",
        chapters: {
          heading: "^Chapter ([IVXLC]+)\\.?—(.+)$",
          expect: 65,
          cite: (n) => `St. Clement of Rome, First Epistle to the Corinthians ${n}, tr. A. Roberts and J. Donaldson, rev. J. Keith (ANF 9, 1896)`,
        },
        scans: SCAN.anf09,
        // CCEL's slips, the page's words put back (both scans agree; "inquity"
        // and "vainglory" read on the page image, n248 of the first scan:
        // "inquity" is the page's own misprint, kept as printed).
        fix: [
          ["their month", "their mouth"],
          ["deed bird", "dead bird"],
          ["anyone go", "any one go"],
          ["unrighteousness and iniquity", "unrighteousness and inquity"],
          ["vain glory", "vainglory"],
          ["and Michael shut up", "and Mishael shut up"],
          ["And these who have been", "And those who have been"],
        ],
        // The page has our word; the scans' text broke it: "hap-" ends a
        // column above its footnotes and "pen" opens the next (n247), as
        // "ar-rangements" and "con-sider" do; "manlv" and "makestrich" are
        // the scans' letters.
        ocr: ["happen", "arrangements", "consider", "manly", "makest", "rich"],
      },
    ],
  },

  // St Gregory the Wonderworker: the four writings ANF 6 sets among his
  // acknowledged works, in S. D. F. Salmond's translation. The writings it
  // sets apart as "dubious or spurious" are left out.
  {
    saint: "gregory-the-wonderworker",
    slug: "a-declaration-of-faith",
    title: "A Declaration of Faith",
    subtitle: "His creed of the Holy Trinity",
    source: GREGORY("A Declaration of Faith"),
    originalLanguage: "grc",
    passages: [
      {
        vol: "anf06",
        from: "A Declaration of Faith. [18]",
        heading: 1,
        voice: "saint",
        title: "A Declaration of Faith",
        citation: "St. Gregory the Wonderworker, A Declaration of Faith, tr. S. D. F. Salmond (ANF 6, 1886)",
        scans: SCAN.anf06,
      },
    ],
  },
  {
    saint: "gregory-the-wonderworker",
    slug: "metaphrase-of-ecclesiastes",
    title: "A Metaphrase of the Book of Ecclesiastes",
    subtitle: "The Preacher's words, opened in his own",
    source: GREGORY("A Metaphrase of the Book of Ecclesiastes"),
    originalLanguage: "grc",
    passages: [
      {
        vol: "anf06",
        from: "A Metaphrase of the Book of Ecclesiastes. [40]",
        heading: 1,
        to: "Canonical Epistle. [121]",
        chapters: {
          heading: "^Chapter ([IVXLC]+)\\.()$",
          expect: 12,
          cite: (n) => `St. Gregory the Wonderworker, A Metaphrase of the Book of Ecclesiastes ${n}, tr. S. D. F. Salmond (ANF 6, 1886)`,
        },
        scans: SCAN.anf06,
        // The page's own misprints, kept as printed (read on the page image
        // of the first scan: "wisdon", n25; "may he", n28). CCEL corrected
        // both.
        fix: [
          ["devoid of wisdom", "devoid of wisdon"],
          ["may be, whereunto", "may he, whereunto"],
        ],
        // The page has our word: a footnote's number printed against it
        // ("cheerfulness5"), the OCR's letters ("discemeth", "laboui", "1"),
        // the hyphen of "life-journey" lost (n28), and "newly-" broken at a
        // line's end over "washed", which leaves CCEL's two words standing.
        ocr: ["i", "cheerfulness", "discerneth", "labour", "lifejourney", "newly", "washed", "vainly", "handle", "things", "it"],
      },
    ],
  },
  {
    saint: "gregory-the-wonderworker",
    slug: "canonical-epistle",
    title: "The Canonical Epistle",
    subtitle: "On the Christians of Pontus after the barbarians' raids",
    source: `${GREGORY("Canonical Epistle")} The eleventh canon, which the edition's own note judges a later addition, is left out.`,
    originalLanguage: "grc",
    passages: [
      {
        vol: "anf06",
        from: "Canonical Epistle. [121]",
        heading: 1,
        to: "Canon XI. [144]",
        chapters: {
          heading: "^Canon ([IVXLC]+)\\.()$",
          expect: 10,
          cite: (n) => `St. Gregory the Wonderworker, Canonical Epistle, canon ${n}, tr. S. D. F. Salmond (ANF 6, 1886)`,
        },
        scans: SCAN.anf06,
        // "coveteous-ness" is the page's own misprint (n31), kept as printed;
        // "scrip-tures" breaks at a column's foot above the footnotes.
        fix: [["indulgence of covetousness", "indulgence of coveteousness"]],
        ocr: ["scriptures"],
      },
    ],
  },
  {
    saint: "gregory-the-wonderworker",
    slug: "panegyric-to-origen",
    title: "The Oration and Panegyric Addressed to Origen",
    subtitle: "His farewell to his teacher at Caesarea",
    source: GREGORY("The Oration and Panegyric Addressed to Origen"),
    originalLanguage: "grc",
    passages: [
      {
        vol: "anf06",
        from: "The Oration and Panegyric Addressed to Origen. [151]",
        heading: 1,
        to: "Elucidations.",
        chapters: {
          heading: "^Argument ([IVXLC]+)\\.—\\s*(.+)$",
          expect: 19,
          cite: (n) => `St. Gregory the Wonderworker, Oration and Panegyric Addressed to Origen ${n}, tr. S. D. F. Salmond (ANF 6, 1886)`,
        },
        scans: SCAN.anf06,
        // CCEL's slips, the page's words put back (both scans agree).
        fix: [
          ["skillfully", "skilfully"],
          ["befall as", "befall us"],
        ],
        // Footnote numbers against the words ("such3"), and the OCR's letters.
        ocr: ["such", "not", "and", "i", "person"],
      },
    ],
  },

  // St Peter of Alexandria: his canons, as ANF 6 gives them from his sermon
  // on penitence. The edition prints Balsamon's and Zonaras's commentaries
  // after each canon; only St Peter's words are kept.
  {
    saint: "peter-of-alexandria",
    slug: "the-canonical-epistle",
    title: "The Canonical Epistle",
    subtitle: "The canons on the lapsed, from his sermon on penitence",
    source:
      "St. Peter of Alexandria, The Canonical Epistle, tr. James B. H. Hawkins (Ante-Nicene Fathers 6, 1886), public domain. CCEL's transcription read word for word against archive.org's scans of the same volume; where they differ, the printed page is followed. The edition's footnotes, and the commentaries of Theodore Balsamon and John Zonaras it prints after each canon, are left out; the canons are as printed.",
    originalLanguage: "grc",
    passages: [
      {
        vol: "anf06",
        from: "The Canons of the Blessed Peter, Archbishop of Alexandria, as They are",
        heading: 1,
        to: "Note by the American Editor.",
        chapters: {
          heading: "^Canon ([IVXLC]+)\\.()$",
          expect: 15,
          dropFrom: "^(Balsamon|Zonaras)\\.",
          cite: (n) => `St. Peter of Alexandria, The Canonical Epistle, canon ${n}, tr. J. B. H. Hawkins (ANF 6, 1886)`,
        },
        scans: SCAN.anf06,
        // "com-municate" breaks at a column's foot above the footnotes.
        ocr: ["communicate"],
      },
    ],
  },
];

// St Victorinus of Pettau (November 2): the treatise ANF 7 gives whole. His
// Commentary on the Apocalypse waits on the clergy review (item 1).
WORKS.push({
  saint: "victorinus-of-pettau",
  slug: "on-the-creation-of-the-world",
  title: "On the Creation of the World",
  subtitle: "The seven days of creation",
  source:
    "St. Victorinus of Pettau, On the Creation of the World, tr. Robert Ernest Wallis (Ante-Nicene Fathers 7, 1886), public domain. CCEL's transcription read word for word against archive.org's scans of the same volume; where they differ, the printed page is followed. The editors' footnotes are left out; the gaps the edition marks in the text are kept as it prints them.",
  originalLanguage: "la",
  passages: [
    {
      vol: "anf07",
      from: "ON THE CREATION OF THE WORLD [2196]",
      heading: 1,
      voice: "saint",
      title: "On the Creation of the World",
      citation: "St. Victorinus of Pettau, On the Creation of the World, tr. R. E. Wallis (ANF 7, 1886)",
      minWords: 500,
      scans: ["antenicenefather07robeuoft", "antenicenefather07buff"],
      // The page has "the Word was with God" (n353); the scans lost the W.
      ocr: ["word"],
    },
  ],
});

/** The source line of St Gregory's works. */
function GREGORY(work) {
  return `St. Gregory the Wonderworker, ${work}, tr. S. D. F. Salmond (Ante-Nicene Fathers 6, 1886), public domain. CCEL's transcription read word for word against archive.org's scans of the same volume; where they differ, the printed page is followed. The editors' footnotes are left out; the chapters are as printed.`;
}
