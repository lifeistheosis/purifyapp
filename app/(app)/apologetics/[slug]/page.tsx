import { notFound } from "next/navigation";

import { ApologeticsReader } from "@/components/apologetics/ApologeticsReader";
import { TheologyArticleNav } from "@/components/theology/TheologyArticleNav";
import { RelatedRail } from "@/components/theology/RelatedRail";
import { getApologeticsMeta, apologeticsParams } from "@/lib/apologetics/topics";
import { loadApologeticsBody } from "@/lib/apologetics/load";
import { buildRelated } from "@/lib/theology/relations";
import { T } from "@/components/i18n/T";

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

  const groups = buildRelated("apologetics", slug, {
    councils: (body.councils ?? [])
      .map((c) => c.councilSlug)
      .filter((s): s is string => Boolean(s)),
    saints: body.florilegium
      .map((q) => q.saintSlug)
      .filter((s): s is string => Boolean(s)),
  });

  return (
    <section className="bg-night px-5 md:px-8 py-10 md:py-16">
      <div className="mx-auto max-w-[760px] w-full mb-10">
        <TheologyArticleNav />
      </div>
      <ApologeticsReader body={body} />
      <div className="mx-auto max-w-[760px] w-full">
        <RelatedRail groups={groups} title={<T k="study.apologetics.goDeeper" />} />
      </div>
    </section>
  );
}
