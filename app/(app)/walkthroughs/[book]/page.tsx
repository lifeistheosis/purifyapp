import { notFound } from "next/navigation";

import { FeatureShell } from "@/components/feature/FeatureShell";
import { T } from "@/components/i18n/T";
import { BookWalkClient } from "@/components/walkthrough/BookWalkClient";
import { BOOK_CHAPTERS, WALKTHROUGHS, getWalkthrough } from "@/lib/walkthroughs";
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

export default async function BookWalkPage({ params }: { params: Params }) {
  const { book } = await params;
  const w = getWalkthrough(book);
  if (!w) notFound();
  if (!walkthroughsEnabled()) {
    return (
      <FeatureShell
        eyebrow={<T k="walk.eyebrow" />}
        title={w.title}
        body={<T k="walk.comingSoon" />}
      />
    );
  }
  return (
    <BookWalkClient
      meta={{
        book: w.book,
        bookName: w.bookName,
        title: w.title,
        intro: w.intro,
        total: BOOK_CHAPTERS[w.book] ?? w.chapters.length,
        chapters: w.chapters.map((c) => ({ n: c.n, title: c.title })),
        movements: w.movements,
      }}
    />
  );
}
