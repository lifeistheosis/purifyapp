import { notFound } from "next/navigation";

import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { ChapterWalkClient } from "@/components/walkthrough/ChapterWalkClient";
import { WalkSoon } from "@/components/walkthrough/WalkSoon";
import { loadChapter } from "@/lib/bible/load";
import { BOOK_CHAPTERS, WALKTHROUGHS, getChapterWalk, getWalkthrough, movementOf } from "@/lib/walkthroughs";
import { walkthroughsEnabled } from "@/lib/walkthroughs/flags";

type Params = Promise<{ book: string; chapter: string }>;

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.values(WALKTHROUGHS).flatMap((w) =>
    w.chapters.map((c) => ({ book: w.book, chapter: String(c.n) })),
  );
}

export async function generateMetadata({ params }: { params: Params }) {
  const { book, chapter } = await params;
  const w = getWalkthrough(book);
  const c = getChapterWalk(book, Number(chapter));
  return {
    title: w && c ? `${w.bookName} ${c.n}: ${c.title}` : "Walkthroughs",
    robots: walkthroughsEnabled() ? undefined : { index: false },
  };
}

// One chapter of a walk (1.7). Its own bar names it ("Job 3", in the reader's
// language) once the chapter's heading has scrolled away, as the Bible
// reader's bar names a chapter, and its way back goes up to the walk's page,
// as the reader's goes up to the Bible.
export default async function ChapterWalkPage({ params }: { params: Params }) {
  const { book, chapter } = await params;
  const n = Number(chapter);
  const w = getWalkthrough(book);
  const c = getChapterWalk(book, n);
  if (!w || !c) notFound();
  const bar = (
    <MobileTopBar
      titleKey={`bible.books.${w.book}`}
      titleTail={String(n)}
      back={`/walkthroughs/${w.book}`}
      revealTitleOn="walk-chapter-title"
    />
  );
  if (!walkthroughsEnabled()) {
    return (
      <>
        {bar}
        <WalkSoon id="walk-chapter-title" title={w.title} />
      </>
    );
  }
  const text = await loadChapter(book, n);
  if (!text) notFound();
  const written = new Set(w.chapters.map((x) => x.n));
  return (
    <>
      {bar}
      <ChapterWalkClient
        meta={{
          book: w.book,
          bookName: w.bookName,
          title: w.title,
          fatherSource: w.fatherSource,
          movementTitle: movementOf(w, n)?.title ?? "",
          total: BOOK_CHAPTERS[w.book] ?? w.chapters.length,
          movements: w.movements,
          chapters: w.chapters.map((x) => ({ n: x.n, title: x.title })),
        }}
        walk={c}
        verses={text.verses.map((v) => ({ n: v.n, text: v.text }))}
        prev={n > 1 && written.has(n - 1) ? n - 1 : null}
        next={written.has(n + 1) ? n + 1 : null}
      />
    </>
  );
}
