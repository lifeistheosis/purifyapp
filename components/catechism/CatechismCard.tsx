import { bankHasQuestions } from "@/lib/catechism/bank";

import { CatechismToday } from "./CatechismToday";

/**
 * Today's Catechism on Today, and only while there is something behind it.
 *
 * A server component, so it can ask the bank directly and render nothing at
 * all when the file is empty: no card promising a feature that has no
 * content yet. Its look is the reader's (1.8, round 17, transitionary: one
 * quiet line for an Orthodox reader, a card for a reader learning or new),
 * which only the device knows, so the client child draws it
 * (CatechismToday). No quiz code loads here; the link is the whole card.
 */
export function CatechismCard({ className }: { className?: string }) {
  if (!bankHasQuestions()) return null;
  return <CatechismToday className={className} />;
}
