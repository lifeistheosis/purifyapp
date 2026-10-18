import "server-only";

import type { ShownCite } from "@/lib/citations/cite";
import { shownCite } from "@/lib/citations/shown";

import { allCards } from "./cards";
import { PASSAGES, type Passage } from "./collections";
import type { CollectionSlug } from "./feelings";
import { tileOf, type TileCard } from "./select";

// The place under a passage is the line every quotation in the app has
// (1.8, lib/citations): its rules began here and live there now.
export { markOf, placeOf } from "@/lib/citations/shown";

/**
 * A Purify collection's page, as the server hands it over (1.8): each passage
 * with its words, where it opens, and its exact place, read from the registry
 * and the work itself, never typed (lib/reading/collections.ts). Only what the
 * page shows: the passages, and the books the Fathers' passages come from as
 * covers to open. No word here is in the reader's language: the page looks
 * its words up on the device, and the passages stay in their English.
 */

/**
 * A passage and its line: the words, and where they stand, as every
 * quotation's line names it (lib/citations/cite.ts, ShownCite): the book,
 * chapter and verses and the translation; or the author, the work by its
 * own numbering ("Institutes 8.21") and its edition.
 */
export type ShownPassage = Extract<ShownCite, { kind: "scripture" | "father" }> & { text: string };

export type CollectionPageData = {
  slug: CollectionSlug;
  passages: ShownPassage[];
  /** The books the Fathers' passages come from, once each, in the order they first appear. */
  sources: TileCard[];
};

function shown(p: Passage): ShownPassage {
  const cite = shownCite(
    p.kind === "scripture"
      ? { kind: "scripture", book: p.book, chapter: p.chapter, from: p.from, ...(p.to !== undefined ? { to: p.to } : {}) }
      : { kind: "work", saint: p.saint, work: p.work, section: p.section, paragraph: p.paragraph },
  );
  if (!cite || (cite.kind !== "scripture" && cite.kind !== "father")) {
    // lib/reading/__tests__/collections.test.ts holds every passage to a place that exists.
    throw new Error(`A collection's passage names a place the app does not have: ${JSON.stringify(p)}`);
  }
  return { ...cite, text: p.text };
}

export function collectionPage(slug: CollectionSlug, native: boolean): CollectionPageData {
  const passages = PASSAGES[slug];
  const cards = new Map(allCards(native).map((c) => [c.key, c]));
  const seen = new Set<string>();
  const sources: TileCard[] = [];
  for (const p of passages) {
    if (p.kind !== "father") continue;
    const key = `${p.saint}/${p.work}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const card = cards.get(key);
    if (card) sources.push(tileOf(card));
  }
  return { slug, passages: passages.map(shown), sources };
}
