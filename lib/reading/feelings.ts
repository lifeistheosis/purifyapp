/**
 * The reading room's row by feeling, and the Purify collections it opens
 * (1.8, the owner's note of 2026-10-17: "For daily life is good, but also add
 * ... a section for emotions ... getting our own collection of stuff, so like
 * collection of quotes from the things we have, like verses about hatred or
 * like sections of books ... talk about hatred").
 *
 * Each feeling on the row is a door to one Purify collection: passages on
 * that one subject, copied letter for letter from the texts the app already
 * carries (the Fathers in the library, the King James New Testament, Brenton's
 * Old Testament), each with its exact place and opening there. The passages
 * are lib/reading/collections.ts; this file is only what the room needs to
 * draw the doors, so the room's script carries no passage.
 *
 * The feelings are the ones the library can answer: each has passages enough
 * from Scripture and from at least two of the Fathers. Hatred came first, as
 * the owner asked.
 *
 * Every English name here is en.json's word for word (`reading.collection.
 * <slug>.name`), held there by lib/reading/__tests__/collections.test.ts, as
 * the room's other closed lists are (lib/reading/catalog.ts).
 *
 * REVIEW. The choice of feelings and passages, and each collection's one line
 * of introduction (`reading.collection.<slug>.intro`, in every language), are
 * ours, written as canonically as we can and marked for a future clergy
 * review (docs/editorial-standards.md). The passages themselves are the
 * texts' own words; nothing in them is ours.
 */

export const FEELINGS = [
  { slug: "love", label: "Love" },
  { slug: "anger", label: "Anger" },
  { slug: "hatred", label: "Hatred" },
  { slug: "fear", label: "Fear and worry" },
  { slug: "grief", label: "Grief" },
  { slug: "despondency", label: "Despondency" },
  { slug: "envy", label: "Envy" },
  { slug: "loneliness", label: "Loneliness" },
] as const;

export type CollectionSlug = (typeof FEELINGS)[number]["slug"];

export const COLLECTION_SLUGS: readonly CollectionSlug[] = FEELINGS.map((f) => f.slug);

export function isCollectionSlug(v: unknown): v is CollectionSlug {
  return typeof v === "string" && (COLLECTION_SLUGS as readonly string[]).includes(v);
}

/** The feeling's name, and the collection's one line of introduction. */
export const collectionNameKey = (slug: CollectionSlug) => `reading.collection.${slug}.name`;
export const collectionIntroKey = (slug: CollectionSlug) => `reading.collection.${slug}.intro`;

/** Where a collection opens. */
export function collectionHref(slug: CollectionSlug): string {
  return `/reading/collections/${slug}`;
}

/** A door on the room's row: which collection, and how many passages it holds. */
export type FeelingDoor = { slug: CollectionSlug; count: number };

/**
 * Our words in the collections, waiting for a future clergy review: the
 * feelings chosen, the passages chosen for each, and each one line of
 * introduction. Since 2026-10-18 (the owner's standing note of 2026-10-16:
 * there is no priest reviewing yet, and nothing waits on one).
 */
export const COLLECTIONS_REVIEW = {
  status: "awaiting-clergy-review",
  since: "2026-10-18",
  ours: ["the feelings on the row", "the passages chosen for each", "each collection's line of introduction"],
} as const;
