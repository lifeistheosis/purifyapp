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
import { ReadingProgressBar } from "@/components/bible/ReadingProgressBar";
import { MobileChapterStrip } from "@/components/bible/MobileChapterStrip";
import { MobileNextChapterFab } from "@/components/bible/MobileNextChapterFab";
import { ReaderSettingsMenu } from "@/components/bible/ReaderSettingsMenu";
import { VerseFocusFlash } from "@/components/bible/VerseFocusFlash";
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
  loadEnglishTagged,
} from "@/lib/bible/load";
import { strongsMap } from "@/lib/bible/strongs";

type Params = Promise<{ book: string; chapter: string }>;

export function generateStaticParams() {
  return allChapterParams();
}

export async function generateMetadata({ params }: { params: Params }) {
  const { book, chapter } = await params;
  const b = getBook(book);
  if (!b) return { title: "The Orthodox Bible" };
  return { title: `${b.name} ${chapter}` };
}

export default async function BibleChapterPage({ params }: { params: Params }) {
  const { book, chapter } = await params;
  const chapterNum = Number(chapter);
  const b = getBook(book);
  if (!b || !Number.isInteger(chapterNum) || chapterNum < 1 || chapterNum > b.chapters) {
    notFound();
  }
  // Interlinear (Greek + English Strong's tags) is NT-only. The OT was
  // originally Hebrew; the Septuagint is a Greek translation, but the
  // user wants the interlinear scoped to the New Testament only.
  const isNT = b!.testament === "NT";
  const [data, intro, commentary, original, englishTagged] = await Promise.all([
    loadChapter(book, chapterNum),
    chapterNum === 1 ? loadIntro(book) : Promise.resolve(null),
    loadCommentary(book, chapterNum),
    isNT ? loadOriginal(book, chapterNum) : Promise.resolve(null),
    isNT ? loadEnglishTagged(book, chapterNum) : Promise.resolve(null),
  ]);
  if (!data) notFound();

  const originalByNum: Record<number, string> = {};
  const tokensByNum: Record<
    number,
    { w: string; s?: string; p?: string }[]
  > = {};
  const usedStrongs = new Set<string>();
  for (const v of original?.verses ?? []) {
    originalByNum[v.n] = v.text;
    if (v.tokens?.length) {
      tokensByNum[v.n] = v.tokens;
      for (const t of v.tokens) if (t.s) usedStrongs.add(t.s);
    }
  }
  // Per-chapter Strong's mini-lexicon (only the entries this chapter uses).
  // Keeps the prop payload at a few KB instead of shipping the whole 557 KB.
  const strongs = strongsMap(Array.from(usedStrongs));

  // English-side tokens (NT only). Each token has a Strong's number that
  // matches the Greek token's number — used for hover sync.
  const englishTokensByNum: Record<
    number,
    { w: string; s?: string }[]
  > = {};
  for (const v of englishTagged?.verses ?? []) {
    if (v.tokens?.length) englishTokensByNum[v.n] = v.tokens;
  }

  const commentaryVerses = Object.keys(commentary)
    .map(Number)
    .filter((n) => (commentary[String(n)]?.length ?? 0) > 0);
  const hasCommentary = commentaryVerses.length > 0;

  return (
    <ReaderPrefsProvider>
    <div className="bg-night flex">
      <ChapterKeyNav slug={book} chapter={chapterNum} />
      <VerseFocusFlash />
      <ReadingProgressBar
        bookName={b!.name}
        chapter={chapterNum}
        totalVerses={data!.verses.length}
      />
      <MobileNextChapterFab slug={book} chapter={chapterNum} />
      <BookChapterSidebar book={b!} current={chapterNum} />
      {/* Extra mobile top padding accounts for the fixed ReadingProgressBar
          context strip (~28px) sitting under the 72px sticky navbar. */}
      <section className="flex-1 px-5 md:px-10 pt-14 md:pt-16 pb-10 md:pb-16 min-w-0">
        <div className="mx-auto max-w-[1200px] w-full">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <TranslationSwitcher currentSlug={book} />
            <BookSwitcher currentSlug={book} />
            {/* Desktop: font controls inline */}
            <div className="hidden md:flex items-center gap-3">
              <ReaderFontSizeButton />
              <ReaderFontFamilyButton />
            </div>
            {/* Mobile: collapse font + interlinear into a single Reader menu */}
            <div className="md:hidden">
              <ReaderSettingsMenu showInterlinear={isNT} />
            </div>
          </div>
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0 max-w-[640px]">
              <BibleSearch />
            </div>
            {/* Interlinear toggle stays inline on desktop only; the mobile
                version lives inside ReaderSettingsMenu above. */}
            {isNT && (
              <div className="hidden md:block">
                <InterlinearToggle />
              </div>
            )}
          </div>
          <MobileChapterStrip book={b!} current={chapterNum} />

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
                <details className="mb-10 group rounded-md border border-paper/10 bg-paper/[0.03] open:bg-paper/[0.05] transition-colors">
                  <summary className="cursor-pointer list-none px-6 py-4 flex items-center justify-between">
                    <span className="font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-paper/55 group-open:text-paper/75 transition-colors">
                      About this book
                    </span>
                    <span
                      aria-hidden
                      className="text-paper/40 group-open:rotate-180 transition-transform duration-200 text-[12px]"
                    >
                      ▾
                    </span>
                  </summary>
                  <div className="px-6 pb-6 -mt-1 font-serif text-[16px] leading-[1.7] text-paper/80 whitespace-pre-line">
                    {intro}
                  </div>
                </details>
              )}

              <ChapterReader
                book={book}
                chapter={chapterNum}
                verses={data!.verses}
                commentaryVerses={commentaryVerses}
                originalByNum={originalByNum}
                tokensByNum={tokensByNum}
                englishTokensByNum={englishTokensByNum}
                strongs={strongs}
              />

              <ChapterPager slug={book} chapter={chapterNum} />

              <p className="hidden md:block mt-10 mb-3 font-sans text-[11px] text-paper/40 leading-[1.6]">
                ← → chapters · drag across words to highlight a phrase · click any Greek word for definition · Cmd+Enter to save a note
              </p>

              <p className="mt-6 md:mt-3 font-sans text-[11px] text-paper/35 leading-[1.6]">
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
                <div className="sticky top-[88px] max-h-[calc(100dvh-104px)] overflow-y-auto scrollbar-thin pr-2 -mr-2">
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
