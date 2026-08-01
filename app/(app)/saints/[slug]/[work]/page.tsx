import { notFound } from "next/navigation";
import { SAINTS, getWork } from "@/lib/saints/saints";
import { loadWriting } from "@/lib/saints/load";
import { WritingReader } from "@/components/saints/WritingReader";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { MobileWorkProgressBar } from "@/components/saints/MobileWorkProgressBar";
import {
  ReaderFontFamilyButton,
  ReaderFontSizeButton,
  ReaderThemeButton,
  ReaderPrefsProvider,
  ReadingModeController,
} from "@/components/reader/ReaderPrefs";
import { getServerLocale } from "@/lib/i18n/server";
import { ContentNotYetTranslated } from "@/components/i18n/ContentNotYetTranslated";
import { RecordRead } from "@/components/reading/RecordRead";
import { SITE_URL } from "@/lib/site";

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

  // CreativeWork schema, authored by the saint and not by Purify. These pages
  // carry verbatim public-domain patristic text and are open to AI training
  // crawlers (see app/robots.ts), so the authorship needs to be unambiguous in
  // the markup: a machine reader that mistakes the translation for Purify's
  // own writing would misattribute a Father.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "@id": `${SITE_URL}/saints/${found.saint.slug}/${found.work.slug}`,
    name: found.work.title,
    ...(found.work.subtitle ? { alternateName: found.work.subtitle } : {}),
    abstract: found.work.blurb,
    ...(found.work.topics.length ? { about: found.work.topics } : {}),
    ...(found.work.year ? { temporalCoverage: found.work.year } : {}),
    inLanguage: locale,
    isAccessibleForFree: true,
    url: `${SITE_URL}/saints/${found.saint.slug}/${found.work.slug}`,
    author: {
      "@type": "Person",
      "@id": `${SITE_URL}/saints/${found.saint.slug}`,
      name: found.saint.name,
      url: `${SITE_URL}/saints/${found.saint.slug}`,
    },
    publisher: { "@type": "Organization", name: "Purify", url: SITE_URL },
  };

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
      {/* Mobile-only chrome: a 48px top bar with back + work title, and
          a 2px gold progress bar pinned beneath it. The trailing slot
          exposes the same font-family + font-size cyclers the Bible
          reader uses, so a reader's choice carries between surfaces,
          plus the Premium Reading Mode cycler. */}
      <MobileTopBar
        title={content.title}
        back={`/saints/${found.saint.slug}`}
        trailing={
          <div className="flex items-center gap-1">
            <ReaderThemeButton />
            <ReaderFontFamilyButton />
            <ReaderFontSizeButton />
          </div>
        }
      />
      <MobileWorkProgressBar />
      {/* Reflects the persisted reading palette onto <html> while this
          reader is mounted (and strips it on the way out) — the same
          controller the Bible chapter route mounts. */}
      <ReadingModeController />

      <section className="bg-night px-5 md:px-8">
        <div className="mx-auto max-w-[1100px] w-full">
          {locale !== "en" && !content.isLocalized ? (
            <ContentNotYetTranslated locale={locale} kind="work" />
          ) : null}
          <WritingReader saint={found.saint} content={content} />
        </div>
      </section>
    </ReaderPrefsProvider>
  );
}
