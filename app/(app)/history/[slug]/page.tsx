import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BookmarkEventButton } from "@/components/history/BookmarkEventButton";
import { EventArticle } from "@/components/history/EventArticle";
import { ShareButton } from "@/components/ui/ShareButton";
import { EventRelations } from "@/components/history/EventRelations";
import { EventSources } from "@/components/history/EventSources";
import { ImmersivePreviewCard } from "@/components/history/ImmersivePreviewCard";
import { eraById, eventBySlug, eventParams } from "@/lib/history/events";
import { loadEventBody } from "@/lib/history/load";

// Every published event page is statically generated — on the website for
// SEO, and inside the Android bundle for offline reading. Drafts never route.
export const dynamicParams = false;

export function generateStaticParams() {
  return eventParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const meta = eventBySlug(slug);
  if (!meta) return { title: "Orthodox History" };
  const description = `${meta.displayDate} — ${meta.preview}`;
  return {
    title: `${meta.title} (${meta.displayDate})`,
    description,
    alternates: { canonical: `/history/${meta.slug}` },
    openGraph: {
      title: meta.title,
      description,
      type: "article",
      url: `/history/${meta.slug}`,
    },
  };
}

export default async function HistoryEventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const meta = eventBySlug(slug);
  if (!meta) notFound();
  const body = await loadEventBody(slug);
  if (!body) notFound();

  const era = eraById(meta.era);

  // Article (not Event) schema: schema.org Event is for scheduled happenings;
  // for historical writing, a dated Article with temporalCoverage is what
  // validators and search engines expect.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: meta.title,
    description: meta.preview,
    about: era.label,
    temporalCoverage: meta.yearEnd
      ? `${meta.yearStart}/${meta.yearEnd}`
      : String(meta.yearStart),
    ...(meta.region ? { contentLocation: { "@type": "Place", name: meta.region } } : {}),
    publisher: { "@type": "Organization", name: "Purify" },
  };

  return (
    <section className="bg-night px-5 md:px-8 py-10 md:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto w-full max-w-[760px]">
        <EventArticle meta={meta} body={body} />
        <div className="mt-8 flex flex-wrap items-center gap-2">
          <BookmarkEventButton event={meta} />
          <ShareButton title={meta.title} text={meta.preview} className="min-h-[44px] px-4" />
        </div>
        <EventSources sources={body.sources} />
        <EventRelations meta={meta} />
        <ImmersivePreviewCard />
      </div>
    </section>
  );
}
