import { notFound } from "next/navigation";

import { TopicReader } from "@/components/theology/TopicReader";
import { getTopicMeta, topicParams } from "@/lib/theology/topics";
import { loadTopicBody } from "@/lib/theology/load";

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

  return (
    <section className="bg-night px-5 md:px-8 py-16 md:py-24">
      <TopicReader body={body} />
    </section>
  );
}
