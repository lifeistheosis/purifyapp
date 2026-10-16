// Guided walkthroughs: the free tier of the owner's specification of
// 2026-09-28 ("Immersive Walkthroughs"). A book is walked chapter by chapter.
// Under the verses that carry the most weight sits a note's name; tapping it
// opens the note in the movable sheet: one line that draws the reader in, a
// note of under fifty words, sometimes a Father's own line, and one question
// to carry. Each chapter ends with a synthesis that cannot be failed: put its
// beats in order, say who spoke a line, and write a sentence of your own,
// which is kept and closes the chapter.
//
// Since 1.7 (the owner's note 24 of 2026-10-16) there are no drawings: the
// Scripture is the page, and the only picture is the book's own icon on its
// cover (`Walkthrough.cover`).
//
// The notes state accepted Orthodox teaching (the owner's authority of
// 2026-09-28). A Father is only ever quoted verbatim from the corpus, and
// lib/walkthroughs/__tests__ holds every excerpt to its source.

/** Who is speaking in a chapter of Job, in the names our Septuagint uses. */
export type Speaker =
  | "narrator"
  | "job"
  | "wife"
  | "devil"
  | "eliphaz"
  | "baldad"
  | "sophar"
  | "elihu"
  | "lord";

/** A Father's line, verbatim: a contiguous part of one corpus entry. */
export type FatherLine = {
  /** The verse the entry is filed under in data/bible/commentary/<book>. */
  verse: number;
  /** Which entry under that verse. */
  index: number;
  /** The words quoted, exactly as the corpus has them. */
  excerpt: string;
};

export type ContextCard = {
  /** Stable, used for progress and saving: "job-1-12". */
  id: string;
  /** The verse the note sits under. */
  verse: number;
  /** The note's name: what the verse shows, and the sheet's title. */
  title: string;
  /** One line that makes you want the rest: the sheet opens on it. */
  hook: string;
  /** The note: cultural context or a word's weight, under fifty words. */
  body: string;
  /** One question to carry away. */
  question: string;
  father?: FatherLine;
};

/** One moment of a chapter, for putting in order. */
export type Beat = { id: string; text: string; verse: number };

/** A line and who said it. */
export type Attribution = {
  id: string;
  /** Verbatim from the chapter's text. */
  quote: string;
  verse: number;
  speaker: Speaker;
  /** The speakers offered, including the right one. */
  choices: Speaker[];
};

export type MovementId =
  | "prologue"
  | "lament"
  | "first"
  | "second"
  | "third"
  | "wisdom"
  | "defense"
  | "elihu"
  | "whirlwind"
  | "epilogue";

export type ChapterWalk = {
  n: number;
  title: string;
  movement: MovementId;
  cards: ContextCard[];
  /** In the order they happen; the sorting activity shuffles them. */
  beats: Beat[];
  attribution: Attribution[];
  /** The reflective ledger's prompt. */
  prompt: string;
};

export type Walkthrough = {
  book: string;
  /** The book's name as the reader shows it: "Job". */
  bookName: string;
  title: string;
  intro: string;
  /**
   * The walk's cover: the book's icon from the read-aloud covers
   * (lib/readAloud/covers.ts), so a book wears one picture everywhere. A file
   * the website keeps and the apps fetch (lib/walkthroughs/cover.ts); null
   * for a book with no icon, whose cover is the plate with its title.
   */
  cover: string | null;
  /** Who the Father lines are from, as a note credits them. */
  fatherSource: string;
  movements: { id: MovementId; title: string; from: number; to: number }[];
  chapters: ChapterWalk[];
};
