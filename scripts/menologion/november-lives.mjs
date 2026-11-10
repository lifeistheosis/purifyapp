// November's Lives in the witnesses' own words (docs/1.9-build/notes/november-saints.md).
//
// Read by scripts/ingest-witness-lives.mjs. Each Life is one work of the
// saint's: its sections are the passages below, in order, each the witness's
// words as the printed edition gives them, under its book and place. No prose
// of ours: a section's title names the place in the book, the reader names the
// witness (`author`), and the citation names the edition.
//
// A passage is cut from CCEL's transcription of the printed volume (`vol`)
// between `from` (a string unique in the volume) and the next rule, or `to`;
// `heading` drops the edition's chapter title; `paras`, `startAt` and
// `endAfter` keep only the witness's words about this saint where a chapter
// runs on to other men. `scans` are archive.org's texts of the same printing,
// which every word is compared with. Scripture is the app's own Bible.

/** archive.org scans of each printed volume (two printings where there are two). */
const SCAN = {
  npnf201: ["selectlibraryofn01scha"],
  npnf202: ["selectlibraryofn02schauoft", "cu31924087124909"],
  npnf203: ["selectlibraryofn03scha", "selectlibraryofn03schauoft"],
  npnf204: ["selectlibraryofn04schauoft", "selectlibraryofn04scha"],
  npnf208: ["selectlibraryofn08scha", "selectlibraryofn08schauoft"],
  anf01: ["antenicenefather01robe", "antenicenefather01buff"],
  anf06: ["antenicenefather06robeuoft", "antenicenefather06buff"],
  anf08: ["antenicenefather08robe", "antenicenefather08robeuoft"],
  novgorod: ["chronicleofnovgo00michrich"],
  mouravieff: ["historyofchurcho00mouriala"],
};

const ED = {
  eusebius: "tr. Arthur Cushman McGiffert (NPNF II 1, 1890)",
  socrates: "tr. A. C. Zenos (NPNF II 2, 1890)",
  sozomen: "tr. Chester D. Hartranft (NPNF II 2, 1890)",
  theodoret: "tr. Blomfield Jackson (NPNF II 3, 1892)",
  jerome: "tr. Ernest Cushing Richardson (NPNF II 3, 1892)",
  athanasius: "tr. Archibald Robertson (NPNF II 4, 1892)",
  basil: "tr. Blomfield Jackson (NPNF II 8, 1895)",
  irenaeus: "tr. Alexander Roberts and W. H. Rambaut (ANF 1, 1885)",
  anf6: "(ANF 6, 1886)",
  anf8: "tr. B. P. Pratten (ANF 8, 1886)",
  kjv: "King James Version",
  brenton: "Brenton's Septuagint (1851)",
  novgorod: "tr. Robert Michell and Nevill Forbes (The Chronicle of Novgorod, 1016-1471, Camden Third Series 25, London, 1914)",
  mouravieff: "tr. R. W. Blackmore (A. N. Mouravieff, A History of the Church of Russia, Oxford, 1842)",
};

/** The words every source line ends with, saying how the text was read. */
const READ =
  "CCEL's transcription of each volume read word for word against archive.org's scans of the same printing; where they differ, the printed page is followed. The editions' footnotes, page numbers and running heads, and their marks in the text, are left out; the paragraphs and the numbers at their heads are as printed. The section titles name the place in each book.";
const SCRIPTURE_READ = "Scripture is the King James Version, as the app's Bible carries it, word for word.";

const e = (vol, from, more) => ({ vol, from, scans: SCAN[vol], ...more });

/**
 * A passage with no clean transcription anywhere: written here from the
 * printed page, word for word and line by line, its footnote marks and the
 * hyphens that broke a word at a line's end left out, and its italics plain.
 * The ingest compares it with the scan's text like any other.
 */
const typed = (book, text, more) => ({ kind: "transcribed", text, scans: SCAN[book], ...more });

/** How a typed passage was read, for its Life's source line. */
const READ_TYPED =
  "Typed from the page images of archive.org's scan of the printing, read line by line, and compared word for word with the scan's text. The editions' footnotes and their marks are left out, and italics are set plain; the paragraphs are as printed. The section titles name the place in each book.";

export const LIVES = [
  {
    saint: "acepsimas-joseph-and-aithalas",
    slug: "life-of-acepsimas",
    title: "The Martyrdom of Sts. Acepsimas and Aithalas",
    subtitle: "As Sozomen tells it",
    originalLanguage: "grc",
    source: `Sozomen, Ecclesiastical History II.13, ${ED.sozomen}, public domain. ${READ} Sozomen names Acepsimas and Aithalas; the third of the Church's commemoration, Joseph, is named in the Syriac acts of their martyrdom, which have no public-domain English.`,
    passages: [
      e("npnf202", "Chapter XIII.--Martyrdom of St. Acepsimas and of his Companions.", {
        heading: 1,
        endAfter: "convey food to his mouth.",
        title: "Ecclesiastical History II.13",
        author: "Sozomen",
        citation: `Sozomen, Ecclesiastical History II.13, ${ED.sozomen}`,
      }),
    ],
  },
  {
    saint: "patrobas-hermas-linus-gaius-and-philologus",
    slug: "their-names-in-scripture",
    title: "Their Names in Scripture",
    subtitle: "Where St. Paul names them, and St. Irenaeus and Eusebius on Linus",
    originalLanguage: "grc",
    source: `${SCRIPTURE_READ} St. Irenaeus, Against Heresies III.3.3, ${ED.irenaeus}, and Eusebius, Church History III.2, ${ED.eusebius}, public domain. ${READ}`,
    passages: [
      { kind: "scripture", book: "romans", chapter: 16, from: 14, to: 15, title: "Romans 16:14-15", citation: "Romans 16:14-15 (King James Version)" },
      { kind: "scripture", book: "romans", chapter: 16, from: 23, title: "Romans 16:23", citation: "Romans 16:23 (King James Version)", minWords: 10 },
      { kind: "scripture", book: "2-timothy", chapter: 4, from: 21, title: "2 Timothy 4:21", citation: "2 Timothy 4:21 (King James Version)", minWords: 10 },
      e("anf01", "3. The blessed apostles, then, having founded and built up the Church,", {
        to: "4. But Polycarp also was not only instructed",
        paras: [0, 0],
        endAfter: "in the Epistles to Timothy.",
        title: "Against Heresies III.3.3",
        author: "Irenaeus of Lyons",
        citation: `St. Irenaeus, Against Heresies III.3.3, ${ED.irenaeus}`,
        minWords: 10,
      }),
      e("npnf201", "1. After the martyrdom of Paul and of Peter, Linus", {
        title: "Church History III.2",
        author: "Eusebius of Caesarea",
        citation: `Eusebius, Church History III.2, ${ED.eusebius}`,
      }),
    ],
  },
  {
    saint: "paul-the-confessor",
    slug: "life-of-paul-the-confessor",
    title: "The Life of St. Paul the Confessor",
    subtitle: "From Socrates and St. Athanasius",
    originalLanguage: "grc",
    source: `Socrates Scholasticus, Ecclesiastical History II.6, 7, 12, 13, 16, 22 and 26, ${ED.socrates}, and St. Athanasius, History of the Arians 7, ${ED.athanasius}, public domain. ${READ} Where a chapter goes on to other men, only its words of Paul are kept.`,
    passages: [
      e("npnf202", "Chapter VI.--Alexander, Bishop of Constantinople", { heading: 1, title: "Ecclesiastical History II.6", author: "Socrates Scholasticus", citation: `Socrates, Ecclesiastical History II.6, ${ED.socrates}` }),
      e("npnf202", "Chapter VII.--The Emperor Constantius ejects Paul", { heading: 1, title: "Ecclesiastical History II.7", author: "Socrates Scholasticus", citation: `Socrates, Ecclesiastical History II.7, ${ED.socrates}` }),
      e("npnf202", "Chapter XII.--The People of Constantinople restore Paul", { heading: 1, title: "Ecclesiastical History II.12", author: "Socrates Scholasticus", citation: `Socrates, Ecclesiastical History II.12, ${ED.socrates}` }),
      e("npnf202", "Chapter XIII.--Paul is again ejected", { heading: 1, title: "Ecclesiastical History II.13", author: "Socrates Scholasticus", citation: `Socrates, Ecclesiastical History II.13, ${ED.socrates}` }),
      e("npnf202", "Chapter XVI.--The Emperor Constantius, through an Order to Philip", {
        heading: 1,
        endAfter: "and again hurried off into exile.",
        title: "Ecclesiastical History II.16",
        author: "Socrates Scholasticus",
        citation: `Socrates, Ecclesiastical History II.16, ${ED.socrates}`,
      }),
      e("npnf202", "Chapter XXII.--The Council of Sardica restores Paul", { heading: 1, title: "Ecclesiastical History II.22", author: "Socrates Scholasticus", citation: `Socrates, Ecclesiastical History II.22, ${ED.socrates}` }),
      e("npnf202", "Chapter XXVI.--After the Death of Constans", {
        heading: 1,
        startAt: "And first of all he ordered that Paul",
        endAfter: "at Cucusus in Cappadocia.",
        title: "Ecclesiastical History II.26",
        author: "Socrates Scholasticus",
        citation: `Socrates, Ecclesiastical History II.26, ${ED.socrates}`,
        minWords: 10,
      }),
      e("npnf204", "7. Martyrdom of Paul of Constantinople.", { heading: 1, title: "History of the Arians 7", author: "Athanasius of Alexandria", citation: `St. Athanasius, History of the Arians 7, ${ED.athanasius}` }),
    ],
  },
  {
    saint: "gurias-samonas-and-habib",
    slug: "acts-of-gurias-samonas-and-habib",
    title: "The Martyrdom of Sts. Gurias, Samonas and Habib",
    subtitle: "The Acts of the confessors of Edessa",
    originalLanguage: "syr",
    source: `The Martyrdom of the Holy Confessors Shamuna, Guria, and Habib, from Simeon Metaphrastes, and the Martyrdom of Habib the Deacon, from the Syriac, in the public-domain English of the Rev. B. P. Pratten (Ante-Nicene Fathers, Vol. 8, ed. A. Cleveland Coxe, 1886). ${READ} The Acts spell the names Shamuna, Guria and Habib. The 1886 page prints "whom thou has not worshipped" in the Martyrdom of Habib; it is kept as printed.`,
    passages: [
      e("anf08", "Martyrdom [3274] of the Holy Confessors Shamuna, Guria, and Habib, from", {
        heading: 1,
        // The scans' misreadings, each read on the page (antenicenefather08robeuoft n711): "1oth", "tune", "15 th".
        ocr: ["10th", "time", "15th"],
        title: "The Martyrdom of Shamuna, Guria and Habib",
        author: "Simeon Metaphrastes",
        citation: `The Martyrdom of the Holy Confessors Shamuna, Guria, and Habib, from Simeon Metaphrastes, ${ED.anf8}`,
      }),
      e("anf08", "Martyrdom of Habib the Deacon. [3235]", {
        heading: 1,
        // Read off the printed page (antenicenefather08robeuoft, n704 to n708). "has" is the page's own slip, kept.
        fix: [
          ["thus he spoke: This fellow", "thus he spake: This fellow"],
          ["shoulder blades", "shoulderblades"],
          ["whom thou hast not worshipped", "whom thou has not worshipped"],
          ["grief over spreading", "grief overspreading"],
        ],
        // The scans' misreadings, read on the page (n703, n704, n705, n706): a footnote mark, two words broken at a line, an italic I.
        ocr: ["Constantine", "inquiring", "settled", "I"],
        title: "The Martyrdom of Habib the Deacon",
        author: "The Acts of Habib",
        citation: `The Martyrdom of Habib the Deacon, ${ED.anf8}`,
      }),
    ],
  },
  {
    saint: "gregory-the-wonderworker",
    slug: "life-of-gregory-the-wonderworker",
    title: "The Life of St. Gregory Thaumaturgus",
    subtitle: "From Eusebius, St. Jerome and St. Basil",
    originalLanguage: "grc",
    source: `Eusebius, Church History VI.30, VII.14 and VII.28.1, ${ED.eusebius}; St. Jerome, Lives of Illustrious Men 65, ${ED.jerome}; St. Basil, On the Holy Spirit 74, ${ED.basil}; public domain. ${READ}`,
    passages: [
      e("npnf201", "Chapter XXX.--The Pupils of Origen.", { heading: 1, title: "Church History VI.30", author: "Eusebius of Caesarea", citation: `Eusebius, Church History VI.30, ${ED.eusebius}` }),
      e("npnf201", "Chapter XIV.--The Bishops that flourished at that Time.", { heading: 1, title: "Church History VII.14", author: "Eusebius of Caesarea", citation: `Eusebius, Church History VII.14, ${ED.eusebius}` }),
      e("npnf201", "Chapter XXVIII.--The Illustrious Bishops of that Time.", { heading: 1, paras: [0, 0], title: "Church History VII.28.1", author: "Eusebius of Caesarea", citation: `Eusebius, Church History VII.28.1, ${ED.eusebius}` }),
      e("npnf203", "Theodorus, [2479] afterwards called Gregory, bishop of Neocæsarea", { title: "Lives of Illustrious Men 65", author: "Jerome", citation: `St. Jerome, Lives of Illustrious Men 65, ${ED.jerome}` }),
      e("npnf208", "74.  But where shall I rank the great Gregory", { paras: [0, 0], title: "On the Holy Spirit 74", author: "Basil the Great", citation: `St. Basil the Great, On the Holy Spirit 74, ${ED.basil}` }),
    ],
  },
  {
    saint: "plato-and-romanus",
    slug: "martyrdom-of-romanus",
    title: "The Martyrdom of St. Romanus",
    subtitle: "As Eusebius tells it",
    originalLanguage: "grc",
    source: `Eusebius, The Martyrs of Palestine 2, ${ED.eusebius}, public domain. ${READ} St. Plato of Ancyra, who shares the day, has no public-domain account.`,
    passages: [
      e("npnf201", "1. What occurred to Romanus on the same day", { title: "The Martyrs of Palestine 2", author: "Eusebius of Caesarea", citation: `Eusebius, The Martyrs of Palestine 2, ${ED.eusebius}` }),
    ],
  },
  {
    saint: "zacchaeus-and-alphaeus",
    slug: "martyrdom-of-zacchaeus-and-alphaeus",
    title: "The Martyrdom of Sts. Zacchaeus and Alphaeus",
    subtitle: "As Eusebius tells it",
    originalLanguage: "grc",
    source: `Eusebius, The Martyrs of Palestine 1.3-5, ${ED.eusebius}, public domain. ${READ}`,
    passages: [
      e("npnf201", "3. Afterwards, [2622] in the same city, many rulers of the country", { title: "The Martyrs of Palestine 1.3-5", author: "Eusebius of Caesarea", citation: `Eusebius, The Martyrs of Palestine 1.3-5, ${ED.eusebius}` }),
    ],
  },
  {
    saint: "proclus-of-constantinople",
    slug: "life-of-proclus",
    title: "The Life of St. Proclus",
    subtitle: "As Socrates tells it",
    originalLanguage: "grc",
    source: `Socrates Scholasticus, Ecclesiastical History VII.28, 40, 41 and 45, ${ED.socrates}, public domain. ${READ}`,
    passages: [
      e("npnf202", "Chapter XXVIII.--Proclus ordained", { heading: 1, title: "Ecclesiastical History VII.28", author: "Socrates Scholasticus", citation: `Socrates, Ecclesiastical History VII.28, ${ED.socrates}` }),
      e("npnf202", "Chapter XL.--Proclus succeeds", { heading: 1, title: "Ecclesiastical History VII.40", author: "Socrates Scholasticus", citation: `Socrates, Ecclesiastical History VII.40, ${ED.socrates}` }),
      e("npnf202", "Chapter XLI.--Excellent Qualities of Proclus", { heading: 1, title: "Ecclesiastical History VII.41", author: "Socrates Scholasticus", citation: `Socrates, Ecclesiastical History VII.41, ${ED.socrates}` }),
      e("npnf202", "Chapter XLV.--The Body of John Chrysostom transferred", { heading: 1, ocr: ["Theophilus"], title: "Ecclesiastical History VII.45", author: "Socrates Scholasticus", citation: `Socrates, Ecclesiastical History VII.45, ${ED.socrates}` }),
    ],
  },
  {
    saint: "amphilochius-of-iconium",
    slug: "life-of-amphilochius",
    title: "The Life of Amphilochius",
    subtitle: "From Theodoret and St. Jerome",
    originalLanguage: "grc",
    source: `Theodoret, Ecclesiastical History V.16, ${ED.theodoret}, and St. Jerome, Lives of Illustrious Men 133, ${ED.jerome}, public domain. ${READ}`,
    passages: [
      e("npnf203", "Chapter XVI.--Of Amphilochius, bishop of Iconium.", { heading: 1, title: "Ecclesiastical History V.16", author: "Theodoret of Cyrrhus", citation: `Theodoret, Ecclesiastical History V.16, ${ED.theodoret}` }),
      e("npnf203", "Amphilochius, [2566] bishop of Iconium, recently read to me", { title: "Lives of Illustrious Men 133", author: "Jerome", citation: `St. Jerome, Lives of Illustrious Men 133, ${ED.jerome}`, minWords: 10 }),
    ],
  },
  {
    saint: "clement-of-rome",
    slug: "life-of-clement",
    title: "The Life of St. Clement of Rome",
    subtitle: "From St. Irenaeus, Eusebius and St. Jerome",
    originalLanguage: "grc",
    source: `St. Irenaeus, Against Heresies III.3.3, ${ED.irenaeus}; Eusebius, Church History III.4.10, III.15, III.16, III.34 and III.38.1, ${ED.eusebius}; St. Jerome, Lives of Illustrious Men 15, ${ED.jerome}; public domain. ${READ} The 1885 page of Irenaeus prints "Telephorus" for Telesphorus; it is kept as printed.`,
    passages: [
      e("anf01", "3. The blessed apostles, then, having founded and built up the Church,", { to: "4. But Polycarp also was not only instructed", paras: [0, 0], fix: [["after him, Telesphorus,", "after him, Telephorus,"]], title: "Against Heresies III.3.3", author: "Irenaeus of Lyons", citation: `St. Irenaeus, Against Heresies III.3.3, ${ED.irenaeus}` }),
      e("npnf201", "10. Clement also, who was appointed third bishop of the church at Rome,", { paras: [0, 0], title: "Church History III.4.10", author: "Eusebius of Caesarea", citation: `Eusebius, Church History III.4.10, ${ED.eusebius}` }),
      e("npnf201", "Chapter XV.--Clement, the Third Bishop of Rome.", { heading: 1, title: "Church History III.15", author: "Eusebius of Caesarea", citation: `Eusebius, Church History III.15, ${ED.eusebius}` }),
      e("npnf201", "Chapter XVI.--The Epistle of Clement.", { heading: 1, title: "Church History III.16", author: "Eusebius of Caesarea", citation: `Eusebius, Church History III.16, ${ED.eusebius}` }),
      e("npnf201", "Chapter XXXIV.--Evarestus, the Fourth Bishop of the Church of Rome.", { heading: 1, title: "Church History III.34", author: "Eusebius of Caesarea", citation: `Eusebius, Church History III.34, ${ED.eusebius}`, minWords: 10 }),
      e("npnf201", "Chapter XXXVIII.--The Epistle of Clement and the Writings falsely", { heading: 1, paras: [0, 0], title: "Church History III.38.1", author: "Eusebius of Caesarea", citation: `Eusebius, Church History III.38.1, ${ED.eusebius}` }),
      e("npnf203", "Clement, [2401] of whom the apostle Paul writing to the Philippians", { title: "Lives of Illustrious Men 15", author: "Jerome", citation: `St. Jerome, Lives of Illustrious Men 15, ${ED.jerome}` }),
    ],
  },
  {
    saint: "peter-of-alexandria",
    slug: "life-of-peter-of-alexandria",
    title: "The Life of St. Peter of Alexandria",
    subtitle: "Eusebius, and the Genuine Acts of his martyrdom",
    originalLanguage: "grc",
    source: `Eusebius, Church History VII.32.31, VIII.13.7 and IX.6.2, ${ED.eusebius}; The Genuine Acts of Peter, tr. James B. H. Hawkins, in the public-domain English of the Ante-Nicene Fathers, Vol. 6, ed. A. Cleveland Coxe (1886). ${READ}`,
    passages: [
      e("npnf201", "31. After Theonas had held the office for nineteen years, Peter", { to: "32. Having written out in these books", title: "Church History VII.32.31", author: "Eusebius of Caesarea", citation: `Eusebius, Church History VII.32.31, ${ED.eusebius}` }),
      e("npnf201", "7. The virtue of his manly deeds we have recorded in the proper place.", {
        paras: [0, 0],
        startAt: "Of those who suffered death illustriously",
        title: "Church History VIII.13.7",
        author: "Eusebius of Caesarea",
        citation: `Eusebius, Church History VIII.13.7, ${ED.eusebius}`,
      }),
      e("npnf201", "2. At about the same time Peter [2736] also, who presided most", { to: "3. And Lucian, [2737] a presbyter", title: "Church History IX.6.2", author: "Eusebius of Caesarea", citation: `Eusebius, Church History IX.6.2, ${ED.eusebius}` }),
      e("anf06", "The Genuine Acts of Peter. [2241]", {
        heading: 1,
        // CCEL's slips, each read off the printed page (antenicenefather06robeuoft, n274 to n278).
        fix: [
          ["treachery of Arias", "treachery of Arius"],
          ["in another clement", "in another element"],
          ["as I have begin to say", "as I have begun to say"],
          ["after their readiness", "after their madness"],
          ["have under taken to fill", "have undertaken to fill"],
        ],
        // The scans' misreadings, each read on the page (n274 to n281): words broken at a line or a page, footnote marks, "thmgs", "flammg".
        ocr: ["animal", "things", "pontiff", "reference", "engaged", "mass", "flaming", "treachery"],
        title: "The Genuine Acts of Peter",
        author: "The Acts of Peter",
        citation: `The Genuine Acts of Peter, tr. James B. H. Hawkins ${ED.anf6}`,
      }),
    ],
  },
  {
    saint: "frumentius-of-axum",
    slug: "life-of-frumentius",
    title: "The Life of St. Frumentius",
    subtitle: "From Socrates and St. Athanasius",
    originalLanguage: "grc",
    source: `Socrates Scholasticus, Ecclesiastical History I.19, ${ED.socrates}, and St. Athanasius, Apology to the Emperor Constantius 29, ${ED.athanasius}, public domain. ${READ} Sozomen (II.24) and Theodoret (I.22) tell the same story after Rufinus.`,
    passages: [
      e("npnf202", "Chapter XIX. [220] --In what Manner the Nations in the Interior of", { heading: 1, ocr: ["permission"], title: "Ecclesiastical History I.19", author: "Socrates Scholasticus", citation: `Socrates, Ecclesiastical History I.19, ${ED.socrates}` }),
      e("npnf204", "29. Athanasius has heard of his own proscription.", {
        heading: 1,
        startAt: "While I thus reasoned and hastened on my journey",
        endAfter: "should be put to death.",
        title: "Apology to Constantius 29",
        author: "Athanasius of Alexandria",
        citation: `St. Athanasius, Apology to the Emperor Constantius 29, ${ED.athanasius}`,
      }),
    ],
  },
  {
    saint: "erastus-olympas-rodion-sosipater-quartus-and-tertius",
    slug: "their-names-in-scripture",
    title: "Their Names in Scripture",
    subtitle: "Where the Acts and St. Paul name them",
    originalLanguage: "grc",
    source: `${SCRIPTURE_READ} Rodion is the Herodion of Romans 16:11.`,
    passages: [
      { kind: "scripture", book: "acts", chapter: 19, from: 22, title: "Acts 19:22", citation: "Acts 19:22 (King James Version)", minWords: 10 },
      { kind: "scripture", book: "romans", chapter: 16, from: 11, title: "Romans 16:11", citation: "Romans 16:11 (King James Version)", minWords: 10 },
      { kind: "scripture", book: "romans", chapter: 16, from: 15, title: "Romans 16:15", citation: "Romans 16:15 (King James Version)", minWords: 10 },
      { kind: "scripture", book: "romans", chapter: 16, from: 21, to: 23, title: "Romans 16:21-23", citation: "Romans 16:21-23 (King James Version)" },
      { kind: "scripture", book: "2-timothy", chapter: 4, from: 20, title: "2 Timothy 4:20", citation: "2 Timothy 4:20 (King James Version)", minWords: 10 },
    ],
  },
  {
    saint: "onesiphorus-and-porphyrius",
    slug: "onesiphorus-in-scripture",
    title: "St. Onesiphorus in Scripture",
    subtitle: "Where St. Paul writes of him",
    originalLanguage: "grc",
    source: `${SCRIPTURE_READ} St. Porphyrius, who shares the day, has no public-domain account.`,
    passages: [
      { kind: "scripture", book: "2-timothy", chapter: 1, from: 16, to: 18, title: "2 Timothy 1:16-18", citation: "2 Timothy 1:16-18 (King James Version)" },
      { kind: "scripture", book: "2-timothy", chapter: 4, from: 19, title: "2 Timothy 4:19", citation: "2 Timothy 4:19 (King James Version)", minWords: 8 },
    ],
  },
  {
    saint: "philemon-and-apphia",
    slug: "the-epistle-to-philemon",
    title: "The Epistle to Philemon",
    subtitle: "St. Paul's letter to Philemon, Apphia and Archippus",
    originalLanguage: "grc",
    source: `${SCRIPTURE_READ} The Epistle to Philemon whole, and Colossians 4:9 and 17, where St. Paul names Onesimus and Archippus again.`,
    passages: [
      { kind: "scripture", book: "philemon", chapter: 1, from: 1, to: 25, title: "Philemon 1-25", citation: "The Epistle to Philemon (King James Version)" },
      { kind: "scripture", book: "colossians", chapter: 4, from: 9, title: "Colossians 4:9", citation: "Colossians 4:9 (King James Version)", minWords: 10 },
      { kind: "scripture", book: "colossians", chapter: 4, from: 17, title: "Colossians 4:17", citation: "Colossians 4:17 (King James Version)", minWords: 10 },
    ],
  },
  {
    saint: "prophet-obadiah",
    slug: "the-vision-of-obadiah",
    title: "The Vision of Obadiah",
    subtitle: "His prophecy, whole",
    originalLanguage: "grc",
    source: "The Book of Obadiah (Obdias), whole, in Brenton's English Septuagint (1851, public domain), as the app's Bible carries it, word for word.",
    passages: [
      { kind: "scripture", book: "obadiah", chapter: 1, from: 1, to: 21, title: "Obadiah 1-21", citation: "Obadiah 1-21 (Brenton's Septuagint, 1851)" },
    ],
  },
  {
    saint: "varlaam-of-khutyn",
    slug: "life-of-varlaam",
    title: "St. Varlaam in the Chronicle of Novgorod",
    subtitle: "The founding of Khutyn, 1192",
    originalLanguage: "orv",
    source: `The Chronicle of Novgorod, A.D. 1192, p. 35, ${ED.novgorod}, public domain. ${READ_TYPED} The Chronicle spells his name Varlam and the place Khutin.`,
    passages: [
      typed("novgorod", [
        "The same year the monk Varlam, whose secular name was Aleksa Mikhalevits, put up a church below at Khutin in the name of the Transfiguration of the Holy Saviour; and Vladyka Gavrilo consecrated it on the [day of that] festival, and named the monastery.",
      ], { title: "The Chronicle of Novgorod, 1192", author: "The Chronicle of Novgorod", citation: `The Chronicle of Novgorod, A.D. 1192, p. 35, ${ED.novgorod}` }),
    ],
  },
  {
    saint: "alexander-nevsky",
    slug: "life-of-alexander-nevsky",
    title: "St. Alexander Nevsky in the Chronicle of Novgorod",
    subtitle: "The Neva, the ice, and his last day, with Mouravieff",
    originalLanguage: "orv",
    source: `The Chronicle of Novgorod, A.D. 1240, 1242 and 1263, pp. 84-87 and 98, ${ED.novgorod}; A. N. Mouravieff, A History of the Church of Russia, ch. IV, pp. 46-48, ${ED.mouravieff}; public domain. ${READ_TYPED} The Chronicle calls him Knyaz (prince) Olexander or Alexander; the Svei are the Swedes and the Nemtsy the Germans, as its translators' notes say. The copy scanned for the Chronicle has a reader's pen marks on p. 86; the printed words are followed.`,
    passages: [
      typed("novgorod", [
        "A.D. 1240. A.M. 6748. The Svei came in great strength with the Murman, Sum, and Yem people in very many ships. The Svei came with their Knyaz and with their bishops, and halted in the Neva at the mouth of the Izhera, wishing to take possession of Ladoga, or in one word, of Novgorod, and of the whole Novgorod province. But again the most kind and merciful God, lover of men, preserved and protected us from the foreigners since they laboured in vain without the command of God. For the news came to Novgorod that the Svei were going towards Ladoga, and Knyaz Olexander with the men of Novgorod and of Ladoga did not delay at all; he went against them and defeated them by the power of St. Sophia and the prayers of our Sovereign Lady the Holy Mother of God and eternally Virgin Mary on the 15th day of July, the Commemoration Day of Saints Kyurik and Ulita, and the Day of the Veche of the 630 Holy Fathers of Khalkidon. And there was a great slaughter of Svei. Their Voyevoda, by name Spiridon, was killed, and some thought that their bishop was also killed there; and a very great number of them fell. And having loaded two vessels with their best men got away first to sea; and the rest of them having dug a pit they threw into it without number; and many others were wounded; and the same night without waiting for the light of Monday they went away in shame. And of the men of Novgorod and Ladoga there fell there Kostyantin Lugotinits, Gyuryata Pineshchinich, Namest, Drochilo son of Nezdilo the tanner, twenty men in all with the men of Ladoga, or less, God knows. And Knyaz Alexander with the men of Novgorod and of Ladoga all came back in health to their own country, preserved by God and St. Sophia, and through the prayers of all the saints.",
      ], { title: "The Chronicle of Novgorod, 1240", author: "The Chronicle of Novgorod", citation: `The Chronicle of Novgorod, A.D. 1240, pp. 84-85, ${ED.novgorod}` }),
      typed("novgorod", [
        "A.D. 1242. A.M. 6750. Knyaz Olexander with the men of Novgorod and with his brother Andrei and the men of the Lower country went [in the winter in great strength against the land of the Chud people, against the Nemtsy, that they might not boast, saying: \u201cWe will humble the Sloven race under us,\u201d for Pskov was already taken, and its Tiuns in prison]. And Knyaz Olexander occupied all the roads right up to Pleskov; and he cleared Pleskov, seized the Nemtsy and Chud men, and having bound them in chains, sent them to be imprisoned in Novgorod, and himself went against the Chud people. And when they came to their land, he let loose his whole force to provide for themselves. And Domash Tverdislavich and Kerbet were scouring [the country] and the Nemtsy and Chud men met them by a bridge; and they fought there, and there they killed Domash, brother of the Posadnik, an honest man, and others with him, and others again they took with their hands, and others escaped to the troops of the Knyaz. And the Knyaz turned back to the lake and the Nemtsy and Chud men went after them. Seeing this, Knyaz Olexander and all the men of Novgorod drew up their forces by Lake Chud at Uzmen by the Raven's rock; and the Nemtsy and Chud men rode at them driving themselves like a wedge through their army; and there was a great slaughter of Nemtsy and Chud men. And God and St. Sophia and the Holy Martyrs Boris and Gleb, for whose sake the men of Novgorod shed their blood, by the great prayers of those Saints, God helped Knyaz Alexander. And the Nemtsy fell there and the Chud men gave shoulder, and pursuing them fought with them on the ice, seven versts short of the Subol shore. And there fell of the Chud men a countless number; and of the Nemtsy 400, and fifty they took with their hands and brought to Novgorod. And they fought on April 5, on a Saturday, the Commemoration Day of the Holy Martyr Feodul, to the glory of the Holy Mother of God.",
      ], { title: "The Chronicle of Novgorod, 1242", author: "The Chronicle of Novgorod", citation: `The Chronicle of Novgorod, A.D. 1242, pp. 86-87, ${ED.novgorod}` }),
      typed("novgorod", [
        "A.D. 1263. A.M. 6771. Knyaz Olexander came back from the Tartars in very bad health, in the autumn; and he came to Gorodets [monastery] and was shorn on November 14, the day of the holy Apostle Philip; and he died the same night and they took him to Volodimir and laid him in the monastery of the Nativity by the Church of the Holy Mother of God. And the Bishops and Igumens having come together with the Metropolitan Kyuril and all the hierarchy and monks and with all the people of Suzdal, they buried him honourably on the 23rd of the same month, Friday, the Day of St. Amfilokhi. Grant him, O merciful Lord, to see Thy face in the future age, for he laboured for Novgorod and for all the Russian land.",
      ], { title: "The Chronicle of Novgorod, 1263", author: "The Chronicle of Novgorod", citation: `The Chronicle of Novgorod, A.D. 1263, p. 98, ${ED.novgorod}` }),
      typed("mouravieff", [
        "The papal legates visited also the court of Alexander, and addressed him with flattering speeches; but the saint of the Neva refused decidedly either to receive their letters or listen to their solicitations.",
      ], { title: "A History of the Church of Russia, p. 46", author: "A. N. Mouravieff", citation: `A. N. Mouravieff, A History of the Church of Russia, ch. IV, p. 46, ${ED.mouravieff}`, minWords: 10 }),
      typed("mouravieff", [
        "Upon the blessed decease of St. Alexander, who at the hour of death exchanged his princely mantle for the humble monastic Schema, the Metropolitan Cyrill, amidst the lamentations of all his country, went out in procession to meet the incorrupt remains of their beloved prince, now brought back dead from the Horde to that same capital, where he had before so joyfully received him.",
      ], { title: "A History of the Church of Russia, pp. 47-48", author: "A. N. Mouravieff", citation: `A. N. Mouravieff, A History of the Church of Russia, ch. IV, pp. 47-48, ${ED.mouravieff}` }),
    ],
  },
  {
    saint: "michael-of-tver",
    slug: "life-of-michael-of-tver",
    title: "The Martyrdom of St. Michael of Tver",
    subtitle: "In the Chronicle of Novgorod and in Mouravieff",
    originalLanguage: "orv",
    source: `The Chronicle of Novgorod, A.D. 1319, p. 121, ${ED.novgorod}, and A. N. Mouravieff, A History of the Church of Russia, ch. IV, p. 51, ${ED.mouravieff}; public domain. ${READ_TYPED} The Chronicle of Novgorod enters his death under the year 1319 and calls him Knyaz Mikhail; Yuri (Mouravieff's Yury and George) is Yuri of Moscow.`,
    passages: [
      typed("novgorod", [
        "A.D. 1319. A.M. 6827. The Tsar killed Knyaz Mikhail of Tver in the Horde and gave the title of Veliki Knyaz to Yuri, and gave over to him Mikhail's son Kostyantin and his Boyars.",
      ], { title: "The Chronicle of Novgorod, 1319", author: "The Chronicle of Novgorod", citation: `The Chronicle of Novgorod, A.D. 1319, p. 121, ${ED.novgorod}` }),
      typed("mouravieff", [
        "First, Michael himself, by the intrigues of Yury, suffered the death of a martyr, and was added by the Church to the number of the saints; then his son Demetrius fell, after having himself struck down Yury, the murderer of his father, in the very presence of the khan Usbek; and lastly, another son of Michael, Alexander, with his boy Theodore, was executed by order of the same khan, for having dared to put to death at Tver, Shefkal, one of his nobles, and the Tartars, who were endeavouring to introduce Mahometanism.",
      ], { title: "A History of the Church of Russia, p. 51", author: "A. N. Mouravieff", citation: `A. N. Mouravieff, A History of the Church of Russia, ch. IV, p. 51, ${ED.mouravieff}` }),
    ],
  },
  {
    saint: "innocent-of-irkutsk",
    slug: "life-of-innocent-of-irkutsk",
    title: "St. Innocent of Irkutsk in Mouravieff",
    subtitle: "The first bishop of Irkutsk",
    originalLanguage: "ru",
    source: `A. N. Mouravieff, A History of the Church of Russia, ch. XVI, pp. 280-281, ${ED.mouravieff}, public domain. ${READ_TYPED} Mouravieff calls him Innocentius Koulchinsky. The 1842 page prints "dictricts"; it is kept as printed.`,
    passages: [
      typed("mouravieff", [
        "By degrees the true faith shed its light also on the Southern dictricts, and the parts about the distant Irkutsk, where there were by this time a good number of Christians, manifested their desire to have a bishop. Innocentius Koulchinsky, who had been appointed head of the spiritual mission to Pekin, was consecrated the first bishop of Irkutsk, and laid there a good foundation for the Church, being celebrated for the holiness of his character during life, and for the discovery of his relics uncorrupted after death.",
      ], { title: "A History of the Church of Russia, pp. 280-281", author: "A. N. Mouravieff", citation: `A. N. Mouravieff, A History of the Church of Russia, ch. XVI, pp. 280-281, ${ED.mouravieff}` }),
    ],
  },
];
