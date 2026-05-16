import { notFound } from "next/navigation";
import { BookChapterSidebar } from "@/components/bible/BookChapterSidebar";
import { ChapterReader } from "@/components/bible/ChapterReader";
import { ChapterPager } from "@/components/bible/ChapterPager";
import { BibleSearch } from "@/components/bible/BibleSearch";
import { BookSwitcher } from "@/components/bible/BookSwitcher";
import { ChapterKeyNav } from "@/components/bible/ChapterKeyNav";
import { StudyRail } from "@/components/bible/StudyRail";
import { TranslationSwitcher } from "@/components/bible/TranslationSwitcher";
import { InterlinearToggle } from "@/components/bible/InterlinearToggle";
import {
  ReaderFontFamilyButton,
  ReaderFontSizeButton,
  ReaderPrefsProvider,
} from "@/components/reader/ReaderPrefs";
import { allChapterParams, getBook } from "@/lib/bible/books";
import {
  loadChapter,
  loadIntro,
  loadCommentary,
  loadOriginal,
} from "@/lib/bible/load";

type Params = Promise<{ book: string; chapter: string }>;

export function generateStaticParams() {
  return allChapterParams();
}

export async function generateMetadata({ params }: { params: Params }) {
  const { book, chapter } = await params;
  const b = getBook(book);
  if (!b) return { title: "The Orthodox Bible - Purify" };
  return { title: `${b.name} ${chapter} - Purify` };
}

export default async function BibleChapterPage({ params }: { params: Params }) {
  const { book, chapter } = await params;
  const chapterNum = Number(chapter);
  const b = getBook(book);
  if (!b || !Number.isInteger(chapterNum) || chapterNum < 1 || chapterNum > b.chapters) {
    notFound();
  }
  const [data, intro, commentary, original] = await Promise.all([
    loadChapter(book, chapterNum),
    chapterNum === 1 ? loadIntro(book) : Promise.resolve(null),
    loadCommentary(book, chapterNum),
    loadOriginal(book, chapterNum),
  ]);
  if (!data) notFound();

  const originalByNum: Record<number, string> = {};
  for (const v of original?.verses ?? []) originalByNum[v.n] = v.text;

  const commentaryVerses = Object.keys(commentary)
    .map(Number)
    .filter((n) => (commentary[String(n)]?.length ?? 0) > 0);
  const hasCommentary = commentaryVerses.length > 0;

  return (
    <ReaderPrefsProvider>
    <div className="bg-night flex">
      <ChapterKeyNav slug={book} chapter={chapterNum} />
      <BookChapterSidebar book={b!} current={chapterNum} />
      <section className="flex-1 px-5 md:px-10 py-10 md:py-16 min-w-0">
        <div className="mx-auto max-w-[1200px] w-full">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <TranslationSwitcher currentSlug={book} />
            <BookSwitcher currentSlug={book} />
            <ReaderFontSizeButton />
            <ReaderFontFamilyButton />
          </div>
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0 max-w-[640px]">
              <BibleSearch />
            </div>
            <InterlinearToggle />
          </div>

          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10">
            {/* Reader column */}
            <div className="min-w-0">
              <header className="mb-6">
                <p className="font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-paper/55">
                  {b!.name}
                </p>
                <h1 className="mt-1 font-serif text-[44px] md:text-[56px] leading-none text-paper">
                  Chapter {chapterNum}
                </h1>
              </header>
              <hr className="mb-8 border-0 h-px bg-white/10" />

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
                book={book}
                chapter={chapterNum}
                verses={data!.verses}
                commentaryVerses={commentaryVerses}
                originalByNum={originalByNum}
              />

              <ChapterPager slug={book} chapter={chapterNum} />

              <p className="mt-10 font-sans text-[11px] text-paper/35 leading-[1.6]">
                Old Testament: Brenton&rsquo;s English Septuagint (1851, public domain).
                New Testament: King James Version (public domain). Patristic
                commentary from Schaff&rsquo;s Ante-Nicene and Nicene Fathers
                (public domain).
              </p>

              {/* Mobile + tablet: study content collapsed below the verses */}
              {hasCommentary && (
                <details className="lg:hidden mt-12 group rounded-md border border-paper/10 bg-paper/[0.03] open:bg-paper/[0.05]">
                  <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between font-sans text-[12px] font-semibold uppercase tracking-[1.5px] text-paper/70 hover:text-paper transition-colors">
                    Patristic commentary
                    <span
                      aria-hidden
                      className="text-[11px] text-paper/45 transition-transform duration-200 group-open:rotate-180"
                    >
                      ▾
                    </span>
                  </summary>
                  <div className="px-4 pb-5 pt-2">
                    <StudyRail commentary={commentary} anchorIds={false} />
                  </div>
                </details>
              )}
            </div>

            {/* Desktop study rail */}
            {hasCommentary && (
              <aside className="hidden lg:block">
                <div className="sticky top-[88px] max-h-[calc(100dvh-104px)] overflow-y-auto pr-2 -mr-2">
                  <p className="font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
                    Patristic commentary
                  </p>
                  <StudyRail commentary={commentary} />
                </div>
              </aside>
            )}
          </div>
        </div>
      </section>
    </div>
    </ReaderPrefsProvider>
  );
}
