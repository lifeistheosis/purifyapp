import { notFound } from "next/navigation";

import { ApologeticsReader } from "@/components/apologetics/ApologeticsReader";
import { getApologeticsMeta, apologeticsParams } from "@/lib/apologetics/topics";
import { loadApologeticsBody } from "@/lib/apologetics/load";

export const dynamicParams = false;

export function generateStaticParams() {
  return apologeticsParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const meta = getApologeticsMeta(slug);
  if (!meta) return { title: "Apologetics" };
  return {
    title: meta.title,
    description: meta.summary,
  };
}

export default async function ApologeticsTopicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const meta = getApologeticsMeta(slug);
  if (!meta || meta.planned) notFound();
  const body = await loadApologeticsBody(slug);
  if (!body) notFound();

  return (
    <section className="bg-night px-5 md:px-8 py-16 md:py-24">
      <ApologeticsReader body={body} />
    </section>
  );
}
