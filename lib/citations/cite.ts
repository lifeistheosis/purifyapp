/**
 * Where a quotation comes from, exactly (1.8).
 *
 * The owner, 2026-10-17: "whenever it quotes a father, I want that quote
 * linked specifically to their book ... When it quotes the fathers, you're
 * left questioning, is the quote authentic? ... Whatever quote, the father,
 * or scripture, or something ... you can easily see where it comes from."
 *
 * One shape for every quotation the app shows, and one line for it under the
 * quotation, the same everywhere (components/citations/SourceLine.tsx):
 *
 *   scripture  book, chapter and verses of the app's own Bible, whose
 *              edition the book's file names (the King James New
 *              Testament, Brenton's Old): "John 3:16, King James Version"
 *   work       a paragraph of a work in the library (data/saints), named by
 *              the work's own divisions where it keeps them
 *              (lib/saints/divisions.ts) and its edition: "St. Augustine of
 *              Hippo, Confessions, Book I, Chapter 1, §1, tr. Pusey". It
 *              opens there.
 *   council    a section of a council's document the app carries
 *              (data/councils): the council, the document and its section
 *              ("Canon III"), opening there.
 *   text       a public-domain text the library does not carry, named by
 *              its author, work, exact place and edition, with no link
 *   inexact    words close to a passage the app carries, but not as its
 *              edition prints them (a word dropped, another translation's
 *              wording, two sentences joined). The line says so and points
 *              to the passage, and `differs` records how, for the owner. The
 *              words are never changed to fit (the owner decides).
 *   untraced   words the app has shown as a quotation that no public-domain
 *              text we can find carries word for word. The line says so
 *              instead of naming a source, and `searched` records where we
 *              looked, for the owner.
 *
 * This is the data's shape. What the line shows is resolved from it on the
 * server (lib/citations/shown.ts), into a ShownCite, the same pieces the
 * reading room's collections show under a passage (lib/reading/collectionView.ts).
 *
 * No imports: lib/saints/saints.ts takes the type, and scripts read that file
 * with types stripped.
 */

export type ScriptureCite = {
  kind: "scripture";
  /** data/bible/<book> */
  book: string;
  chapter: number;
  /** The first verse, and the last of a run of them. */
  from: number;
  to?: number;
};

export type WorkCite = {
  kind: "work";
  /** The saint whose page the work is on: /saints/<saint>/<work>. */
  saint: string;
  work: string;
  /** Section.n */
  section: number;
  /** The paragraph's index in the section. */
  paragraph: number;
  /** The last paragraph, when the words run on past the first. The line opens the first. */
  through?: number;
};

export type CouncilCite = {
  kind: "council";
  /** data/councils/<council> */
  council: string;
  /** data/councils/<council>/<document>.json */
  document: string;
  /** Section.n */
  section: number;
};

export type TextCite = {
  kind: "text";
  author: string;
  work: string;
  /** The exact place, in words, as the edition numbers it: "Chapter 3", "Book I, Chapter 28". */
  place: string;
  /** The public-domain edition, named so it can be found: "ANF 3 (1885)". */
  edition: string;
};

export type InexactCite = {
  kind: "inexact";
  /** The passage the words are close to, as the app carries it. */
  of: ScriptureCite | WorkCite | CouncilCite;
  /** How the words differ from it, for the owner. Never shown. */
  differs: string;
};

export type UntracedCite = {
  kind: "untraced";
  /** Where we looked and what we found, for the owner. Never shown. */
  searched: string;
};

export type Cite = ScriptureCite | WorkCite | CouncilCite | TextCite | InexactCite | UntracedCite;

/** What the line under a quotation shows, resolved on the server. */
export type ShownCite =
  | {
      kind: "scripture";
      href: string;
      book: string;
      /** "13:4-7", after the book's name, which the line says in the reader's language. */
      reference: string;
      translation: "kjv" | "brenton";
    }
  | {
      /** A place in a work the app carries: a Father's, or a council's document. */
      kind: "father";
      href: string;
      /** The author, as the cover says him; empty for a work no one signed. */
      author: string;
      /** The work's title. */
      work: string;
      /** The place by the work's own divisions: "Book I, Chapter 1", "Homily 15, Matthew 5:1, 2", "Chapter 54". */
      place: string;
      /** The number the edition prints on the paragraph, where there is one: "§78". */
      mark?: string;
      /** The edition: "NPNF I 10", "tr. Pusey". */
      edition?: string;
    }
  | { kind: "text"; author: string; work: string; place: string; edition: string }
  | { kind: "inexact"; of: ShownPlace }
  | { kind: "untraced" }
  /**
   * Words in our own voice about a Father's teaching, shown where his are
   * (a note of the Bible's commentary written as a summary): said plainly,
   * with the work it speaks of, and no link (1.8).
   */
  | { kind: "summary"; author: string; work: string };

/** A place in the app's own texts, which the line links to. */
export type ShownPlace = Extract<ShownCite, { kind: "scripture" | "father" }>;

/**
 * The line for a quotation whose place needs no file read: a text the
 * library does not carry, or the mark that it is not traced. Null for a
 * place in the app's own texts, which the server resolves
 * (lib/citations/shown.ts). For a card that chooses its quotation on the
 * device, as Today's saying does.
 */
export function staticShown(c: Cite): ShownCite | null {
  if (c.kind === "untraced") return { kind: "untraced" };
  if (c.kind === "text") return { kind: "text", author: c.author, work: c.work, place: c.place, edition: c.edition };
  return null;
}

/**
 * The section's place as the work names it. A title that runs on after its
 * numbers ("Book 8, Chapter 17. That the peace of our heart ...") is cut to
 * them; any other is whole. (The reading room's rule, 1.8.)
 */
export function placeOf(title: string): string {
  const m = /^((?:Book|Conference|Sermon|Homily|Chapter) [0-9IVXLC]+(?:, Chapter [0-9IVXLC]+)?)\. /.exec(title);
  return m ? m[1] : title;
}

/** The number the edition prints at the head of a paragraph ("78. Which same ..."), as "§78". */
export function markOf(paragraph: string): string | undefined {
  const m = /^(\d{1,4})\. /.exec(paragraph);
  return m ? `§${m[1]}` : undefined;
}

/** Where a passage of Scripture opens: its verses in the Bible. */
export function scriptureHref(c: { book: string; chapter: number; from: number; to?: number }): string {
  return `/bible/${c.book}/${c.chapter}#v${c.from}${c.to !== undefined && c.to !== c.from ? `-${c.to}` : ""}`;
}

/** "13:4-7" */
export function scriptureReference(c: { chapter: number; from: number; to?: number }): string {
  return `${c.chapter}:${c.from}${c.to !== undefined && c.to !== c.from ? `-${c.to}` : ""}`;
}

type Translate = (key: string, replacements?: Record<string, string | number>) => string;

/**
 * The line as words, the same the line shows: what a reader copies with a
 * quotation. The book of the Bible and the translation in the reader's
 * language; the Fathers' works in their English, as the library has them.
 */
export function citeWords(c: ShownCite, t: Translate): string {
  switch (c.kind) {
    case "scripture":
      return `${t(`bible.books.${c.book}`)} ${c.reference}, ${t(c.translation === "kjv" ? "reading.collection.kjv" : "reading.collection.brenton")}`;
    case "father":
      return [c.author, c.work, c.place, c.mark, c.edition].filter(Boolean).join(", ");
    case "text":
      return [c.author, c.work, c.place, c.edition].filter(Boolean).join(", ");
    case "inexact":
      return `${t("cite.inexact")} ${citeWords(c.of, t)}`;
    case "untraced":
      return t("cite.untraced");
    case "summary":
      return `${t("cite.summary")}: ${[c.author, c.work].filter(Boolean).join(", ")}`;
  }
}
