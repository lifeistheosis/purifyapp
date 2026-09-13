import { CollectionsClient } from "@/components/catechism/CollectionsClient";
import { loadBank } from "@/lib/catechism/bank";
import { collectionIndex, loadCollections } from "@/lib/catechism/collections";

export const metadata = {
  title: "Study collections",
  description:
    "Sets of catechism questions on one subject each. A right answer, in the day's five or in practice, counts toward the collection, and nothing expires.",
};

// Rebuilt hourly on the web so a question's published_at is honoured the day
// it lands. Ignored by the static export, which bakes once.
export const revalidate = 3600;

/**
 * Server shell only. This page SHIPS INTO THE NATIVE BUNDLE, so it reads no
 * auth and no data on the server: the collections and their published
 * question ids are baked from the two committed files, and the client child
 * reads the reader's own sets after mount.
 */
export default function CollectionsPage() {
  const index = collectionIndex(loadCollections(), loadBank());
  return <CollectionsClient index={index} />;
}
