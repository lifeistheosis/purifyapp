import Link from "next/link";
import { notFound } from "next/navigation";
import {
  loadAllTopics,
  loadTopic,
  partitionCitations,
  type TopicCitation,
} from "@/lib/topics/topics";
import { loadWriting } from "@/lib/saints/load";
import { getSaint } from "@/lib/saints/saints";

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

/** Resolve one citation into the data needed to render its card. */
async function resolveCitation(c: TopicCitation) {
  const saint = getSaint(c.saintSlug);
  if (!saint) return null;
  const writing = await loadWriting(c.saintSlug, c.workSlug);
  if (!writing) return null;
  const section = writing.sections.find((s) => s.n === c.sectionN);
  if (!section) return null;
  const paragraph =
    typeof c.paragraphIndex === "number"
      ? section.paragraphs[c.paragraphIndex]
      : section.paragraphs[0];
  return {
    saintName: saint.name,
    saintIcon: saint.iconUrl,
    workTitle: writing.title,
    sectionTitle: section.title,
    citation: section.citation,
    paragraph: paragraph ?? "",
    href: `/saints/${c.saintSlug}/${c.workSlug}#s${c.sectionN}`,
    gloss: c.gloss,
  };
}

type ResolvedCitation = NonNullable<Awaited<ReturnType<typeof resolveCitation>>>;

function CitationCard({ c }: { c: ResolvedCitation }) {
  return (
    <Link
      href={c.href}
      className="block rounded-lg border border-paper/12 bg-paper/[0.03] p-5 hover:border-gold/40 hover:-translate-y-0.5 transition-all duration-200"
    >
      {c.gloss ? (
        <p className="font-sans text-[12px] uppercase tracking-[1.2px] text-gold/85 mb-3">
          {c.gloss}
        </p>
      ) : null}
      <blockquote className="font-serif italic text-[17px] text-paper/90 leading-[1.65]">
        &ldquo;{c.paragraph}&rdquo;
      </blockquote>
      <p className="mt-3 font-sans text-[12.5px] text-paper/55">
        {c.saintName}
        <span className="text-paper/30 mx-2">&middot;</span>
        <span className="text-paper/70">{c.workTitle}</span>
        {c.citation ? (
          <>
            <span className="text-paper/30 mx-2">&middot;</span>
            <span className="text-paper/55">{c.citation}</span>
          </>
        ) : null}
      </p>
    </Link>
  );
}

export default async function TopicPage({ params }: { params: Params }) {
  const { slug } = await params;
  const topic = await loadTopic(slug);
  if (!topic) notFound();

  const { affirming, refuting } = partitionCitations(topic);
  const resolvedAffirming = (
    await Promise.all(affirming.map(resolveCitation))
  ).filter((c): c is ResolvedCitation => c !== null);
  const resolvedRefuting = (
    await Promise.all(refuting.map(resolveCitation))
  ).filter((c): c is ResolvedCitation => c !== null);

  return (
    <section className="bg-night px-5 md:px-8 py-16 md:py-24">
      <article className="mx-auto max-w-[760px] w-full">
        <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
          Topical index
        </p>
        <h1 className="font-sans text-[36px] md:text-[46px] font-bold leading-[1.05] tracking-[-0.025em] text-paper">
          {topic.title}
        </h1>
        <p className="mt-6 font-serif text-[17px] text-paper/85 leading-[1.7]">
          {topic.definition}
        </p>
        {topic.tradition ? (
          <p className="mt-4 font-serif text-[16px] text-paper/70 leading-[1.7]">
            {topic.tradition}
          </p>
        ) : null}

        {/* Confessed by the Fathers */}
        {resolvedAffirming.length > 0 ? (
          <section className="mt-12">
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-gold mb-5">
              Confessed by the Fathers
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

        {/* Refuted by the Fathers — only renders when non-empty.
            Per the PRD, never show an empty rubric column. */}
        {resolvedRefuting.length > 0 ? (
          <section className="mt-12">
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[1.5px] mb-5"
               style={{ color: "var(--ink-rubric, #c1272d)" }}>
              Refuted by the Fathers
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
          <p className="mt-16 pt-8 border-t border-paper/10 font-sans text-[12px] text-paper/40">
            Curated by {topic.curatedBy}
            {topic.curatedOn ? ` · ${topic.curatedOn}` : ""}.
          </p>
        ) : null}
      </article>
    </section>
  );
}
