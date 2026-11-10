import { notFound } from "next/navigation";

import { ApologeticsReader } from "@/components/apologetics/ApologeticsReader";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { LEAF_TITLE } from "@/components/theology/wayStyle";
import { getApologeticsMeta, apologeticsParams } from "@/lib/apologetics/topics";
import { loadApologeticsBody } from "@/lib/apologetics/load";
import { buildRelated } from "@/lib/theology/relations";

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

/**
 * An answer's page (1.9, in the house style): its own bar, the answer's name
 * once its heading has gone up under it, back to Apologetics, the search
 * turned to Theology; then the answer (components/apologetics/
 * ApologeticsReader.tsx).
 */
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

  // What it leads to, in one list: the studies behind it, the answers beside
  // it that are written, the councils it cites and the Fathers it quotes.
  const groups = buildRelated("apologetics", slug, {
    apologetics: (body.related ?? []).filter((s) => {
      const beside = getApologeticsMeta(s);
      return Boolean(beside) && !beside?.planned;
    }),
    councils: (body.councils ?? [])
      .map((c) => c.councilSlug)
      .filter((s): s is string => Boolean(s)),
    saints: body.florilegium
      .map((q) => q.saintSlug)
      .filter((s): s is string => Boolean(s)),
  });

  return (
    <>
      <MobileTopBar title={meta.title} back backFallback="/apologetics" revealTitleOn={LEAF_TITLE} searchPlace="theology" />
      <ApologeticsReader body={body} minutes={meta.estimatedMinutes} groups={groups} />
    </>
  );
}
