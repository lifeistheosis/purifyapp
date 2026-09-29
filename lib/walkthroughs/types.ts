// Guided walkthroughs: the free tier of the owner's specification of
// 2026-09-28 ("Immersive Walkthroughs"). A book is walked chapter by chapter.
// Beside the verses that carry the most weight sits a quiet glyph; pausing
// there lifts a short hook from the bottom edge, and opening it gives a full
// card: a line drawing, a note of under fifty words, sometimes a Father's own
// line, and one question to carry. Each chapter ends with a synthesis that
// cannot be failed: put its beats in order, say who spoke a line, and write a
// sentence of your own, which is kept and closes the chapter.
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

/** The line drawings a card can carry (components/walkthrough/art). */
export type ArtId =
  | "uz"
  | "altar"
  | "council"
  | "messengers"
  | "ashheap"
  | "night"
  | "friends"
  | "gate"
  | "scales"
  | "mine"
  | "whirlwind"
  | "sea"
  | "stars"
  | "wild"
  | "behemoth"
  | "leviathan"
  | "restored"
  | "redeemer"
  | "tree"
  | "lamp";

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
  /** The verse the glyph sits beside. */
  verse: number;
  /** The card's heading. */
  title: string;
  /** What the peek shows: one line that makes you want the rest. */
  hook: string;
  /** The note: cultural context or a word's weight, under fifty words. */
  body: string;
  /** One question to carry away. */
  question: string;
  art: ArtId;
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
  /** Who the Father lines are from, as a card credits them. */
  fatherSource: string;
  movements: { id: MovementId; title: string; from: number; to: number }[];
  chapters: ChapterWalk[];
};
