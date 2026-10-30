// The verses Settings shows its reading choices on (1.8, the owner's pick A
// of round 3, "Lit panels"): the size on a real verse, and each reading mode
// as a small page of the Bible in its own colours. John 1 in the King James
// Version, as the app holds it and as the Bible reader opens it.

import john from "@/data/bible/john/1.json";

type Chapter = { verses: { n: number; text: string }[] };

/** The opening of John 1, the first four verses: enough to fill a small page. */
export const JOHN_1_OPENING: readonly { n: number; text: string }[] = (john as Chapter).verses.slice(0, 4);

/** John 1's book and chapter, for the words a preview names it by (bible.books.john, bible.chapterN). */
export const PREVIEW_CHAPTER = 1;
