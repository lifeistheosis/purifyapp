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

// Sts Barlaam and Josaphat (November 19): the book of their lives, in the
// Loeb's English of 1914, from Project Gutenberg's transcription of it (no
// CCEL text exists), read against three scans of the printed book: the 1914
// printing twice and the 1937 reprint from the same plates. The Greek facing
// pages and the margin notes are not in the transcription.
WORKS.push({
  saint: "barlaam-and-josaphat",
  slug: "barlaam-and-ioasaph",
  title: "Barlaam and Ioasaph",
  subtitle: "The edifying story of their lives",
  source:
    "Barlaam and Ioasaph, ascribed to St. John of Damascus (the book names its writer John the Monk, of the monastery of St. Sabas), tr. G. R. Woodward and H. Mattingly (Loeb Classical Library, 1914), public domain in the United States. Project Gutenberg's transcription (ebook 749) read word for word against archive.org's scans of the printed book; where they differ, the printed page is followed. The Greek facing pages and the margin notes are left out; the chapters are as printed.",
  originalLanguage: "grc",
  passages: [
    {
      vol: "gutenberg:749",
      from: "INTRODUCTION",
      to: "End of Project Gutenberg's Barlaam and Ioasaph",
      voice: "witness",
      author: "John the Monk of St. Sabas",
      chapters: {
        heading: "^([IVXL]+)\\.?()$",
        lead: "INTRODUCTION",
        leadTitle: "Introduction",
        first: 0,
        expect: 41,
        title: (numeral) => `Chapter ${numeral}`,
        cite: (n) => `Barlaam and Ioasaph${n ? ` ${n}` : ", Introduction"}, tr. G. R. Woodward and H. Mattingly (Loeb, 1914)`,
      },
      scans: [
        "bwb_KV-383-028",
        "in.ernet.dli.2015.183454/2015.183454.St-John-Damascene-Barlaam-And-Ioasaph_djvu.txt",
        "stjohndamasceneb00wood",
      ],
      // The transcription's slips (it was made in 1996 from a scan), the
      // printed page's words put back: all three scans agree on each, and the
      // doubtful ones were read on the page image. "anwers" is the page's own
      // misprint (n410 of the 1937 scan), kept as printed.
      fix: [
        ["a certain mall", "a certain man"],
        ["its three took", "its force took"],
        ["thyself will bear", "thyself wilt bear"],
        ["in such ease", "in such case"],
        ["loftiness die", "loftiness the"],
        ["star-lore of the Chaldaeans", "star-lore of the Chaldeans"],
        ["weft an healer", "wert an healer"],
        ["purveyante", "purveyance"],
        ["Wily hast thou barred", "Why hast thou barred"],
        ["thou were come", "thou wert come"],
        ["set thereto the", "set therein the"],
        ["only to these whose", "only to those whose"],
        ["root mid sure", "root and sure"],
        ["I was anhungred", "I was an hungred"],
        ["yet call they", "yet can they"],
        ["asketh time", "asketh thee"],
        ["concerning time", "concerning thee"],
        ["deliver time", "deliver thee"],
        ["solace to time", "solace to thee"],
        ["within time", "within thee"],
        ["after time, O God", "after thee, O God"],
        ["makeeth", "maketh"],
        ["wed-her", "wed her"],
        ["reek on it", "reckon it"],
        ["more cloth the", "more doth the"],
        ["accustomed therto", "accustomed thereto"],
        ["fear and love-and how", "fear and love: and how"],
        ["judged his ease,", "judged his case,"],
        ["weft to be", "wert to be"],
        ["irrefutable answers", "irrefutable anwers"],
        ["carry oft", "carry off"],
        ["and mowing", "and moving"],
        ["tat trusted", "that trusted"],
        ["that ally", "that any"],
        ["drink offerings to his", "drink-offerings to his"],
        ["milo Theudas", "unto Theudas"],
        ["hive. When he rose", "hive. Then he rose"],
        ["maintained his ease", "maintained his case"],
        ["of his glow", "of his glory"],
        ["wily art thou", "why art thou"],
        ["with team", "with tears"],
        ["facing the cast", "facing the east"],
        ["Through thine,", "Through thee,"],
        ["stiffest", "stirrest"],
        ["toils Chat he", "toils that he"],
        ["Benedic, father, benedic", "Benedicite, father, benedicite"],
        ["cheeked him", "checked him"],
        ["know thy ease", "know thy case"],
        ["only begotten Son, the Word", "only-begotten Son, the Word"],
        ["in the only begotten Son, and", "in the only-begotten Son, and"],
        ["stable and steadfast", "stable and stedfast"],
        ["Howsoever he built", "Howsomever he built"],
        ["as never before", "as ne'er before"],
        ["Tim king was delighted", "The king was delighted"],
        ["each ox these", "each of these"],
        ["thou shall not be afraid", "thou shalt not be afraid"],
      ],
      // The page has our words where the scans' text breaks them: a margin
      // note or a page number set between the halves of a word or a line, two
      // words run together, or the OCR's letters. Each is tied to its place.
      ocr: [
        ["while", "religion but while working"],
        ["on", "thought on a day"],
        ["a", "on a day when"],
        ["without", "accept them without proof"],
        ["twas", "pity thee twas in"],
        ["when", "when the king's son"],
        ["everlasting", "into life everlasting"],
        ["a", "shall be a resurrection"],
        ["generation", "faithless generation"],
        ["in", "imprisoned in a tiny"],
        ["a", "in a tiny grave"],
        ["was", "it was found likewise"],
        ["found", "was found likewise"],
        ["i", "hope that i may"],
        ["vain", "is this vain and deceitful"],
        ["stedfast", "stable and stedfast"],
        ["virgin", "child a virgin"],
        ["understand", "to understand the manner"],
        ["a", "as a right happy"],
        ["right", "a right happy man"],
        ["cry", "unto their cry"],
        ["ioasaph", "presence ioasaph hid"],
        ["persuade", "to persuade barlaam"],
        ["of", "teaching of this deceiver"],
        ["of", "thought of death more"],
        ["cared", "kindly and cared for"],
        ["to", "myself to destruction"],
        ["destruction", "to destruction well"],
        ["it", "speech it is impossible"],
        ["is", "it is impossible for"],
        ["went", "heart and went bounding"],
        ["all", "honours from all men"],
        ["despondency", "seized with despondency"],
        ["glory", "heavenly glory to the"],
        ["flinty", "father's flinty and"],
        ["and", "flinty and more"],
        ["fellowservant", "on his fellowservant"],
        ["into", "passed into the depth"],
        ["the", "into the depth of"],
        ["life", "of monastic life never"],
        ["oftentimes", "have oftentimes prayed"],
      ],
    },
  ],
});

/** The source line of St Gregory's works. */
function GREGORY(work) {
  return `St. Gregory the Wonderworker, ${work}, tr. S. D. F. Salmond (Ante-Nicene Fathers 6, 1886), public domain. CCEL's transcription read word for word against archive.org's scans of the same volume; where they differ, the printed page is followed. The editors' footnotes are left out; the chapters are as printed.`;
}
