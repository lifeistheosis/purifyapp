import { notFound } from "next/navigation";
import { SAINTS, getWork } from "@/lib/saints/saints";
import { loadWriting } from "@/lib/saints/load";
import { WritingReader } from "@/components/saints/WritingReader";
import { JsonLd } from "@/components/seo/JsonLd";
import { writingSchema } from "@/lib/seo/jsonld";

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
    title: `${found.work.title}, by ${found.saint.name}`,
    description: found.work.blurb,
  };
}

export default async function WritingPage({ params }: { params: Params }) {
  const { slug, work } = await params;
  const found = getWork(slug, work);
  if (!found) notFound();
  const content = await loadWriting(slug, work);
  if (!content) notFound();

  return (
    <section className="bg-night px-5 md:px-8">
      <JsonLd data={writingSchema(found.saint, found.work, content)} />
      <div className="mx-auto max-w-[1100px] w-full">
        <WritingReader saint={found.saint} content={content} />
      </div>
    </section>
  );
}
