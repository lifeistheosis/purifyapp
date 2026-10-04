"use client";

import { useEffect, useState } from "react";

import { loadChapterCommentary } from "@/lib/bible/chapterData";
import type { ChapterCommentary } from "@/lib/bible/load";

import { StudyRail } from "./StudyRail";

/**
 * The study rail in the apps, where the commentary is a file and not part of
 * the page (lib/bible/chapterExtras.ts).
 *
 * The rail is drawn only at a tablet's or a computer's width, so a phone
 * never fetches for it: the file is read when the rail is on screen, and
 * again if a tablet is turned to the width that shows it. `empty` is the
 * chapter the Fathers do not comment on in a book where they do, which the
 * rail says in words; there is no file to fetch for that.
 */
const WIDE = "(min-width: 1024px)";

export function LazyStudyRail({ book, chapter, empty }: { book: string; chapter: number; empty: boolean }) {
  const key = `${book}/${chapter}`;
  const [read, setRead] = useState<{ key: string; notes: ChapterCommentary } | null>(null);

  useEffect(() => {
    if (empty) return;
    const wide = window.matchMedia(WIDE);
    let live = true;
    const fetchIfShown = () => {
      if (!wide.matches) return;
      void loadChapterCommentary(book, chapter).then((notes) => {
        if (live && notes) setRead({ key: `${book}/${chapter}`, notes });
      });
    };
    fetchIfShown();
    wide.addEventListener("change", fetchIfShown);
    return () => {
      live = false;
      wide.removeEventListener("change", fetchIfShown);
    };
  }, [book, chapter, empty]);

  if (empty) return <StudyRail commentary={{}} />;
  // Nothing while it is read: the rail's empty state says "no commentary on
  // this chapter", which would be untrue for the instant before the file lands.
  if (read?.key !== key) return null;
  return <StudyRail commentary={read.notes} />;
}
