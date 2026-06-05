import { notFound } from "next/navigation";
import { SAINTS, getWork } from "@/lib/saints/saints";
import { loadWriting } from "@/lib/saints/load";
import { WritingReader } from "@/components/saints/WritingReader";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { MobileWorkProgressBar } from "@/components/saints/MobileWorkProgressBar";
import {
  ReaderFontFamilyButton,
  ReaderFontSizeButton,
  ReaderPrefsProvider,
} from "@/components/reader/ReaderPrefs";
import { getServerLocale } from "@/lib/i18n/server";
import { ContentNotYetTranslated } from "@/components/i18n/ContentNotYetTranslated";
import { RecordRead } from "@/components/reading/RecordRead";

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

  return (
    <ReaderPrefsProvider>
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
          reader uses, so a reader's choice carries between surfaces. */}
      <MobileTopBar
        title={content.title}
        back={`/saints/${found.saint.slug}`}
        trailing={
          <div className="flex items-center gap-1">
            <ReaderFontFamilyButton />
            <ReaderFontSizeButton />
          </div>
        }
      />
      <MobileWorkProgressBar />

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
