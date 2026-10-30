/**
 * The printed divisions of the works in the library (1.8).
 *
 * The owner, 2026-10-17: "when you're reading the confessions ... I want the
 * book, the chapter, and then the verse. Like, I want the original book's
 * formatting, honestly. To be easily quotable." So a paragraph of a Father's
 * work can be named the way the work itself is cited: the Confessions I.1.1
 * (book, chapter, section), Chrysostom on Matthew 15.2 (homily, section),
 * Cassian's Institutes 8.21 (book, chapter), the Morals 5.82 (book and the
 * edition's paragraph), Ignatius to the Romans 4 (chapter). A citation's
 * line says them in words, in the style of the reading room's collections
 * ("Confessions, Book I, Chapter 1, §1": placeWords); an address and the
 * reader's quiet numbers use the numbers themselves (#at-1.1.1, citeLabel).
 *
 * WHERE THE NUMBERS COME FROM. Never from a guess. Each work below says how
 * its file keeps the edition's divisions, and the numbers are read from that:
 *
 *   title      the section's own title names them ("Book 8, Chapter 21",
 *              "Homily 15, Matthew 5:1, 2", "Discourse I")
 *   order      the sections are the edition's chapters in order, the first
 *              of them at section `first` (Ignatius's letters open with a
 *              salutation the edition does not number)
 *   marks      the number the edition prints at the head of a paragraph
 *              ("2. Whence then doth He begin?"), counting the next level
 *              down. A number is a mark only when it follows the one before
 *              it; anything else at a paragraph's head (a note's number, a
 *              list) is text.
 *   synopsis   a paragraph that is the edition's own heading for a chapter
 *              ("§54. The Word was made man that we might be made God ...",
 *              "Chapter I.--Introduction. ..."): it opens the chapter, and it
 *              is the editor's summary, not the author's words
 *   table      where the file kept no numbers at all: each division's opening
 *              words, checked against the edition (the Confessions, below)
 *
 * NOTHING HERE MOVES THE TEXT. Sections and paragraphs stay as data/saints
 * has them, because readers' highlights, notes, bookmarks and places are kept
 * by section and paragraph. The divisions are laid over them, so a work can
 * be cited, and opened (`#at-1.1.1`), by the edition's numbers whatever its
 * file looks like.
 *
 * No imports: scripts read this file with types stripped, as they read
 * lib/saints/saints.ts. lib/saints/__tests__/divisions.test.ts holds every
 * work's divisions to its file (in order, none skipped, each found).
 */

export type Level =
  | "book"
  | "part"
  | "chapter"
  | "section"
  | "homily"
  | "sermon"
  | "conference"
  | "discourse"
  | "codex";

/** A paragraph's place in the edition's numbering. */
export type ParagraphPlace = {
  /** The edition's numbers, outermost first: [1, 1, 1] is Book I, chapter 1, section 1. */
  path: number[];
  /** How many of the innermost numbers begin at this paragraph: 0 when it carries on the one before. */
  begins: number;
  /** The edition's heading for the chapter it opens, not the author's words. */
  synopsis?: true;
};

type SectionLike = { n: number; title: string; paragraphs: string[]; voice?: string };
export type WorkLike = { sections: SectionLike[] };

type TitleRule = {
  /** Captures one number per level, Arabic or Roman. */
  re: RegExp;
  levels: Level[];
};

type Scheme = {
  title?: TitleRule;
  order?: {
    first: number;
    level: Level;
    /** Where a file's sections fall out of step with the edition's chapters: the chapter a section holds. */
    chapterOf?: (n: number) => number | null;
    /**
     * The edition's heading for a chapter that a file runs on inside the
     * section before, kept there as a paragraph: it opens that chapter, and
     * it is set apart as a heading, never cited as the author's words.
     */
    heading?: RegExp;
  };
  marks?: {
    level: Level;
    /** Where the count starts again: in every section, or at each new number of the outermost titled level. */
    restart: "section" | "outer" | "never";
    /** The first paragraph of a division counts as 1 when the edition prints no "1." there. */
    implicitFirst?: boolean;
  };
  synopsis?: {
    re: RegExp;
    level: Level;
    /** Whether the chapter is cited (On the Incarnation 54.3), or only shown (the Discourses are cited I.9). */
    cited: boolean;
    /** The chapters run on through the work, or start again with each titled division. */
    restart: "outer" | "never";
  };
  table?: { levels: Level[]; starts: readonly (readonly [string, string])[] };
  /** Sections the edition does not number this way (a second treatise filed in the same work). */
  exclude?: (n: number) => boolean;
  /** Which numbers print as Roman numerals, by level index. */
  roman?: readonly boolean[];
  /** Cite only the innermost number (On the Councils 15, not 2.15). */
  innermostOnly?: true;
  /** The edition's translator or series, as a citation names it. */
  edition: string;
};

const ROMAN: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100 };
function fromRoman(s: string): number {
  let total = 0;
  for (let k = 0; k < s.length; k++) {
    const v = ROMAN[s[k]];
    const next = ROMAN[s[k + 1]] ?? 0;
    total += v < next ? -v : v;
  }
  return total;
}
export function toRoman(n: number): string {
  const table: [number, string][] = [
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let out = "";
  let left = n;
  for (const [v, s] of table) while (left >= v) { out += s; left -= v; }
  return out;
}
function num(s: string): number {
  return /^\d+$/.test(s) ? Number(s) : fromRoman(s.toUpperCase());
}

/** "2. Whence then" → 2. A paragraph's head as the edition numbers it. */
function markOfParagraph(p: string): number | null {
  const m = /^(\d{1,4})\. \S/.exec(p);
  return m ? Number(m[1]) : null;
}

const NPNF = (series: "I" | "II", vol: number) => `NPNF ${series} ${vol}`;

const HOMILY: TitleRule = { re: /^Homily (\d+)\b/, levels: ["homily"] };
const homilies = (vol: number, marked = false): Scheme => ({
  title: HOMILY,
  ...(marked ? { marks: { level: "section", restart: "section", implicitFirst: true } as const } : {}),
  edition: NPNF("I", vol),
});
const ANF1 = "ANF 1";
const ignatius = (): Scheme => ({ order: { first: 2, level: "chapter" }, edition: ANF1 });

/**
 * St Justin's Dialogue with Trypho as its file has it (from Wikisource): the
 * 142 chapters of ANF 1, one section each, numbered out of step for a stretch.
 * Sections 1 to 60 hold chapters 1 to 60; chapter 61, which ran on inside
 * section 60 under the edition's heading, is its own section since 1.8 and
 * takes 143, a number the file never had; sections 61 to 114 hold chapters
 * 62 to 115 and section 115 holds chapter 116 (a second copy of it, section
 * 116, is gone); from 117 they agree again. Read against the chapter
 * headings of the ANF text at newadvent.org (fathers/0128), 2026-10-18:
 * chapters 48 to 68, 89 to 108 and 125 to 142 there, the rest by the titles
 * in between. The other sections keep their numbers, because a reader's
 * highlights and notes are kept by them; what was marked on the paragraphs
 * that moved follows them (lib/saints/layoutMoves.ts).
 */
const dialogueChapter = (n: number): number | null =>
  n === 143 ? 61 : n < 1 || n > 142 || n === 116 ? null : n <= 60 ? n : n <= 114 ? n + 1 : n === 115 ? 116 : n;

/**
 * The Confessions, Book I: where each of its 31 sections begins in Pusey's
 * English, by the opening words of his paragraph. The divisions are those of
 * the Latin text (Book, chapter, section: 1.1.1 to 1.20.31), read on the
 * Latin (thelatinlibrary.com, conf1) and on the NPNF translation
 * (newadvent.org, 110101), 2026-10-18, and matched to Pusey's paragraphs one
 * by one: every section opens a paragraph of his, and the five paragraphs
 * after 1.16.26 (Terence's lines and Augustine on them) and the two after
 * 1.17.27 (Virgil's line) carry their section on.
 */
const CONFESSIONS_I: readonly (readonly [string, string])[] = [
  ["1.1.1", "Great art Thou, O Lord, and greatly to be praised"],
  ["1.2.2", "And how shall I call upon my God"],
  ["1.3.3", "Do the heaven and earth then contain Thee"],
  ["1.4.4", "What art Thou then, my God?"],
  ["1.5.5", "Oh! that I might repose on Thee!"],
  ["1.5.6", "Narrow is the mansion of my soul"],
  ["1.6.7", "Yet suffer me to speak unto Thy mercy"],
  ["1.6.8", "Afterwards I began to smile"],
  ["1.6.9", "And, lo! my infancy died long since"],
  ["1.6.10", "I acknowledge Thee, Lord of heaven and earth"],
  ["1.7.11", "Hear, O God. Alas, for man's sin!"],
  ["1.7.12", "Thou, then, O Lord my God, who gavest life to this my infancy"],
  ["1.8.13", "Passing hence from infancy, I came to boyhood"],
  ["1.9.14", "O God my God, what miseries and mockeries"],
  ["1.9.15", "Is there, Lord, any of soul so great"],
  ["1.10.16", "And yet, I sinned herein, O Lord God"],
  ["1.11.17", "As a boy, then, I had already heard of an eternal life"],
  ["1.11.18", "I beseech Thee, my God, I would fain know"],
  ["1.12.19", "In boyhood itself, however"],
  ["1.13.20", "But why did I so much hate the Greek"],
  ["1.13.21", "For what more miserable than a miserable being"],
  ["1.13.22", "But now, my God, cry Thou aloud in my soul"],
  ["1.14.23", "Why then did I hate the Greek classics"],
  ["1.15.24", "Hear, Lord, my prayer; let not my soul faint"],
  ["1.16.25", "But woe is thee, thou torrent of human custom!"],
  ["1.16.26", "And yet, thou hellish torrent"],
  ["1.17.27", "Bear with me, my God, while I say somewhat of my wit"],
  ["1.18.28", "But what marvel that I was thus carried away to vanities"],
  ["1.18.29", "Behold, O Lord God, yea, behold patiently"],
  ["1.19.30", "This was the world at whose gate unhappy I lay"],
  ["1.20.31", "Yet, Lord, to Thee, the Creator and Governor of the universe"],
];

/**
 * The Confessions, Books II to XIII (1.8): where each of their 422 sections
 * begins in Pusey's English, the same way. The divisions are the Latin
 * text's, read at The Latin Library (augustine/conf2 to conf13),
 * 2026-10-18, and laid over Pusey's paragraphs (Project Gutenberg #3296) in
 * order: his paragraphs follow the Latin's sections one to one, save where
 * he sets a quotation apart (Virgil in VIII.2.3, St Ambrose's hymn in
 * IX.12.32) or carries a section on into a second paragraph (VI.16.26);
 * three paragraphs that held two sections are split where the second
 * begins (VIII.5.12, XII.15.19, XIII.18.23; scripts/ingest-confessions.mjs).
 * Each pair was read, the English opening against the Latin. In a few
 * places Pusey's paragraph begins a sentence before or after the Latin's
 * section (V.10.19, X.36.58): the section is laid at his paragraph.
 */
const CONFESSIONS_II_XIII: readonly (readonly [string, string])[] = [
  // Book II
  ["2.1.1", "I will now call to mind my past foulness"],
  ["2.2.2", "And what was it that I delighted in, but"],
  ["2.2.3", "Oh! that some one had then attempered my"],
  ["2.2.4", "To these words I should have listened more"],
  ["2.3.5", "For that year were my studies intermitted"],
  ["2.3.6", "But while in that my sixteenth year I lived"],
  ["2.3.7", "Woe is me! and dare I say that Thou heldest"],
  ["2.3.8", "Behold with what companions I walked the"],
  ["2.4.9", "Theft is punished by Thy law, O Lord, and"],
  ["2.5.10", "For there is an attractiveness in beautiful"],
  ["2.5.11", "When, then, we ask why a crime was done"],
  ["2.6.12", "What then did wretched I so love in thee"],
  ["2.6.13", "For so doth pride imitate exaltedness; whereas"],
  ["2.6.14", "Thus doth the soul commit fornication, when"],
  ["2.7.15", "What shall I render unto the Lord, that"],
  ["2.8.16", "What fruit had I then (wretched man!) in"],
  ["2.9.17", "What then was this feeling? For of a truth"],
  ["2.10.18", "Who can disentangle that twisted and intricate"],
  // Book III
  ["3.1.1", "To Carthage I came, where there sang all"],
  ["3.2.2", "Stage-plays also carried me away, full of"],
  ["3.2.3", "Are griefs then too loved? Verily all desire"],
  ["3.2.4", "But I, miserable, then loved to grieve, and"],
  ["3.3.5", "And Thy faithful mercy hovered over me afar"],
  ["3.3.6", "Those studies also, which were accounted"],
  ["3.4.7", "Among such as these, in that unsettled age"],
  ["3.4.8", "How did I burn then, my God, how did I burn"],
  ["3.5.9", "I resolved then to bend my mind to the holy"],
  ["3.6.10", "Therefore I fell among men proudly doting"],
  ["3.6.11", "Where then wert Thou then to me, and how"],
  ["3.7.12", "For other than this, that which really is"],
  ["3.7.13", "Nor knew I that true inward righteousness"],
  ["3.7.14", "These things I then knew not, nor observed"],
  ["3.8.15", "Can it at any time or place be unjust to"],
  ["3.8.16", "So in acts of violence, where there is a"],
  ["3.9.17", "Amidst these offences of foulness and violence"],
  ["3.10.18", "These things I being ignorant of, scoffed"],
  ["3.11.19", "And Thou sentest Thine hand from above, and"],
  ["3.11.20", "Whence was this also, that when she had told"],
  ["3.12.21", "Thou gavest her meantime another answer"],
  // Book IV
  ["4.1.1", "For this space of nine years (from my nineteenth"],
  ["4.2.2", "In those years I taught rhetoric, and, overcome"],
  ["4.2.3", "I remember also, that when I had settled"],
  ["4.3.4", "Those impostors then, whom they style Mathematicians"],
  ["4.3.5", "There was in those days a wise man, very"],
  ["4.3.6", "And thus much, either from or through him"],
  ["4.4.7", "In those years when I first began to teach"],
  ["4.4.8", "Who can recount all Thy praises, which he"],
  ["4.4.9", "At this grief my heart was utterly darkened"],
  ["4.5.10", "And now, Lord, these things are passed by"],
  ["4.6.11", "But what speak I of these things? for now"],
  ["4.7.12", "O madness, which knowest not how to love"],
  ["4.8.13", "Times lose no time; nor do they roll idly"],
  ["4.9.14", "This is it that is loved in friends; and"],
  ["4.10.15", "Turn us, O God of Hosts, show us Thy countenance"],
  ["4.11.16", "Be not foolish, O my soul, nor become deaf"],
  ["4.11.17", "Why then be perverted and follow thy flesh"],
  ["4.12.18", "If bodies please thee, praise God on occasion"],
  ["4.12.19", "\"But our true Life came down hither, and"],
  ["4.13.20", "These things I then knew not, and I loved"],
  ["4.14.21", "But what moved me, O Lord my God, to dedicate"],
  ["4.14.22", "For so did I then love men, upon the judgment"],
  ["4.14.23", "But that orator was of that sort whom I loved"],
  ["4.15.24", "But I saw not yet, whereon this weighty matter"],
  ["4.15.25", "For as deeds of violence arise, if that emotion"],
  ["4.15.26", "But I pressed towards Thee, and was thrust"],
  ["4.15.27", "I was then some six or seven and twenty years"],
  ["4.16.28", "And what did it profit me, that scarce twenty"],
  ["4.16.29", "What did all this further me, seeing it even"],
  ["4.16.30", "And what did it profit me, that all the books"],
  ["4.16.31", "But what did this further me, imagining that"],
  // Book V
  ["5.1.1", "Accept the sacrifice of my confessions from"],
  ["5.2.2", "Let the restless, the godless, depart and"],
  ["5.3.3", "I would lay open before my God that nine-and-twentieth"],
  ["5.3.4", "For with their understanding and wit, which"],
  ["5.3.5", "But they knew not the way, Thy Word, by Whom"],
  ["5.3.6", "Yet many truths concerning the creature retained"],
  ["5.4.7", "Doth then, O Lord God of truth, whoso knoweth"],
  ["5.5.8", "But yet who bade that Manichaeus write on"],
  ["5.5.9", "For when I hear any Christian brother ignorant"],
  ["5.6.10", "And for almost all those nine years, wherein"],
  ["5.6.11", "That greediness then, wherewith I had of"],
  ["5.7.12", "For after it was clear that he was ignorant"],
  ["5.7.13", "My zeal for the writings of Manichaeus being"],
  ["5.8.14", "Thou didst deal with me, that I should be"],
  ["5.8.15", "But why I went hence, and went thither, Thou"],
  ["5.9.16", "And lo, there was I received by the scourge"],
  ["5.9.17", "I see not then how she should have been healed"],
  ["5.10.18", "Thou recoveredst me then of that sickness"],
  ["5.10.19", "But now despairing to make proficiency in"],
  ["5.10.20", "For hence I believed Evil also to be some"],
  ["5.11.21", "Furthermore, what the Manichees had criticised"],
  ["5.12.22", "I began then diligently to practise that"],
  ["5.13.23", "When therefore they of Milan had sent to"],
  ["5.14.24", "For though I took no pains to learn what"],
  ["5.14.25", "Hereupon I earnestly bent my mind, to see"],
  // Book VI
  ["6.1.1", "O Thou, my hope from my youth, where wert"],
  ["6.2.2", "When then my mother had once, as she was"],
  ["6.3.3", "Nor did I yet groan in my prayers, that Thou"],
  ["6.3.4", "I however certainly had no opportunity of"],
  ["6.4.5", "Ignorant then how this Thy image should subsist"],
  ["6.4.6", "I joyed also that the old Scriptures of the"],
  ["6.5.7", "Being led, however, from this to prefer the"],
  ["6.5.8", "This I believed, sometimes more strongly"],
  ["6.6.9", "I panted after honours, gains, marriage"],
  ["6.6.10", "Away with those then from my soul who say"],
  ["6.7.11", "These things we, who were living as friends"],
  ["6.7.12", "I however had forgotten to deal with him"],
  ["6.8.13", "He, not forsaking that secular course which"],
  ["6.9.14", "But this was already being laid up in his"],
  ["6.9.15", "But thus far was Alypius to be instructed"],
  ["6.10.16", "Him then I had found at Rome, and he clave"],
  ["6.10.17", "Nebridius also, who having left his native"],
  ["6.11.18", "And I, viewing and reviewing things, most"],
  ["6.11.19", "\"Perish every thing, dismiss we these empty"],
  ["6.11.20", "While I went over these things, and these"],
  ["6.12.21", "Alypius indeed kept me from marrying; alleging"],
  ["6.12.22", "For when he wondered that I, whom he esteemed"],
  ["6.13.23", "Continual effort was made to have me married"],
  ["6.14.24", "And many of us friends conferring about"],
  ["6.15.25", "Meanwhile my sins were being multiplied"],
  ["6.16.26", "To Thee be praise, glory to Thee, Fountain"],
  // Book VII
  ["7.1.1", "Deceased was now that my evil and abominable"],
  ["7.1.2", "I then being thus gross-hearted, nor clear"],
  ["7.2.3", "It was enough for me, Lord, to oppose to"],
  ["7.3.4", "But I also as yet, although I held and was"],
  ["7.3.5", "And I strained to perceive what I now heard"],
  ["7.4.6", "For I was in such wise striving to find out"],
  ["7.5.7", "And I sought \"whence is evil,\" and sought"],
  ["7.6.8", "By this time also had I rejected the lying"],
  ["7.6.9", "Upon hearing and believing these things"],
  ["7.6.10", "An opening thus made, ruminating with myself"],
  ["7.7.11", "Now then, O my Helper, hadst Thou loosed"],
  ["7.8.12", "But Thou, Lord, abidest for ever, yet not"],
  ["7.9.13", "And Thou, willing first to show me how Thou"],
  ["7.9.14", "Again I read there, that God the Word was"],
  ["7.9.15", "And therefore did I read there also, that"],
  ["7.10.16", "And being thence admonished to return to"],
  ["7.11.17", "And I beheld the other things below Thee"],
  ["7.12.18", "And it was manifested unto me, that those"],
  ["7.13.19", "And to Thee is nothing whatsoever evil: yea"],
  ["7.14.20", "There is no soundness in them, whom aught"],
  ["7.15.21", "And I looked back on other things; and I"],
  ["7.16.22", "And I perceived and found it nothing strange"],
  ["7.17.23", "And I wondered that I now loved Thee, and"],
  ["7.18.24", "Then I sought a way of obtaining strength"],
  ["7.19.25", "But I thought otherwise; conceiving only"],
  ["7.20.26", "But having then read those books of the Platonists"],
  ["7.21.27", "Most eagerly then did I seize that venerable"],
  // Book VIII
  ["8.1.1", "O my God, let me, with thanksgiving, remember"],
  ["8.1.2", "For, I saw the church full; and one went"],
  ["8.2.3", "To Simplicianus then I went, the father of"],
  ["8.2.4", "O Lord, Lord, Which hast bowed the heavens"],
  ["8.2.5", "To conclude, when the hour was come for making"],
  ["8.3.6", "Good God! what takes place in man, that he"],
  ["8.3.7", "What then takes place in the soul, when it"],
  ["8.3.8", "This law holds in foul and accursed joy"],
  ["8.4.9", "Up, Lord, and do; stir us up, and recall"],
  ["8.5.10", "But when that man of Thine, Simplicianus"],
  ["8.5.11", "Thus, I understood, by my own experience"],
  ["8.5.12", "Thus with the baggage of this present world"],
  ["8.6.13", "And how Thou didst deliver me out of the"],
  ["8.6.14", "Upon a day then, Nebridius being absent (I"],
  ["8.6.15", "Thence his discourse turned to the flocks"],
  ["8.7.16", "Such was the story of Pontitianus; but Thou"],
  ["8.7.17", "But now, the more ardently I loved those"],
  ["8.7.18", "And I had thought that I therefore deferred"],
  ["8.8.19", "Then in this great contention of my inward"],
  ["8.8.20", "Lastly, in the very fever of my irresoluteness"],
  ["8.9.21", "Whence is this monstrousness? and to what"],
  ["8.10.22", "Let them perish from Thy presence, O God"],
  ["8.10.23", "For if there be so many contrary natures"],
  ["8.10.24", "Let them no more say then, when they perceive"],
  ["8.11.25", "Thus soul-sick was I, and tormented, accusing"],
  ["8.11.26", "The very toys of toys, and vanities of vanities"],
  ["8.11.27", "But now it spake very faintly. For on that"],
  ["8.12.28", "But when a deep consideration had from the"],
  ["8.12.29", "So was I speaking and weeping in the most"],
  ["8.12.30", "Then putting my finger between, or some other"],
  // Book IX
  ["9.1.1", "O Lord, I am Thy servant; I am Thy servant"],
  ["9.2.2", "And I resolved in Thy sight, not tumultuously"],
  ["9.2.3", "Thou hadst pierced our hearts with Thy charity"],
  ["9.2.4", "Moreover, it had at first troubled me that"],
  ["9.3.5", "Verecundus was worn down with care about"],
  ["9.3.6", "He then had at that time sorrow, but Nebridius"],
  ["9.4.7", "Now was the day come wherein I was in deed"],
  ["9.4.8", "Oh, in what accents spake I unto Thee, my"],
  ["9.4.9", "I trembled for fear, and again kindled with"],
  ["9.4.10", "I further read, Be angry, and sin not. And"],
  ["9.4.11", "And with a loud cry of my heart I cried out"],
  ["9.4.12", "When shall I recall all which passed in those"],
  ["9.5.13", "The vintage-vacation ended, I gave notice"],
  ["9.6.14", "Thence, when the time was come wherein I"],
  ["9.7.15", "Not long had the Church of Milan begun to"],
  ["9.7.16", "Then didst Thou by a vision discover to Thy"],
  ["9.8.17", "Thou that makest men to dwell of one mind"],
  ["9.8.18", "And yet (as Thy handmaid told me her son)"],
  ["9.9.19", "Brought up thus modestly and soberly, and"],
  ["9.9.20", "Her mother-in-law also, at first by whisperings"],
  ["9.9.21", "This great gift also thou bestowedst, O my"],
  ["9.9.22", "Finally, her own husband, towards the very"],
  ["9.10.23", "The day now approaching whereon she was to"],
  ["9.10.24", "And when our discourse was brought to that"],
  ["9.10.25", "We were saying then: If to any the tumult"],
  ["9.10.26", "Such things was I speaking, and even if not"],
  ["9.11.27", "What answer I made her unto these things"],
  ["9.11.28", "But I, considering Thy gifts, Thou unseen"],
  ["9.12.29", "I closed her eyes; and there flowed withal"],
  ["9.12.30", "What then was it which did grievously pain"],
  ["9.12.31", "The boy then being stilled from weeping"],
  ["9.12.32", "And behold, the corpse was carried to the"],
  ["9.12.33", "And then by little and little I recovered"],
  ["9.13.34", "But now, with a heart cured of that wound"],
  ["9.13.35", "I therefore, O my Praise and my Life, God"],
  ["9.13.36", "And, I believe, Thou hast already done what"],
  ["9.13.37", "May she rest then in peace with the husband"],
  // Book X
  ["10.1.1", "Let me know Thee, O Lord, who knowest me"],
  ["10.2.2", "And from Thee, O Lord, unto whose eyes the"],
  ["10.3.3", "What then have I to do with men, that they"],
  ["10.3.4", "But do Thou, my inmost Physician, make plain"],
  ["10.4.5", "But for what fruit would they hear this?"],
  ["10.4.6", "This is the fruit of my confessions of what"],
  ["10.5.7", "For Thou, Lord, dost judge me: because, although"],
  ["10.6.8", "Not with doubting, but with assured consciousness"],
  ["10.6.9", "And what is this? I asked the earth, and"],
  ["10.6.10", "Is not this corporeal figure apparent to"],
  ["10.7.11", "What then do I love, when I love my God?"],
  ["10.8.12", "I will pass then beyond this power of my"],
  ["10.8.13", "There are all things preserved distinctly"],
  ["10.8.14", "These things do I within, in that vast court"],
  ["10.8.15", "Great is this force of memory, excessive"],
  ["10.9.16", "Yet not these alone does the unmeasurable"],
  ["10.10.17", "But now when I hear that there be three kinds"],
  ["10.11.18", "Wherefore we find, that to learn these things"],
  ["10.12.19", "The memory containeth also reasons and laws"],
  ["10.13.20", "All these things I remember, and how I learnt"],
  ["10.14.21", "The same memory contains also the affections"],
  ["10.14.22", "But, behold, out of my memory I bring it"],
  ["10.15.23", "But whether by images or no, who can readily"],
  ["10.16.24", "What, when I name forgetfulness, and withal"],
  ["10.16.25", "Lord, I, truly, toil therein, yea and toil"],
  ["10.17.26", "Great is the power of memory, a fearful thing"],
  ["10.18.27", "For the woman that had lost her groat, and"],
  ["10.19.28", "But what when the memory itself loses any"],
  ["10.20.29", "How then do I seek Thee, O Lord? For when"],
  ["10.21.30", "But is it so, as one remembers Carthage who"],
  ["10.21.31", "Where then and when did I experience my happy"],
  ["10.22.32", "Far be it, Lord, far be it from the heart"],
  ["10.23.33", "It is not certain then that all wish to be"],
  ["10.23.34", "But why doth \"truth generate hatred,\" and"],
  ["10.24.35", "See what a space I have gone over in my memory"],
  ["10.25.36", "But where in my memory residest Thou, O Lord"],
  ["10.26.37", "Where then did I find Thee, that I might"],
  ["10.27.38", "Too late loved I Thee, O Thou Beauty of ancient"],
  ["10.28.39", "When I shall with my whole self cleave to"],
  ["10.29.40", "And all my hope is no where but in Thy exceeding"],
  ["10.30.41", "Verily Thou enjoinest me continency from"],
  ["10.30.42", "Art Thou not mighty, God Almighty, so as"],
  ["10.31.43", "There is another evil of the day, which I"],
  ["10.31.44", "This hast Thou taught me, that I should set"],
  ["10.31.45", "I hear the voice of my God commanding, Let"],
  ["10.31.46", "Thou hast taught me, good Father, that to"],
  ["10.31.47", "Placed then amid these temptations, I strive"],
  ["10.32.48", "With the allurements of smells, I am not"],
  ["10.33.49", "The delights of the ear had more firmly entangled"],
  ["10.33.50", "At other times, shunning over-anxiously this"],
  ["10.34.51", "There remains the pleasure of these eyes"],
  ["10.34.52", "O Thou Light, which Tobias saw, when, these"],
  ["10.34.53", "What innumerable toys, made by divers arts"],
  ["10.35.54", "To this is added another form of temptation"],
  ["10.35.55", "But by this may more evidently be discerned"],
  ["10.35.56", "In this so vast wilderness, full of snares"],
  ["10.35.57", "Notwithstanding, in how many most petty and"],
  ["10.36.58", "And Thou knowest how far Thou hast already"],
  ["10.36.59", "But, O Lord, Thou alone Lord without pride"],
  ["10.37.60", "By these temptations we are assailed daily"],
  ["10.37.61", "What then do I confess unto Thee in this"],
  ["10.37.62", "Behold, in Thee, O Truth, I see that I ought"],
  ["10.38.63", "Yet the word which cometh out of the mouth"],
  ["10.39.64", "Within also, within is another evil, arising"],
  ["10.40.65", "Where hast Thou not walked with me, O Truth"],
  ["10.41.66", "Thus then have I considered the sicknesses"],
  ["10.42.67", "Whom could I find to reconcile me to Thee"],
  ["10.43.68", "But the true Mediator, Whom in Thy secret"],
  ["10.43.69", "How hast Thou loved us, good Father, who"],
  ["10.43.70", "Affrighted with my sins and the burden of"],
  // Book XI
  ["11.1.1", "Lord, since eternity is Thine, art Thou ignorant"],
  ["11.2.2", "But how shall I suffice with the tongue of"],
  ["11.2.3", "O Lord my God, give ear unto my prayer, and"],
  ["11.2.4", "Lord, have mercy on me, and hear my desire"],
  ["11.3.5", "I would hear and understand, how \"In the"],
  ["11.4.6", "Behold, the heavens and the earth are; they"],
  ["11.5.7", "But how didst Thou make the heaven and the"],
  ["11.6.8", "But how didst Thou speak? In the way that"],
  ["11.7.9", "Thou callest us then to understand the Word"],
  ["11.8.10", "Why, I beseech Thee, O Lord my God? I see"],
  ["11.9.11", "In this Beginning, O God, hast Thou made"],
  ["11.10.12", "Lo, are they not full of their old leaven"],
  ["11.11.13", "Who speak thus, do not yet understand Thee"],
  ["11.12.14", "See, I answer him that asketh, \"What did"],
  ["11.13.15", "But if any excursive brain rove over the"],
  ["11.13.16", "Nor dost Thou by time, precede time: else"],
  ["11.14.17", "At no time then hadst Thou not made any thing"],
  ["11.15.18", "And yet we say, \"a long time\" and \"a short"],
  ["11.15.19", "Let us see then, thou soul of man, whether"],
  ["11.15.20", "See how the present time, which alone we"],
  ["11.16.21", "And yet, Lord, we perceive intervals of times"],
  ["11.17.22", "I ask, Father, I affirm not: O my God, rule"],
  ["11.18.23", "Permit me, Lord, to seek further. O my hope"],
  ["11.18.24", "Which way soever then this secret fore-perceiving"],
  ["11.19.25", "Thou then, Ruler of Thy creation, by what"],
  ["11.20.26", "What now is clear and plain is, that neither"],
  ["11.21.27", "I said then even now, we measure times as"],
  ["11.22.28", "My soul is on fire to know this most intricate"],
  ["11.23.29", "I heard once from a learned man, that the"],
  ["11.23.30", "I desire to know the force and nature of"],
  ["11.24.31", "Dost Thou bid me assent, if any define time"],
  ["11.25.32", "And I confess to Thee, O Lord, that I yet"],
  ["11.26.33", "Does not my soul most truly confess unto"],
  ["11.27.34", "Courage, my mind, and press on mightily."],
  ["11.27.35", "\"Deus Creator omnium,\" this verse of eight"],
  ["11.27.36", "It is in thee, my mind, that I measure times"],
  ["11.28.37", "But how is that future diminished or consumed"],
  ["11.28.38", "I am about to repeat a Psalm that I know"],
  ["11.29.39", "But because Thy loving-kindness is better"],
  ["11.30.40", "And now will I stand, and become firm in"],
  ["11.31.41", "O Lord my God, what a depth is that recess"],
  // Book XII
  ["12.1.1", "My heart, O Lord, touched with the words"],
  ["12.2.2", "The lowliness of my tongue confesseth unto"],
  ["12.3.3", "And now this earth was invisible and without"],
  ["12.4.4", "How then should it be called, that it might"],
  ["12.5.5", "So that when thought seeketh what the sense"],
  ["12.6.6", "But I, Lord, if I would, by my tongue and"],
  ["12.7.7", "But whence had it this degree of being, but"],
  ["12.8.8", "But that heaven of heavens was for Thyself"],
  ["12.9.9", "And therefore the Spirit, the Teacher of"],
  ["12.10.10", "O let the Light, the Truth, the Light of"],
  ["12.11.11", "Already Thou hast told me with a strong voice"],
  ["12.11.12", "Thou hast told me also with a strong voice"],
  ["12.11.13", "By this may the soul, whose pilgrimage is"],
  ["12.11.14", "There is, behold, I know not what formlessness"],
  ["12.12.15", "These things considered, as much as Thou"],
  ["12.13.16", "This then is what I conceive, O my God, when"],
  ["12.14.17", "Wondrous depth of Thy words! whose surface"],
  ["12.15.18", "\"Will you affirm that to be false, which"],
  ["12.15.19", "\"What will ye say then, O ye gainsayers?"],
  ["12.15.20", "For although we find no time before it, for"],
  ["12.15.21", "Hence it is so of Thee, our God, as to be"],
  ["12.15.22", "\"What say ye to me, O ye gainsayers that"],
  ["12.16.23", "With these I now parley a little in Thy presence"],
  ["12.17.24", "For they say, \"Though these things be true"],
  ["12.17.25", "What now if another should say that \"this"],
  ["12.17.26", "It yet remains for a man to say, if he will"],
  ["12.18.27", "All which things being heard and well considered"],
  ["12.19.28", "For true it is, O Lord, that Thou madest"],
  ["12.20.29", "Out of these truths, of which they doubt"],
  ["12.21.30", "And with regard to the understanding of the"],
  ["12.22.31", "For should any attempt to dispute against"],
  ["12.23.32", "These things then being heard and perceived"],
  ["12.24.33", "But which of us shall, among those so many"],
  ["12.25.34", "Let no man harass me then, by saying, Moses"],
  ["12.25.35", "Hearken, O God, Thou best judge; Truth Itself"],
  ["12.26.36", "And yet I, O my God, Thou lifter up of my"],
  ["12.27.37", "For as a fountain within a narrow compass"],
  ["12.28.38", "But others, unto whom these words are no"],
  ["12.28.39", "Another bends his mind on that which is said"],
  ["12.29.40", "But he that no otherwise understands In the"],
  ["12.30.41", "In this diversity of the true opinions, let"],
  ["12.31.42", "So when one says, \"Moses meant as I do\""],
  ["12.32.43", "Lastly, O Lord, who art God and not flesh"],
  // Book XIII
  ["13.1.1", "I call upon Thee, O my God, my mercy, Who"],
  ["13.2.2", "For of the fulness of Thy goodness, doth"],
  ["13.2.3", "How did corporeal matter deserve of Thee"],
  ["13.3.4", "That which Thou saidst in the beginning of"],
  ["13.4.5", "What then could be wanting unto Thy good"],
  ["13.5.6", "Lo, now the Trinity appears unto me in a"],
  ["13.6.7", "But what was the cause, O true-speaking Light"],
  ["13.7.8", "Hence let him that is able, follow with his"],
  ["13.8.9", "Angels fell away, man's soul fell away, and"],
  ["13.9.10", "But was not either the Father, or the Son"],
  ["13.10.11", "Blessed creature, which being itself other"],
  ["13.11.12", "Which of us comprehendeth the Almighty Trinity"],
  ["13.12.13", "Proceed in thy confession, say to the Lord"],
  ["13.13.14", "But as yet by faith and not by sight, for"],
  ["13.14.15", "Behold, I too say, O my God, Where art Thou"],
  ["13.15.16", "Or who, except Thou, our God, made for us"],
  ["13.15.17", "Let us look, O Lord, upon the heavens, the"],
  ["13.15.18", "Other waters there be above this firmament"],
  ["13.16.19", "For altogether, as Thou art, Thou only knowest"],
  ["13.17.20", "Who gathered the embittered together into"],
  ["13.17.21", "But the souls that thirst after Thee, and"],
  ["13.18.22", "So, Lord, so, I beseech Thee, let there spring"],
  ["13.18.23", "For to one is given by the Spirit the word"],
  ["13.19.24", "But first, wash you, be clean; put away evil"],
  ["13.19.25", "But you, chosen generation, you weak things"],
  ["13.20.26", "Let the sea also conceive and bring forth"],
  ["13.20.27", "Speak I untruly, or do I mingle and confound"],
  ["13.20.28", "Now are all things fair that Thou hast made"],
  ["13.21.29", "And hereby, in Thy Word, not the deepness"],
  ["13.21.30", "Now then let Thy ministers work upon the"],
  ["13.21.31", "But Thy word, O God, is the fountain of life"],
  ["13.22.32", "For behold, O Lord, our God, our Creator"],
  ["13.23.33", "But that he judgeth all things, this answers"],
  ["13.23.34", "Man therefore, whom Thou hast made after"],
  ["13.24.35", "But what is this, and what kind of mystery"],
  ["13.24.36", "What then shall I say, O Truth my Light?"],
  ["13.24.37", "If therefore we conceive of the natures of"],
  ["13.25.38", "I would also say, O Lord my God, what the"],
  ["13.26.39", "But they are fed by these fruits, that are"],
  ["13.26.40", "Whereat then rejoicest thou, O great Paul"],
  ["13.26.41", "Was it for his own necessities, because he"],
  ["13.27.42", "I will then speak what is true in Thy sight"],
  ["13.28.43", "And Thou, O God, sawest every thing that"],
  ["13.29.44", "And I looked narrowly to find, whether seven"],
  ["13.30.45", "And I heard, O Lord my God, and drank up"],
  ["13.31.46", "But they who by Thy Spirit see these things"],
  ["13.32.47", "Thanks to Thee, O Lord. We behold the heaven"],
  ["13.33.48", "Let Thy works praise Thee, that we may love"],
  ["13.34.49", "We have also examined what Thou willedst"],
  ["13.35.50", "O Lord God, give peace unto us: (for Thou"],
  ["13.36.51", "But the seventh day hath no evening, nor"],
  ["13.37.52", "For then shalt Thou rest in us, as now Thou"],
  ["13.38.53", "We therefore see these things which Thou"],
];

/**
 * Every work whose file keeps the edition's divisions, and how. A work not
 * here is either Purify's own prose (a Life in our voice, a retelling), a
 * selection that names its places in its sections' titles and citations, or
 * a work whose divisions are still to be added (docs/editorial-standards.md, Editorial review 3).
 */
export const SCHEMES: Readonly<Record<string, Scheme>> = {
  "augustine-of-hippo/confessions": {
    table: { levels: ["book", "chapter", "section"], starts: [...CONFESSIONS_I, ...CONFESSIONS_II_XIII] },
    roman: [true, false, false],
    edition: "tr. Pusey",
  },
  // The 57 chapters, each opened by the edition's own heading ("§54. ...").
  // The sections inside a chapter are printed in the middle of its
  // paragraphs in this file, so the work is cited by chapter: On the
  // Incarnation 54.
  "athanasius-the-great/on-the-incarnation": {
    synopsis: { re: /^§(\d+)\. /, level: "chapter", cited: true, restart: "never" },
    edition: NPNF("II", 4),
  },
  // The same: its 47 chapters run on through the file's three parts, each
  // opened by the edition's heading, and it is cited by chapter (Against
  // the Heathen 40).
  "athanasius-the-great/against-the-heathen": {
    synopsis: { re: /^§(\d+)\. /, level: "chapter", cited: true, restart: "never" },
    edition: NPNF("II", 4),
  },
  "athanasius-the-great/life-of-antony": {
    marks: { level: "chapter", restart: "never" },
    edition: NPNF("II", 4),
  },
  "anthony-the-great/life-of-antony": {
    marks: { level: "chapter", restart: "never" },
    edition: NPNF("II", 4),
  },
  "athanasius-the-great/on-the-nicene-definition": {
    synopsis: { re: /^Chapter ([IVXLC]+)\.--/, level: "chapter", cited: false, restart: "never" },
    marks: { level: "section", restart: "never" },
    edition: NPNF("II", 4),
  },
  "athanasius-the-great/on-the-councils": {
    title: { re: /^Part ([IVX]+)\./, levels: ["part"] },
    marks: { level: "section", restart: "never" },
    innermostOnly: true,
    edition: NPNF("II", 4),
  },
  "athanasius-the-great/four-discourses-against-the-arians": {
    title: { re: /^Discourse ([IVX]+)$/, levels: ["discourse"] },
    synopsis: { re: /^Chapter ([IVXLC]+)\.--/, level: "chapter", cited: false, restart: "never" },
    marks: { level: "section", restart: "section" },
    roman: [true, false],
    edition: NPNF("II", 4),
  },
  "ignatius-of-antioch/epistle-to-the-ephesians": ignatius(),
  "ignatius-of-antioch/epistle-to-the-magnesians": ignatius(),
  "ignatius-of-antioch/epistle-to-the-trallians": ignatius(),
  "ignatius-of-antioch/epistle-to-the-romans": ignatius(),
  "ignatius-of-antioch/epistle-to-the-philadelphians": ignatius(),
  "ignatius-of-antioch/epistle-to-the-smyrnaeans": ignatius(),
  "ignatius-of-antioch/epistle-to-polycarp": ignatius(),
  "polycarp-of-smyrna/epistle-to-the-philippians": ignatius(),
  "polycarp-of-smyrna/the-martyrdom-of-polycarp": ignatius(),
  "justin-martyr/first-apology": { order: { first: 1, level: "chapter" }, edition: ANF1 },
  "justin-martyr/second-apology": { order: { first: 1, level: "chapter" }, edition: ANF1 },
  "justin-martyr/dialogue-with-trypho": {
    order: { first: 1, level: "chapter", chapterOf: dialogueChapter },
    edition: ANF1,
  },
  "cyprian-of-carthage/on-the-lords-prayer": { title: { re: /^Chapter (\d+)$/, levels: ["chapter"] }, edition: "ANF 5" },
  "cyprian-of-carthage/on-the-mortality": { title: { re: /^Chapter (\d+)$/, levels: ["chapter"] }, edition: "ANF 5" },
  "cyprian-of-carthage/on-the-unity-of-the-church": { title: { re: /^Chapter (\d+)$/, levels: ["chapter"] }, edition: "ANF 5" },
  "cyprian-of-carthage/the-life-and-passion-of-cyprian": { title: { re: /^Chapter (\d+)$/, levels: ["chapter"] }, edition: "ANF 5" },
  "jerome-of-stridon/life-of-paulus-the-first-hermit": { title: { re: /^(\d+)$/, levels: ["chapter"] }, edition: NPNF("II", 6) },
  "jerome-of-stridon/life-of-saint-hilarion": { title: { re: /^(\d+)$/, levels: ["chapter"] }, edition: NPNF("II", 6) },
  // The same Life, registered under St. Hilarion too (as the Life of Antony is under both).
  "hilarion-the-great/life-of-saint-hilarion": { title: { re: /^(\d+)$/, levels: ["chapter"] }, edition: NPNF("II", 6) },
  "jerome-of-stridon/life-of-malchus-the-captive-monk": { title: { re: /^(\d+)$/, levels: ["chapter"] }, edition: NPNF("II", 6) },
  "jerome-of-stridon/the-perpetual-virginity-of-blessed-mary": { title: { re: /^(\d+)$/, levels: ["section"] }, edition: NPNF("II", 6) },
  "gregory-of-nyssa/the-great-catechism": { title: { re: /^Chapter (\d+)$/, levels: ["chapter"] }, edition: NPNF("II", 5) },
  "leo-the-great/the-tome-of-leo": { order: { first: 2, level: "chapter" }, edition: NPNF("II", 12) },
  // The whole First Theological Oration (1.8): its nine chapters are
  // sections 101 to 109, past the two sections of our own that held chapter
  // 3 until then (lib/saints/layoutMoves.ts), and cited by chapter.
  "gregory-theologian/first-theological-oration": { order: { first: 101, level: "chapter" }, edition: NPNF("II", 7) },
  // The seven Nativity sermons (1.8), each a section titled by its number in
  // the edition ("Sermon XXI. On the Feast of the Nativity, I"). The
  // translator opens each chapter with his own heading ("I. All share in the
  // joy of Christmas."), the chapters starting again in every sermon: the
  // headings are set apart and never cited as St. Leo's words, and a place is
  // cited by sermon and chapter (Sermon XXI.2).
  "leo-the-great/sermons-on-the-nativity": {
    title: { re: /^Sermon ([IVXLC]+)\./, levels: ["sermon"] },
    synopsis: { re: /^([IVXLC]+)\. /, level: "chapter", cited: true, restart: "outer" },
    roman: [true, false],
    edition: NPNF("II", 12),
  },
  "basil-the-great/on-the-holy-spirit": {
    title: { re: /^Chapter ([IVXLC]+)\./, levels: ["chapter"] },
    marks: { level: "section", restart: "never" },
    edition: NPNF("II", 8),
  },
  "john-of-damascus/exact-exposition-of-the-orthodox-faith": {
    title: { re: /^Book ([IVX]+), Chapter ([IVXLC]+)\./, levels: ["book", "chapter"] },
    roman: [true, false],
    edition: NPNF("II", 9),
  },
  "john-cassian/institutes": {
    title: { re: /^Book (\d+), Chapter (\d+)\./, levels: ["book", "chapter"] },
    edition: NPNF("II", 11),
  },
  "john-cassian/conferences": {
    title: { re: /^Conference (\d+), Chapter (\d+)\./, levels: ["conference", "chapter"] },
    // Sections 493 to 603 are not the Conferences: they are Cassian's Seven
    // Books on the Incarnation of the Lord, against Nestorius, which follow
    // them in NPNF II 11 and which the ingest filed here titled "Conference
    // 24, Chapter n" (each book's chapters counted from 1 again at 493, 499,
    // 506, 522, 535, 550 and 573). They are not numbered as Conferences until
    // that is put right (docs/editorial-standards.md, Editorial review 3).
    exclude: (n) => n >= 493,
    edition: NPNF("II", 11),
  },
  "augustine-of-hippo/harmony-of-the-gospels": {
    title: { re: /^Book (\d+), Chapter (\d+)\./, levels: ["book", "chapter"] },
    marks: { level: "section", restart: "outer" },
    edition: NPNF("I", 6),
  },
  "augustine-of-hippo/sermon-on-the-mount": {
    title: { re: /^Book (\d+), Chapter (\d+)$/, levels: ["book", "chapter"] },
    marks: { level: "section", restart: "outer" },
    edition: NPNF("I", 6),
  },
  "augustine-of-hippo/sermons-on-selected-lessons": {
    title: { re: /^Sermon (\d+)\./, levels: ["sermon"] },
    marks: { level: "section", restart: "section" },
    edition: NPNF("I", 6),
  },
  "gregory-the-dialogist/morals-on-the-book-of-job": {
    title: { re: /^Book (\d+), on Job/, levels: ["book"] },
    marks: { level: "section", restart: "section" },
    edition: "Oxford, 1844 to 1850",
  },
  "john-chrysostom/on-the-priesthood": {
    title: { re: /^Book ([IVX]+)$/, levels: ["book"] },
    marks: { level: "section", restart: "section", implicitFirst: true },
    roman: [true, false],
    edition: NPNF("I", 9),
  },
  "john-chrysostom/commentary-on-galatians": { title: { re: /^Chapter ([IVX]+), Galatians/, levels: ["chapter"] }, edition: NPNF("I", 13) },
  "john-chrysostom/homilies-on-matthew": homilies(10, true),
  "john-chrysostom/homilies-on-john": homilies(14),
  "john-chrysostom/homilies-on-acts": homilies(11),
  "john-chrysostom/homilies-on-romans": homilies(11),
  "john-chrysostom/homilies-on-1-corinthians": homilies(12),
  "john-chrysostom/homilies-on-2-corinthians": homilies(12),
  "john-chrysostom/homilies-on-ephesians": homilies(13),
  "john-chrysostom/homilies-on-philippians": homilies(13),
  "john-chrysostom/homilies-on-colossians": homilies(13),
  "john-chrysostom/homilies-on-1-thessalonians": homilies(13),
  "john-chrysostom/homilies-on-2-thessalonians": homilies(13),
  "john-chrysostom/homilies-on-1-timothy": homilies(13),
  "john-chrysostom/homilies-on-2-timothy": homilies(13),
  "john-chrysostom/homilies-on-titus": homilies(13),
  "john-chrysostom/homilies-on-philemon": homilies(13),
  "john-chrysostom/homilies-on-hebrews": homilies(14),
  "cyril-of-alexandria/commentary-on-luke": { title: { re: /^Sermon (\d+)\b/, levels: ["sermon"] }, edition: "tr. Payne Smith, 1859" },
  "photius-the-great/the-bibliotheca": { title: { re: /^Codex (\d+)\b/, levels: ["codex"] }, edition: "tr. Freese, 1920" },
};

export type WorkDivisions = {
  key: string;
  levels: Level[];
  /** How many of the outer levels the sections' titles (or their order) already name. */
  titled: number;
  /** Each paragraph's place, by the section's index in the file, then the paragraph's. */
  places: (ParagraphPlace | null)[][];
  /** The edition, as a citation names it: "NPNF I 10", "tr. Pusey". */
  edition: string;
  scheme: Scheme;
};

const cache = new WeakMap<WorkLike, WorkDivisions | null>();

/** The edition's divisions of a work, laid over its file; null for a work that keeps none. */
export function divisionsOf(key: string, work: WorkLike): WorkDivisions | null {
  const hit = cache.get(work);
  if (hit !== undefined && (hit === null || hit.key === key)) return hit;
  const scheme = SCHEMES[key];
  const out = scheme ? derive(key, scheme, work) : null;
  cache.set(work, out);
  return out;
}

/** A mark the count accepts: the next number, or one a little past it (a number the file lost). */
function accepts(m: number | null, last: number): m is number {
  return m !== null && m > last && m <= last + 3;
}

/** How many of the innermost numbers changed from the place before: the divisions that begin here. */
function beginsFrom(prev: readonly number[] | null, path: readonly number[]): number {
  if (!prev || prev.length !== path.length) return path.length;
  for (let d = 0; d < path.length; d++) if (prev[d] !== path[d]) return path.length - d;
  return 0;
}

function derive(key: string, s: Scheme, work: WorkLike): WorkDivisions {
  if (s.table) return deriveTable(key, s, work);
  const titleLevels: Level[] = s.title ? s.title.levels : s.order ? [s.order.level] : [];
  const cited = !!s.synopsis?.cited;
  const levels: Level[] = [...titleLevels, ...(cited ? [s.synopsis!.level] : []), ...(s.marks ? [s.marks.level] : [])];
  const titled = titleLevels.length;

  const places: (ParagraphPlace | null)[][] = [];
  let outer: number[] | null = null; // the titled numbers of the section before
  let chapter = 0; // the synopses' count
  let mark = 0; // the marks' count
  let prev: number[] | null = null; // the place before, for what begins

  for (const sec of work.sections) {
    let head: number[] | null = null;
    if (s.exclude?.(sec.n)) head = null;
    else if (s.title) {
      const m = s.title.re.exec(sec.title);
      head = m ? m.slice(1, 1 + s.title.levels.length).map(num) : null;
    } else if (s.order) {
      const c = s.order.chapterOf ? s.order.chapterOf(sec.n) : sec.n >= s.order.first ? sec.n - s.order.first + 1 : null;
      head = c === null ? null : [c];
    } else head = [];
    const sectionPlaces: (ParagraphPlace | null)[] = [];
    places.push(sectionPlaces);
    if (!head || (titled > 0 && head.length === 0)) {
      // A section the edition does not number so: an editor's note, a salutation.
      for (let i = 0; i < sec.paragraphs.length; i++) sectionPlaces.push(null);
      continue;
    }
    const newOuter = !outer || outer[0] !== head[0];
    outer = head;
    if (s.marks && (s.marks.restart === "section" || (s.marks.restart === "outer" && newOuter && titled > 0))) mark = 0;
    if (s.synopsis?.restart === "outer" && newOuter && titled > 0) chapter = 0;
    let open = false; // a marked division has begun in this section

    for (let i = 0; i < sec.paragraphs.length; i++) {
      const p = sec.paragraphs[i];
      // A chapter the file runs on in this section, opened by its heading.
      const opens = s.order?.heading?.exec(p);
      if (opens && head) {
        head = [num(opens[1])];
        sectionPlaces.push({ path: [...head], begins: beginsFrom(prev, head), synopsis: true });
        prev = [...head];
        continue;
      }
      const rule = s.synopsis;
      const syn = rule ? rule.re.exec(p) : null;
      if (syn && accepts(num(syn[1]), chapter)) {
        chapter = num(syn[1]);
        if (cited && s.marks) mark = 0;
        // The heading names the chapter, and the section the text under it begins.
        let next = mark + 1;
        if (s.marks) {
          for (let j = i + 1; j < sec.paragraphs.length; j++) {
            const m = markOfParagraph(sec.paragraphs[j]);
            if (accepts(m, mark)) {
              next = s.marks.implicitFirst && j > i + 1 ? 1 : m;
              break;
            }
            if (rule?.re.test(sec.paragraphs[j])) break;
          }
          if (cited && s.marks.implicitFirst) next = Math.min(next, 1);
        }
        const path = [...head, ...(cited ? [chapter] : []), ...(s.marks ? [next] : [])];
        sectionPlaces.push({ path, begins: beginsFrom(prev, path), synopsis: true });
        prev = path;
        if (s.marks) {
          mark = next;
          open = true;
        }
        continue;
      }
      if (s.synopsis?.cited && chapter === 0) {
        sectionPlaces.push(null); // before the first chapter: the work's front matter
        continue;
      }
      if (s.marks) {
        const m = markOfParagraph(p);
        if (accepts(m, mark)) {
          mark = m;
          open = true;
        } else if (!open && mark === 0 && s.marks.implicitFirst) {
          mark = 1;
          open = true;
        } else if (!open && titled > 0) {
          // A titled section's opening before its first number (its title
          // run on, a note): it belongs to the division its first number
          // begins. In a work of one section, what comes before the first
          // number is the work's front matter (a preface, an address).
          for (let j = i + 1; j < sec.paragraphs.length; j++) {
            const ahead = markOfParagraph(sec.paragraphs[j]);
            if (accepts(ahead, mark)) {
              mark = ahead;
              open = true;
              break;
            }
          }
        }
        if (mark === 0) {
          sectionPlaces.push(null); // before the first number: the work's front matter
          continue;
        }
        open = true;
      }
      const path = [...head, ...(cited ? [chapter] : []), ...(s.marks ? [mark] : [])];
      if (path.length === 0) {
        sectionPlaces.push(null);
        continue;
      }
      sectionPlaces.push({ path, begins: beginsFrom(prev, path) });
      prev = path;
    }
  }
  return { key, levels, titled, places, edition: s.edition, scheme: s };
}

function deriveTable(key: string, s: Scheme, work: WorkLike): WorkDivisions {
  const t = s.table!;
  const starts = t.starts.map(([at, words]) => ({ path: parseAt(at)!, words }));
  const places: (ParagraphPlace | null)[][] = [];
  let k = 0;
  let current: number[] | null = null;
  for (const sec of work.sections) {
    const sectionPlaces: (ParagraphPlace | null)[] = [];
    for (const p of sec.paragraphs) {
      const next = starts[k];
      if (next && p.startsWith(next.words)) {
        const before = current;
        current = next.path;
        k++;
        let begins = current.length;
        if (before) {
          begins = 0;
          for (let d = 0; d < current.length; d++) {
            if (before[d] !== current[d]) {
              begins = current.length - d;
              break;
            }
          }
        }
        sectionPlaces.push({ path: [...current], begins });
      } else {
        sectionPlaces.push(current ? { path: [...current], begins: 0 } : null);
      }
    }
    places.push(sectionPlaces);
  }
  return { key, levels: [...t.levels], titled: 1, places, edition: s.edition, scheme: s };
}

/** "1.1.1" → [1, 1, 1]. */
export function parseAt(at: string): number[] | null {
  if (!/^\d+(?:\.\d+)*$/.test(at)) return null;
  return at.split(".").map(Number);
}

/** The address a division opens at: "1.1.1". */
export function atOf(path: readonly number[]): string {
  return path.join(".");
}

/** A paragraph's place, by the section's number and the paragraph's index. */
export function placeAt(d: WorkDivisions, work: WorkLike, n: number, i: number): ParagraphPlace | null {
  const s = work.sections.findIndex((x) => x.n === n);
  return s >= 0 ? d.places[s]?.[i] ?? null : null;
}

/** How a work cites a place: "I.1.1", "15.2", "8.21", "54.3". */
export function citeLabel(d: WorkDivisions, path: readonly number[]): string {
  const parts = d.scheme.innermostOnly ? path.slice(-1) : path;
  const offset = path.length - parts.length;
  return parts.map((n, k) => (d.scheme.roman?.[k + offset] ? toRoman(n) : String(n))).join(".");
}

/** Where a division begins: the first paragraph whose place falls within it. */
export function findAt(d: WorkDivisions, work: WorkLike, path: readonly number[]): { n: number; i: number } | null {
  for (let s = 0; s < d.places.length; s++) {
    const sec = d.places[s];
    for (let i = 0; i < sec.length; i++) {
      const pl = sec[i];
      if (!pl) continue;
      if (path.every((v, k) => pl.path[k] === v)) return { n: work.sections[s].n, i };
    }
  }
  return null;
}

/**
 * The numbers a reader sees beside a paragraph, quietly: the levels below
 * what the section's own title already says, innermost last. Empty when the
 * paragraph carries on a division or when the title says it all.
 */
export function shownMarks(d: WorkDivisions, place: ParagraphPlace | null): { level: Level; n: number }[] {
  if (!place || place.begins === 0) return [];
  const from = Math.max(d.titled, place.path.length - place.begins);
  const out: { level: Level; n: number }[] = [];
  for (let k = from; k < place.path.length; k++) out.push({ level: d.levels[k], n: place.path[k] });
  return out;
}

const WORD: Record<Level, string> = {
  book: "Book",
  part: "Part",
  chapter: "Chapter",
  section: "§",
  homily: "Homily",
  sermon: "Sermon",
  conference: "Conference",
  discourse: "Discourse",
  codex: "Codex",
};

/**
 * A place in words, as a citation line says it (1.8), in the style the
 * reading room's collections set: the section's own name for what its title
 * numbers ("Book 2, Chapter 19", "Homily 15, Matthew 5:1, 2", "Book 5, on
 * Job 3 to 5"), then the edition's paragraph number as `mark` ("§63"). Where
 * the titles number nothing, the numbers are said in words: the Confessions'
 * "Book I, Chapter 1" with "§1", Ignatius's "Chapter 4", the Life of
 * Antony's "Chapter 20", On the Incarnation's "Chapter 54". The words are
 * English, as the works' names are.
 */
export function placeWords(
  d: WorkDivisions,
  path: readonly number[],
  sectionTitle: string,
  nameOf: (title: string) => string,
): { place: string; mark?: string } {
  const say = (k: number) => {
    const n = path[k];
    const level = d.levels[k];
    const shown = d.scheme.roman?.[k] ? toRoman(n) : String(n);
    return level === "section" ? `§${shown}` : `${WORD[level]} ${shown}`;
  };
  // A work cited by its sections alone (On the Councils 8): just that number.
  if (d.scheme.innermostOnly) return { place: say(path.length - 1) };
  const titled = d.scheme.title ? d.titled : 0;
  const inner = path.map((_, k) => k).filter((k) => k >= titled);
  const last = inner[inner.length - 1];
  const markAt = last !== undefined && d.levels[last] === "section" ? last : undefined;
  const words = inner.filter((k) => k !== markAt).map(say);
  // The section's own name, unless it is a bare number, runs long, or
  // carries a dash: then the numbers in words ("Chapter 12", "Codex 6").
  const named = titled ? nameOf(sectionTitle) : "";
  const plain = !named || /^\d+$/.test(named) || named.length > 48 || named.includes(String.fromCharCode(0x2014));
  const head = titled ? (plain ? path.slice(0, titled).map((_, k) => say(k)).join(", ") : named) : "";
  const place = [head, ...words].filter(Boolean).join(", ");
  const mark = markAt !== undefined ? say(markAt) : undefined;
  return place ? { place, ...(mark ? { mark } : {}) } : { place: mark ?? "" };
}

/** The chapter an edition's heading opens, by its own number ("§54." is 54, "Chapter XIV.--" is 14). */
export function synopsisChapter(d: WorkDivisions, paragraph: string): number | null {
  const m = d.scheme.synopsis?.re.exec(paragraph) ?? d.scheme.order?.heading?.exec(paragraph);
  return m ? num(m[1]) : null;
}

/** An edition's heading as the reader sets it: its words, its number shown apart. */
export function synopsisWords(paragraph: string): string {
  return paragraph.replace(/^(?:§\d+\.|Chapter [IVXLC]+(?:\.--|—))\s*/, "");
}

/** The section's number as the edition prints it, for the reader's heading: "8.21" rather than the file's 177. */
export function sectionLabel(d: WorkDivisions, work: WorkLike, n: number): string | null {
  const s = work.sections.findIndex((x) => x.n === n);
  if (s < 0 || d.titled === 0) return null;
  const first = d.places[s]?.find((p) => p);
  if (!first) return null;
  return citeLabel({ ...d, scheme: { ...d.scheme, innermostOnly: undefined } }, first.path.slice(0, d.titled));
}
