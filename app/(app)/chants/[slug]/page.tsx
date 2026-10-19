import { notFound } from "next/navigation";

import { ChantPage } from "@/components/chants/ChantPage";
import { chantBySlug, chantIndex, firstSentence, indexRow, liveChants } from "@/lib/chants/registry.server";

type Params = Promise<{ slug: string }>;

// Every live chant has its page in the export; any other address is the
// usual not-found page.
export const dynamicParams = false;

export function generateStaticParams() {
  return liveChants().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const chant = chantBySlug(slug);
  if (!chant) return { title: "Chants" };
  return { title: chant.title, description: firstSentence(chant.about.what) };
}

// A chant's page carries that chant (its words, its history, its versions)
// and, for the row under it, only the index rows of the chants it names.
export default async function ChantRoute({ params }: { params: Params }) {
  const { slug } = await params;
  const chant = chantBySlug(slug);
  if (!chant) notFound();
  const related = (chant.related ?? [])
    .map((s) => chantIndex().find((r) => r.slug === s))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));
  return <ChantPage chant={chant} row={indexRow(chant)} related={related} />;
}
