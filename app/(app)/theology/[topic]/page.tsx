import { notFound } from "next/navigation";

import { TopicReader } from "@/components/theology/TopicReader";
import { TheologyArticleNav } from "@/components/theology/TheologyArticleNav";
import { RelatedRail } from "@/components/theology/RelatedRail";
import { ViewInHistory } from "@/components/history/ViewInHistory";
import { eventsForTheologyTopic } from "@/lib/history/events";
import { getTopicMeta, topicParams } from "@/lib/theology/topics";
import { loadTopicBody, saintsCitedIn } from "@/lib/theology/load";
import { buildRelated } from "@/lib/theology/relations";

export const dynamicParams = false;

export function generateStaticParams() {
  return topicParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const { topic } = await params;
  const meta = getTopicMeta(topic);
  if (!meta) return { title: "Theology" };
  return {
    title: meta.title,
    description: meta.summary,
  };
}

export default async function TheologyTopicPage({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const { topic } = await params;
  const meta = getTopicMeta(topic);
  if (!meta || meta.planned) notFound();
  const body = await loadTopicBody(topic);
  if (!body) notFound();

  const groups = buildRelated("doctrine", topic, {
    councils: (body.councils ?? [])
      .map((c) => c.councilSlug)
      .filter((s): s is string => Boolean(s)),
    saints: saintsCitedIn(body).map((s) => s.saintSlug),
  });

  return (
    <section className="bg-night px-5 md:px-8 py-10 md:py-16">
      <div className="mx-auto max-w-[760px] w-full mb-10">
        <TheologyArticleNav />
      </div>
      <TopicReader body={body} />
      <div className="mx-auto max-w-[760px] w-full">
        {/* A study argues from the sources; the account says what happened.
            Rendered only when a curated event actually cites this topic, so
            it can never be an empty shell (same contract as saints). */}
        <ViewInHistory events={eventsForTheologyTopic(topic)} />
        <RelatedRail groups={groups} />
      </div>
    </section>
  );
}
