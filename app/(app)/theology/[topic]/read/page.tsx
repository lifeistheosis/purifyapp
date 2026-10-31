import { notFound } from "next/navigation";

import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { PassageDeck } from "@/components/theology/PassageDeck";
import { ReaderPartLine, StudyReader, type ReaderEnd } from "@/components/theology/StudyReader";
import { StudyCouncils, StudyCurated, StudyPartText } from "@/components/theology/StudyPartText";
import { IS_STATIC_EXPORT } from "@/lib/platform/buildTarget";
import { loadTopicBody } from "@/lib/theology/load";
import { subjectOfStudy } from "@/lib/theology/page";
import { readAfter, readIdOf } from "@/lib/theology/path";
import { pathSteps } from "@/lib/theology/pathSteps";
import { studyPassages } from "@/lib/theology/passages";
import { getTopicMeta, topicParams } from "@/lib/theology/topics";

export const dynamicParams = false;

export function generateStaticParams() {
  return topicParams();
}

export async function generateMetadata({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params;
  const meta = getTopicMeta(topic);
  return meta ? { title: meta.title, description: meta.summary } : { title: "Theology" };
}

/**
 * A study read one part at a time (1.8, round 3 r3-13): C's "one part at a
 * time" in the owner's hybrid of B and C. The parts are the study's own
 * headings; each part's words, then at its end the Fathers' passages it
 * rests on (lib/theology/parts.ts: after the first paragraph that names
 * their Father, or where the editors set them), as B's picture cards. The
 * last part closes with what the councils said, the Fathers no part names,
 * and who curated the study. After it, Up next is what the path brings next:
 * the step's next read, the next step, or after the ninth, Go deeper.
 *
 * The bar names the study and the part in view, and leads back to the
 * study's page; the parts and what moves are components/theology/
 * StudyReader.tsx.
 */
export default async function StudyReadPage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params;
  const meta = getTopicMeta(topic);
  if (!meta || meta.planned) notFound();
  const body = await loadTopicBody(topic);
  if (!body) notFound();

  const { passages, placed } = studyPassages(body);
  const last = placed.parts.length - 1;
  const subject = subjectOfStudy(topic);

  // What comes after the study on the path.
  const steps = await pathSteps(IS_STATIC_EXPORT);
  const step = subject ? steps.find((s) => s.id === subject.id) : undefined;
  const after = step ? readAfter(step.reads, readIdOf.study(topic)) : null;
  const nextStep = step ? steps[step.n] : undefined;
  const end: ReaderEnd = after
    ? { title: after.title, href: after.href, read: { id: after.id, kind: after.kind, step: step!.id } }
    : nextStep
      ? { title: nextStep.title, href: `/theology/path/${nextStep.id}` }
      : { title: null, href: "/theology#go-deeper" };

  const panels = placed.parts.map((part, i) => (
    <div key={i}>
      <StudyPartText blocks={part.blocks} summary={i === 0 ? body.summary : undefined} />
      {i === last ? <StudyCouncils councils={body.councils ?? []} /> : null}
      <PassageDeck passages={[...part.passages, ...(i === last ? placed.end : [])].map((j) => passages[j])} />
      {i === last ? <StudyCurated body={body} /> : null}
    </div>
  ));

  return (
    <>
      <MobileTopBar
        title={meta.title}
        back
        backFallback={`/theology/${topic}`}
        subtitle={<ReaderPartLine total={placed.parts.length} />}
        searchPlace="theology"
      />
      <section className="relative overflow-x-clip bg-night px-5 pb-12 md:px-8 md:py-14">
        <div className="mx-auto w-full max-w-[680px]">
          <StudyReader
            slug={topic}
            title={meta.title}
            headings={placed.parts.map((p) => p.heading)}
            panels={panels}
            light={subject?.picture.src ?? "/discover/tiles/theology.v2.webp"}
            end={end}
          />
        </div>
      </section>
    </>
  );
}
