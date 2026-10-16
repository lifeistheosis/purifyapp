import { notFound } from "next/navigation";

import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { BookWalkClient } from "@/components/walkthrough/BookWalkClient";
import { WalkSoon } from "@/components/walkthrough/WalkSoon";
import { IS_STATIC_EXPORT } from "@/lib/platform/buildTarget";
import { BOOK_CHAPTERS, WALKTHROUGHS, getWalkthrough } from "@/lib/walkthroughs";
import { walkCoverSrc } from "@/lib/walkthroughs/cover";
import { walkthroughsEnabled } from "@/lib/walkthroughs/flags";

type Params = Promise<{ book: string }>;

// Every walked book is prerendered; anything else is a 404, which the
// Android static export requires.
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(WALKTHROUGHS).map((book) => ({ book }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { book } = await params;
  const w = getWalkthrough(book);
  return {
    title: w ? w.title : "Walkthroughs",
    description: w?.intro,
    robots: walkthroughsEnabled() ? undefined : { index: false },
  };
}

// A walked book's page (1.7): its cover, how far the reader has walked and
// the way on, then its chapters. Its own bar names it once the heading has
// scrolled away; back leads to the walkthroughs when there is nothing behind.
export default async function BookWalkPage({ params }: { params: Params }) {
  const { book } = await params;
  const w = getWalkthrough(book);
  if (!w) notFound();
  return (
    <>
      <MobileTopBar title={w.title} back backFallback="/walkthroughs" revealTitleOn="walk-book-title" />
      {walkthroughsEnabled() ? (
        <BookWalkClient
          meta={{
            book: w.book,
            title: w.title,
            intro: w.intro,
            total: BOOK_CHAPTERS[w.book] ?? w.chapters.length,
            cover: walkCoverSrc(w.cover, IS_STATIC_EXPORT),
            chapters: w.chapters.map((c) => ({ n: c.n, title: c.title })),
            movements: w.movements,
          }}
        />
      ) : (
        <WalkSoon id="walk-book-title" title={w.title} />
      )}
    </>
  );
}
