import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EventArticle, EventHeader } from "@/components/history/EventArticle";
import { EventPictures } from "@/components/history/EventPictures";
import { peopleFromSaints } from "@/components/history/EventPeople";
import { EventRelations } from "@/components/history/EventRelations";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { eraById, eventBySlug, eventParams } from "@/lib/history/events";
import { loadEventBody } from "@/lib/history/load";
import { eventGallery, eventPicture } from "@/lib/history/media";
import { IS_STATIC_EXPORT } from "@/lib/platform/buildTarget";

// Every published event page is statically generated, on the website for
// search engines and inside the apps' bundle for offline reading (its words;
// its pictures are the website's). Drafts never route.
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
  const description = `${meta.displayDate}, ${meta.preview}`;
  return {
    title: `${meta.title} (${meta.displayDate})`,
    description,
    alternates: { canonical: `/history/${meta.slug}` },
    openGraph: {
      title: meta.title,
      description,
      type: "article",
      url: `/history/${meta.slug}`,
      // The event's own picture, on the website (a link pasted anywhere).
      ...(meta.media ? { images: [{ url: meta.media.hero, width: meta.media.width, height: meta.media.height, alt: meta.media.alt }] } : {}),
    },
  };
}

/**
 * An event of Orthodox History (1.7, the owner's note 20), phone first: the
 * page's own bar (back to the timeline, and the event's name once its title
 * has scrolled away), the event's picture, its head, the row of its four
 * parts, the account in those parts, and the way along the line at its foot.
 */
export default async function HistoryEventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const meta = eventBySlug(slug);
  if (!meta) notFound();
  const body = await loadEventBody(slug);
  if (!body) notFound();

  const era = eraById(meta.era);
  const people = body.people?.length ? body.people : peopleFromSaints(meta.rel?.saints ?? []);
  // The picture's address is decided by the build: the website's own file on
  // the website, the website's address in the apps (lib/history/media.ts).
  const picture = eventPicture(meta, IS_STATIC_EXPORT);
  const gallery = eventGallery(meta, IS_STATIC_EXPORT);

  // Article (not Event) schema: schema.org Event is for scheduled happenings;
  // for historical writing, a dated Article with temporalCoverage is what
  // validators and search engines expect.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: meta.title,
    description: meta.preview,
    about: era.label,
    temporalCoverage: meta.yearEnd ? `${meta.yearStart}/${meta.yearEnd}` : String(meta.yearStart),
    ...(meta.region ? { contentLocation: { "@type": "Place", name: meta.region } } : {}),
    ...(meta.media ? { image: meta.media.hero } : {}),
    publisher: { "@type": "Organization", name: "Purify" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <MobileTopBar title={meta.shortTitle ?? meta.title} back backFallback="/history" revealTitleOn="event-title" />
      <section className="history-line bg-night px-5 pb-16 pt-5 md:px-8 md:pt-12">
        <div className="mx-auto w-full max-w-[760px]">
          <EventPictures picture={picture} gallery={gallery} className="mb-7" />
          <EventHeader meta={meta} />
          <EventArticle meta={meta} body={body} people={people} />
          <EventRelations meta={meta} />
        </div>
      </section>
    </>
  );
}
