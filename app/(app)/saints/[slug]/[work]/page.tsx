import { notFound } from "next/navigation";
import { SAINTS, getWork } from "@/lib/saints/saints";
import { loadWriting } from "@/lib/saints/load";
import { writingJsonLd } from "@/lib/seo/jsonld";
import { WritingReader } from "@/components/saints/WritingReader";
import { LazyWritingReader } from "@/components/saints/LazyWritingReader";
import { IS_STATIC_EXPORT } from "@/lib/platform/buildTarget";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { MobileWorkProgressBar } from "@/components/saints/MobileWorkProgressBar";
import { MobileWorkActions } from "@/components/saints/MobileWorkActions";
import { ReaderPrefsProvider, ReadingModeController } from "@/components/reader/ReaderPrefs";
import { getServerLocale } from "@/lib/i18n/server";
import { ContentNotYetTranslated } from "@/components/i18n/ContentNotYetTranslated";
import { RecordRead } from "@/components/reading/RecordRead";
import { KeepDay } from "@/components/streak/KeepDay";
import { bookPage } from "@/lib/reading/cards";
import { MovedPlace } from "@/components/saints/MovedPlace";
import { movesOutOf } from "@/lib/saints/workMoves";

type Params = Promise<{ slug: string; work: string }>;

/** A citation's author: the cover's, when the work is by him; none for one about him or no one's. */
function authorOfBook(book: ReturnType<typeof bookPage>): string | null | undefined {
  if (!book) return undefined;
  return book.header.card.byline === "by" ? book.header.card.author : null;
}

export function generateStaticParams() {
  return SAINTS.flatMap((s) =>
    s.works.map((w) => ({ slug: s.slug, work: w.slug })),
  );
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug, work } = await params;
  const found = getWork(slug, work);
  if (!found) return { title: "Writing" };
  return {
    title: `${found.work.title}, ${found.saint.name}`,
    description: found.work.blurb,
  };
}

export default async function WritingPage({ params }: { params: Params }) {
  const { slug, work } = await params;
  const found = getWork(slug, work);
  if (!found) notFound();
  const locale = await getServerLocale();
  const content = await loadWriting(slug, work, locale);
  if (!content) notFound();

  // Structured data. The @type and the author follow the sections' `voice`:
  // a work carrying Purify's own prose is never published as a Book the
  // saint wrote. See lib/seo/jsonld.ts.
  const jsonLd = writingJsonLd(found.saint, content);

  // The book's page (1.7, the reading room): its cover and facts, and more
  // like it. Built here from the room's own cards, and since 1.8's round 6
  // (r3-29 A) shown as About this book over the chapter.
  const book = bookPage(found.saint, found.work.slug, IS_STATIC_EXPORT);
  const about = book ? { header: book.header, key: book.key, like: book.like } : null;

  return (
    <ReaderPrefsProvider>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <RecordRead
        kind="work"
        href={`/saints/${found.saint.slug}/${found.work.slug}`}
        label={`${found.work.title}, ${found.saint.name}`}
        saintSlug={found.saint.slug}
        topics={found.work.topics}
      />
      {/* An old link to a part that has left this work lands where it is now
          (St John Cassian's books On the Incarnation, filed in the Conferences
          until 1.8: lib/saints/workMoves.ts). */}
      {movesOutOf(found.saint.slug, found.work.slug).length ? <MovedPlace /> : null}
      {/* Reading the Fathers keeps the day for the streak. */}
      <KeepDay strand="day:study" />
      {/* The Bible's page (1.8, the owner's pick A of r3-29, "As the Bible
          reads"): no bar, only the way back and ••• on round plates over the
          page (MobileTopBar `plates`), which step away while the reader
          reads on; ••• holds the reader's settings, the bookmark, About this
          book and the search (MobileWorkActions). The reading line runs along
          the top of the screen. Back the way the reader came (1.8, F-47): a
          fixed address here sent a reader who opened the book from the
          reading room round a loop, book, saint, book. The saint's Writings
          is the floor, for a book opened from outside the app. */}
      <MobileTopBar plates back backFallback={`/saints/${found.saint.slug}#writings`} trailing={<MobileWorkActions />} />
      <MobileWorkProgressBar />
      {/* Reflects the persisted reading palette onto <html> while this
          reader is mounted (and strips it on the way out), the same
          controller the Bible chapter route mounts. */}
      <ReadingModeController />

      {/* The page starts under the plates (globals.css, .under-plates). */}
      <section className="bg-night px-5 md:px-8 under-plates md:pt-16">
        <div className="mx-auto max-w-[1100px] w-full">
          {locale !== "en" && !content.isLocalized ? (
            <ContentNotYetTranslated locale={locale} kind="work" />
          ) : null}
          {/* The website writes the work into the page, where a search engine
              reads the Fathers' own words. The apps carry it as a file in
              the bundle and read it as the page opens: handed over as a
              prop it was in every app twice (lib/saints/writingFile.ts). */}
          {/* Who wrote it, as its cover says him: a citation names the
              author, who is not always the saint whose page it is on, and
              names none for a work no one signed (the Martyrdom of
              Polycarp is the Church of Smyrna's letter about him). */}
          {/* The book's page (its cover, what it is, Start reading or
              Continue, More like this) is About this book now, a sheet over
              the chapter, opened from the contents and from ••• (r3-29 A). */}
          {IS_STATIC_EXPORT ? (
            <LazyWritingReader saint={found.saint} work={work} author={authorOfBook(book)} about={about} />
          ) : (
            <WritingReader saint={found.saint} content={content} author={authorOfBook(book)} about={about} />
          )}
        </div>
      </section>
    </ReaderPrefsProvider>
  );
}
