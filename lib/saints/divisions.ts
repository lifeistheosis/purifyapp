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
 * Every work whose file keeps the edition's divisions, and how. A work not
 * here is either Purify's own prose (a Life in our voice, a retelling), a
 * selection that names its places in its sections' titles and citations, or
 * a work whose divisions are still to be added (docs/editorial-standards.md, Editorial review 3).
 */
export const SCHEMES: Readonly<Record<string, Scheme>> = {
  "augustine-of-hippo/confessions": {
    table: { levels: ["book", "chapter", "section"], starts: CONFESSIONS_I },
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
  "jerome-of-stridon/life-of-malchus-the-captive-monk": { title: { re: /^(\d+)$/, levels: ["chapter"] }, edition: NPNF("II", 6) },
  "jerome-of-stridon/the-perpetual-virginity-of-blessed-mary": { title: { re: /^(\d+)$/, levels: ["section"] }, edition: NPNF("II", 6) },
  "gregory-of-nyssa/the-great-catechism": { title: { re: /^Chapter (\d+)$/, levels: ["chapter"] }, edition: NPNF("II", 5) },
  "leo-the-great/the-tome-of-leo": { order: { first: 2, level: "chapter" }, edition: NPNF("II", 12) },
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
