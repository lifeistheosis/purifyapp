import { notFound } from "next/navigation";

import { CollectionsClient } from "@/components/catechism/CollectionsClient";
import { PracticeClient } from "@/components/catechism/PracticeClient";
import { bankRegistries, loadBank, toClientQuestion } from "@/lib/catechism/bank";
import { getCollection, loadCollections, tagQuestions } from "@/lib/catechism/collections";
import type { ClientQuestion } from "@/lib/catechism/types";

/**
 * The placeholder segment generated while data/catechism/collections.json
 * is empty. A dynamic route under output:export must yield at least one
 * param or the export fails; this one renders the list's empty state.
 */
const PLACEHOLDER = "none";

export function generateStaticParams() {
  const slugs = loadCollections().map((c) => ({ slug: c.slug }));
  return slugs.length ? slugs : [{ slug: PLACEHOLDER }];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = getCollection(slug);
  return {
    title: c ? `${c.name}: practice` : "Study collections",
    description: c
      ? `${c.description} Untimed, and every right answer counts toward the collection.`
      : "Sets of catechism questions on one subject each.",
  };
}

// Rebuilt hourly on the web, like the list. Ignored by the static export.
export const revalidate = 3600;

/**
 * Server shell only: metadata, the collection and its published questions
 * from the two committed files, no auth, no data. The client child reads
 * the reader's own set after mount. SHIPS INTO THE NATIVE BUNDLE.
 */
export default async function CollectionPracticePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const collections = loadCollections();
  if (collections.length === 0) return <CollectionsClient index={[]} />;

  const collection = getCollection(slug);
  if (!collection) notFound();

  const bank = loadBank();
  const registries = await bankRegistries();
  const published = tagQuestions(bank, collection.tag);
  const questions = published
    .map((q) => toClientQuestion(q, registries))
    .filter((q): q is ClientQuestion => q !== null);

  return (
    <PracticeClient
      collection={{ ...collection, question_ids: questions.map((q) => q.id) }}
      questions={questions}
    />
  );
}
