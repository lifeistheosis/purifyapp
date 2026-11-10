import { notFound } from "next/navigation";

import { CitationCard } from "@/components/citations/CitationCard";
import { T } from "@/components/i18n/T";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { RecordRead } from "@/components/reading/RecordRead";
import { LeafGlyph, LeafNote, LeafPage, LeafPart, LeafPicture } from "@/components/theology/LeafPage";
import { RelatedRail } from "@/components/theology/RelatedRail";
import { LEAF_LEAD, LEAF_TEXT, LEAF_TITLE } from "@/components/theology/wayStyle";
import { Book } from "@/components/ui/icons/Book";
import { resolveCitations } from "@/lib/citations/resolve";
import { buildRelated } from "@/lib/theology/relations";
import { THEOLOGY_SUBJECTS } from "@/lib/theology/subjects";
import { loadAllTopics, loadTopic, partitionCitations } from "@/lib/topics/topics";

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

/**
 * A topic: a question, its answer, and the Fathers who confess it (1.9, in
 * the house style with the list that opens it; components/theology/
 * LeafPage.tsx has the frame and docs/1.9-build/notes/theology-fable.md the
 * plan).
 *
 * The head is the list's card, grown: the question's subject by its icon,
 * whole on its plate, which the card's own picture travels into; the name in
 * Lora; and how many of the Fathers it cites, as the card and the path say
 * it. A question no subject names yet wears the book, lit. Then the answer
 * whole (the card gave its first sentence), the Fathers' own words under
 * "Confessed by the Fathers" and, where there are any, "Refuted by the
 * Fathers", each on a raised surface with his face and its line
 * (components/citations/CitationCard.tsx), what the question leads to as
 * rows, and who curated it.
 *
 * Until 1.9: a back bar with no name, the "Theology" label over four pills,
 * "Topical index" over a giant headline, outlined boxes with gold lines, and
 * the search pill floating over the words. No word of the page's own
 * changed.
 */
export default async function TopicPage({ params }: { params: Params }) {
  const { slug } = await params;
  const topic = await loadTopic(slug);
  if (!topic) notFound();

  const { affirming, refuting } = partitionCitations(topic);
  const resolvedAffirming = await resolveCitations(affirming);
  const resolvedRefuting = await resolveCitations(refuting);

  const related = buildRelated("topics", topic.slug, {
    saints: topic.citations
      .map((c) => c.saintSlug)
      .filter((s): s is string => Boolean(s)),
  });

  // The subject the question belongs to, whose icon its card wears (app/(app)/topics/page.tsx).
  const subject = THEOLOGY_SUBJECTS.find((s) => s.topics.includes(topic.slug));

  return (
    <>
      <MobileTopBar title={topic.title} back backFallback="/topics" revealTitleOn={LEAF_TITLE} searchPlace="theology" />
      <RecordRead
        kind="topic"
        href={`/topics/${topic.slug}`}
        label={topic.title}
        topics={[topic.title, topic.title.replace(/^The\s+/i, "")]}
      />
      <LeafPage
        kind="topic"
        up={{ href: "/topics", label: "discover.tile.topics" }}
        mark={subject ? <LeafPicture src={subject.picture.src} carry={`topic:${topic.slug}`} /> : <LeafGlyph icon={Book} />}
        name={topic.title}
        nameLang="en"
        line={<T k="topics.citations" count={topic.citations.length} />}
      >
        <p lang="en" dir="ltr" data-leaf-lead="" className={`mt-6 ${LEAF_LEAD}`}>
          {topic.definition}
        </p>
        {topic.tradition ? (
          <p lang="en" dir="ltr" className={`mt-4 ${LEAF_TEXT}`}>
            {topic.tradition}
          </p>
        ) : null}

        {/* Confessed by the Fathers */}
        {resolvedAffirming.length > 0 ? (
          <LeafPart id="topic-confessed" title={<T k="topics.confessed" />} count={resolvedAffirming.length} data-topic-part="confessed">
            <ul className="mt-3 space-y-3">
              {resolvedAffirming.map((c, i) => (
                <li key={`a-${i}`}>
                  <CitationCard c={c} />
                </li>
              ))}
            </ul>
          </LeafPart>
        ) : null}

        {/* Refuted by the Fathers, only when there are any: never an empty part. */}
        {resolvedRefuting.length > 0 ? (
          <LeafPart id="topic-refuted" title={<T k="topics.refuted" />} count={resolvedRefuting.length} data-topic-part="refuted">
            <ul className="mt-3 space-y-3">
              {resolvedRefuting.map((c, i) => (
                <li key={`r-${i}`}>
                  <CitationCard c={c} />
                </li>
              ))}
            </ul>
          </LeafPart>
        ) : null}

        <RelatedRail groups={related} />

        {topic.curatedBy ? (
          <LeafNote>
            <p>
              <T k="study.curatedBy" /> {topic.curatedBy}
              {topic.curatedOn ? ` · ${topic.curatedOn}` : ""}.
            </p>
          </LeafNote>
        ) : null}
      </LeafPage>
    </>
  );
}
