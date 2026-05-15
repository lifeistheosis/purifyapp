import { notFound } from "next/navigation";
import { BookChapterSidebar } from "@/components/bible/BookChapterSidebar";
import { ChapterReader } from "@/components/bible/ChapterReader";
import { ChapterPager } from "@/components/bible/ChapterPager";
import { allChapterParams, getBook } from "@/lib/bible/books";
import { loadChapter, loadCrossRefs, loadIntro, loadCommentary } from "@/lib/bible/load";

type Params = Promise<{ book: string; chapter: string }>;

export function generateStaticParams() {
  return allChapterParams();
}

export async function generateMetadata({ params }: { params: Params }) {
  const { book, chapter } = await params;
  const b = getBook(book);
  if (!b) return { title: "Bible - Purify" };
  return { title: `${b.name} ${chapter} - Purify` };
}

export default async function BibleChapterPage({ params }: { params: Params }) {
  const { book, chapter } = await params;
  const chapterNum = Number(chapter);
  const b = getBook(book);
  if (!b || !Number.isInteger(chapterNum) || chapterNum < 1 || chapterNum > b.chapters) {
    notFound();
  }
  const [data, crossRefs, intro, commentary] = await Promise.all([
    loadChapter(book, chapterNum),
    loadCrossRefs(book, chapterNum),
    chapterNum === 1 ? loadIntro(book) : Promise.resolve(null),
    loadCommentary(book, chapterNum),
  ]);
  if (!data) notFound();

  return (
    <div className="bg-night flex">
      <BookChapterSidebar book={b!} current={chapterNum} />
      <section className="flex-1 px-5 md:px-10 py-12 md:py-20">
        <div className="mx-auto max-w-[680px] w-full">
          <header className="mb-10">
            <p className="font-sans text-[12px] font-semibold uppercase tracking-[2px] text-paper/55">
              {b!.name}
            </p>
            <h1 className="mt-2 font-serif text-[72px] md:text-[96px] leading-none text-paper">
              {chapterNum}
            </h1>
            <hr className="mt-8 border-0 h-px bg-white/10" />
          </header>
          {intro && (
            <div className="mb-10 rounded-md border border-paper/10 bg-paper/[0.03] p-6">
              <p className="font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-paper/50 mb-3">
                About this book
              </p>
              <div className="font-serif text-[16px] leading-[1.7] text-paper/80 whitespace-pre-line">
                {intro}
              </div>
            </div>
          )}
          <ChapterReader
            verses={data!.verses}
            crossRefs={crossRefs}
            commentary={commentary}
          />
          <ChapterPager slug={book} chapter={chapterNum} />
          <p className="mt-10 font-sans text-[11px] text-paper/35 leading-[1.6]">
            Old Testament: Brenton&rsquo;s English Septuagint (1851, public domain).
            New Testament: King James Version (public domain). Cross-references from
            openbible.info (CC&nbsp;BY). Patristic commentary from Schaff&rsquo;s
            Ante-Nicene and Nicene Fathers (public domain).
          </p>
        </div>
      </section>
    </div>
  );
}
