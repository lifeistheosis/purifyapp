import { CatechismClient } from "@/components/catechism/CatechismClient";
import { getDailyWindow, loadBank } from "@/lib/catechism/bank";
import { collectionIndex, loadCollections } from "@/lib/catechism/collections";

export const metadata = {
  title: "Today's Catechism",
  description:
    "Five questions a day on the Orthodox faith, the same five for everyone, each pointing to the free page it comes from. Written and reviewed by people.",
};

// Rebuilt hourly on the web so the three-day window keeps up with the
// calendar. Ignored by the static export, which bakes 400 days once.
export const revalidate = 3600;

/**
 * Server shell only.
 *
 * This page SHIPS INTO THE NATIVE BUNDLE, so it must not read auth or data
 * on the server and must not resolve "today": a server component renders
 * once under output:export and freezes its answer. It bakes a date-keyed
 * window (lib/catechism/window.ts, the VerseOfDayCard pattern) and the
 * client child picks the reader's own day out of it after mount.
 *
 * The bank is data/catechism/questions.json. Empty, this renders the quiet
 * empty state; nothing here invents a question.
 */
export default async function CatechismPage() {
  const window = await getDailyWindow();
  // The collections and their published question ids, so a correct answer
  // can advance a collection on the device with no server. Empty while
  // data/catechism/collections.json is.
  const collections = collectionIndex(loadCollections(), loadBank());
  return <CatechismClient window={window} collections={collections} />;
}
