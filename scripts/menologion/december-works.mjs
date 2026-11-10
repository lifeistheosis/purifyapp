// December's works: the saints' own writings, whole, in the printed English
// (docs/1.9-build/notes/december-saints.md, push 2).
//
// Read by `node scripts/ingest-witness-lives.mjs december --works`, as
// November's were (scripts/menologion/november-works.mjs): each work is cut
// from CCEL's transcription of the printed volume and split at the edition's
// own chapter headings, every word compared with archive.org's text of two
// scans of the same volume, and a word the scans read otherwise settled on the
// page image (`fix` for CCEL's slip, `ocr` for the scans' misreading).
//
// St Ambrose: the four works the plan names, from the Nicene and Post-Nicene
// Fathers, Second Series, vol. X (1896). The volume prints its own summary
// under every chapter heading, after Hurter's edition; those summaries are the
// editor's, not St Ambrose's, and are left out (`synopsis`: his text begins at
// his first numbered paragraph). His prologues to a book are kept, as section
// 0 of that book.

/** archive.org scans of each printed volume. */
const SCAN = {
  npnf210: ["selectlibraryofn10scha", "selectlibraryofn0010phil_e1y3"],
  // Mary H. Allies's St. John Damascene on Holy Images (London: Thomas Baker,
  // 1898): Toronto's scan, from which Gutenberg's transcription was made, and
  // a second scan of the same printing.
  allies: ["stjohndamasceneo00john", "stjohndamasceneo00alliuoft"],
};

const ALLIES = "tr. Mary H. Allies (St. John Damascene on Holy Images, London: Thomas Baker, 1898)";
const DAMASCENE = (work, what) =>
  `St. John of Damascus, ${work}, ${ALLIES}, public domain. ${what} Project Gutenberg's transcription (ebook 49917), whose transcriber notes minor emendations of spelling and punctuation, read word for word against two archive.org scans of the printing (stjohndamasceneo00john, stjohndamasceneo00alliuoft); where a word differs, the printed page is followed. The translator's footnotes and their marks are left out, and italics are set plain; the paragraphs are as printed.`;

/** One part of the book, from its heading to the next. */
const damascene = (from, to, title, citation, ocr = []) => ({
  vol: "gutenberg:49917",
  from,
  to,
  heading: 1,
  voice: "saint",
  scans: SCAN.allies,
  title,
  citation,
  // The page has our word (read on the page images where it was in doubt):
  // the scans' text broke it at a running head ("TREATISE ON", "ON
  // CROWNING"), a page's number, or a hyphen it lost.
  ocr,
});

const TR = "tr. H. de Romestin, with E. de Romestin and H. T. F. Duckworth (NPNF II 10, 1896)";
const AMBROSE = (work, misprints = "") =>
  `St. Ambrose, ${work}, ${TR}, public domain. CCEL's transcription read word for word against two archive.org scans of the volume (named in the ingest's review); where they differ, the printed page is followed${misprints}. The editor's summary under each chapter heading, the footnotes and their marks are left out; the numbered paragraphs are St. Ambrose's, as printed. Greek words are given in CCEL's Latin letters, as the library's other volumes of the series give them, where the page prints them in Greek.`;

/** His numbered paragraphs: where his text begins under each heading. */
const NUMBERED = "^\\d+\\. ";
const CHAPTER = "^Chapter ([IVXLC]+)\\.$";

/** One book of a work: its chapters, titled and cited by book. */
const book = (work, roman, more) => ({
  vol: "npnf210",
  scans: SCAN.npnf210,
  voice: "saint",
  ...more,
  chapters: {
    heading: CHAPTER,
    synopsis: NUMBERED,
    title: (numeral) => `Book ${roman}, Chapter ${numeral}`,
    leadTitle: `Book ${roman}, Introduction`,
    cite: (n) => `St. Ambrose, ${work} ${roman}${n ? `.${n}` : ", Introduction"}, ${TR}`,
    ...more.chapters,
  },
});

export const WORKS = [
  {
    saint: "ambrose-of-milan",
    slug: "on-the-duties-of-the-clergy",
    title: "On the Duties of the Clergy",
    subtitle: "Three books",
    source: AMBROSE("On the Duties of the Clergy", ", and its misprint \u201crest\u201d for \u201clest\u201d is kept"),
    originalLanguage: "la",
    passages: [
      book("On the Duties of the Clergy", "I", {
        within: "Three Books on the Duties of the Clergy.",
        from: "\n  Book I.\n",
        to: "\n  Book II.\n",
        heading: 1,
        chapters: { expect: 50 },
        // Read on the page images (leaves 41 to 66 of selectlibraryofn10scha):
        // CCEL's slips, the page's words put back; the page's own misprint
        // "rest" for "lest" is kept as printed.
        fix: [
          ["take care lest, either", "take care rest, either"],
          ["food and converts", "food and coverts"],
          ["the unworthy in son", "the unworthy son"],
          ["We call show", "We can show"],
        ],
        // The page has our word; the scans' text ran it into a note's mark or
        // the next word.
        ocr: [["he", "commandments he saith"], ["saith", "commandments he saith which"], ["i", "my course i have"], "place", "eunomius", "sion", "unconquered", ["was", "society was higher"]],
      }),
      book("On the Duties of the Clergy", "II", {
        within: "Three Books on the Duties of the Clergy.",
        from: "\n  Book II.\n",
        to: "\n  Book III.\n",
        heading: 1,
        chapters: { expect: 30 },
        fix: [["did be answer", "did he answer"]],
        ocr: ["theophrastus", "callipho", ["nothing", "there is nothing so useful"], ["of", "courtesy of speech"]],
      }),
      book("On the Duties of the Clergy", "III", {
        within: "Three Books on the Duties of the Clergy.",
        from: "\n  Book III.\n",
        // The editor's introduction to the next work follows the last chapter.
        to: "Introduction to the Three Books of St. Ambrose on the Holy Spirit.",
        heading: 1,
        chapters: { expect: 22 },
        fix: [
          ["another or the king's", "another of the king's"],
          ["but shall not eat", "but shalt not eat"],
        ],
        ocr: [["know", "first to know that"], ["27", "27 some ask"], "ahimelech", ["people", "information the people went"]],
      }),
    ],
  },
  {
    saint: "ambrose-of-milan",
    slug: "on-the-holy-spirit",
    title: "On the Holy Spirit",
    subtitle: "Three books to the Emperor Gratian",
    source: AMBROSE("On the Holy Spirit", ", and its misprints \u201cbegining\u201d, \u201cmultipled\u201d and \u201ccondemed\u201d are kept"),
    originalLanguage: "la",
    passages: [
      // Book I opens on his own prologue (Gideon's fleece), before chapter I.
      book("On the Holy Spirit", "I", {
        within: "Three Books of St. Ambrose, Bishop of Milan, on the Holy Spirit.",
        from: "\n  Book I.\n",
        to: "\n  Book II.\n",
        heading: 1,
        chapters: { expect: 17, lead: true, first: 0 },
        fix: [["with in corporeal", "with incorporeal"]],
        ocr: [
          "heel",
          ["son", "through the son then"],
          ["the", "then the paraclete"],
          "paraclete",
          ["shalt", "thou shalt see the spirit"],
          ["me", "in me but neither"],
          ["he", "spirit he said in"],
          ["said", "he said in the name"],
          "father's",
        ],
      }),
      // Book II opens on his introduction, under its own heading.
      book("On the Holy Spirit", "II", {
        within: "Three Books of St. Ambrose, Bishop of Milan, on the Holy Spirit.",
        from: "\n  Book II.\n",
        to: "\n  Book III.\n",
        heading: 2,
        chapters: { expect: 14, lead: true, first: 0 },
        // The page's own misprints, kept as printed.
        fix: [
          ["very beginning of the world", "very begining of the world"],
          ["be multiplied as the cedar", "be multipled as the cedar"],
        ],
        ocr: [["again", "born again when"], ["of", "office of the holy"], ["the", "of the holy spirit but"]],
      }),
      book("On the Holy Spirit", "III", {
        within: "Three Books of St. Ambrose, Bishop of Milan, on the Holy Spirit.",
        from: "\n  Book III.\n",
        to: "The Two Books of St. Ambrose, Bishop of Milan, on the Decease of His Brother",
        heading: 1,
        chapters: { expect: 22 },
        // The page's own misprint, kept as printed.
        fix: [["was condemned held", "was condemed held"]],
        ocr: [["christ", "equivalent in christ for"], "158"],
      }),
    ],
  },
  {
    saint: "ambrose-of-milan",
    slug: "on-the-mysteries",
    title: "On the Mysteries",
    subtitle: "To the newly baptized",
    source: AMBROSE("On the Mysteries"),
    originalLanguage: "la",
    passages: [
      {
        vol: "npnf210",
        scans: SCAN.npnf210,
        voice: "saint",
        // After the editor's introduction, at the first chapter.
        within: "The writer explains in the commencement of this treatise that his",
        from: "\n  Chapter I.\n",
        to: "Two Books Concerning Repentance.",
        ocr: [["thou", "me thou shalt teach"], ["shalt", "thou shalt teach me"], "fear"],
        chapters: {
          heading: CHAPTER,
          synopsis: NUMBERED,
          expect: 9,
          title: (numeral) => `Chapter ${numeral}`,
          cite: (n) => `St. Ambrose, On the Mysteries ${n}, ${TR}`,
        },
      },
    ],
  },
  {
    saint: "ambrose-of-milan",
    slug: "concerning-repentance",
    title: "Concerning Repentance",
    subtitle: "Two books against the Novatians",
    source: AMBROSE("Concerning Repentance"),
    originalLanguage: "la",
    passages: [
      book("Concerning Repentance", "I", {
        within: "These two books were written against the Novatian heresy",
        from: "\n  Book I.\n",
        to: "\n  Book II.\n",
        heading: 1,
        chapters: { expect: 17 },
        fix: [["that is all harlot", "that is an harlot"]],
        ocr: [["teaching", "the teaching of your"], "zeboim", "receiveth", "hereafter", ["eat", "not to eat how"]],
      }),
      book("Concerning Repentance", "II", {
        within: "These two books were written against the Novatian heresy",
        from: "\n  Book II.\n",
        // The editor's note on the penitential discipline follows the last chapter.
        to: "Note on the Penitential Discipline of the Early Church.",
        heading: 1,
        chapters: { expect: 11 },
        fix: [
          ["this not unreservedly", "this not undeservedly"],
          // II.5.32: the page prints "joining" (leaf 376).
          ["all were Joining", "all were joining"],
        ],
        ocr: [
          ["repentance", "practice of repentance yet"],
          "punishment",
          ["and", "thou remember and let us"],
          ["let", "remember and let us plead"],
          ["us", "and let us plead together"],
          "occasions",
          "before",
          "zion",
        ],
      }),
    ],
  },
  {
    saint: "john-of-damascus",
    slug: "on-holy-images",
    title: "On Holy Images",
    subtitle: "His three apologies against those who decry them",
    source: DAMASCENE("Apologies against Those Who Decry Holy Images", "The three apologies, whole, with the testimonies of the Fathers he sets after each."),
    originalLanguage: "grc",
    passages: [
      damascene("PART I.\nAPOLOGIA OF ST JOHN DAMASCENE AGAINST THOSE WHO DECRY HOLY IMAGES.", "\nPART II.\n", "Part I", `St. John of Damascus, On Holy Images, Part I, ${ALLIES}`, ["discipline", "isaias", ["now", "now if the substances"], ["likeness", "art likeness is according"]]),
      damascene("\nPART II.\n", "\nPART III.[20]\n", "Part II", `St. John of Damascus, On Holy Images, Part II, ${ALLIES}`, ["footsteps", "jerusalem"]),
      damascene("\nPART III.[20]\n", "\nSERMON I.\n", "Part III", `St. John of Damascus, On Holy Images, Part III, ${ALLIES}`, ["windingsheets", "honouring", "3rd", "jerome", ["repentance", "sinners to repentance help"], "patari"]),
    ],
  },
  {
    saint: "john-of-damascus",
    slug: "sermons-on-the-dormition",
    title: "Three Sermons on the Dormition",
    subtitle: "On the falling asleep of the Mother of God",
    source: DAMASCENE("Three Sermons on the Assumption (Koimesis)", "The three sermons, whole; the 1898 English calls the feast the Assumption, and the Church keeps it as the Dormition."),
    originalLanguage: "grc",
    passages: [
      damascene("\nSERMON I.\n", "\nSERMON II.\n", "Sermon I", `St. John of Damascus, Sermon I on the Dormition, ${ALLIES}`, ["marvellous", "dwellingplace"]),
      damascene("\nSERMON II.\n", "\nSERMON III.\n", "Sermon II", `St. John of Damascus, Sermon II on the Dormition, ${ALLIES}`, ["willest", "motherhood", "blessings"]),
      damascene("\nSERMON III.\n", "\nINDEX\n", "Sermon III", `St. John of Damascus, Sermon III on the Dormition, ${ALLIES}`, ["soulsustaining"]),
    ],
  },
];
