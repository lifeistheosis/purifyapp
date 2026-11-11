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

/** The words every source line ends with, saying how the text was read. */
const READ =
  "CCEL's transcription of each volume read word for word against archive.org's scans of the same printing; where they differ, the printed page is followed. The editions' footnotes, page numbers and running heads, and their marks in the text, are left out; the paragraphs and the numbers at their heads are as printed. The section titles name the place in each book.";
const SCRIPTURE_READ = "Scripture is the King James Version, as the app's Bible carries it, word for word.";

/** How a passage typed from the page images was read (November's words). */
const READ_TYPED =
  "Typed from the page images of archive.org's scan of the printing, read line by line, and compared word for word with the scan's text. The editions' footnotes and their marks are left out, and italics are set plain; the paragraphs are as printed. The section titles name the place in each book.";

const typed = (book, text, more) => ({ kind: "transcribed", text, scans: SCAN[book], ...more });
const e = (vol, from, more) => ({ vol, from, scans: SCAN[vol], ...more });

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
        title: "Eusebius, Church History III.4.6",
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
        title: "A History of the Church of Russia, pp. 114-117",
        author: "A. N. Mouravieff",
        citation: `A. N. Mouravieff, A History of the Church of Russia, ch. V, section XLII, pp. 114-117, ${ED.mouravieff}`,
      }),
      typed("mouravieff", PHILIP_END, {
        title: "A History of the Church of Russia, pp. 117-118",
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
        title: "The Book of the Popes, XXXIV, pp. 41-42",
        author: "The Book of the Popes",
        citation: `The Book of the Popes, XXXIV, Sylvester, pp. 41-42, ${ED.loomis}`,
      }),
      typed("loomis", SYLVESTER_CLOSE, {
        // The page has "Priscilla" and "Salaria" (p. 71, leaf n96); the
        // comparison matched the like sentence of the pope before him (buried
        // "in the cemetery of Calistus on the Via Appia").
        ocr: [["priscilla", "cemetery of priscilla"], ["salaria", "via salaria three"]],
        title: "The Book of the Popes, XXXIV, pp. 71-72",
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
        title: `The Life of Paulus the First Hermit, ${i + 1}`,
        author: "St. Jerome",
        citation: `St. Jerome, The Life of Paulus the First Hermit, ${i + 1}, ${ED.jerome}`,
      }),
    ),
  },
];
