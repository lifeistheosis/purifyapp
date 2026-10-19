import { notFound } from "next/navigation";

import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { CollectionView } from "@/components/reading/CollectionView";
import { IS_STATIC_EXPORT } from "@/lib/platform/buildTarget";
import { collectionPage } from "@/lib/reading/collectionView";
import { COLLECTION_SLUGS, FEELINGS, collectionNameKey, isCollectionSlug } from "@/lib/reading/feelings";

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return COLLECTION_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const feeling = FEELINGS.find((f) => f.slug === slug);
  if (!feeling) return { title: "Reading" };
  return {
    title: `${feeling.label}, a Purify collection`,
    description: `${feeling.label}: passages from Scripture and the Fathers, each copied word for word from the texts in Purify and opening where it stands.`,
  };
}

/**
 * A Purify collection (1.8): passages on one feeling, each in its own words
 * and opening where it stands (lib/reading/collections.ts). The server reads
 * each passage's place from the registry and the work once, at build time in
 * the apps; every word around the passages is looked up on the device, in the
 * reader's language (components/reading/CollectionView.tsx).
 */
export default async function CollectionPage({ params }: { params: Params }) {
  const { slug } = await params;
  if (!isCollectionSlug(slug)) notFound();
  const page = collectionPage(slug, IS_STATIC_EXPORT);
  return (
    <>
      <MobileTopBar titleKey={collectionNameKey(slug)} back backFallback="/reading" revealTitleOn="collection-title" />
      <CollectionView slug={slug} passages={page.passages} sources={page.sources} />
    </>
  );
}
