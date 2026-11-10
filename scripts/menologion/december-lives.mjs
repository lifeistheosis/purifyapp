// December's Lives in the witnesses' own words (docs/1.9-build/notes/december-saints.md).
//
// Read by scripts/ingest-witness-lives.mjs, as November's are
// (scripts/menologion/november-lives.mjs): each Life is one work of the
// saint's, its sections the passages below, in order, each the witness's
// words as the printed edition gives them, under its book and place. No prose
// of ours: a section's title names the place in the book, the reader names the
// witness (`author`), and the citation names the edition. The five prophets'
// books are their own words, as St Obadiah's was in November.

/** archive.org scans of each printed volume (two printings where there are two). */
const SCAN = {
  npnf201: ["selectlibraryofn01scha"],
  npnf202: ["selectlibraryofn02schauoft", "cu31924087124909"],
  npnf203: ["selectlibraryofn03scha", "selectlibraryofn03schauoft"],
  // Pusey's Confessions, the 1909 printings (the Harvard Classics' among them).
  pusey: ["confessionofstau0007unse", "confessionsofsta1909augu"],
  // Lowther Clarke's Lausiac History (1918), three scans of the printing.
  clarke: ["lausiachistoryof00palluoft", "lausiachistoryof002802mbp", "in.ernet.dli.2015.157791/2015.157791.The-Lausiac-History-Of-Palladius_djvu.txt"],
  mouravieff: ["historyofchurcho00mouriala"],
};

const ED = {
  eusebius: "tr. Arthur Cushman McGiffert (NPNF II 1, 1890)",
  socrates: "tr. A. C. Zenos (NPNF II 2, 1890)",
  sozomen: "tr. Chester D. Hartranft (NPNF II 2, 1890)",
  theodoret: "tr. Blomfield Jackson (NPNF II 3, 1892)",
  augustine: "tr. E. B. Pusey",
  clarke: "tr. W. K. Lowther Clarke (1918)",
};

/** The words every source line ends with, saying how the text was read. */
const READ =
  "CCEL's transcription of each volume read word for word against archive.org's scans of the same printing; where they differ, the printed page is followed. The editions' footnotes, page numbers and running heads, and their marks in the text, are left out; the paragraphs and the numbers at their heads are as printed. The section titles name the place in each book.";
const SCRIPTURE_READ = "Scripture is the King James Version, as the app's Bible carries it, word for word.";
const PUSEY_READ =
  "St. Augustine's words are Project Gutenberg's transcription of E. B. Pusey's English, the text of the app's own Confessions, read word for word against archive.org's scans of the 1909 printings; where they differ, the printed page is followed.";

/** How a passage typed from the page images was read (November's words). */
const READ_TYPED =
  "Typed from the page images of archive.org's scan of the printing, read line by line, and compared word for word with the scan's text. The editions' footnotes and their marks are left out, and italics are set plain; the paragraphs are as printed. The section titles name the place in each book.";

const typed = (book, text, more) => ({ kind: "transcribed", text, scans: SCAN[book], ...more });
const e = (vol, from, more) => ({ vol, from, scans: SCAN[vol], ...more });
const gut = (from, to, more) => ({ vol: "gutenberg:3296", from, to, scans: SCAN.pusey, author: "St. Augustine of Hippo", ...more });

/** A prophet's book, whole, chapter by chapter, from the app's Bible (Brenton). */
const book = (name, chapters, more = {}) =>
  chapters.map(([chapter, from, to]) => ({
    kind: "scripture",
    book: name,
    chapter,
    from,
    to,
    // A chapter given in two parts names its verses.
    title: `${more.title ?? name[0].toUpperCase() + name.slice(1)} ${chapter}${chapters.filter((c) => c[0] === chapter).length > 1 ? `:${from}-${to}` : ""}`,
    citation: `${more.cite ?? name[0].toUpperCase() + name.slice(1)} ${chapter}:${from}-${to} (Brenton's Septuagint, 1851)`,
    minWords: 10,
  }));

const prophet = (saint, slug, title, name, brenton, chapters) => ({
  saint,
  slug,
  title,
  subtitle: "His prophecy, whole",
  originalLanguage: "grc",
  source: `The Book of ${name} (${brenton}), whole, in Brenton's English Septuagint (1851, public domain), as the app's Bible carries it, word for word.`,
  passages: book(name.toLowerCase(), chapters, { title: name, cite: name }),
});

const kjv = (book, chapter, from, to, more = {}) => {
  const name = book.replace(/-/g, " ").replace(/^(\d) /, "$1 ").replace(/\b\w/g, (c) => c.toUpperCase());
  const at = to ? `${chapter}:${from}-${to}` : `${chapter}:${from}`;
  return { kind: "scripture", book, chapter, from, ...(to ? { to } : {}), title: `${name} ${at}`, citation: `${name} ${at} (King James Version)`, minWords: 5, ...more };
};

/**
 * Palladius, The Lausiac History LXI, typed from the tertullian.org transcription
 * and read against the page images of lausiachistoryof00palluoft (pp. 167-169):
 * the page reads "thou" where the transcription has "thon", its small capitals
 * open "Since", and its "(grand-)" ends a line before "daughter". The
 * transcription's note numbers (344 to 346) are the footnotes' marks, left out.
 */
const MELANIA_PARAS = [
  "[1] Since I promised above to tell about the (grand-)daughter of Melania, I am constrained to pay the debt, for it is not just that men should disdain her youthfulness in respect of the flesh and leave on one side with no pillar to commemorate it such great virtue, virtue which, frankly, far surpasses that of old and zealous women. Her parents by using compulsion made her marry a man of the highest rank in Rome. Her conscience was always being pricked by the tales she heard about her grandmother, and (at last) she was so goaded that she felt unable to perform her marriage duty. [2] For, two male children having been born to her and both having died, she came to have such great hatred of marriage as to say to her husband Pinianus, son of Severus the ex-prefect: “If you choose to practise asceticism with me according to the fashion of chastity, then I recognise you as master and lord of my life. But if this appears grievous to you, being still a young man, take all my belongings and set my body free, that I may fulfil my desire toward God and become heir of the zeal of my grandmother, whose name I also bear. [3] For if God had wished us to have children, He would not have taken away my children untimely.” After they had struggled under the yoke a long while, at last God had pity on the young man and planted in him a zeal for renunciation, so that the word of Scripture was fulfilled in their case: “How knowest thou, O woman, that thou shalt save thy husband?” So having been married at thirteen and having lived with her husband seven years, in the twentieth year she renounced the world. And first she gave her silk dresses to the altars: this the holy Olympias has also done. [4] Then she cut up her other silks and made them into different church ornaments. And having entrusted her silver and gold to a certain Paul, a priest, a monk of Dalmatia, she sent them across the sea to the East, 10,000 pieces of money to Egypt and the Thebaid, 10,000 pieces to Antioch and its neighbourhood, 15,000 to Palestine, 10,000 to the churches in the islands and the places of exile, while she herself distributed to the churches in the West in the same way. [5] All this and four times as much she snatched, if God will allow the expression, “out of the mouth of the lion” Alaric by her faith. And she freed 8000 slaves who wished freedom, for the rest did not wish it, but preferred to be slaves to her brother; and she allowed him to take them all for three pieces of money. But having sold her possessions in the Spains, Aquitania, Tarragonia and the Gauls, she reserved for herself only those in Sicily and Campania and Africa and appropriated their income for the support of monasteries. [6] Such was her wise conduct with regard to the burden of riches. And her asceticism was as follows. She ate every other day—to begin with after a five days’ interval—and assigned to herself a part in the daily work of her own slavewomen, whom also she made her fellow-ascetics.",
  "She had with her also her mother Albina, who lived a similar ascetic life and distributed her riches for her part privately. Now these ladies are dwelling on their properties, now in Sicily and now in Campania, with fifteen eunuchs and sixty virgins, both free and slave. [7] Similarly also Pinianus her husband lives with thirty monks, reading and busying himself with the garden and solemn conferences. But in no small way did they honour us when we, a numerous party, went to Rome because of the blessed bishop John; they refreshed us both with hospitality and lavish equipment for the journey, thus winning for themselves with great joy the fruit of eternal life by their God-given works springing from a noble mode of life.",
];

/*
 * Alban Butler's Lives, for fifteen of the month's saints whose one Life in
 * English is his (a Catholic priest; the Lives first printed 1756 to 1759).
 * The owner's word (2026-11-10, call 11 in docs/1.9-build/BRAINSTORM.md):
 * published with no priest's check, word for word with Butler's name on
 * each, any passage of Roman doctrine against the Orthodox Church cut and
 * shown as […]. None was found in these fifteen, and no sentence that
 * demeans a people, so nothing is cut; a Life that runs on to another saint
 * ends at its last sentence about this one (St. Anastasia's), as November's
 * St. Menas does.
 *
 * THE EDITION. The London stereotype edition in twelve volumes, printed for
 * John Murphy. Each Life was read from the page images of archive.org's scan
 * of Princeton Theological Seminary's copy, line by line against the Digital
 * Library of India's scan of the same printing (the plates are the same, line
 * for line); every difference was settled on the page, and two Lives (St.
 * Boniface's and St. Eugenia's) were typed from it. The drafts are
 * scripts/menologion/scan-draft's (december-butler.json). The scans below are
 * the ones the words are checked against now: that second scan, and the same
 * text set again at Edinburgh (1798 to 1800) and at Derby (1842).
 *
 * WHAT IS LEFT OUT. Butler's footnotes and their marks, the note of his
 * sources and the date under each heading, the heading, the running heads,
 * the page numbers and the plates; his italics and small capitals are set
 * plain, his ligatures (Cæsarea, Menæa) kept.
 */
const BUTLER_SCAN = {
  xii: [
    "in.ernet.dli.2015.41806/2015.41806.The-Lives-Of-Fathers-Martyrs--Vol12_djvu.txt",
    "bim_eighteenth-century_lives-of-the-saints-t_butler-alban_1800_12",
    "livesoffathersma12butl",
  ],
  i: [
    "in.ernet.dli.2015.24075/2015.24075.The-Lives-Of-The-Fathers-Martyrs--Vol-1_djvu.txt",
    "bim_eighteenth-century_lives-of-the-saints-t_butler-alban_1798_1",
    "livesoffathersma01butl",
  ],
  ii: [
    "in.ernet.dli.2015.24076/2015.24076.The-Lives-Of-The-Fathers-Martyrs--Vol-2_djvu.txt",
    "bim_eighteenth-century_lives-of-the-saints-t_butler-alban_1798_2",
    "livesoffathersma02butl_0",
  ],
  iii: [
    "in.ernet.dli.2015.24077/2015.24077.The-Lives-Of-The-Fathers-Martyrs--Vol-3_djvu.txt",
    "bim_eighteenth-century_lives-of-the-saints-t_butler-alban_1798_3",
    "livesoffathersma03butl",
  ],
  v: [
    "in.ernet.dli.2015.24078/2015.24078.The-Lives-Of-The-Fathers-Martyrs--Vol-5_djvu.txt",
    "bim_eighteenth-century_lives-of-the-saints-t_butler-alban_1799_5",
    "livesoffathersma05butl",
  ],
  xi: [
    "in.ernet.dli.2015.92761/2015.92761.The-Lives-Of-The-Fathers-Martyrs--Vol-11_djvu.txt",
    "bim_eighteenth-century_lives-of-the-saints-t_butler-alban_1799_11",
    "livesoffathersma11butl",
  ],
};

const BUTLER_BOOK = "Alban Butler, The Lives of the Fathers, Martyrs, and Other Principal Saints";
/** Each volume as its title page names it; vol. XII's prints no year. */
const BUTLER_VOL = {
  xii: `${BUTLER_BOOK}, vol. XII (London: John Murphy)`,
  i: `${BUTLER_BOOK}, vol. I (London: John Murphy, 1812)`,
  ii: `${BUTLER_BOOK}, vol. II (London: John Murphy, 1815)`,
  iii: `${BUTLER_BOOK}, vol. III (London: John Murphy, 1815)`,
  v: `${BUTLER_BOOK}, vol. V (London: John Murphy, 1815)`,
  xi: `${BUTLER_BOOK}, vol. XI (London: John Murphy, 1815)`,
};

/** November's words for how a Life of Butler's was read. */
const READ_BUTLER =
  "Read from the page images of archive.org's scan of the printing, word by word against a second scan of the same printing; where they differ, the printed page is followed. Butler's footnotes, the note of his sources under each heading and the running heads are left out, and his italics are set plain; the paragraphs are as printed.";

/** One Life: Butler's words for the day, typed from the page, checked against the scans of `vol`. */
const butler = (vol, text, day, pages, more) => ({
  kind: "transcribed",
  text,
  scans: BUTLER_SCAN[vol],
  title: `The Lives of the Saints, ${day}`,
  author: "Alban Butler",
  citation: `${BUTLER_VOL[vol]}, ${day}, ${pages}`,
  ...more,
});

export const LIVES = [
  prophet("prophet-nahum", "the-prophecy-of-nahum", "The Prophecy of Nahum", "Nahum", "Naum", [[1, 1, 15], [2, 1, 13], [3, 1, 19]]),
  prophet("prophet-habakkuk", "the-prophecy-of-habakkuk", "The Prophecy of Habakkuk", "Habakkuk", "Ambacum", [[1, 1, 17], [2, 1, 20], [3, 1, 19]]),
  prophet("prophet-zephaniah", "the-prophecy-of-zephaniah", "The Prophecy of Zephaniah", "Zephaniah", "Sophonias", [[1, 1, 18], [2, 1, 14], [3, 1, 20]]),
  prophet("prophet-haggai", "the-prophecy-of-haggai", "The Prophecy of Haggai", "Haggai", "Aggaeus", [[1, 1, 15], [2, 2, 24]]),
  {
    ...prophet("prophet-daniel", "the-book-of-daniel", "The Book of Daniel", "Daniel", "Daniel, with Susanna and Bel", [
      [1, 1, 21], [2, 1, 49], [3, 1, 66], [3, 71, 97], [4, 1, 37], [5, 1, 30], [6, 1, 29], [7, 1, 28], [8, 1, 27], [9, 1, 27], [10, 1, 21], [11, 1, 45], [12, 1, 13], [13, 1, 64], [14, 1, 42],
    ]),
    subtitle: "His book, whole, with Susanna and Bel",
    source:
      "The Book of Daniel, whole, with the Song of the Three Children in its third chapter and the histories of Susanna and of Bel and the Dragon as its thirteenth and fourteenth, in Brenton's English Septuagint (1851, public domain), as the app's Bible carries it, word for word. The third chapter is given as the app's Bible numbers it, which has no verses numbered 67 to 70.",
  },
  {
    saint: "sosthenes-apollos-cephas-and-tychicus",
    slug: "their-names-in-scripture",
    title: "Their Names in Scripture",
    subtitle: "Sosthenes, Apollos and Tychicus",
    originalLanguage: "grc",
    source: `${SCRIPTURE_READ} Every verse that names Sosthenes, Apollos or Tychicus. The Church keeps Cephas of the Seventy apart from the apostle Peter, whom the New Testament calls Cephas, so no verse is given for him.`,
    passages: [
      kjv("acts", 18, 17),
      kjv("1-corinthians", 1, 1),
      kjv("acts", 18, 24, 28),
      kjv("acts", 19, 1),
      kjv("1-corinthians", 1, 12),
      kjv("1-corinthians", 3, 4, 6),
      kjv("1-corinthians", 16, 12),
      kjv("titus", 3, 12, 13),
      kjv("acts", 20, 4),
      kjv("ephesians", 6, 21, 22),
      kjv("colossians", 4, 7, 8),
      kjv("2-timothy", 4, 12),
    ],
  },
  {
    saint: "holy-innocents",
    slug: "the-slaughter-of-the-innocents",
    title: "The Slaughter of the Innocents",
    subtitle: "In the Gospel of St. Matthew",
    originalLanguage: "grc",
    source: `${SCRIPTURE_READ} Matthew 2:13-18.`,
    passages: [kjv("matthew", 2, 13, 18)],
  },
  {
    saint: "stephen-the-protomartyr",
    slug: "the-martyrdom-of-stephen",
    title: "The Martyrdom of St. Stephen",
    subtitle: "In the Acts of the Apostles",
    originalLanguage: "grc",
    source: `${SCRIPTURE_READ} Acts 6:1 to 8:2.`,
    passages: [kjv("acts", 6, 1, 15), kjv("acts", 7, 1, 60), kjv("acts", 8, 1, 2)],
  },
  {
    saint: "martyrs-of-nicomedia",
    slug: "the-martyrs-of-nicomedia",
    title: "The Martyrs of Nicomedia",
    subtitle: "As Eusebius tells it",
    originalLanguage: "grc",
    source: `Eusebius, Church History VIII.6.1-8, ${ED.eusebius}, public domain. ${READ} The passage ends where Eusebius turns from Nicomedia to Melitene and Syria.`,
    passages: [
      e("npnf201", "Chapter VI.--Those in the Palace.", {
        heading: 1,
        paras: [0, 7],
        endAfter: "at the beginning of the persecution.",
        title: "Church History VIII.6",
        author: "Eusebius of Caesarea",
        citation: `Eusebius, Church History VIII.6.1-8, ${ED.eusebius}`,
      }),
    ],
  },
  {
    saint: "melania-the-younger",
    slug: "life-of-melania-the-younger",
    title: "The Life of St. Melania the Younger",
    subtitle: "As Palladius tells it",
    originalLanguage: "grc",
    source: `Palladius of Helenopolis, The Lausiac History LXI, in the public-domain English of W. K. Lowther Clarke (The Lausiac History of Palladius, London: SPCK, and New York: Macmillan, 1918), from the tertullian.org transcription read word for word against three archive.org scans of that printing; where they differ, the page is followed. The translator's footnotes are left out; the numbers of the chapter's sections are his, in brackets, as the app's other chapters of the book keep them.`,
    passages: [
      {
        kind: "transcribed",
        text: MELANIA_PARAS,
        scans: SCAN.clarke,
        sectionNumbers: true,
        // The scans read the old-style "[1]" and "[6]" as "[i]" and "[6j"; "(grand-)"
        // ends a line before "daughter" (pp. 167 and 168, read on the page).
        ocr: ["1", "granddaughter", "6"],
        title: "The Lausiac History LXI",
        author: "Palladius of Helenopolis",
        citation: `Palladius, The Lausiac History LXI, ${ED.clarke}`,
      },
    ],
  },
  {
    saint: "ambrose-of-milan",
    slug: "ambrose-in-the-witnesses",
    title: "St. Ambrose in the Witnesses' Words",
    subtitle: "Socrates, Augustine, Sozomen and Theodoret",
    originalLanguage: "la",
    source: `Socrates, Church History IV.30, ${ED.socrates}; St. Augustine, Confessions V.13, VI.3 and IX.7, ${ED.augustine}; Sozomen, Church History VII.25, ${ED.sozomen}; Theodoret, Church History V.17, ${ED.theodoret}; public domain. ${READ} ${PUSEY_READ} St. Augustine's ninth book is followed to the end of what he tells of St. Ambrose.`,
    passages: [
      e("npnf202", "Chapter XXX.--Dissension about a Successor to Auxentius, Bishop of", {
        heading: 1,
        // CCEL drops the page's opening quotation marks and a comma
        // (p. 113 and 114, read on the page image).
        fix: [
          ["crying out that Ambrose was worthy of the bishopric,'", "crying out 'that Ambrose was worthy of the bishopric,'"],
          ["his ordination: for by that means only,'", "his ordination: 'for by that means only,'"],
          ["it was alleged, would the peace", "it was alleged, 'would the peace"],
          ["declaring that his choice was", "declaring that 'his choice was"],
          ["the inhabitants of Milan who were divided", "the inhabitants of Milan, who were divided"],
        ],
        title: "Socrates, Church History IV.30",
        author: "Socrates Scholasticus",
        citation: `Socrates, Church History IV.30, ${ED.socrates}`,
      }),
      gut("To Milan I came, to Ambrose the Bishop", "For though I took no pains to learn what he spake", {
        startAt: "To Milan I came",
        title: "Confessions V.13",
        citation: `St. Augustine, Confessions V.13, ${ED.augustine}`,
      }),
      gut("Nor did I yet groan in my prayers, that Thou wouldest help me", "I however certainly had no opportunity of enquiring", {
        title: "Confessions VI.3",
        citation: `St. Augustine, Confessions VI.3, ${ED.augustine}`,
      }),
      gut("Not long had the Church of Milan begun to use this kind", "Thou that makest men to dwell of one mind", {
        endAfter: "from her fury of persecuting.",
        title: "Confessions IX.7",
        citation: `St. Augustine, Confessions IX.7, ${ED.augustine}`,
      }),
      e("npnf202", "Chapter XXV.--Intrepid Bearing of St. Ambrose in the Presence of the", {
        heading: 1,
        title: "Sozomen, Church History VII.25",
        author: "Sozomen",
        citation: `Sozomen, Church History VII.25, ${ED.sozomen}`,
      }),
      e("npnf203", "Chapter XVII.--Of the massacre of Thessalonica; the boldness of Bishop", {
        heading: 1,
        title: "Theodoret, Church History V.17",
        author: "Theodoret of Cyrus",
        citation: `Theodoret, Church History V.17, ${ED.theodoret}`,
      }),
    ],
  },
  {
    saint: "peter-of-moscow",
    slug: "life-of-peter-of-moscow",
    title: "St. Peter of Moscow in Mouravieff",
    subtitle: "How the see came to Moscow",
    originalLanguage: "ru",
    source: `A. N. Mouravieff, A History of the Church of Russia, ch. IV, section XXV, pp. 51-54, tr. R. W. Blackmore (Oxford, 1842); public domain. ${READ_TYPED} The section's first six paragraphs, to the end of what it tells of him; the seventh turns from him to the churches of Russia named for the Mother of God.`,
    passages: [
      typed(
        "mouravieff",
        [
          "While the yoke of the Mongols was pressing most heavily on Russia, and the glory of her princes was obscured by disgraceful civil feuds, the holy Metropolitan Peter was a faithful guardian and comforter of his flock. A Volhynian by birth, he had from his early youth devoted himself to the monastic life, and had presided over the small convent of Ratno, founded by himself in his native district. There the fame of his virtues reached the grandson of Daniel, who with the title of king reigned over all the south-west of Russia and the Lithuanian provinces; for Vœsheleg, the son of the heathen chieftain Mindovig, after having embraced Christianity against the will of his father, and propagated it within the sphere of his influence, shut himself up in a monastery, and voluntarily resigned his right of inheritance in favour of his relations, the princes of Galich. But the strength of their empire was short lived: another powerful heathen, Hedimine, established himself in Wilna, and soon wrested Kieff and all the eastern part of the principality out of the hands of the feeble sons of Yury, with whom failed the glorious race of Romanus of Galich, while his western provinces became the inheritance of Poland; and from that time the influence of the Roman Church, assisted by the heathen indifference of Hedimine and his son Olgerd, spread itself through the districts beyond the Dnieper.",
          "Yury, like his great grandfather, wished to have the metropolitan in his own capital; and having heard that a certain hegumen named Gerontius had gone of his own accord from Vladimir to Constantinople with the intention of seeking to be consecrated to the office of primate, he by his entreaties persuaded the humble Peter, for the good of the Church, to go thither too for the same purpose, with a letter from himself to the patriarch. The petitioner of Yury’s choice was consecrated by the most holy Athanasius to be metropolitan of all Russia. But on taking possession of his throne, St. Peter saw that the ancient capital was forgotten by the princes, and that all the life of the empire was now concentrated in the North; and he did not think of preferring the particular advantage of his own native district to the general good of the Church. Like his predecessor Maximus he removed his residence to Vladimir, though at the same time he did not cease to make journeys in every direction throughout Russia, to reconcile contending princes, to appoint bishops, and to regulate the affairs of the Church. His zeal to compose the differences of the princes of Bransk was very near costing him his life; he only escaped by taking refuge in the cathedral church.",
          "Soon after Peter came to be metropolitan, a circumstance occurred which plainly revealed the depth of his Christian humility. Anthony bishop of Tver and son of the prince of Lithuania, envying his elevation, lodged a slanderous accusation against him with the patriarch, who sent his commissioner to try Peter. A synod met at Periaslavla-Zalessky, in which Simeon bishop of Rostoff was present, together with the accuser and a venerable company of clergy and princes. The metropolitan, little caring to be great in this world, spake thus to the assembly: “I am not better than the Prophet Jonas; if I be the cause of this tempest, cast me out of the ship, and the tumult will be still.” But when his innocence could not be hid, the meek prelate revenged himself upon his slanderer by these words: “Peace be with thee, my son! This was no deed of thine, but his, who from the beginning is the envier of the human race, the devil; as for thee, take care of thyself for the future, and for the past may God forgive thee!”",
          "Notwithstanding this, on any occasion when not his own person but the Church was in danger of suffering, St. Peter acted with firmness in her defence. Thus he deprived and degraded the guilty bishop of Sarai, and by the threat of excommunication restrained Demetrius prince of Tver from falling upon Vladimir. He even went to the Horde itself with Michael, the unfortunate father of the same prince, as a true pastor conducting his children. There he obtained the general respect of the Khan Uzbek and the Mongols, who had lately embraced the lying imposture of the Koran; and the certificate which he received of the favourable disposition of Uzbek towards him served afterwards as a pledge to secure the good will of all succeeding khans: “Let no one injure the Catholic Church, the Metropolitan Peter, the archimandrites, or the popes in Russia: let their lands be free from all tax and tribute; for all this belongs to God, and these people by their prayers preserve us: let them be under the sole jurisdiction of Peter the metropolitan, agreeably to their ancient laws: let the metropolitan lead his life in quiet and meekness, and let him pray, with a true heart, and without fear, for us and for our children: whosoever shall take any thing from any of the clergy, let him restore it threefold; whosoever shall dare to speak evil of the Russian Faith, whosoever shall injure any church, monastery, or chapel, let him be put to death.”",
          "The consideration which the primate enjoyed amidst the feuds of the princes of the different appanages, was the preservation of the whole empire, which was united together into one body only by the person of the metropolitan of all Russia. The Great Prince John, of Moscow, perceived all the importance of his spiritual authority, when by flattery and entreaties he persuaded the metropolitan to transfer his residence to his beloved patrimony of Moscow, which from that time became the capital. But St. Peter did not comply with the wish of John without the highest motives for doing so: he foresaw the future glory of Moscow while it was then as yet poor, and persuaded the prince to lay in it the foundation of the stone cathedral of the Assumption. “If thou wilt comfort my old age,” said he, “if thou wilt build here a temple worthy of the Mother of God, then thou shalt be more glorious than all the other princes, and thy posterity shall become great. My bones shall remain in this city, prelates shall rejoice to dwell in it, and the hands of its princes shall be upon the neck of our enemies!”",
          "Thus in the words of the ancient patriarch Jacob, the man of many labours, who in the hour of death foretold the lion strength of the tribe of Judah, St. Peter, also a man of many labours, when about to depart in peace from his pilgrimage, spoke in the spirit of prescience to John; and his word of commandment was obeyed, his prophecy was fulfilled. In that same temple, in the wall of which he prepared for himself beforehand a tomb, in the view of his uncorrupted remains, and as it were before the face and presence of the prelate himself, are crowned the successors of John, now no longer princes of Moscow only, or Vladimir, but rulers over the ninth part of the globe, which scarcely finds room upon its surface for one such empire as Russia.",
        ],
        {
          title: "A History of the Church of Russia, pp. 51-54",
          author: "A. N. Mouravieff",
          citation: "A. N. Mouravieff, A History of the Church of Russia, ch. IV, pp. 51-54, tr. R. W. Blackmore (Oxford, 1842)",
        },
      ),
    ],
  },
  {
    saint: "barbara-the-great-martyr",
    slug: "martyrdom-of-barbara",
    title: "The Martyrdom of St. Barbara",
    subtitle: "As Alban Butler tells it",
    source: `${BUTLER_VOL.xii}, December 4, pp. 65-66, public domain. ${READ_BUTLER} The page prints “calendars. but”, where the other printings read “calendars, but”; it is kept as printed.`,
    passages: [
      butler(
        "xii",
        [
        "This holy virgin and martyr is honoured with particular devotion in the Latin, Greek, Muscovite, and Syriac calendars. but her history is obscured by a variety of false acts. Baronius prefers those who tell us, that she was a scholar of Origen, and suffered martyrdom at Nicomedia, in the reign of Maximinus the First, who raised the sixth general persecution after the murder of Alexander Severus, in 235. But Joseph Assemani shows the acts which we have in Metaphrastes and Mombritius to be the most exact and sincere. By these we are informed that St. Barbara suffered at Heliopolis, in Egypt, in the reign of Galerius, about the year 306. This account agrees with the emperor Basil’s Menology, and the Greek Synaxary. There stood an old monastery near Edessa, which bore her name. See Jos. Assemani in Calend. Univ. t. 5. p. 408.",
        ],
        "December 4",
        "pp. 65-66",
        { expect: 1 },
      ),
    ],
  },
  {
    saint: "sabbas-the-sanctified",
    slug: "life-of-sabbas",
    title: "The Life of St. Sabbas",
    subtitle: "As Alban Butler tells it",
    source: `${BUTLER_VOL.xii}, December 5, pp. 78-87, public domain. ${READ_BUTLER} Butler spells his name Sabas.`,
    passages: [
      butler(
        "xii",
        [
        "St. Sabas, one of the most renowned patriarchs of the monks of Palestine, was born at Mutalasca, in Cappadocia, not far from Cæsarea, the capital, in 439. The name of his father was John, that of his mother, Sophia: both were pious, and of illustrious families. The father was an officer in the army, and being obliged to go to Alexandria in Egypt, took his wife with him, and recommended his son Sabas, with the care of his estate, to Hermias, the brother of his wife. This uncle’s wife used the child so harshly that, three years after, he went to an uncle called Gregory, brother to his father, hoping there to live in peace. Gregory having the care of the child, demanded also the administration of his estate, whence great lawsuits and animosities arose between the two uncles. Sabas, who was of a mild disposition, took great offence at these discords about so contemptible a thing as earthly riches, and the grace of God working powerfully in his heart, he resolved to renounce for ever what was a source of so great evils among men. He retired to a monastery called Flavinia, three miles from Mutalasca, and the abbot received him with open arms, and took great care to see him instructed in the science of the saints, and in the rules of a monastic profession. His uncles, blinded by avarice and mutual animosity, were some years without opening their eyes; but at last, ashamed of their conduct towards a nephew, they agreed together to take him out of his monastery, restore him his estate, and persuade him to marry. In vain they employed all means to gain their point. Sabas had tasted the bitterness of the world, and the sweetness of the yoke of Christ, and his heart was so united to God, that nothing could draw him from his good purpose. He applied himself with great fervour to the practice of all virtues, especially humility, mortification, and prayer, as the means to attain all others. One day whilst he was at work in the garden he saw a tree loaded with fair and beautiful apples, and gathered one with an intention to eat it. But reflecting that this was a temptation of the devil, he threw the apple on the ground, and trod upon it. Moreover, to punish himself, and more perfectly to overcome the enemy, he made a vow never to eat any apples as long as he lived. By this victory over himself he made great progress in all other virtues, exercising himself by day in labour, accompanied with prayer, and by night in watching in devotions, always flying idleness as the root of all evils, sleeping only as much as was absolutely necessary to support nature, and never interrupting his labours but to lift up his hands to God. Though he was the youngest in the house he soon surpassed all the rest in fervour and virtue. So tender was his charity and compassion, that once when he was serving the baker, who had put his wet clothes into the oven to dry, and forgetting them, had put in fire, seeing him much troubled for his clothes, he went into the oven and fetched them out through the flames without hurt. When Sabas had been ten years in this monastery, being eighteen years old, with the leave of his abbot, he went to Jerusalem to visit the holy places, and to edify himself by the examples of the eminent solitaries of that country. He passed the winter in the monastery of Passarion, governed at that time by the holy abbot Elpidius. All the brethren were charmed with his virtue, and desired earnestly that he would fix his abode among them: but his great love of silence and retirement made him prefer the manner of life practised by St. Euthymius. He cast himself at the feet of that holy abbot, conjuring him with many tears to receive him among his disciples. St. Euthymius judged him too young to continue in his laura with the anchorets; so extreme a solitude being only proper for the most perfect: for a laura consisted of a cluster of separate cells or hermitages in a desert. Euthymius, therefore, recommended him to the monastery below the hill, which was under the conduct of Theoctistus, and a kind of noviceship to the laura, from which it lay about three miles distant, the laura itself being twelve miles from Jerusalem.",
        "Sabas consecrated himself to God with new fervour, working all day, and watching in prayer a good part of the night. As he was very lusty and strong, he assisted all his brethren in their offices, and prepared himself the wood and water for the house with extraordinary care and cheerfulness. He served the sick with singular diligence and affection; and was always the first and the last at the divine office, and in every regular duty. A temptation put his virtue to the trial. He was sent by his abbot as companion to another monk on certain affairs to Alexandria. There his parents knew him and desired to engage him to accept his father’s post and estate in the world: but he gave them to understand that would be to apostatize from the service of God which he had chosen. They pressed him at least to accept a large sum of money for his necessaries; but he would only take three pieces of gold, and those he gave all to his abbot on his return. When he was thirty years of age he obtained leave of St. Euthymius to spend five days a-week in a remote cave, which time he passed, without eating any thing, in prayer and manual labour. He left his monastery on Sunday evening, carrying with him palm-twigs, and came back on Saturday morning with fifty baskets which he had made, imposing upon himself a task of ten a-day. Thus he had lived five years, till St. Euthymius chose him and one Domitian for his companions in his great yearly retreat in the deserts of Rouban, in which Christ is said to have performed his forty days’ fast. They entered this solitude together on the fourteenth of January, and returned to their monastery on Palm-Sunday. In the first retreat Sabas fell down in the wilderness, almost dead with thirst. St. Euthymius, moved with compassion, addressed a prayer to Christ, that he would take pity on his young fervent soldier, and, striking his staff into the earth, a spring gushed forth: of which Sabas drinking a little, recovered his strength so as to be enabled to bear the fatigues of his retreat.",
        "After the death of St. Euthymius a relaxation of discipline crept into that monastery: on which account Sabas, sensible that a religious house in such a condition is like a general shipwreck, in which every one must save himself as he can, retired into a desert toward the East, in which St. Gerasimus lived. The devil here endeavoured to affright him by appearing in divers shapes of serpents and beasts: but the servant of God, armed with prayer and faith, surmounted all his assaults. Four years the saint had spent in his wilderness in a total separation from all commerce with men, when, directed by an admonition of heaven, he chose his dwelling in a cave on the top of a high mountain, at the bottom of which ran the brook Cedron. The water of that torrent not being there drinkable, he fetched what he used from a spring five miles off, through a very rough and steep way. He was obliged to hang a cord down the descent to hold himself by in mounting up it. Wild herbs which grew on the rocks were his food, till certain countrymen, who found him by his cord, out of respect brought him on certain days a little bread, cheese, dates, and other little things which he might want.",
        "After he had lived here five years, several resorted to him, desiring to serve God under his direction. He was at first unwilling to consent; but charity overcoming the resistance which his humility raised, he founded a new laura, which at first consisted of seventy persons, all desirous to devote themselves to praise and serve God without interruption. He marked to each the place to build their cell; and, having prayed to God that they might find water, caused a pit to be dug at the foot of the mountain, where a spring was discovered which subsisted in succeeding ages. He built also a little chapel with an altar. The number of his disciples was shortly increased to one hundred and fifty; which obliged him to extend his laura on the other side of the torrent. He watched over all, and provided for their necessities with an incredible attention. He taught them to overcome their passions, to discover and defeat the artifices of the devil, and to pray with fruit and holy perseverance. To cut off all necessities and pretexts of ever leaving their solitude, by the help of certain charitable persons, he supplied them with all things in a manner suitable to persons dead to the world. He had no priest in his community, and he thought no religious man could aspire to that dignity without presumption. He grieved, however, to depend upon the opportunity of some strange priest for the celebration of the divine mysteries. Certain factious spirits in the community formed a schism against their holy abbot, and accused him to Sallust, then lately made bishop of Jerusalem. The prelate found their invectives groundless, except that the want of a priest was a real defect in the community. He therefore compelled Sabas to receive that sacred character at his hands. The abbot was then fifty-three years old. The reputation of his sanctity drew persons from very remote countries to his laura. Our saint assigned a particular chapel for the Armenian monks, where they performed the first part of the divine office, which consists of prayers and instructions in their own tongue: but met in the great church to finish it, and to make the oblation and receive the communion with the rest. After the death of the saint’s father, his mother came to him, and served God under his direction. With the money which she brought he built two hospitals, one for strangers, and another for the sick; also an hospital at Jericho, and a monastery on a neighbouring hill, called Castel; and another small one a mile distant, for the young, where they learned the psalter and religious exercises. When they were perfect in these, and ripe in years, he translated them to the house of Castel; and drew out of this nursery those that were most perfect into his laura. Sallust, patriarch of Jerusalem, established St. Sabas exarch or superior-general over all the monks of Palestine, who lived in several cells, and St. Theodosius over all who lived in community, or the Cenobites. St. Sabas, after the example of St. Euthymius, left his disciples every year after the octave of the Epiphany, and passed the whole Lent without being seen by any one, eating nothing all that time, except that he received the holy eucharist every Saturday and Sunday, which he always took with him for that purpose. If any of his disciples accompanied him, he caused them to carry with them some dried bread for their subsistence. In one of these retreats, he found a holy hermit who had lived on wild herbs, without seeing any man thirty-eight years. He had with him very edifying discourses: but the next year found him dead, and buried him. The patriarch, Sallust, dying in 493, the rebellious monks above-mentioned went to his successor Elias, hoping that he would hear their complaints. Sabas was informed of their cabals, and, not to be an occasion of others’ malice, withdrew himself privately, saying, that we must resist the devils, but yield to men, for the sake of peace.",
        "He went into the desert of Scythopolis, near the river Gadara, where he went into a great cave to pray. It happened to be the den of a huge lion. At midnight the beast came in, and finding this guest, dared not to touch him, but taking him gently by his garments, plucked him as if it had been to draw him out. The saint was no ways affrighted or troubled, but began leisurely and with much devotion to recite aloud the midnight psalms. The lion went out, and when the holy man had finished matins, came in again, and pulled him by the skirts of his clothes as he had done before. The saint spoke to the beast and said, the place was big enough to hold them both. The lion at those words departed, and returned thither no more. Certain thieves found St. Sabas in his cave, and were so moved by his example and discourses, that they all embraced a penitential life. Many persons here, again put themselves under his conduct; but, finding himself distracted by their direction, and by a number of visitants who resorted thither, he abandoned his cell to them; and this place grew into a monastery. He enjoyed the sweetness of perfect solitude some time, when, moved with tender charity and compassion, he went to visit his former rebellious monks, who continued hardened in their iniquity, and were joined by twenty others. The saint was pierced with grief to see them thus give death to their own souls, and draw others into the same perdition. It seemed to him that he felt his own limbs torn from his body whilst he saw his monks separated from him. In order to soften their hatred and malice, he gave them every token of the greatest sweetness, tenderness, and goodness; but they were not yet to be gained. He left them a second time, to ask their conversion with greater fervour of the Father of mercies. He retired near Nicopolis, living some time under the boughs of a shady tree, the fruit of which furnished him with food till the master of the field built him a cell and afforded him his scanty diet. Elias, the patriarch, ordered Sabas to appoint a superior for the disciples whom he had gathered at Nicopolis, and to return to his great laura, to which he sent his orders to receive him. The factious monks, in a rage, threw down a building which he had raised, and, after many disorders, left that place, and settled in certain old ruinous cells near the brook Theon. The great laura was freed from their scandals, and Sabas soon renewed in it the spirit of fervour and charity. His zeal and compassion for the seditious apostates made him still to weep for them. He even procured and sent them seventy pieces of gold to build them a church and furnish them with necessaries. This excess of goodness, made them to enter into themselves, confess their crime, and submit themselves to their abbot. St. Sabas nominated a superior to govern them; and, under his direction, this became a new very regular monastery. The saint founded several others after the same model.",
        "The eastern churches were then in great confusion. The emperor Anastasius supported the Eutychian heresy, and banished many catholic bishops. The patriarch Elias sent to him as deputies St. Sabas, with other famous abbots, to endeavour to stop the fury of this persecution. Sabas was seventy years old when he undertook this journey to Constantinople. As he was dressed like some poor beggar, the officers at the gate of the imperial palace admitted the rest, but stopped him. Sabas made no reply, but withdrew into a corner to employ his time in prayer. When the emperor had read the letter of the patriarch, in which great commendations were bestowed on Sabas, he asked where he was. The saint was sought, and at length found in a corner reciting the psalms. Anastasius gave the abbots liberty to ask what they wanted or desired for themselves; the rest presented their petitions, but Sabas had no request to make in his own name. Being pressed by the emperor to ask some favour, he only begged that his majesty would restore peace to the church, and not disturb the clergy. The emperor gave him a thousand pieces of gold to employ in charities. Sabas staid all the winter in Constantinople, and often visited the emperor to gain his point. The prince had caused a heretical council at Sidon to condemn the general council of Chalcedon, and required the bishops to subscribe this decree, banishing many who refused to do it. However, he spared Elias, patriarch of Jerusalem, at the repeated entreaties of Sabas, and dismissed the holy abbot with honour, giving him a thousand pieces of gold more to be distributed among the poor in his country. The saint returned to his solitude, and the emperor dying, according to what our holy abbot had foretold, Justin, his successor, favoured the true faith. St. Sabas, laying hold of that opportunity, went to Cæsarea, Scythopolis, and other places, preaching the catholic faith, and bringing back many monks and seculars into its fold. A drought which had continued five years, produced a famine in Palestine. The prayers of the saint obtained supplies for his seven monasteries in their extreme necessity, and at last rain, to the universal joy of the whole country.",
        "In the ninety-first year of his age, at the request of Peter, patriarch of Jerusalem, he undertook a second journey to Constantinople, in favour of the Christians of Palestine, who had been calumniated at court. Justinian, who then occupied the imperial throne, received him with great honour, granted him all his requests, and offered to settle annual revenues for the maintenance of all his monasteries. The holy abbot thanked his majesty, but said they stood not in need of such revenues, as long as the monks should serve God. However, he begged a remission of all taxes in favour of the people of Palestine for a certain term, in consideration of what they had suffered by the plunders of the Samaritans: that his majesty would build an hospital at Jerusalem for the pilgrims, and a fortress for the protection of the hermits and monks against the inroads of barbarians: that he would bestow some ornaments on the church of our Lady, which was lately built, and would afford his protection to the catholics. All which things were granted. It happened one day that the emperor being busy in council in dispatching certain affairs of the saint, who was himself present, when it was the hour of tierce, the abbot went out to recite his prayers. His companion, called Jeremy, said it was not well done to leave the emperor on such an occasion. “My son,” replied Sabas, “the emperor does his duty, and we must do ours;” so exact was he in all the rules of his state. St. Sabas returned into Palestine with the imperial orders, which he delivered to the magistrates of Jerusalem, Scythopolis, and Cæsarea, and saw every where put in execution. Soon after his return to his laura he fell sick: the patriarch persuaded him to suffer himself to be conveyed to a neighbouring church, where he served him with his own hands. The pains of the saint were very sharp, but God supported him under them in perfect sentiments of patience and resignation. Finding his last hour approach, he begged the patriarch that he might be carried back to his laura. He appointed Melitas of Berytus his successor, gave him excellent instructions, and then lay four days in silence, without seeing any one, that he might entertain himself with God alone. On the fifth of December, in the evening, having received the holy communion, he departed to our Lord, in 532, (not 531, as Jos. Assemani demonstrates against Baronius, &c.) being ninety-four years old. He is commemorated on this day both in the Greek and Latin Calendars.",
        "St. Sabas met with persecutors among the monks, to whom his virtue seemed too scrupulous a severity; and these men were long insensible to his mild remonstrances, and holy instructions animated by the example of his admirable sanctity. How easily do men blind themselves in their passions, and excuse to themselves, nay canonize, their more subtle vices? And how difficult is it for such sinners to be reclaimed? It is much easier to convert a notorious sinner, than one who is falsely just. The one feels his miseries, the other crowns himself with his own hands, and, like the proud Pharisee, makes his own panegyric or apology. This dreadful blindness is a frequent case: men every day study by a false conscience to palliate crimes, and allow themselves many unjustifiable liberties under false pretences. As St. Austin complains, what our passions strongly incline us to, we often call holy. Not to perish by such illusions, we must banish out of our hearts all self-conceit, learn perfectly to die to ourselves, especially in regard to our darling or ruling passions, and never take our passions for our counsellors or guides, as we shall be sure to do if we rely too much on ourselves. We must often suspect and narrowly examine our own hearts, which are frequently the greatest cheats with which we can have to deal. We are often imposed upon by other men: but a thousand times oftener by ourselves.",
        ],
        "December 5",
        "pp. 78-87",
        { expect: 8 },
      ),
    ],
  },
  {
    saint: "lucia-of-syracuse",
    slug: "martyrdom-of-lucia",
    title: "The Martyrdom of St. Lucia",
    subtitle: "As Alban Butler tells it",
    source: `${BUTLER_VOL.xii}, December 13, pp. 209-211, public domain. ${READ_BUTLER} Butler calls her Lucy. The couplet he quotes is set as one paragraph, as the app sets verse inside prose.`,
    passages: [
      butler(
        "xii",
        [
        "The glorious virgin and martyr St. Lucy, one of the brightest ornaments of the church of Sicily, was born of honourable and wealthy parents in the city of Syracusa, and educated from her cradle in the faith of Christ. She lost her father in her infancy, but Eutychia her mother took singular care to furnish her with tender and sublime sentiments of piety and religion. By the early impressions which Lucy received, and the strong influence of divine grace, Lucy discovered no disposition but toward virtue, and she was yet very young when she offered to God the flower of her virginity. This vow, however, she kept a secret, and her mother, who was a stranger to it, pressed her to marry a young gentleman who was a pagan. The saint sought occasions to hinder this design from taking effect, and her mother was visited with a long and troublesome flux of blood, under which she laboured four years without finding any remedy by recourse to physicians. At length she was persuaded by her daughter to go to Catana, and offer up her prayers to God for relief at the tomb of St. Agatha. St. Lucy accompanied her thither, and their prayers were successful. Hereupon our saint disclosed to her mother her desire of devoting herself to God in a state of perpetual virginity, and bestowing her fortune on the poor: and Eutychia, in gratitude, left her at full liberty to pursue her pious inclinations. The young nobleman with whom the mother had treated about marrying her, came to understand this by the sale of her jewels and goods, and the distribution of the price among the poor, and in his rage accused her before the governor Paschasius as a Christian, the persecution of Dioclesian then raging with the utmost fury. The judge commanded the holy virgin to be exposed to prostitution in a brothel-house; but God rendered her immoveable, so that the guards were not able to carry her thither. He also made her an overmatch for the cruelty of the persecutors, in overcoming fire and other torments. After a long and glorious combat she died in prison of the wounds she had received, about the year 304. She was honoured at Rome in the sixth century among the most illustrious virgins and martyrs, whose triumphs the church celebrates, as appears from the Sacramentary of St. Gregory, Bede, and others. Her festival was kept in England, till the change of religion, as a holiday of the second rank, in which no work but tillage or the like was allowed. Her body remained at Syracusa for many years; but was at length translated into Italy, and thence, by the authority of the emperor Otho I. to Metz, as Sigebert of Gemblours relates. It is there exposed to public veneration in a rich chapel of Saint Vincent’s church. A portion of her relicks was carried to Constantinople, and brought thence to Venice, where it is kept with singular veneration. St. Lucy is often painted with the balls of her eyes laid in a dish: perhaps her eyes were defaced or plucked out, though her present acts make no mention of any such circumstance. In many places her intercession is particularly implored for distempers of the eyes.",
        "It is a matter of the greatest consequence what ideas are stamped upon the ductile minds of children, what sentiments are impressed on their hearts, and to what habits they are first formed. Let them be inured to little denials both in their will and senses, and learn that pleasures which gratify the senses must be guarded against, and used with great fear and moderation: for by them the taste is debauched, and the constitution of the soul broken and spoiled much more fatally than that of the body can be by means contrary to its health. Let them be taught that, as one of the ancient philosophers said, Temperance is the highest luxury: for only its pleasures are easy, solid, and permanent. It is much easier to conquer than to satisfy the passions, which, unless they are curbed by a vigorous restraint, whilst they are pliable, will be harder to be subdued. Obstinacy, untractableness, sloth, and voluptuousness, are of all dispositions in youth the most dangerous.",
        "Children like tender osiers take the bow, And as they first are fashioned, always grow.",
        "There are few Lucies now-a-days among Christian ladies, because sensuality, pride, and vanity are instilled into their minds by the false maxims and pernicious example of those with whom they first converse. Alas! unless a constant watchfulness and restraint produce and strengthen good habits, the inclinations of our souls lean of their own accord toward corruption.",
        ],
        "December 13",
        "pp. 209-211",
        { expect: 4 },
      ),
    ],
  },
  {
    saint: "ten-martyrs-of-crete",
    slug: "the-ten-martyrs-of-crete",
    title: "The Ten Martyrs of Crete",
    subtitle: "As Alban Butler tells it",
    source: `${BUTLER_VOL.xii}, December 23, pp. 286-288, public domain. ${READ_BUTLER}`,
    passages: [
      butler(
        "xii",
        [
        "Upon the publication of the edict for persecuting the Christians under Decius, by the activity of a barbarous governor in seeing it rigorously executed, the isle of Crete, now called Candia, soon became one large field of blood. Among the martyrs who there triumphed over the world, the devil, and sin, none were more conspicuous than Theodulus, Saturninus, Euporus, Gelasius, Eunicianus, Zoticus, Cleomenes, Agathopus, Basilides, and Evarestus, commonly called the Ten Martyrs of Crete. The three first were citizens of Gortyna, the metropolis, where they had probably been grounded in the faith by St. Cyril, bishop of that city, who was beheaded for the faith in the same persecution, and is honoured in the Roman Martyrology on the ninth of July. The rest were brought from other towns of the same island; Zoticus (called by some Zeticus) from Gnossus, Pontius from Epinium, Agathopus from Panormus, Basilides from Cydonia, and Evarestus from Heracleum. Their zeal had united them in their confession of Christ; they were apprehended, insulted, dragged on the ground, beaten, stoned, covered with phlegm and spittle, and at length presented to the governor of the island at Gortyna, and the twenty-third of December was appointed for their trial. As soon as they appeared in court, they were ordered to sacrifice to Jupiter, who was particularly worshipped in Crete, and on that very day their countrymen celebrated a festival in his honour with all manner of pleasures, diversions, and sacrifices. The martyrs answered, they could never offer sacrifice to idols. The president said, “You shall know the power of the great gods. Neither do you shew respect to this illustrious assembly, which adores the great Jupiter, Juno, Rhea, and the rest.” The martyrs replied, “Mention not Jupiter, O president; nor his mother Rhea. We are no strangers to his pedigree, or to the history of his life and actions. We can shew you his grave: he was a native of this island, the tyrant of his country, and a man abandoned to every kind of lust, even with his own sex: with these crimes he defiled himself every hour, and made use of spells and inchantments to debauch others. Those who look upon him as a god, must look upon it as a divine thing to imitate his lust and intemperance.”",
        "The proconsul not being able to deny or confute what they alleged, swelled with rage, and the people were ready to tear them to pieces upon the spot, if he had not restrained them, and commanded the martyrs to be inhumanly tormented several ways. Some of them were hoisted on the rack, and torn with iron nails, so that the ground underneath was covered with great morsels of their flesh; others were pierced on their sides, and in almost every other part with sharp stones, reeds, and pointed sticks: others were beaten with heavy plummets of lead with such cruelty, that their very bones were in some parts broken, and in others disjointed, and their flesh was bruised and torn. The martyrs endured all with joy, and often repeated to the outcries of the judge and mob, who pressed them to spare themselves by obeying the prince, and sacrificing to their gods: “We are Christians: were a thousand deaths prepared for us, we would receive them with joy.” The whole city thronged about them, and many cried out to the judge against them; nor did he cease stirring up the executioners to exert their whole strength in tormenting them. The saints stood like meek lambs in the midst of so many raging tygers, and only raised their voices to praise God, and declare their constant adherence to his law. The proconsul at length seeing himself vanquished, condemned them to die by the sword. The soldiers of Christ went forth triumphant to the place of execution without the city, praying to their last breath that God would have mercy on them, and on all mankind, and would deliver their countrymen from the blindness of spiritual ignorance, and bring them to see him in his true light. They were ambitious who should first receive his crown. When their heads were struck off, and the crowds retired, certain Christians interred their bodies, which were afterward conveyed to Rome. The fathers who composed the council of Crete in 558, writing to the emperor Leo, say, that through the intercession of these holy martyrs, their island had been till that time preserved from heresy. The Greeks, Latins, and Muscovites commemorate them on this day. See their Acts in Metaphrastes, Surius, and Lipoman, mentioned in Greek by Fabricius, t. 6. p. 520. See also Creta Sacra.",
        ],
        "December 23",
        "pp. 286-288",
        { expect: 2 },
      ),
    ],
  },
  {
    saint: "anastasia-the-pharmakolytria",
    slug: "martyrdom-of-anastasia",
    title: "The Martyrdom of St. Anastasia",
    subtitle: "As Alban Butler tells it",
    source: `${BUTLER_VOL.xii}, December 25, p. 320, public domain. ${READ_BUTLER} Her Life ends where Butler turns to another St. Anastasia, called the Elder.`,
    passages: [
      butler(
        "xii",
        [
        "Her name is mentioned in the canon of the mass, in the sacramentary of St. Gregory, and in other ancient catalogues of martyrs. There stands in Rome an ancient church, which is dedicated to God in her memory. In the acts of St. Chrysogonus we are told, that she was of an illustrious descent at Rome, had St. Chrysogonus for her tutor and director in the faith, and when that holy martyr was apprehended at Aquileia in the persecution of Dioclesian, went thither to comfort him in his chains. It is farther related, that after suffering exquisite tortures, she was sentenced by the prefect of Illyricum to be burnt alive in 304. Her body was removed to Rome, and laid in the church which still bears her name. In this church the popes anciently said their second mass on Christmas-night, or rather that of the morning, whence a commemoration of her is made in the second mass. The relicks of St. Anastasia were translated to Constantinople in the time of the emperor Leo, and deposited first in the church of Anastasia or the Resurrection, afterward in the patriarchal church of St. Sophia: but were lost when that city was taken by the Turks. The Greek Menologies and the Muscovite Calendars commemorate our saint on the twenty-second of December, the Roman Missal on the twenty-fifth. See on her also Nicephorus, Suidas, and Jos. Assemani ad 22 Dec. p. 489.",
        ],
        "December 25",
        "p. 320",
        { expect: 1 },
      ),
    ],
  },
  {
    saint: "eugenia-of-rome",
    slug: "martyrdom-of-eugenia",
    title: "The Martyrdom of St. Eugenia",
    subtitle: "As Alban Butler tells it",
    source: `${BUTLER_VOL.xii}, December 25, p. 321, public domain. ${READ_BUTLER}`,
    passages: [
      butler(
        "xii",
        [
        "She suffered at Rome under Valerian about the year 257, and is mentioned by St. Avitus, though we have no authentic acts of her sufferings, those recited by Metaphrastes and Surius deserving no notice. She is also mentioned in the lives of SS. Protus and Hyacinthus, MM. on the eleventh of September, p. 116.",
        ],
        "December 25",
        "p. 321",
        { expect: 1 },
      ),
    ],
  },
  {
    saint: "theodore-the-branded",
    slug: "life-of-theodore-the-branded",
    title: "The Life of St. Theodore the Branded",
    subtitle: "As Alban Butler tells it",
    source: `${BUTLER_VOL.xii}, December 27, pp. 346-347, public domain. ${READ_BUTLER} Butler calls him Theodorus Grapt.`,
    passages: [
      butler(
        "xii",
        [
        "This saint was of the country of the Moabites; but his parents, who were rich and virtuous, went and settled at Jerusalem, in order to procure him the advantages of a holy education. He was placed by them when he was very young, in the monastery of Sabas, and by his progress in learning, the extraordinary purity of his manners, and the habitual mortification of his senses, attained in a short time to an eminent degree of virtue, and acquired a high reputation in the world. The patriarch of Jerusalem obliged him to receive priestly orders, and when Leo the Armenian waged a cruel war against holy images, sent the saint to that emperor to exhort him not to disturb the peace of the church. The tyrant, instead of relenting, caused St. Theodorus to be scourged, and banished him, with his brother Theophanes, a monk of the same monastery, and his companion, into an island in the mouth of the Euxine sea, where they suffered much by hunger and cold. But they had not staid long there before the emperor died, in 822, when they returned to Constantinople, and St. Theodorus published some writings in defence of the truth. Michael the Stutterer, who succeeded in the imperial throne, and is thought either to have had no religion, or to have leaned most to that of the Manichees or Paulicians, was for steering a middle course between the catholics and the Iconoclasts. He cast St. Theodorus into prison, and afterward sent him into exile. His son and successor Theophilus, a violent Iconoclast, and barbarous persecutor, who ascended the throne in 829, caused the two brothers to be whipped; then banished them into the island of Aphusia. Two years after, they were brought back to Constantinople, buffeted in presence of the emperor till they fell down quite stunned at his feet, then stripped and publicly scourged. When they had lain some days in prison, and still persisted in their refusal to communicate with the Iconoclasts, the emperor commanded twelve Iambic verses, composed for that purpose by an Iconoclast courtier, to be inscribed on their foreheads. The sense of the verses was as follows: “These men have appeared at Jerusalem as vessels of iniquity, full of superstitious error, and were driven thence for their crimes: and having fled to Constantinople they forsook not their impiety. Wherefore they have been again banished from thence, and are stigmatized on their faces.” Though the wounds which they had received by their stripes, were yet much inflamed, and very painful, they were laid upon benches, whilst the letters which composed those verses were cut or pricked upon their faces. The operation was long and tedious, and interrupted by the coming on of the night; and the confessors were sent back to prison, their faces being still bloody. They were soon after banished to Apamea in Syria, where St. Theodorus died of his sufferings. From the inscription cut in his forehead he is surnamed Grapt, which signifies in Greek, marked or engraved. Theophilus died about the same time, and the empress Theodora, a zealous catholic, becoming regent for her son Michael, St. Methodius was made patriarch, and restored holy images in 842. Theophanes was then honoured for his glorious confession of the faith, and constituted bishop of Nice, that he might more effectually concur in overthrowing a heresy, over which he had already triumphed. Saint Theodorus Grapt is named in the Roman Martyrology with his brother Theophanes on this day. The Greeks honour the former on this twenty-seventh of December, and Saint Theophanes, whom, on account of sacred hymns which he composed, they style the poet, on the eleventh of October. See the authentic life of St. Theodorus Grapt in Metaphrastes, Baronius, and Fleury, l. 47, &c. The twelve iambic verses, which were wrote on their foreheads, with a red hot steel pencil, are recited in the Greek Synaxary on this day.",
        ],
        "December 27",
        "pp. 346-347",
        { expect: 1 },
      ),
    ],
  },
  {
    saint: "marcellus-of-the-unsleeping-ones",
    slug: "life-of-marcellus",
    title: "The Life of St. Marcellus",
    subtitle: "As Alban Butler tells it",
    source: `${BUTLER_VOL.xii}, December 29, pp. 386-388, public domain. ${READ_BUTLER}`,
    passages: [
      butler(
        "xii",
        [
        "The Order of the Acœmetes differed from other Basilian monks only by this particular rule, that each monastery was divided into several choirs, which, succeeding one another, continued the divine office day and night without interruption; whence was derived their name, which signifies in Greek, without sleep. This institute was set on foot by a Syrian nobleman, named Alexander, who had bore an honourable command in the army several years; but renouncing the world in 402, built a monastery upon the banks of the Euphrates, in which he assembled four hundred monks. Coming afterward to Constantinople, he founded a monastery not far from the city, toward the Euxine sea, in which he governed three hundred monks, whom he divided into six choirs. Alexander died in 430. Bollandus gives his life on the fifteenth of January, and he is honoured with the title of saint when incidentally mentioned in the Menæa, but his name seems never to have been commemorated in any calendar either of the eastern or western church. His successor John removed his community to a monastery which he built at Gomon, a mile from Constantinople. St. Marcellus, who was chose third abbot of this house, raised the reputation of this order to the highest pitch. He was a native of Apamea in Syria, and, by the death of his parents, who were rich and of noble descent, he was left master of a plentiful fortune when he was in the flower of his age. Considering seriously with what vanities the little interval between a man’s birth and his death is usually filled in the world, he conceived a great distaste of its fooleries, and repairing to Antioch, made sacred studies, and the exercises of devotion, his whole employment. By holy meditation he saw daily more and more clearly the emptiness of all worldly occupations and enjoyments. An infant with all its childish toys about it, thinks itself happy; and what are these, if compared to those fooleries which in manhood are called business or amusements? From this contempt of earthly things, his love of those which are heavenly, daily grew stronger; and it was not long before he bestowed on the poor his whole personal estate, and settled his real estate upon a younger brother. Thus disencumbered, he repaired to Ephesus, and there put himself under the direction of certain eminent servants of God. The greatest part of the night he spent in prayer, and the day he employed in copying good books, by the sale of which he gained not only his own subsistence, but also wherewith to relieve the poor. The reputation of the austerity and solitude of the Acœmetes drew him thither; and taking the habit, he ran in a religious course with incredible ardour.",
        "Upon the death of Alexander, the founder and first abbot, Marcellus had been chosen to fill his place, had he not concealed himself by a timely flight. When he returned, John, who had been chosen abbot, compelled him to be his assistant in the discharge of his office; and upon his demise Marcellus was raised to that dignity. The order flourished exceedingly under his prudent and saintly administration; and when he was at a loss how sufficiently to enlarge his buildings, he was abundantly supplied with means for that purpose, by Pharetrius, a very opulent gentleman, who took the habit with all his sons on the same day. About the year 465, Studius, a nobleman who had been consul in 463, founded for him and his monks a great monastery within the city, near the golden gate, in which there are said to have been one thousand monks at the same time. This house being called by the founder’s name, the Acœmetes were from that time called Studites. St. Marcellus assisted at the council of Constantinople, assembled by St. Flavian against Eutyches, whose heresy our holy abbot condemned, with the prelates who composed that venerable assembly. St. Marcellus spent sixty years in a monastic state, and his long life was all filled with good works. He died in 485 or 486, and is honoured both by the Latins and Greeks on this day. See his authentic life in Surius, Bulteau, Bonanni, Herman, Scoonbeck, and Helyot, t. 2.",
        ],
        "December 29",
        "pp. 386-388",
        { expect: 2 },
      ),
    ],
  },
  {
    saint: "anysia-of-thessaloniki",
    slug: "martyrdom-of-anysia",
    title: "The Martyrdom of St. Anysia",
    subtitle: "As Alban Butler tells it",
    source: `${BUTLER_VOL.xii}, December 30, p. 393, public domain. ${READ_BUTLER} The page prints “presecution” for persecution; it is kept as printed.`,
    passages: [
      butler(
        "xii",
        [
        "Whilst the governor Dulcitius carried on a cruel presecution at Thessalonica to deter the Christians from holding religious assemblies, in 304, in the reign of Maximian Galerius, a Christian young lady called Anysia, of rich and noble parents, by whose death she was left an orphan, resolved to go to the assembly of the faithful. As she passed by the gate of Cassandra, one of the emperor’s guards who happened to see her, was taken with her beauty, and stepping before her said: “Stay, whither are you going?” Anysia startled at his insolence, and fearing a temptation, made the sign of the cross upon her forehead. The soldier, offended at her silence, seized her, and asked her roughly, “Who art thou, and whither art thou going?” “I am,” said she, “a servant of Jesus Christ, and am going to the Lord’s assembly.” “I will prevent that,” said he, “and will bring thee to sacrifice to the gods; for to-day we adore the sun:” that day being called by the pagans Sunday. Saying this, he tore off her veil to discover her face. Anysia endeavoured to hinder him; but the soldier enraged, drew his sword, and ran it through her body, so that it came out on the other side. She fell down immediately, trembling, and bathed in her blood, and there expired. Her name occurs in the Roman Martyrology, in the Greek Synaxary, and the Menology of the emperor Basil, on the thirtieth of December. See her genuine Greek Acts, also her panegyric by Philotheus, patriarch of Constantinople, mentioned by Allatius and by Fabricius, Bibl. Græc. t. 6. p. 513. See also Surius, 30 Decemb. Baron. ad an. 303. n. 48. Fleury, l. 8. n. 304.",
        ],
        "December 30",
        "p. 393",
        { expect: 1 },
      ),
    ],
  },
  {
    saint: "sebastian-and-companions",
    slug: "martyrdom-of-sebastian",
    title: "The Martyrdom of St. Sebastian",
    subtitle: "As Alban Butler tells it",
    source: `${BUTLER_VOL.i}, January 20, pp. 239-242, public domain. ${READ_BUTLER}`,
    passages: [
      butler(
        "i",
        [
        "St. Sebastian was born at Narbonne, in Gaul, but his parents were of Milan, in Italy, and he was brought up in that city. He was a fervent servant of Christ, and though his natural inclinations gave him an aversion to a military life, yet to be better able, without suspicion, to assist the confessors and martyrs in their sufferings, he went to Rome, and entered the army under the emperor Carinus, about the year 283. It happened that the martyrs, Marcus and Marcellianus, under sentence of death, appeared in danger of being shaken in their faith by the tears of their friends: Sebastian seeing this, stept in, and made them a long exhortation to constancy, which he delivered with the holy fire, that strongly affected all his hearers. Zoë, the wife of Nicostratus, having for six years lost the use of speech, by a palsy in her tongue, fell at his feet, and spoke distinctly, by the saint’s making the sign of the cross on her mouth. She, with her husband Nicostratus, who was master of the rolls, the parents of Marcus and Marcellianus, the jailor Claudius, and sixteen other prisoners, were converted; and Nicostratus, who had charge of the prisoners, took them to his own house, where Polycarp, a holy priest, instructed and baptized them. Chromatius, governor of Rome, being informed of this, and that Tranquillinus, the father of Saints Marcus and Marcellianus, had been cured of the gout by receiving baptism, desired to be instructed in the faith, being himself grievously afflicted with the same distemper. Accordingly, having sent for Sebastian, he was cured by him, and baptized with his son Tiburtius. He then enlarged the converted prisoners, made his slaves free, and resigned his prefectship.",
        "Not long after, in the year 285, Carinus was defeated and slain in Illyricum by Dioclesian, who, the year following, made Maximian his colleague in the empire. The persecution was still carried on by the magistrates, in the same manner as under Carinus, without any new edicts. Dioclesian, admiring the courage and virtue of St. Sebastian, who concealed his religion, would fain have him near his person, and created him captain of a company of the pretorian guards, which was a considerable dignity. When Dioclesian went into the East, Maximian, who remained in the West, honoured our saint with the same distinction and respect. Chromatius with the emperor’s consent, retired into the country in Campania, taking many new converts along with him. It was a contest of zeal, out of a mutual desire of martyrdom, between St. Sebastian and the priest Polycarp, which of them should accompany this troop, to complete their instruction, and which should remain in the city, to encourage and assist the martyrs, which latter was the more dangerous province. St. Austin wished to see such contests of charity amongst the ministers of the church. Pope Caius, who was appealed to, judged it most proper, that Sebastian should stay in Rome, as a defender of the church. In the year 286, the persecution growing hot, the pope and others concealed themselves in the imperial palace, as a place of the greatest safety, in the apartments of one Castulus, a christian officer of the court. Saint Zoë was first apprehended, praying at St. Peter’s tomb on the feast of the apostles. She was stifled with smoke, being hung by the heels over a fire. Tranquillinus, ashamed to be less courageous than a woman, went to pray at the tomb of St. Paul, and was seized by the populace, and stoned to death. Nicostratus, Claudius, Castorius, and Victorinus were taken, and after being thrice tortured, were thrown into the sea. Tiburtius, betrayed by a false brother, was beheaded. Castulus, accused by the same wretch, was thrice put on the rack, and afterward buried alive. Marcus and Marcellianus were nailed by the feet to a post, and having remained in that torment twenty-four hours, were shot to death with arrows.",
        "St. Sebastian, having sent so many martyrs to heaven before him, was himself impeached before the emperor Dioclesian; who, having grievously reproached him with ingratitude, delivered him over to certain archers of Mauritania, to be shot to death. His body was covered with arrows, and he left for dead. Irene, the widow of St. Castulus, going to bury him, found him still alive, and took him to her lodgings, where, by care, he recovered of his wounds, but refused to fly, and even placed himself one day by a staircase, where the emperor was to pass, whom he first accosted, reproaching him for his unjust cruelties against the Christians. This freedom of speech, and from a person too whom he supposed to have been dead, greatly astonished the emperor; but recovering from his surprise, he gave orders for his being seized and beat to death with cudgels, and his body thrown into the common sewer. A pious lady called Lucina, admonished by the martyr in a vision, got it privately removed, and buried it in the catacombs, at the entrance of the cemetery of Calixtus. A church was afterward built over his relicks, by pope Damasus, which is one of the seven ancient stationary churches at Rome, but not one of the seven principal churches of that city, as some moderns mistake; it neither being one of the five patriarchal churches, nor one of the seventy-two old churches which give titles to cardinals. Vandelbert, Saint Ado, Eginard, Sigebert, and other cotemporary authors relate, that in the reign of Lewis Debonnair, pope Eugenius II. gave the body of St. Sebastian to Hilduin, abbot of St. Denys, who brought it into France, and it was deposited at Saint Medard’s, at Soissons, on the ninth of December, in 826; with it is said to have been brought a considerable portion of the relicks of St. Gregory the Great. The rich shrines of SS. Sebastian, Gregory, and Medard, were plundered by the Calvinists, in 1564, and the sacred bones thrown into a ditch, in which there was water. Upon the declaration of two eye-witnesses, they were afterward found by the Catholics; and in 1578, enclosed in three new shrines, though the bones of the three saints could not be distinguished from each other. The head of this martyr, which was given to St. Willibrord, by pope Sergius, is kept at Esternach, in the dutchy of Luxemburg. Portions of his relicks are shewn in the cathedral at St. Victor’s; the Theatins and Minims at Paris; in four churches at Mantua; at Malaca, Seville, Toulouse, Munich in the ducal palace, Tournay in the cathedral, Antwerp in the church of the Jesuits, and at Brussels, in the chapel of the court, not at St. Gudula’s, as some have mistaken. Saint Sebastian has been always honoured by the church, as one of her most illustrious martyrs. We read in Paul the deacon, in what manner, in the year 680, Rome was freed from a raging pestilence, by the patronage of this saint. Milan, in 1575, Lisbon, in 1599, and other places, have experienced in like calamities, the miraculous effects of his intercession with God in their behalf.",
        ],
        "January 20",
        "pp. 239-242",
        { expect: 3 },
      ),
    ],
  },
  {
    saint: "thyrsus-leucius-and-callinicus",
    slug: "martyrdom-of-thyrsus-leucius-and-callinicus",
    title: "The Martyrdom of Sts. Thyrsus, Leucius and Callinicus",
    subtitle: "As Alban Butler tells it",
    source: `${BUTLER_VOL.i}, January 28, p. 404, public domain. ${READ_BUTLER}`,
    passages: [
      butler(
        "i",
        [
        "Their Greek and Latin Acts agree that, after suffering many torments, they were put to death, on three different days, at Apollonia in Phrygia, in the persecution of Decius. Sozomen tells us that Cæsarius, who had been prefect and consul, built at Constantinople a magnificent church under the invocation of St. Thyrsus, with a portion of whose relicks it was enriched. Another church within the city bore his name, as appears from the Menæa, on the fourteenth of December. In the cathedral of our Lady at Sisteron, in a church at Limoges, &c. St. Thyrsus is one of the patrons. Many churches in Spain bear his name. Silon, king of Oviedo and Asturia, in a letter to Cyxilas, archbishop of Toledo in 777, says, that the queen had sent presents to the church of St. Thyrsus, which the archbishop had built, viz. a silver chalice and paten, a basin to wash the hands in, with a pipe and a diadem on the cover, to be used when the blood of our Lord was distributed to the people.",
        ],
        "January 28",
        "p. 404",
        { expect: 1 },
      ),
    ],
  },
  {
    saint: "juliana-of-nicomedia",
    slug: "martyrdom-of-juliana",
    title: "The Martyrdom of St. Juliana",
    subtitle: "As Alban Butler tells it",
    source: `${BUTLER_VOL.ii}, February 16, p. 163, public domain. ${READ_BUTLER}`,
    passages: [
      butler(
        "ii",
        [
        "After many torments, she was beheaded at Nicomedia, under Galerius Maximianus. St. Gregory the Great mentions, that her bones were translated to Rome. Part of them are now at Brussels, in the church of our Lady of Sablon. This saint is much honoured in the Low-Countries. Her acts in Bollandus deserve no notice. Bede, and martyrologies ascribed to St. Jerom, call this the day of her martyrdom, which the ancient Corbie manuscript places at Nicomedia. See Chatelain’s notes on the martyrology, p. 667.",
        ],
        "February 16",
        "p. 163",
        { expect: 1 },
      ),
    ],
  },
  {
    saint: "philemon-apollonius-and-arrianus",
    slug: "martyrdom-of-apollonius-and-philemon",
    title: "The Martyrdom of Apollonius and Philemon",
    subtitle: "As Alban Butler tells it",
    source: `${BUTLER_VOL.iii}, March 8, p. 88, public domain. ${READ_BUTLER}`,
    passages: [
      butler(
        "iii",
        [
        "Apollonius was a zealous holy anchoret, and was apprehended by the persecutors at Antinous in Egypt. Many heathens came to insult and affront him while in chains; and among others one Philemon, a musician, very famous, and much admired by the people. He treated the martyr as an impious person and a seducer, and one that deserved the public hatred. To his injuries the saint only answered, “My son, may God have mercy on thee, and not lay these reproaches to thy charge.” This his meekness wrought so powerfully on Philemon, that he forthwith confessed himself a Christian. Both were brought before the judge whom Metaphrastes and Usuard call Arian, and who had already put to death SS. Asclas, Timothy, Paphnutius, and several other martyrs: after making them suffer all manner of tortures, he condemned them to be burnt alive. When the fire was kindled about them, Apollonius prayed: Lord, deliver not to beasts the souls who confess thee; but manifest thy power. At that instant a cloud of dew encompassed the martyrs, and put out the fire. The judge and people cried out at this miracle: “The God of the Christians is the great and only God.” The prefect of Egypt being informed of it, caused the judge and the two confessors to be brought, loaded with irons, to Alexandria. During the journey, Apollonius, by his instructions, prevailed so far upon those who conducted him, that they presented themselves also to the judge with their prisoners, and confessed themselves likewise to be Christians. The prefect finding their constancy invincible, caused them all to be thrown into the sea, about the year 311. Their bodies were afterward found on the shore, and were all put into one sepulchre. “By whom,” says Rufinus, “many miracles are wrought to the present time, and the vows and prayers of all are received, and are accomplished. Hither the Lord was pleased to bring me, and to fulfil my requests.” See Rufinus Vit. Patr. l. 2. c. 19. p. 477. Palladius Lausiac. c. 65, 66.",
        ],
        "March 8",
        "p. 88",
        { expect: 1 },
      ),
    ],
  },
  {
    saint: "boniface-of-tarsus",
    slug: "martyrdom-of-boniface",
    title: "The Martyrdom of St. Boniface",
    subtitle: "As Alban Butler tells it",
    source: `${BUTLER_VOL.v}, May 14, pp. 190-193, public domain. ${READ_BUTLER} The page prints “Maximinus Daie”, where the edition prints Daia elsewhere; it is kept as printed.`,
    passages: [
      butler(
        "v",
        [
        "There lived at Rome, about the beginning of the fourth century, a certain lady called Aglaë, young, beautiful, and well born, and so rich and fond of making a figure in the world, that she had entertained the city three several times with public shows at her own charge. Her chief steward was one Boniface, with whom she entertained a criminal commerce. This man, though addicted to wine and all kinds of debauchery, was however remarkable for three good qualities, hospitality, liberality, and compassion. Whensoever he saw a stranger or traveller, he would assist him very cordially; and he used to go about the streets, and into the public places in the night time, and relieved the poor according to their necessities. After several years commerce in the vicious way already mentioned, Aglaë, touched with a motion of divine grace, and feeling some compunction within herself, called Boniface to her, and thus opened her mind to him: “You are sensible how deep we are plunged in vice, without reflecting that we must appear before God to give an account of all our actions. I have heard say, that they who honour those that suffer for the sake of Jesus Christ, shall have a share in their glory. In the East the servants of Jesus Christ every day suffer torments, and lay down their lives for his sake. Go thither then, and bring me the relicks of some of those conquerors, that we may honour their memories, and be saved by their assistance.” Boniface came into the proposal; and having raised a considerable sum of money to purchase the bodies of the martyrs from their executioners, and to distribute among the poor, said to Aglaë on his departure: “I wont fail to bring back with me the relicks of martyrs, if I find any; but what if my own body should be brought to you for that of a martyr?” She reproved him for jesting in a matter so serious. The steward set out, but was now entirely a new man. Penetrated with sentiments of compunction, in all that long journey from Rome into the East, he neither eat meat nor drank wine; and his fasts he accompanied with prayers, tears, and penitential works. The church at that time enjoyed peace in the West, but in the East, the persecution which had been begun by Dioclesian, was carried on with great cruelty by Galerius Maximianus and Maximinus Daie. It raged most fiercely in Cilicia, under an inhuman governor named Simplicius. Boniface therefore directed his journey to Tarsus, the capital of that country. He no sooner arrived at the city, but alighting, he sent away all his servants with the horses to an inn, and went himself straight to the court of the governor, whom he found seated on his tribunal, and many holy martyrs suffering under their tortures: one hanged up by the feet, with his head over a fire: another stretched almost to the tearing of his limbs on four planks or stakes: a third sawn asunder: a fourth had his hands cut off: a fifth was fixed to the ground by a stake run through his neck: a sixth having his hands and feet tied behind him, the executioners were beating him with clubs. There were no less than twenty tortured after this cruel manner, the sight whereof shocked the beholders, while their courage and resolution filled them with amazement. Boniface went boldly up to these champions of Christ, and having saluted them, cried out: “Great is the God of the Christians, great is the God of the holy martyrs. I beseech you the servants of Jesus Christ to pray for me that I may join with you in fighting against the devil.” The governor thought himself insulted by so bold an action in his presence, and asked him in great wrath, who he was. The martyr answered, that he was a Christian, and that having Jesus Christ for his master, he feared nothing the governor could inflict to make him renounce that sacred name. Simplicius, in a rage, ordered some reeds to be sharpened and thrust under his nails: and this being done, he commanded boiling lead to be poured into his mouth. Boniface, after having called upon Jesus Christ for his assistance, begged the prayers of the other expiring martyrs, who all joined in putting up their petitions to God for him. The people, disgusted with so much cruelty, began to raise a tumult, and cried out: “Great is the God of the Christians.” Simplicius was alarmed, and withdrew. But the next day, being seated on his tribunal, he ordered Boniface to be brought before him a second time. The martyr appeared constant and undaunted. The judge commanded him to be cast into a caldron of boiling pitch; but he came out without receiving any hurt. Lastly, he was condemned to lose his head; and after a short prayer for the pardon of his sins, and the conversion of his persecutors, he cheerfully presented his neck to the executioner. His companions in the mean time not finding him return to the inn, searched for him in those parts of the city where they thought him most likely to be found. Being at last informed by the jailer’s brother, that a stranger had been beheaded the day before for his faith in Christ, and being shewn the dead body and the head, they assured him that it was the very person they were in search of, and beseeched him to bestow the martyr’s relicks upon them; this he refused to do without a reward: so they paid down five hundred pieces of gold; and having embalmed it, carried it home with them, praising God for the happy end of the blessed martyr. Aglaë, upon information of the affair, gave God thanks for his victory, and taking some priests with her, met the corpse with tapers and perfumes half a mile out of Rome, on the Latin road; and in that very place raised a monument in which she laid them, and some years after built a chapel. She from that time led a penitential retired life, and dying fifteen years after, was buried near his relicks. They were found in Rome in 1603, together with those of St. Alexius, in the church in Rome formerly called of Saint Boniface, but now of St. Alexius. The bodies of both Saint Boniface and St. Alexius lie under the stately high altar in two rich marble tombs. The martyrdom of St. Boniface happened about the year 307.",
        "Whilst we praise the divine mercy, who of sinners maketh saints, we ought earnestly to pray that he change our hearts from vessels of corruption into vessels of grace and his divine charity. Regret and sorrow for sin has many degrees; but till it has entirely subdued the corruptions, changed the affections, and purified the heart, it is not a saving repentance, or that charity and love which animates or impregnates the new creature. The certain proof of regeneration or of a real conversion is victory. He that is born of God, overcometh the world. The maxims of the gospel, the rules of the church, and reason itself forbid us to look upon him as a sincere convert whose life is very uneven, unconstant, and contradictory to itself; if he be to-day a saint, and to-morrow a sinner; if he follow to-day the impulses of the Holy Ghost, and yield to-morrow to the temptations of the enemy; or if he has not courage to fly the dangers and renounce the occasions which are fatal to him.",
        ],
        "May 14",
        "pp. 190-193",
        { expect: 2 },
      ),
    ],
  },
  {
    saint: "chrysogonus",
    slug: "martyrdom-of-chrysogonus",
    title: "The Martyrdom of Chrysogonus",
    subtitle: "As Alban Butler tells it",
    source: `${BUTLER_VOL.xi}, November 24, p. 417, public domain. ${READ_BUTLER}`,
    passages: [
      butler(
        "xi",
        [
        "The name of this holy martyr, who was apprehended at Rome, but beheaded at Aquileia in the persecution of Dioclesian, occurs in the canon of the mass, and is mentioned in the ancient Calendar of Carthage of the fifth century, and in all Western Martyrologies since that time. The church in Rome of which he is titular saint, is mentioned in a council held by pope Symmachus, and in the epistles of St. Gregory the Great; it gives title to a cardinal priest. The head of St. Chrysogonus is shewn there in a rich case; but his body is at Venice.",
        ],
        "November 24",
        "p. 417",
        { expect: 1 },
      ),
    ],
  },
];
