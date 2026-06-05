import { notFound } from "next/navigation";
import {
  loadAllTopics,
  loadTopic,
  partitionCitations,
} from "@/lib/topics/topics";
import { resolveCitations } from "@/lib/citations/resolve";
import { CitationCard } from "@/components/citations/CitationCard";
import { getServerLocale } from "@/lib/i18n/server";
import { getMessages, t } from "@/lib/i18n";
import { RecordRead } from "@/components/reading/RecordRead";

type Params = Promise<{ slug: string }>;

export const revalidate = 3600;

export async function generateStaticParams() {
  const topics = await loadAllTopics();
  return topics.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const topic = await loadTopic(slug);
  if (!topic) return { title: "Topic" };
  return {
    title: topic.title,
    description: topic.definition.slice(0, 220),
  };
}

export default async function TopicPage({ params }: { params: Params }) {
  const { slug } = await params;
  const topic = await loadTopic(slug);
  if (!topic) notFound();

  const { affirming, refuting } = partitionCitations(topic);
  const resolvedAffirming = await resolveCitations(affirming);
  const resolvedRefuting = await resolveCitations(refuting);
  const locale = await getServerLocale();
  const m = getMessages(locale);

  return (
    <section className="bg-night px-5 md:px-8 py-16 md:py-24">
      <RecordRead
        kind="topic"
        href={`/topics/${topic.slug}`}
        label={topic.title}
        topics={[topic.title, topic.title.replace(/^The\s+/i, "")]}
      />
      <article className="mx-auto max-w-[760px] w-full">
        <p className="font-sans text-detail font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
          {t(m, "topics.eyebrow")}
        </p>
        <h1 className="font-sans text-display-sm md:text-display font-bold leading-[1.05] tracking-[-0.025em] text-paper">
          {topic.title}
        </h1>
        <p className="mt-6 font-serif text-body text-paper/85 leading-[1.7]">
          {topic.definition}
        </p>
        {topic.tradition ? (
          <p className="mt-4 font-serif text-body text-paper/70 leading-[1.7]">
            {topic.tradition}
          </p>
        ) : null}

        {/* Confessed by the Fathers */}
        {resolvedAffirming.length > 0 ? (
          <section className="mt-12">
            <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-gold mb-5">
              {t(m, "topics.confessed")}
            </p>
            <ul className="space-y-4">
              {resolvedAffirming.map((c, i) => (
                <li key={`a-${i}`}>
                  <CitationCard c={c} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Refuted by the Fathers, only renders when non-empty.
            Per the PRD, never show an empty rubric column. */}
        {resolvedRefuting.length > 0 ? (
          <section className="mt-12">
            <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] mb-5"
               style={{ color: "var(--ink-rubric, #c1272d)" }}>
              {t(m, "topics.refuted")}
            </p>
            <ul className="space-y-4">
              {resolvedRefuting.map((c, i) => (
                <li key={`r-${i}`}>
                  <CitationCard c={c} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {topic.curatedBy ? (
          <p className="mt-16 pt-8 border-t border-paper/10 font-sans text-caption text-paper/40">
            Curated by {topic.curatedBy}
            {topic.curatedOn ? ` · ${topic.curatedOn}` : ""}.
          </p>
        ) : null}
      </article>
    </section>
  );
}
