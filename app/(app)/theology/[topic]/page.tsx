import { notFound } from "next/navigation";

import { TopicReader } from "@/components/theology/TopicReader";
import { TheologySearch } from "@/components/theology/TheologySearch";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { ShareButton } from "@/components/ui/ShareButton";
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

/**
 * A doctrine's own page (1.8, round 3 r3-04, the owner's B and C mix): on a
 * phone the bar starts clear over the subject's icon, the way back and Share
 * on round plates, and turns solid with the study's name once its title has
 * gone up under it, as a saint's page does (lib/nav/backBar.ts lists the
 * address, so the apps show this bar alone). The head, the doors and the
 * deck are components/theology/TopicReader.tsx; the search pill floats over
 * the foot, as on every Theology screen.
 */
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
    <>
      <MobileTopBar
        title={meta.title}
        back
        backFallback="/theology"
        revealTitleOn="doctrine-title"
        overlay
        trailing={<ShareButton title={meta.title} round />}
      />
      <section className="bg-night px-5 pb-10 md:px-8 md:py-14">
        <TopicReader body={body} groups={groups} events={eventsForTheologyTopic(topic)} />
        <TheologySearch />
      </section>
    </>
  );
}
