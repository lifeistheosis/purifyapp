// January's Lives in the witnesses' own words (docs/1.9-build/notes/january-saints.md).
//
// Read by scripts/ingest-witness-lives.mjs, as December's are
// (scripts/menologion/december-lives.mjs): each Life is one work of the
// saint's, its sections the passages below, in order, each the witness's
// words as the printed edition gives them, under its book and place. No prose
// of ours: a section's title names the place in the book, the reader names the
// witness (`author`), and the citation names the edition. St Malachi's book
// is his own words, as December's five prophets' were.

/** archive.org scans of each printed volume (two printings where there are two). */
const SCAN = {
  npnf201: ["selectlibraryofn01scha"],
  npnf206: ["selectlibraryofn06scha", "selectlibraryofn06schauoft"],
  mouravieff: ["historyofchurcho00mouriala"],
  // Louise Ropes Loomis's Book of the Popes (New York: Columbia University
  // Press, 1916): Toronto's scan and Cornell's, of the same printing.
  loomis: ["bookofpopesliber00loomuoft", "cu31924006163897"],
};

const ED = {
  eusebius: "tr. Arthur Cushman McGiffert (NPNF II 1, 1890)",
  jerome: "tr. W. H. Fremantle (NPNF II 6, 1893)",
  loomis: "tr. Louise Ropes Loomis (The Book of the Popes (Liber Pontificalis) I, New York: Columbia University Press, 1916)",
  mouravieff: "tr. R. W. Blackmore (Oxford, 1842)",
};

/**
 * A section's title names its place in the book, short enough to stand whole
 * on the reader's chapter button (checkMock's "cut" rule): the book itself is
 * named in the work's title and in every section's citation.
 */
const TITLE_MAX = 26;

/** The words every source line ends with, saying how the text was read. */
const READ =
  "CCEL's transcription of each volume read word for word against archive.org's scans of the same printing; where they differ, the printed page is followed. The editions' footnotes, page numbers and running heads, and their marks in the text, are left out; the paragraphs and the numbers at their heads are as printed. The section titles name the place in each book.";
const SCRIPTURE_READ = "Scripture is the King James Version, as the app's Bible carries it, word for word.";

/** How a passage typed from the page images was read (November's words). */
const READ_TYPED =
  "Typed from the page images of archive.org's scan of the printing, read line by line, and compared word for word with the scan's text. The editions' footnotes and their marks are left out, and italics are set plain; the paragraphs are as printed. The section titles name the place in each book.";

const typed = (book, text, more) => ({ kind: "transcribed", text, scans: SCAN[book], ...more });
const e = (vol, from, more) => ({ vol, from, scans: SCAN[vol], ...more });

/*
 * Alban Butler's Lives, for nine of the month's saints whose one Life in
 * English is his (a Catholic priest; the Lives first printed 1756 to 1759).
 * The owner's word (2026-11-11, call 34, "yes Butler January"): published
 * with no priest's check, as November's and December's were, word for word
 * with Butler's name on each, any passage of Roman doctrine against the
 * Orthodox Church cut and shown as […]. None was found in these nine, and no
 * sentence that demeans a people, so nothing is cut.
 *
 * THE EDITION. The London stereotype edition in twelve volumes, printed for
 * John Murphy: vol. I for the January saints, vol. II for St. Polyeuctus,
 * whom Butler keeps on February 13. Each Life was drafted from two scans of
 * the same printing (Princeton Theological Seminary's copy, whose page images
 * were read, and the Digital Library of India's, line for line the same) and
 * then typed from the page images, line by line (scripts/menologion/scan-
 * draft, january-butler.json). The scans below are the ones the words are
 * checked against now: that second scan, and the same text set again at
 * Edinburgh (1798) and at Derby (1842).
 *
 * WHAT IS LEFT OUT. Butler's footnotes and their marks, the note of his
 * sources and the date under each heading, the heading, the running heads,
 * the page numbers; his italics and small capitals are set plain, his
 * ligatures (Cæsarea, Acæmetes) kept. Where his heading is the subject of
 * his first sentence (St. Gordius, the Fathers of Sinai), it stands at the
 * sentence's head, and the source says so.
 */
const BUTLER_SCAN = {
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
};

const BUTLER_BOOK = "Alban Butler, The Lives of the Fathers, Martyrs, and Other Principal Saints";
/** Each volume as its title page names it. */
const BUTLER_VOL = {
  i: `${BUTLER_BOOK}, vol. I (London: John Murphy, 1812)`,
  ii: `${BUTLER_BOOK}, vol. II (London: John Murphy, 1815)`,
};

/** November's words for how a Life of Butler's was read. */
const READ_BUTLER =
  "Read from the page images of archive.org's scan of the printing, word by word against a second scan of the same printing; where they differ, the printed page is followed. Butler's footnotes, the note of his sources under each heading and the running heads are left out, and his italics are set plain; the paragraphs are as printed.";

/**
 * One Life: Butler's words for the day, typed from the page, checked against
 * the scans of `vol`. Its section is named by the day and the pages, short
 * enough for the chapter button (TITLE_MAX); the book is in the citation.
 */
const butler = (vol, text, day, pages, more) => ({
  kind: "transcribed",
  text,
  scans: BUTLER_SCAN[vol],
  title: `${day}, ${pages}`,
  author: "Alban Butler",
  citation: `${BUTLER_VOL[vol]}, ${day}, ${pages}`,
  ...more,
});

/** A prophet's book, whole, chapter by chapter, from the app's Bible (Brenton). */
const book = (name, chapters, more = {}) =>
  chapters.map(([chapter, from, to]) => ({
    kind: "scripture",
    book: name,
    chapter,
    from,
    to,
    title: `${more.title ?? name[0].toUpperCase() + name.slice(1)} ${chapter}`,
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
 * Mouravieff, A History of the Church of Russia, ch. V, typed from the page
 * images of historyofchurcho00mouriala (pp. 114-118, scan leaves n137 to
 * n141), read line by line. The page has what the scan's text misread: "his"
 * under a blot (p. 116, "the yoke of his virtues"), "Däevichy" with its
 * diaeresis, "martyrdom", "incorruptible" and "was"; the footnote marks after
 * "tafia" (74) and "away" (77) are left out, as the house leaves out every
 * note's mark. "John" opens the section in small capitals, set plain.
 */
const PHILIP_PARAS = [
  "John then called to mind an old acquaintance of his childhood, the holy Hegumen Philip, of the noble family of Kolicheff. He had long since quitted the vanities of the world, and had retired to the wild solitude of the Solovetsky monastery, where the strict life of the monk did not prevent his occupying himself with the regulation of his own distant convent, or with diffusing the light of Christianity over the shores of the White sea. The fame of the holy life of Philip put it into the Tsar’s mind to summon him to his own presence, upon the ground that he needed his spiritual counsel. With bitter tears the old man quitted his retirement, and, alarmed at the offer of so exalted a station, entreated not to be torn from his cell, and from the study of the holy Fathers. He understood the duties of the office to which he was called, and foresaw also what would be his own fate. The first thing he did was to refuse to recognise the ruinous distinction of the Tsar’s “Personalty,” which deprived him of part of his flock. He implored the bishops to oppose themselves firmly to such an injurious division; but some of them kept silence from fear, others connived at what was done, to gain the favour of men; all besought him not to irritate their frantic sovereign by attempting to withdraw himself, nor abandon the kingdom and the Church to his wrath; and in deference to their hopes, which were destined to be disappointed, Philip consented, not wishing to incur the imputation of pride and obstinacy. He knew that fresh horrors would be sure soon to bring him face to face with John, and give him an opportunity of speaking to him the words of truth.",
  "On the very day of his consecration he gave utterance to words of admonition and reproof in the answer which he made from his chair to the customary address of recognition by the Tsar. “For silence,” said the zealous pastor, “lays sin upon the soul, and brings death to the whole people.” John, still under the influence of his first impression, listened quietly to the metropolitan, and put on a show of courteousness towards him, or, to speak more correctly, of endurance; the executions ceased for a time, though that was indeed but a short one. Very soon they began again with fresh horrors in the wretched capital, and the cries of the boyars, who fled to Philip for protection, deeply wrung his soul.",
  "Once, on a Sunday, while he was celebrating the liturgy in the cathedral of the Assumption, the Tsar entered with a crowd of his “Peculiars,” dressed in strange attire, and presented himself before the primate’s chair to receive the blessing. But the prelate kept his eyes steadily fixed on the Icon of the Saviour, and appeared not to notice the approach of the sovereign. The boyars announced to him that John was there. “I do not recognise the Tsar,” he exclaimed, “in any such dress; I do not recognise him either in the acts of his government. What is this that thou hast done, O Tsar, to put off from thee the form of thine honour? Fear the judgments of God. Here we are offering up the bloodless sacrifice to the Lord; while behind the altar there is flowing the innocent blood of Christian men.” John boiled over with fury, and tried to stop his lips with menaces; but these had no terrors for the holy man. “I am a stranger and a pilgrim upon earth, as all my fathers were,” he quietly replied, “and I am ready to suffer for the truth. Where would be my faith if I kept silence?”",
  "John left the church almost beside himself with passion; but still, notwithstanding the suggestions of those about him, some secret awe restrained him from laying hands on the saint; he only avoided his presence, and took care never to meet him but in the churches, and there he heard himself reproved. A procession brought them both together upon the walls of the Däevichy convent, and the metropolitan, as he turned himself towards the people, perceived one of the “Peculiars” with his head covered; he pointed out the offender to John, and complained of this Tartar habit of his suite. But the favourite of the Tsar had already taken off his tafia, and in his turn accused Philip of calumny. John at length felt determined to throw off the yoke of his virtues, by which he felt himself oppressed, and sought immediately for something like a ground of accusation against him. He sent Paphnutius, bishop of Souzdal, to the Solovetsky monastery, to make enquiries respecting the life of Philip on the spot itself, where the greater part of it had been spent in spiritual exercises. But none of the community dared to calumniate their former superior; only one man, the Hegumen Paisius, was induced by flattery and threats to accuse him. The Tsar, overjoyed, cited the metropolitan as a criminal before a spiritual council, where, in the number of his judges, sat the Lord of Novogorod, the ambitious Pimen, destined soon after to be rewarded as he deserved, with Philotheus of Riazan, Paphnutius of Souzdal, and others who were equally creatures of John. Imprisonment was the punishment they awarded him. St. Philip had foretold this to Pimen; and laying aside, of his own accord, his mantle and white cowl, he joyfully surrendered them to the Tsar, begging to be restored to his retired monastery and quiet, and imploring the bishops to stand up firmly for the Church of Christ. But John, who had been publicly reproved, wished to take an equally public and triumphant revenge. He compelled the metropolitan to perform once more the service of the liturgy. A crowd of the “Peculiars” rushed into the church with a shout after the service was begun, when the prelate was now standing before the altar quietly offering up his last sacrifice, and ready also to offer up himself for the name of Christ; they tore his robes from him, and left nothing on him but a shirt, and so dragged him to prison. The old man made the sign of the cross, and gave his benediction to the people as they were taking him along, and only repeated this one word, “Pray!” and at the doors of the cathedral, he exclaimed, “I rejoice that I have received all this for the sake of the Church. Alas! the times of her widowhood are coming, when her shepherds shall be despised as hirelings.”",
  "On the next day, in the royal palace, and in the presence of the Tsar, Philip’s sentence of deposition was announced to him. After having heard his own condemnation unmoved, he once more, for the last time, implored the Tsar to remember the good examples of his ancestors, and cease from his murders. In the monastery of St. Nicholas, where he was temporarily confined, he received as a present from John the bloody head of his nephew. Philip blessed it, and returned it to the sender. A week afterwards, he was conducted, under a strong guard, to the Otroch monastery in Tver, where he continued in his narrow cell in unceasing prayer till the time of his martyrdom.",
];

/** pp. 117-118, from section XLIII: his martyrdom and his relics, to the end of what it tells of him. */
const PHILIP_END = [
  "In the midst of the desolation which he had caused in Tver, the torturer did not forget his former victim; he sent his worthy assistant, Maliout Skouratoff, as if for Philip’s blessing, to the Otroch monastery. But St. Philip quietly said to him, “Execute thy mission;” and was strangled in his cell, suffering for the truth like another John the Baptist. The Church of Russia has been distinguished by many great prelates, but among them all there is only this one martyr, and his glory is incorruptible, even as are his holy relics themselves. The living words which he spake have kept as it were life and power even in his dead body, and this immoveable pillar which supports the Church crumbles not away. On four such pillars the Church of Moscow and of all Russia rests: Peter, Alexis, Jonah, Philip. Who can shake so firm a foundation? The relics of the holy martyr lie in the cathedral of the Assumption: in vain the Solovetsky convent desired to have them in the days of the mild Theodore, that he who had aforetime chosen the rocky cave of the ocean to be his lone retreat, might rest within hearing of its hoary waves. It was right that the good shepherd, who had laid down his life for the sheep, should repose on the spot where he had laboured and suffered.",
];

/**
 * The Book of the Popes, XXXIV, Sylvester, typed from the page images of
 * bookofpopesliber00loomuoft (pp. 41-42, leaves n66 and n67; pp. 71-72,
 * leaves n96 and n97) and checked against Cornell's scan of the printing.
 * The phrases the translator sets in the first of her two columns, where the
 * second recension lacks them ("driven by the persecution of Constantine",
 * "through baptism"), are read in their place in the sentence, as she prints
 * them; her note marks are left out. The entry between these two passages,
 * thirty pages of the churches the emperor built and the gifts he gave them,
 * is not of him and is left out.
 */
const SYLVESTER_OPENING = [
  "Sylvester, by nationality a Roman, son of Rufinus, occupied the see 23 years, 10 months and 11 days.",
  "He was bishop in the time of Constantine and Volusianus, from February 1 until January 1 in the consulship of Constantius and Volusianus.",
  "He was an exile on Mount Syraptin, driven by the persecution of Constantine, and afterward he returned and baptised with glory Constantine Augustus, whom the Lord cured through baptism of leprosy, from whose persecution he had fled when he was in exile. He built a church in the city of Rome, in the garden of one of his priests who was called Equitius, and he appointed it as a parish church of Rome, near the baths of Domitian, and even unto this day it is called the church of Equitius.",
];
const SYLVESTER_CLOSE = [
  "This Silvester held 6 ordinations in the month of December, 42 priests, 26 deacons, 65 bishops in divers places.",
  "He was buried in the cemetery of Priscilla on the Via Salaria, three miles from the city of Rome, December 31. He verily died catholic and a confessor.",
  "And the bishopric was empty 15 days.",
];

/** The Life of Paulus's eighteen chapters, as runs of the edition's paragraphs. */
const PAULUS_CHAPTERS = [
  ...Array.from({ length: 8 }, (_, i) => [i, i]),
  [8, 11],
  ...Array.from({ length: 9 }, (_, i) => [12 + i, 12 + i]),
];

/**
 * Where both scans misread the page: in chapter 7 a broken "o" that both
 * read "en earth" (p. 300, read on the page image); in chapter 16 "tradi-
 * tion", which both scans' text splits round the page's footnote, and "If I
 * return", where both read "1".
 */
const PAULUS_OCR = {
  7: [["on", "lived on earth"]],
  16: [["tradition", "christian tradition antony"], ["i", "if i return"]],
};

export const LIVES = [
  prophet("prophet-malachi", "the-prophecy-of-malachi", "The Prophecy of Malachi", "Malachi", "Malachias", [[1, 1, 14], [2, 1, 17], [3, 1, 18], [4, 1, 6]]),
  {
    // January 5's Micah is the elder, Micaiah son of Imlah (the calendar's
    // "the elder Micah, +9th c. BC"), not the Micah of the Twelve, whose page
    // (prophet-micah) keeps August 14.
    saint: "prophet-micaiah",
    slug: "micaiah-before-ahab",
    title: "Micaiah before Ahab",
    subtitle: "In the First Book of Kings",
    originalLanguage: "grc",
    source:
      "1 Kings 22:1-38, in Brenton's English Septuagint (1851, public domain; the Third Book of Kings in its count, where he is Michaias son of Jemblaa), as the app's Bible carries it, word for word: the prophet before Ahab and Jehoshaphat (Achaab and Josaphat in Brenton), and the word he spoke fulfilled.",
    passages: [{ kind: "scripture", book: "1-kings", chapter: 22, from: 1, to: 38, title: "1 Kings 22:1-38", citation: "1 Kings 22:1-38 (Brenton's Septuagint, 1851)", minWords: 10 }],
  },
  {
    saint: "apostle-timothy",
    slug: "timothy-in-scripture",
    title: "St. Timothy in Scripture",
    subtitle: "Every verse that names him, and Eusebius",
    originalLanguage: "grc",
    source: `${SCRIPTURE_READ} Every verse that names Timothy (Timotheus in most of them), with the verses round some of them that speak of him, in the order of the books; then Eusebius, Church History III.4.6, ${ED.eusebius}, public domain. ${READ}`,
    passages: [
      kjv("acts", 16, 1, 3),
      kjv("acts", 17, 14, 15),
      kjv("acts", 18, 5),
      kjv("acts", 19, 22),
      kjv("acts", 20, 4),
      kjv("romans", 16, 21),
      kjv("1-corinthians", 4, 17),
      kjv("1-corinthians", 16, 10, 11),
      kjv("2-corinthians", 1, 1),
      kjv("2-corinthians", 1, 19),
      kjv("philippians", 1, 1),
      kjv("philippians", 2, 19, 22),
      kjv("colossians", 1, 1),
      kjv("1-thessalonians", 1, 1),
      kjv("1-thessalonians", 3, 1, 6),
      kjv("2-thessalonians", 1, 1),
      kjv("1-timothy", 1, 1, 3),
      kjv("1-timothy", 1, 18),
      kjv("1-timothy", 6, 20),
      kjv("2-timothy", 1, 1, 5),
      kjv("philemon", 1, 1),
      kjv("hebrews", 13, 23),
      e("npnf201", "Chapter IV.--The First Successors of the Apostles.", {
        heading: 1,
        paras: [5, 5],
        title: "Church History III.4.6",
        author: "Eusebius of Caesarea",
        citation: `Eusebius, Church History III.4.6, ${ED.eusebius}`,
      }),
    ],
  },
  {
    saint: "philip-of-moscow",
    slug: "life-of-philip-of-moscow",
    title: "St. Philip of Moscow in Mouravieff",
    subtitle: "His rebuke of the Tsar, and his martyrdom",
    originalLanguage: "ru",
    source: `A. N. Mouravieff, A History of the Church of Russia, ch. V, section XLII, pp. 114-117, and from section XLIII, pp. 117-118, ${ED.mouravieff}; public domain. ${READ_TYPED} Section XLII whole; then, from the next, the sentences on his death and his relics, from where its account of the Tsar's march turns to him to where it turns away.`,
    passages: [
      typed("mouravieff", PHILIP_PARAS, {
        title: "Section XLII, pp. 114-117",
        author: "A. N. Mouravieff",
        citation: `A. N. Mouravieff, A History of the Church of Russia, ch. V, section XLII, pp. 114-117, ${ED.mouravieff}`,
      }),
      typed("mouravieff", PHILIP_END, {
        title: "Section XLIII, pp. 117-118",
        author: "A. N. Mouravieff",
        citation: `A. N. Mouravieff, A History of the Church of Russia, ch. V, section XLIII, pp. 117-118, ${ED.mouravieff}`,
      }),
    ],
  },
  {
    saint: "sylvester-of-rome",
    slug: "sylvester-in-the-book-of-the-popes",
    title: "St. Sylvester in the Book of the Popes",
    subtitle: "The Liber Pontificalis on his pontificate",
    originalLanguage: "la",
    source: `The Book of the Popes (Liber Pontificalis), XXXIV, Sylvester, pp. 41-42 and 71-72, ${ED.loomis}, public domain. ${READ_TYPED} The entry's opening and its close; the thirty pages between, of the churches Constantine built and the gifts he gave them, are left out.`,
    passages: [
      typed("loomis", SYLVESTER_OPENING, {
        // The page has these words (p. 41, leaf n66); the scans' text sets the
        // translator's long notes between this line and the next, and the
        // comparison loses its place in them.
        ocr: [["he", "he was an exile"], ["was", "he was an exile"], ["an", "was an exile"], ["exile", "an exile on"], ["on", "exile on mount"], ["mount", "on mount syraptin"], ["syraptin", "mount syraptin driven"]],
        title: "XXXIV, pp. 41-42",
        author: "The Book of the Popes",
        citation: `The Book of the Popes, XXXIV, Sylvester, pp. 41-42, ${ED.loomis}`,
      }),
      typed("loomis", SYLVESTER_CLOSE, {
        // The page has "Priscilla" and "Salaria" (p. 71, leaf n96); the
        // comparison matched the like sentence of the pope before him (buried
        // "in the cemetery of Calistus on the Via Appia").
        ocr: [["priscilla", "cemetery of priscilla"], ["salaria", "via salaria three"]],
        title: "XXXIV, pp. 71-72",
        author: "The Book of the Popes",
        citation: `The Book of the Popes, XXXIV, Sylvester, pp. 71-72, ${ED.loomis}`,
      }),
    ],
  },
  {
    // St Jerome's Life, already on St Jerome's page from an older file with
    // no citation to each part and the edition's preface at its head. St
    // Paul's page is held to the month's standard, so it carries the Life as
    // the witness path reads it: the same printing, each numbered chapter its
    // own section, cited, the preface (the editor's words) left out. The
    // reading room shows the Life once, as St Jerome's (sameAs).
    saint: "paul-of-thebes",
    slug: "life-of-paulus-the-first-hermit",
    title: "The Life of Paulus the First Hermit",
    subtitle: "Written by St. Jerome",
    originalLanguage: "la",
    source: `St. Jerome, The Life of Paulus the First Hermit, chapters 1 to 18, whole, ${ED.jerome}, public domain. ${READ} The edition's preface before chapter 1 is the editor's, and is left out.`,
    // Each chapter one paragraph as printed, but chapter 9, which holds two
    // lines of Virgil set apart and the paragraph after them (paragraphs 8 to
    // 11, counted from chapter 1's).
    passages: PAULUS_CHAPTERS.map(([first, last], i) =>
      e("npnf206", "1. It has been a subject of wide-spread and frequent discussion", {
        paras: [first, last],
        ...(PAULUS_OCR[i + 1] ? { ocr: PAULUS_OCR[i + 1] } : {}),
        title: `Chapter ${i + 1}`,
        author: "St. Jerome",
        citation: `St. Jerome, The Life of Paulus the First Hermit, ${i + 1}, ${ED.jerome}`,
      }),
    ),
  },
  {
    saint: "gordius-of-caesarea",
    slug: "martyrdom-of-gordius",
    title: "The Martyrdom of St. Gordius",
    subtitle: "As Alban Butler tells it",
    source: `${BUTLER_VOL.i}, January 3, p. 63, public domain. ${READ_BUTLER} Butler's heading, “St. Gordius,” is the subject of his first sentence, and is set at its head, before “martyred”.`,
    passages: [
      butler(
        "i",
        [
        "St. Gordius, martyred at Cæsarea, in Cappadocia, was a centurion in the army, but retired to the deserts when the persecution was first raised by Dioclesian. The desire of shedding his blood for Christ made him quit his solitude, whilst the people of that city were assembled in the Circus to solemnize public games in honour of Mars. His extenuated body, long beard and hair, and ragged clothes, drew on him the eyes of the whole assembly; yet, with this strange garb and mien, the graceful air of majesty that appeared in his countenance commanded veneration. Being examined by the governor, and loudly confessing his faith, he was condemned to be beheaded. Having fortified himself by the sign of the cross, he joyfully received the deadly blow. St. Basil, on this festival, pronounced his panegyric at Cæsarea, in which he says, several of his audience had been eye-witnesses of the martyr’s triumph. Hom. 17. T. 1.",
        ],
        "January 3",
        "p. 63",
        { expect: 1 },
      ),
    ],
  },
  {
    saint: "theodosius-the-cenobiarch",
    slug: "life-of-theodosius",
    title: "The Life of St. Theodosius",
    subtitle: "As Alban Butler tells it",
    source: `${BUTLER_VOL.i}, January 11, pp. 135-141, public domain. ${READ_BUTLER}`,
    passages: [
      butler(
        "i",
        [
        "St. Theodosius was born at Mogariassus, called in latter ages Marissa, in Cappadocia, in 423. He imbibed the first tincture of virtue from the fervent example and pious instructions of his virtuous parents. He was ordained reader, but some time after being moved by Abraham’s example to quit his country and friends, he resolved to put this motion in execution. He accordingly set out for Jerusalem, but went purposely out of his road, to visit the famous St. Simeon Stylites on his pillar, who foretold him several circumstances of his life, and gave him proper instructions for his behaviour in each. Having satisfied his devotion in visiting the holy places in Jerusalem, he began to consider in what manner he should dedicate himself to God in a religious state. The dangers of living without a guide, made him prefer a monastery to an hermitage; and he therefore put himself under the direction of a holy man named Longinus, to whom his virtue soon endeared him in a very particular manner. A pious lady having built a church under the invocation of the Blessed Virgin, on the high road to Bethlehem, Longinus could not well refuse her request, that his pupil should undertake the charge of it; but Theodosius, who loved only to obey, could not be induced by any entreaties to consent to this proposal: absolute commands were necessary to force him to a compliance. Nor did he govern long; for dreading the poison of vanity from the esteem of men, he retired into a cave at the top of a neighbouring desert mountain, and employed his time in fasting, watching, prayers, and tears, which almost continually flowed from his eyes. His food was coarse pulse and wild herbs: for thirty years he never tasted so much as a morsel of bread. Many desired to serve God under his direction: he at first determined only to admit six or seven, but was soon obliged to receive a greater number, and at length came to a resolution, which charity extorted from him, never to reject any that presented themselves with dispositions that seemed sincere. The first lesson which he taught his monks was, that the continual remembrance of death is the foundation of religious perfection; to imprint this more deeply in their minds, he caused a great grave or pit to be dug, which might serve for the common burial-place of the whole community, that by the presence of this memorial of death, and by continually meditating on that object, they might more perfectly learn to die daily. The burial-place being made, the abbot one day when he had led his monks to it said, “The grave is made, who will first perform the dedication?” Basil, a priest, who was one of the number, falling on his knees, said to St. Theodosius, “I am the person, be pleased to give me your blessing.” The abbot ordered the prayers of the church for the dead to be offered up for him, and on the fortieth day, Basil wonderfully departed to our Lord in peace, without any apparent sickness. When the holy company of disciples were twelve in number, it happened that at the great feast of Easter they had nothing to eat; they had not even bread for the sacrifice: some murmured; the saint bid them trust in God and he would provide; which was soon remarkably verified, by the arrival of certain mules loaded with provisions. The lustre of the sanctity and miracles of St. Theodosius, drawing great numbers to him who desired to serve God under his direction, his cave was too little for their reception; therefore, having consulted heaven by prayer, he, by its particular direction, built a spacious monastery at a place called Cathismus, not far from Bethlehem, at a small distance from his cave, and it was soon filled with holy monks. To this monastery were annexed three infirmaries; one for the sick, the gift of a pious lady in that neighbourhood; the two others St. Theodosius built himself, one for the aged and feeble, the other for such as had been punished with the loss of their senses, or by falling under the power of the devil, for rashly engaging in a religious state through pride, and without a due dependence on the grace of God to carry them through it. All succours, spiritual and temporal, were afforded in these infirmaries, with admirable order, care, and affection. He erected also several buildings for the reception of strangers, in which he exercised an unbounded hospitality, entertaining all that came, for whose use there were one day above an hundred tables served with provisions: these, when insufficient for the number of guests, were more than once miraculously multiplied by his prayers. The monastery itself was like a city of saints in the midst of a desert, and in it reigned regularity, silence, charity, and peace. There were four churches belonging to it, one for each of the three several nations of which his community was chiefly composed, each speaking a different language; the fourth was for the use of such as were in a state of penance, which those that recovered from their lunatic or possessed condition before-mentioned, were put into, and detained till they had expiated their fault. The nations into which his community was divided, were the Greeks, which were far the most numerous, and consisted of all those that came from any provinces of the empire; the Armenians, with whom were joined the Arabians and Persians; and, thirdly, the Bessi, who comprehended all the northern nations below Thrace, or all who used the Runic or Sclavonian tongue. Each nation sung the first part of the mass to the end of the gospel, in their own church, but after the gospel, all met in the church of the Greeks, where they celebrated the essential part of the sacrifice in Greek, and communicated all together.",
        "The monks passed a considerable part of the day and night at their devotions in the church, and at the times not set apart for public prayer and necessary rest, every one was obliged to apply himself to some trade, or manual labour, not incompatible with recollection, that the house might be supplied with conveniencies. Sallust, bishop of Jerusalem, appointed St. Sabas superior general of the hermits, and our saint of the Cenobites, or religious men living in community throughout all Palestine, whence he was styled the Cenobiarch. These two great servants of God lived in strict friendship, and had frequent spiritual conferences together; they were also united in their zeal and sufferings for the church.",
        "The emperor Anastasius patronised the Eutychian heresy, and used all possible means to engage our saint in his party. In 513 he deposed Elias, patriarch of Jerusalem, as he had banished Flavian II. patriarch of Antioch, and intruded Severus, an impious heretic, into that see, commanding the Syrians to obey and hold communion with him. SS. Theodosius and Sabas maintained boldly the right of Elias, and of John his successor; whereupon the imperial officers thought it most adviseable to connive at their proceedings, considering the great authority they had acquired by their sanctity. Soon after, the emperor sent Theodosius a considerable sum of money, for charitable uses in appearance, but in reality to engage him in his interest. The saint accepted of it, and distributed it all among the poor. Anastasius now persuading himself that he was as good as gained over to his cause, sent him an heretical profession of faith, in which the divine and human natures in Christ were confounded into one, and desired him to sign it. The saint wrote him an answer full of apostolic spirit; in which, besides solidly confuting the Eutychian error, he added, that he was ready to lay down his life for the faith of the church. The emperor admired his courage and the strength of his reasoning, and returning him a respectful answer, highly commended his generous zeal, made some apology for his own inconsiderateness, and protested that he only desired the peace of the church. But it was not long ere he relapsed into his former impiety, and renewed his bloody edicts against the orthodox, despatching troops every where to have them put in execution. On the first intelligence of this, Theodosius went over all the deserts and country of Palestine, exhorting every one to be firm in the faith of the four general councils. At Jerusalem, having assembled the people together, he from the pulpit cried out with a loud voice; “If any one receives not the four general councils as the four gospels, let him be anathema.” So bold an action in a man of his years, inspired with courage those whom the edicts had terrified. His discourses had a wonderful effect on the people, and God gave a sanction to his zeal by miracles: one of these was, that on his going out of the church at Jerusalem, a woman was healed of a cancer on the spot, by only touching his garments. The emperor sent an order for his banishment, which was executed; but dying soon after, Theodosius was recalled by his catholic successor, Justin; who, from a common soldier, had gradually ascended the imperial throne.",
        "Our saint survived his return eleven years, never admitting the least relaxation in his former austerities. Such was his humility, that seeing two monks at variance with each other, he threw himself at their feet, and would not rise till they were perfectly reconciled; and once having excommunicated one of his subjects for a crime, who contumaciously pretended to excommunicate him in his turn, the saint behaved as if he had been really excommunicated, to gain the sinner’s soul by this unprecedented example of submission, which had the desired effect. During the last year of his life he was afflicted with a painful distemper, in which he gave proof of an heroic patience, and an entire submission to the will of God; for being advised by one that was an eye-witness of his great sufferings, to pray that God would be pleased to grant him some ease, he would give no ear to it, alleging that such thoughts were impatience, and would rob him of his crown. Perceiving the hour of his dissolution at hand, he gave his last exhortation to his disciples, and foretold many things which accordingly came to pass after his death: this happened in the one hundred and fifth year of his age, and of our Lord 529. Peter, patriarch of Jerusalem, and the whole country, assisted with the deepest sentiments of respect at the solemnity of his interment, which was honoured by miracles. He was buried in his first cell, called the cave of the magi, because the wise men, who came to adore Christ soon after his birth, were said to have lodged in it. A certain count being on his march against the Persians, begged the hair shirt which the saint used to wear next his skin, and believed that he owed the victory which he obtained over them, to the saint’s protection through the pledge of that relick. Both the Roman and Greek calendars mention his festival on the eleventh of January.",
        "The examples of the Nazarites and Essenes among the Jews, and of many excellent and holy persons among the Christians through every age demonstrate, that many are called by God to serve him in a retired contemplative life; nay, it is the opinion of St. Gregory the Great, that the world is to some persons so full of ambushes and snares, or dangerous occasions of sin, that they cannot be saved but by choosing a safe retreat. Those, who from experience are conscious of their own weakness, and find themselves to be no match for the world, unable to countermine its policies, and oppose its power, ought to retire as from the face of too potent an enemy; and prefer a contemplative state, to a busy and active life: not to indulge sloth, or to decline the service of God and his neighbour, but to consult his own security, and to fly from dangers of sin and vanity. Yet there are some who find the greatest dangers in solitude itself; so that it is necessary for every one to sound his own heart, take a survey of his own forces and abilities, and consult God, that he may best be able to learn the designs of his providence with regard to his soul; in doing which, a great purity of intention is the first requisite. Ease and enjoyment must not be the end of Christian retirement, but penance, labour, and assiduous contemplation; without great fervour and constancy in which, close solitude is the road to perdition. If greater safety, or an unfitness for a public station, or a life of much business (in which several are only public nuisances) may be just motives to some for embracing a life of retirement, the means of more easily attaining to perfect virtue may be such to many. Nor do true contemplatives bury their talents, or cease either to be members of the republic of mankind, or to throw in their mite towards its welfare. From the prayers and thanksgivings, which they daily offer to God for the peace of the world, the preservation of the church, the conversion of sinners, and the salvation of all men, doubtless more valuable benefits often accrue to mankind, than from the alms of the rich, or the labours of the learned. Nor is it to be imagined, how far and how powerfully their spirit, and the example of their innocence and perfect virtue, often spread their influence; and how serviceable, persons who lead an holy and sequestered life, may be to the good of the world; nor how great glory redounds to God, by the perfect purity of heart and charity to which many souls are thus raised.",
        ],
        "January 11",
        "pp. 135-141",
        { expect: 5 },
      ),
    ],
  },
  {
    saint: "fathers-of-sinai-and-raithu",
    slug: "the-fathers-of-sinai-and-raithu",
    title: "The Fathers of Sinai and Raithu",
    subtitle: "As Alban Butler tells it",
    source: `${BUTLER_VOL.i}, January 14, pp. 180-181, public domain. ${READ_BUTLER} Butler's heading, “SS. Isaias, Sabbas,” is the subject of his first sentence, and is set at its head, before “and thirty-eight”. He spells Raithu Raithe. The page prints “Hist. Mon d’Orient” in the second note, without the stop of the first; it is kept as printed.`,
    passages: [
      butler(
        "i",
        [
        "SS. Isaias, Sabbas, and thirty-eight other holy solitaries on mount Sinai, martyred by a troop of Arabians in 273; likewise Paul, the abbot; Moses, who by his preaching and miracles had converted to the faith the Ishmaelites of Pharan; Psaes, a prodigy of austerity, and many other hermits in the desert of Raithe, two days journey from Sinai, near the Red sea, were massacred the same year by the Blemmyans, a savage infidel nation of Ethiopia. All these anchorets lived on dates, or other fruits, never tasted bread, worked at making baskets in cells at a considerable distance from each other, and met on Saturdays, in the evening, in one common church, where they watched and said the night office, and on the Sunday received together the holy eucharist. They were remarkable for their assiduity in prayer and fasting. See their acts by Ammonius, an eye-witness, published by F. Combefis; also Bulteau, Hist. Mon. d’Orient, l. 2. c. 1. p. 209.",
        "Also many holy anchorets on mount Sinai, whose lives were faithful copies of christian perfection, and who met on Sundays to receive the holy eucharist, were martyred by a band of Saracens in the fifth century. A boy of fourteen years of age led among them an ascetic life of great perfection. The Saracens threatened to kill him, if he did not discover where the ancient monks had concealed themselves. He answered, that death did not terrify him, and that he could not ransom his life by a sin in betraying his fathers. They bade him put off his clothes: “After you have killed me, said the modest youth, take my clothes and welcome: but as I never saw my body naked, have so much compassion and regard for my shamefacedness, as to let me die covered.” The barbarians enraged at this answer, fell on him with all their weapons at once, and the pious youth died by as many martyrdoms as he had executioners. St. Nilus, who had been formerly governor of Constantinople, has left us an account of this massacre in seven narratives: at that time he led an eremitical life in those deserts, and had placed his son Theodulus in this holy company. He was carried away captive, but redeemed after many dangers. See S. Nili septem narrationes, also Bulteau, Hist. Mon d’Orient, l. 2. c. 2. p. 220.",
        ],
        "January 14",
        "pp. 180-181",
        { expect: 2 },
      ),
    ],
  },
  {
    saint: "john-the-hut-dweller",
    slug: "life-of-john-the-hut-dweller",
    title: "The Life of St. John the Hut-Dweller",
    subtitle: "As Alban Butler tells it",
    source: `${BUTLER_VOL.i}, January 15, pp. 191-192, public domain. ${READ_BUTLER} Butler calls him St. John Calybite, from the Greek for a hut. The page prints “Leo the Isarian” for the Isaurian; it is kept as printed.`,
    passages: [
      butler(
        "i",
        [
        "He was the son of Eutropius, a rich nobleman in Constantinople. He secretly left home to become a monk among the Acæmetes. After six years he returned disguised in the rags of a beggar, and subsisted by the charity of his parents, as a stranger, in a little hut near their house; hence he was called the Calybite. He sanctified his soul by wonderful patience, meekness, humility, mortification, and prayer. He discovered himself to his mother, in his agony, in the year 450, and, according to his request, was buried under his hut; but his parents built over his tomb a stately church, as the author of his life mentions. Cedrenus, who says it stood in the western quarter of the city, calls it the church of poor John; Zonaras, the church of St. John Calybite. An old church, standing near the bridge of the isle of the Tiber in Rome, which bore his name, according to an inscription there, was built by pope Formosus (who died in 896), together with an hospital. From which circumstance Du Cange infers, that the body of our saint, which is preserved in this church, was conveyed from Constantinople to Rome, before the broaching of the Iconoclast heresy under Leo the Isarian, in 706: but his head remained at Constantinople till after that city fell into the hands of the Latins, in 1204; soon after which it was brought to Besanzon in Burgundy, where it is kept in St. Stephens church, with a Greek inscription round the case. The church which bears the name of Saint John Calybite, at Rome, with the hospital, is now in the hands of religious men of the order of St. John of God. According to a MS. life, commended by Baronius, St. John Calybite flourished under Theodosius the Younger, who died in 450: Nicephorus says, under Leo, who was proclaimed emperor in 457; so that both accounts may be true. On his genuine Greek acts, see Lambecius, Bibl. Vind. t. 8. p. 228. 395; Bollandus, p. 1035, gives his Latin acts the same which we find in Greek at St. Germain-des-Prez. See Montfaucon, Bibl. Coislianæ, p. 196. Bollandus adds other Latin acts, to which he gives the preference. See also Papebroch, Comm. ad Januarium Græcum metricum, t. 1. Maij. Jos. Assemani, in Calendaria Univ. ad 15 Jan. t. 6. p. 76. Chatelain, p. 283, &c.",
        ],
        "January 15",
        "pp. 191-192",
        { expect: 1 },
      ),
    ],
  },
  {
    saint: "euthymius-the-great",
    slug: "life-of-euthymius",
    title: "The Life of St. Euthymius",
    subtitle: "As Alban Butler tells it",
    source: `${BUTLER_VOL.i}, January 20, pp. 242-246, public domain. ${READ_BUTLER}`,
    passages: [
      butler(
        "i",
        [
        "The birth of this saint was the fruit of the prayers of his pious parents, through the intercession of the martyr Polyeuctus. His father was a noble and wealthy citizen of Melitene in Armenia. Euthymius was educated in sacred learning, and in the fervent practice of prayer, silence, humility and mortification, under the care of the holy bishop of that city, who ordained him priest, and constituted him his vicar and general overseer of the monasteries. The saint often visited that of St. Polyeuctus, and spent whole nights in prayer on a neighbouring mountain; as he also did all the time from the octave of the Epiphany till towards the end of Lent. The love of solitude daily growing stronger in his breast, he secretly left his own country, at twenty-nine years of age; and, after offering up his prayers at the holy places in Jerusalem, chose a cell six miles from that city, near the Laura of Pharan. He made baskets, and procured, by selling them, both his own subsistence and alms for the poor. Constant prayer was the employment of his soul. After five years he retired with one Theoctistus, an holy hermit, ten miles farther towards Jericho, where they lived together on raw herbs in a cave. In this place he began to receive disciples about the year 411. He committed the care of his monastery to Theoctistus, and continued himself in a remote hermitage, only giving audience on Saturdays and Sundays to those who desired spiritual advice. He taught all his monks never to eat so much as to satisfy their hunger, but strictly forbade among them all singularity in fasts or any other common observances, as savouring of vanity and self-will. According to his example, they all retired into the deserts, from the octave of the feast of the Epiphany till the week before Easter, when they met again in their monastery, to celebrate the office peculiar to Holy Week. He enjoined them constant silence and manual labours: they gained their own subsistence, and a surplus, which they devoted as first-fruits to God in the relief of the poor.",
        "St. Euthymius cured, by the sign of the cross and a short prayer, Terebon, one half of whose body had been struck dead with a palsy. His father, who was an Arabian prince, named Aspebetes, an idolater, had exhausted on his cure, but to no purpose, the much-boasted arts of physic and magic among the Persians, to procure some relief for his son. At the sight of this miracle Aspebetes desired baptism, and took the name of Peter. Such multitudes of Arabians followed his example, that Juvenal, patriarch of Jerusalem, ordained him their bishop, and he assisted at the council of Ephesus against Nestorius in 431. He built St. Euthymius a Laura on the right hand of the road from Jerusalem to Jericho, in the year 420. Euthymius could never be prevailed upon to depart from his rules of strict solitude; but governed his monks by proper superiors, to whom he gave his directions on Sundays. His humility and charity won the hearts of all who spoke to him. He seemed to surpass the great Arsenius in the gift of perpetual tears. Cyril relates many miracles which he wrought, usually by the sign of the cross. In the time of a great drought, he exhorted the people to penance, to avert this scourge of heaven. Great numbers came in procession to his cell, carrying crosses, singing Kyrie eleison, and begging him to offer up his prayers to God for them. He said to them: “I am a sinner, how can I presume to appear before God, who is angry at our sins? Let us prostrate ourselves all together before him, and he will hear us.” They obeyed; and the saint going into his chapel with some of his monks, prayed prostrate on the ground. The sky grew dark on a sudden, rain fell in abundance, and the year proved remarkably fruitful.",
        "St. Euthymius shewed great zeal against the Nestorian and Eutychian heretics. The turbulent empress Eudocia, after the death of her husband Theodosius, retired into Palestine, and there continued to favour the latter with her protection. Awaked by the afflictions of her family, particularly in the plunder of Rome, and the captivity of her daughter Eudocia, and her two grand-daughters, carried by the Vandals into Africa, she sent to beg the advice of Saint Simeon Stylites. He answered, that her misfortunes were the punishment of her sin, in forsaking and persecuting the orthodox faith; and ordered her to follow the direction of Euthymius. She knew that our saint admitted no woman within the precinct of his Laura, no more than St. Simeon suffered them to step within the enclosure of the mandra or lodge about his pillar. She therefore built a tower on the east side of the desert, thirty furlongs from the Laura, and prayed St. Euthymius to meet her there. His advice to her was to forsake the Eutychians and their impious patriarch Theodosius, and to receive the council of Chalcedon. She followed his advice as the command of God, and returning to Jerusalem, embraced the catholic communion with the orthodox patriarch Juvenal; and an incredible number followed her example. She spent the rest of her life in works of penance and piety. In 459, she desired St. Euthymius to meet her at her tower, designing to settle on his Laura sufficient revenues for its subsistence. He sent her word to spare herself the trouble, and to prepare herself for death; for God summoned her before his tribunal. She admired his disinterestedness, returned to Jerusalem, and died shortly after. One of the latest disciples of our saint was the young St. Sabas, whom he tenderly loved. In the year 473, on the thirteenth of January, Martyrius and Elias, to both whom St. Euthymius had foretold the patriarchate of Jerusalem, came with several others to visit him, and to conduct him into his Lent-retreat. But he said he would stay with them all that week, and leave them on the Saturday following, meaning, by death. Three days after he gave orders that a general watching should be observed on the eve of St. Antony’s festival, on which he made a discourse to his spiritual children, exhorting them to humility and charity. He appointed Elias his successor, and foretold Domitian a beloved disciple, that he would follow him out of this world, on the seventh day, which happened accordingly. Euthymius died on Saturday the twentieth day of January, being ninety-five years old, of which he had spent sixty-eight in the deserts. Cyril relates his having appeared several times after his death, and the many miracles that were wrought by his intercession; to several of which he declares himself an eye-witness. St. Sabas kept his festival immediately after his death; which is observed both by the Latins and Greeks. The latter always style him the Great. It appears from his life that he was ordained priest before he embraced an eremitical state, and that he founded two monasteries, besides a Laura, which was also converted into a monastery after his death.",
        ],
        "January 20",
        "pp. 242-246",
        { expect: 3 },
      ),
    ],
  },
  {
    saint: "anastasius-the-persian",
    slug: "martyrdom-of-anastasius",
    title: "The Martyrdom of St. Anastasius",
    subtitle: "As Alban Butler tells it",
    source: `${BUTLER_VOL.i}, January 22, pp. 262-267, public domain. ${READ_BUTLER} The page sets no stop between “comply” and the saint's words “Write what you please”; it is kept as printed.`,
    passages: [
      butler(
        "i",
        [
        "St. Anastasius was a trophy of the holy cross of Christ, when it was carried away into Persia by Chosroës, in the year 614, after he had taken and plundered Jerusalem. The martyr was a Persian, son of a Magian, instructed in the sciences of that sect, and a young soldier in the Persian troops. Upon hearing the news of the taking of the cross by his king, he became very inquisitive concerning the christian religion; and its sublime truths made such an impression on his mind, that being returned into Persia from an expedition into the Roman empire, he left the army with his brother, who also served in it, and retired to Hierapolis. In that city he lodged with a devout Persian Christian, a silversmith, with whom he went often to prayer. The holy pictures which he saw, moved him exceedingly, and gave him occasion to inquire daily more into our faith, and to admire the courage of the martyrs whose glorious sufferings were painted in the churches. At length, desirous of baptism, he left Hierapolis, which city was subject to the Persians, and went to Jerusalem, where he received that sacrament by the hands of Modestus, who governed that church as vicar, during the absence of the patriarch Zachary, whom Chosroës had led away captive into Persia. In baptism he changed his Persian name Magundat, into that of Anastasius, meaning, according to the signification of that Greek word, that he was risen from death to a new and spiritual life. He had prepared himself with wonderful devotion for that sacrament whilst a catechumen, and he spent in no less fervour the several days after it, which persons baptized passed in white garments, in prayer, and in receiving more perfect instructions in the faith. At the end of this term, Anastasius, the more easily and more perfectly to keep inviolably his sacred baptismal vows and obligations, desired to become a monk in a monastery five miles distant from Jerusalem. Justin, the abbot, made him first learn the Greek tongue and the psalter; then cutting off his hair, gave him the monastic habit, in the year 621.",
        "Anastasius was always the first at all spiritual duties, especially in assisting at the celebration of the divine mysteries. His attention to pious discourse testified the earnest thirst of his soul; nor was he less fervent in practice. He never read the triumphs of the martyrs without abundance of tears, and burned with an ardent desire of the like happiness. Being molested beyond measure with blasphemous thoughts of magic and superstitions, which his father had taught him, he was delivered from that troublesome temptation by discovering it to his director, and by his advice and prayers. After seven years spent in great perfection in this monastery, his desire of martyrdom daily increasing, and having been assured by a revelation, that his prayers for that grace were heard, he left that house, and visited the places of devotion in Palestine, at Diospolis, Garizim, and our Lady’s church at Cæsarea, where he staid two days. This city, with the greatest part of Syria, was then subject to the Persians. The saint seeing certain Persian soothsayers of the garrison occupied in their abominable superstitions in the streets, boldly spoke to them, remonstrating against the impiety of such practices. The Persian magistrates apprehended him as a suspected spy; but he informed them that he once enjoyed the dignity of Magian with them, and had renounced it to become an humble follower of Christ. Upon this confession he was thrown into a dungeon, where he lay three days without eating or drinking, till the return of Marzabanes, the governor, to the city. Being interrogated by him, he confessed his conversion to the faith, and equally despised his offers of great preferments, and his threats of crucifying him. Marzabanes commanded him to be chained by the foot to another criminal, and his neck and one foot to be also linked together by a heavy chain, and condemned him in this condition to carry stones. The Persians, especially those of his own province of Rasech, and his former acquaintance, upbraided him as the disgrace of his country, kicked and beat him, plucked his beard, and loaded him with burdens above his strength. The governor sent for him a second time, but could by no means prevail with him to pronounce the impious words which the Magians used in their superstitions: he said, “that the wilful calling them to remembrance would defile the heart.” The judge then threatened he would write immediately to the king against him, if he did not comply “Write what you please, said the saint, I am a Christian: I repeat it again, I am a Christian.” Marzabanes commanded him to be forthwith beaten with knotty clubs. The executioners were preparing themselves to bind him fast on the ground; but the saint told him it was unnecessary, for he had courage enough to lie down under the punishment without moving, and he regarded it as his greatest happiness and pleasure to suffer for Christ. He only begged leave to put off his monk’s habit, lest it should be treated with contempt, which only his body deserved. He therefore laid it aside in a respectful manner, and then stretched himself on the ground, and without being bound did not stir all the time of the cruel torment, bearing it without changing his posture. The governor again threatened him to acquaint the king of his obstinacy: “Whom ought we rather to fear,” said Anastasius, “a mortal man, or God, who made all things out of nothing?” The judge pressed him to sacrifice to fire, and to the sun and moon. The saint answered, he could never acknowledge as gods, creatures which God had made only for our use; upon which he was remanded to prison.",
        "His old abbot hearing of his sufferings, sent two monks to assist him, and ordered prayers for him. The confessor, after carrying stones all the day, spent the greatest part of the night in prayer, to the surprise of his companions: one of whom, a Jew, saw and shewed him to others at prayer in the night, shining in brightness and glory like a blessed spirit, and angels praying with him. As the confessor was chained to a man condemned for a public crime, he prayed always with his neck bowed downwards, keeping his chained foot near his companion not to disturb him. Marzabanes in the mean time having informed Chosroës, and received his orders, acquainted the martyr by a messenger, without seeing him, that the king would be satisfied on condition he would only by word of mouth abjure the christian faith: after which he might choose whether he would be an officer in the king’s service, or still remain a Christian and a monk; adding, he might in his heart always adhere to Christ, provided he would but for once renounce him in words privately, in his presence, “in which there could be no harm, nor any great injury to his Christ,” as he said. Anastasius answered firmly, that he would never even seem to dissemble, or to deny his God. Then the governor told him, that he had orders to send him bound into Persia to the king. “There is no need of binding me, said the saint: I go willingly and cheerfully to suffer for Christ.” The governor put on him and on two other prisoners the mark, and gave orders, that they should set out after five days. In the mean time, on the feast of the Exaltation of the Cross, the fourteenth of September, at the request of the Comerciarius, or tax-gatherer for the king, who was a Christian of distinction, Anastasius had leave to go to the church and assist at the divine service. His presence and exhortations encouraged the faithful, excited the tepid to fervour, and moved all to tears. He dined that day with the Comerciarius, and then returned with joy to his prison. On the day appointed, the martyr left Cæsarea, in Palestine, with two other christian prisoners, under a strict guard, and was followed by one of the monks whom the abbot had sent to assist and encourage him. The acts of his martyrdom were written by this monk, or at least from what he related by word of mouth. The saint received great marks of honour, much against his inclination, from the Christians wherever he came. This made him fear lest human applause should rob him of his crown by infecting his heart with pride. He wrote from Hierapolis, and again from the river Tigris to his abbot, begging the prayers of his brethren.",
        "Being arrived at Barsaloe in Assyria, six miles from Discartha or Dastagerde, near the Euphrates, where the king then was, the prisoners were thrown into a dungeon till his pleasure was known. An officer came from Chosroës to interrogate the saint, who made answer, with regard to his magnificent promises, in these words: “My religious habit and poor clothes shew that I despise from my heart the gaudy pomp of the world. The honours and riches of a king, who must shortly die himself, are no temptation to me.” Next day the officer returned to the prison, and endeavoured to intimidate him by blustering threats and reproaches. But the saint said calmly: “My lord judge, do not give yourself so much trouble about me. By the grace of Christ I am not to be moved: so execute your pleasure without more ado.” The officer caused him to be unmercifully beaten with staves, after the Persian manner, insulting him all the time, and often repeating, that because he contemned the king’s bounty, he should be treated in that manner every day as long as he lived. This punishment was inflicted on him three days; on the third, the judge commanded him to be laid on his back, and a heavy beam pressed down by the weight of two men on his legs, crushing the flesh to the very bone. The martyr’s tranquillity and patience astonished the officer, who went again to acquaint the king of his behaviour. In his absence the jailer, being a Christian by profession, though too weak to resign his place rather than detain such a prisoner, gave every one free access to the martyr. The Christians immediately filled the prison; every one sought to kiss his feet or chains, and kept as relicks whatever had been sanctified by their touch: they also overlaid his fetters with wax, in order to receive their impression. The saint, with confusion and indignation, strove to hinder them, and expressed how extremely dissatisfied he was with such actions. The officer returning from the king caused him to be beaten again, which the confessor bore rather as a statue, than as flesh and blood. Then he was hung up for two hours by one hand, with a great weight at his feet, and tampered with by threats and promises. The judge despairing to overcome him, went back to the king for his last orders, which were, that he and all the christian captives should be put to death. He returned speedily to put them in execution, and caused Anastasius’s two companions, with threescore and six other Christians, to be strangled one after another, on the banks of the river, before his face, whom the judge, all the time, pressed to return to the Persian worship, and to escape so disgraceful a death; promising, in case of compliance, that he should be made one of the greatest men in the court. Anastasius, with his eyes lifted up to heaven, gave thanks to God for bringing his life to so happy a conclusion; and said he expected that he should have met with a more cruel death in the torture of all his members: but seeing God granted him one so easy, he embraced with joy that end of a life which he otherwise must shortly have lost in a more painful manner. He was accordingly strangled, and after his death his head was cut off. This was in the year 628, the seventeenth of the emperor Heraclius, on the twenty-second of January, on which day both the Latins and Greeks keep his festival. His body, among the other dead, was exposed to be devoured by dogs, but it was the only one they left untouched. It was afterward redeemed by the Christians, who laid it in the monastery of St. Sergius, a mile from the place of his triumph, in the city Barsaloe, called afterward from that monastery, Sergiopolis. The monk that attended him brought back his Colobium, or linen tunic without sleeves. The saint’s body was afterward brought into Palestine. Some years after, it was removed to Constantinople, and lastly to Rome.",
        "The seventh general council proves the use of pious pictures from the head of this holy martyr, and his miraculous image, then kept at Rome with great veneration: where it is still preserved in the church belonging to the monastery of our Lady ad Aquas Sylvias, which now bears the name of SS. Vincent and Anastasius. The rest of his relicks are reposited in the holy chapel ad Scalas Sanctas, near St. John Lateran. See the history of many miracles wrought by them in Bollandus. St. Anastasius foretold the speedy fall of the tyrant Chosroës: and ten days after his martyrdom the emperor Heraclius entered Persia.",
        ],
        "January 22",
        "pp. 262-267",
        { expect: 5 },
      ),
    ],
  },
  {
    saint: "clement-of-ancyra",
    slug: "martyrdom-of-clement-of-ancyra",
    title: "The Martyrdom of St. Clement of Ancyra",
    subtitle: "As Alban Butler tells it",
    source: `${BUTLER_VOL.i}, January 23, p. 280, public domain. ${READ_BUTLER}`,
    passages: [
      butler(
        "i",
        [
        "He suffered under Dioclesian, and is ranked by the Greeks among the great martyrs. His modern Greek acts say, his lingering martyrdom was continued by divers torments during twenty-eight years; but are demonstrated by Baronius and others to be of no authority. Two churches at Constantinople were dedicated to God under the invocation of Saint Clement of Ancyra; one called of the Palace, the other now in Pera, a suburb of that city. Several parts of his relicks were kept with great devotion at Constantinople. His skull, which was brought thence to Paris when Constantinople was taken by the Latins, in the thirteenth century, was given by queen Anne of Austria to the abbey of Val de Grace. See Chatelain, p. 386. Le Quien, Oriens Chr. t. 1. p. 457.",
        ],
        "January 23",
        "p. 280",
        { expect: 1 },
      ),
    ],
  },
  {
    saint: "cyrus-and-john",
    slug: "martyrdom-of-cyrus-and-john",
    title: "The Martyrdom of Sts. Cyrus and John",
    subtitle: "As Alban Butler tells it",
    source: `${BUTLER_VOL.i}, January 31, pp. 464-465, public domain. ${READ_BUTLER} Butler keeps them on January 31.`,
    passages: [
      butler(
        "i",
        [
        "Cyrus, a physician of Alexandria, who by the opportunities which his profession gave him, had converted many sick persons to the faith; and John, an Arabian, hearing that a lady called Athanasia, and her three daughters, of which the eldest was only fifteen years of age, suffered torments for the name of Christ at Canope in Egypt, went thither to encourage them. They were apprehended themselves, and cruelly beaten: their sides were burnt with torches, and salt and vinegar poured into their wounds in the presence of Athanasia and her daughters, who were also tortured after them. At length the four ladies, and a few days after Cyrus and John, were beheaded, the two latter on this day. The Syrians, Egyptians, Greeks and Latins, honour their memory. See their acts by St. Sophronius, commended in the seventh general council, and published with remarks by Bollandus.",
        ],
        "January 31",
        "pp. 464-465",
        { expect: 1 },
      ),
    ],
  },
  {
    saint: "polyeuctus-of-melitene",
    slug: "martyrdom-of-polyeuctus",
    title: "The Martyrdom of St. Polyeuctus",
    subtitle: "As Alban Butler tells it",
    source: `${BUTLER_VOL.ii}, February 13, pp. 144-145, public domain. ${READ_BUTLER} Butler keeps him on February 13.`,
    passages: [
      butler(
        "ii",
        [
        "The city of Melitine, a station of the Roman troops in the Lesser Armenia, is illustrious for a great number of martyrs, whereof the first in rank is Polyeuctus. He was a rich Roman officer, and had a friend called Nearchus, a zealous Christian; who, when the news of the persecution, raised by the emperor against the church, reached Armenia, prepared himself to lay down his life for his faith; and grieving to leave Polyeuctus in the darkness of Paganism, was so successful in his endeavours to induce him to embrace Christianity, as not only to gain him over to the faith, but to inspire him with an eager desire of laying down his life for the same. He openly declared himself a Christian, and was apprehended and condemned to cruel tortures. The executioners being weary with tormenting him, betook themselves to the method of argument and persuasion in order to prevail with him to renounce Christ. The tears and cries of his wife Paulina, of his children, and of his father-in-law, Felix, were sufficient to have shaken a mind not superior to all the assaults of hell. But Polyeuctus, strengthened by God, grew only the firmer in his faith, and received the sentence of death with such cheerfulness and joy, and exhorted all to renounce their idols with so much energy, on the road to execution, that many were converted. He was beheaded on the tenth of January, in the persecution of Decius, or Valerian, about the year 250, or 257. The Christians buried his body in the city. Nearchus gathered his blood in a cloth, and afterward wrote his acts. The Greeks keep his festival very solemnly: and all the Latin martyrologies mention him. There was in Melitine a famous Church of St. Polyeuctus, in the fourth age, in which St. Euthymius often prayed. There was also a very stately one in Constantinople, under Justinian, the vault of which was covered with plates of gold, in which it was the custom for men to make their most solemn oaths, as is related by St. Gregory of Tours. The same author informs us, in his history of the Franks, that the kings of France of the first race used to confirm their treaties by the name of Polyeuctus. The martyrology ascribed to St. Jerom, and the most ancient Armenian calendars, place his feast on the seventh of January, which seems to have been the day of his martyrdom. The Greeks defer his festival to the ninth of January: but it is marked on the thirteenth of February in the ancient martyrology, which was sent from Rome to Aquileia in the eighth century, and which is copied by Ado, Usuard, and the Roman Martyrology.—See his acts taken from those wrote by Nearchus, the saint’s friend, and Tillem. t. 3. p. 424. Jos. Assemani in Calend. ad 9 Januarii, t. 6.",
        ],
        "February 13",
        "pp. 144-145",
        { expect: 1 },
      ),
    ],
  },
];

for (const life of LIVES) {
  for (const p of life.passages) {
    if ((p.title ?? "").length > TITLE_MAX) throw new Error(`${life.slug}: section title "${p.title}" runs past ${TITLE_MAX} characters`);
  }
}
