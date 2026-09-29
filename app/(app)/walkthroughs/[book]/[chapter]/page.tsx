import { notFound } from "next/navigation";

import { FeatureShell } from "@/components/feature/FeatureShell";
import { T } from "@/components/i18n/T";
import { ChapterWalkClient } from "@/components/walkthrough/ChapterWalkClient";
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

export default async function ChapterWalkPage({ params }: { params: Params }) {
  const { book, chapter } = await params;
  const n = Number(chapter);
  const w = getWalkthrough(book);
  const c = getChapterWalk(book, n);
  if (!w || !c) notFound();
  if (!walkthroughsEnabled()) {
    return <FeatureShell eyebrow={<T k="walk.eyebrow" />} title={w.title} body={<T k="walk.comingSoon" />} />;
  }
  const text = await loadChapter(book, n);
  if (!text) notFound();
  const written = new Set(w.chapters.map((x) => x.n));
  return (
    <ChapterWalkClient
      meta={{
        book: w.book,
        bookName: w.bookName,
        title: w.title,
        fatherSource: w.fatherSource,
        movementTitle: movementOf(w, n)?.title ?? "",
        total: BOOK_CHAPTERS[w.book] ?? w.chapters.length,
      }}
      walk={c}
      verses={text.verses.map((v) => ({ n: v.n, text: v.text }))}
      prev={n > 1 && written.has(n - 1) ? n - 1 : null}
      next={written.has(n + 1) ? n + 1 : null}
    />
  );
}
