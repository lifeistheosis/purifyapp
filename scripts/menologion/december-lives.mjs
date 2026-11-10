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
];
