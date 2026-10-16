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
import { BookHeader } from "@/components/reading/BookHeader";
import { MoreLikeThis } from "@/components/reading/MoreLikeThis";
import { bookPage } from "@/lib/reading/cards";

type Params = Promise<{ slug: string; work: string }>;

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

  // The book's page (1.7, the reading room): its cover and facts above the
  // text, and more like it at the foot. Built here from the room's own cards,
  // so the apps draw it before the text has been read from its file.
  const book = bookPage(found.saint, found.work.slug, IS_STATIC_EXPORT);

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
      {/* Reading the Fathers keeps the day for the streak. */}
      <KeepDay strand="day:study" />
      {/* Mobile-only chrome: a 48px top bar with back + work title, and
          a 2px gold progress bar pinned beneath it. The trailing slot is
          one gear, opening the reader settings the Bible reader opens
          (typeface, size, spacing, reading mode, focus), so a reader's
          choice carries between surfaces and the bar fits the screen. */}
      {/* Up to the saint, with his Writings open (1.7): the work's own part
          of his page, where the reader most likely came from. */}
      <MobileTopBar
        title={content.title}
        back={`/saints/${found.saint.slug}#writings`}
        trailing={<MobileWorkActions />}
        revealTitleOn="work-title"
      />
      <MobileWorkProgressBar />
      {/* Reflects the persisted reading palette onto <html> while this
          reader is mounted (and strips it on the way out) — the same
          controller the Bible chapter route mounts. */}
      <ReadingModeController />

      <section className="bg-night px-5 md:px-8">
        <div className="mx-auto max-w-[1100px] w-full">
          {book ? <BookHeader {...book.header} /> : null}
          {locale !== "en" && !content.isLocalized ? (
            <ContentNotYetTranslated locale={locale} kind="work" />
          ) : null}
          {/* The website writes the work into the page, where a search engine
              reads the Fathers' own words. The apps carry it as a file in
              the bundle and read it as the page opens: handed over as a
              prop it was in every app twice (lib/saints/writingFile.ts). */}
          {IS_STATIC_EXPORT ? (
            <LazyWritingReader saint={found.saint} work={work} />
          ) : (
            <WritingReader saint={found.saint} content={content} />
          )}
          {book ? <MoreLikeThis workKey={book.key} cards={book.like} /> : null}
        </div>
      </section>
    </ReaderPrefsProvider>
  );
}
