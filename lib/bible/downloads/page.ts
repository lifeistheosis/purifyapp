// What the app's page for a chapter shows of a downloaded Bible (1.9).
//
// A Bible keeps its own numbering, chapters as well as verses
// (scripts/bibles/build.mjs): the Synodal's Jeremiah is in the Hebrew order,
// the Greek's Joel in four chapters. The app's pages are its own books' (the
// English's), and a reader moves through them with the pill, the sheet and
// the pager. So the page for chapter N shows the Bible's chapter N, and:
//
//  - the app's last page of a book also shows any chapters the Bible has past
//    it, each under its own heading, so none is out of reach (the Greek's
//    Joel 4, on the page for Joel 3);
//  - a page whose chapter the Bible sets elsewhere says where, and leads
//    there (the Greek's Malachi 4 is its 3:19-24; its Proverbs 30 stands in
//    its chapter 24, as the Septuagint orders it).
//
// Pure: no React, no window.

import type { BibleBookFile, BibleVerse } from "./store";

export type BiblePageSection = { chapter: number; verses: BibleVerse[] };

export type BiblePage = {
  /** The Bible's chapters on this page: its chapter N, then any past the app's last. */
  sections: BiblePageSection[];
  /** The Bible's chapter where this page's verses stand, when it has none here. */
  elsewhere: number | null;
  /** The last verse number on the page's own chapter, for "v 3 of 21". */
  last: number;
};

/** The page for the app's chapter `chapter` of a book the app divides into `appChapters`. */
export function biblePage(file: BibleBookFile, chapter: number, appChapters: number): BiblePage {
  const sections: BiblePageSection[] = [];
  const own = file.chapters[chapter - 1];
  if (own?.length) sections.push({ chapter, verses: own });
  if (chapter === appChapters) {
    for (let n = appChapters + 1; n <= file.chapters.length; n += 1) {
      if (file.chapters[n - 1]?.length) sections.push({ chapter: n, verses: file.chapters[n - 1] });
    }
  }
  const elsewhere = own?.length ? null : (file.elsewhere?.[String(chapter)] ?? null);
  let last = 0;
  for (const [label] of own ?? []) if (typeof label === "number" && label > last) last = label;
  return { sections, elsewhere, last };
}

/** A verse's anchor on the page: "v12" for its own chapter, "c4v12" for one past the app's last. */
export function verseAnchor(section: number, chapter: number, label: number | string): string | undefined {
  if (typeof label !== "number") return undefined;
  return section === chapter ? `v${label}` : `c${section}v${label}`;
}
