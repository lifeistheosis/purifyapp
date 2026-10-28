/**
 * The Church's hymns to a saint that the library already holds (1.8): the
 * Hymns door on his page (round 3b D, "Fade and doors"). Each is a section of
 * one of his works marked `voice: "liturgical"` (lib/saints/load.ts): the
 * apolytikion, the kontakion, the troparion, read from a public-domain service
 * book and cited there (F-49). Nothing is written for the door: it shows those
 * sections as the work has them, and opens the work where each stands.
 *
 * A saint with none has no Hymns door. The owner is sending the troparia and
 * kontakia for more saints (r18/SAINTS-1.8.md, "Saints' hymns on their
 * pages"); each one added to a work as a liturgical section belongs here too,
 * and lib/saints/__tests__/hymns.test.ts fails until it is.
 *
 * No imports, so the saint's page can ask cheaply whether to offer the door.
 */

export type HymnRef = {
  /** The work's slug, among the saint's works. */
  work: string;
  /** The section's `n` in that work. */
  section: number;
};

export const HYMNS: Readonly<Record<string, readonly HymnRef[]>> = {
  "alexander-of-alexandria": [{ work: "encyclical-against-arius", section: 4 }],
  "archangel-michael": [
    { work: "hymns-to-the-bodiless-hosts", section: 2 },
    { work: "hymns-to-the-bodiless-hosts", section: 3 },
    { work: "hymns-to-the-bodiless-hosts", section: 5 },
  ],
  "constantine-the-great": [
    { work: "the-vision-and-the-council", section: 3 },
    { work: "the-vision-and-the-council", section: 4 },
  ],
  "cyril-of-jerusalem": [{ work: "the-catechist-of-jerusalem", section: 5 }],
  "eustathius-of-antioch": [{ work: "the-confessor-of-antioch", section: 5 }],
  "gregory-palamas": [{ work: "the-holy-hesychast", section: 2 }],
  "meletius-of-antioch": [{ work: "the-confessor-and-the-funeral", section: 4 }],
  "nicholas-the-wonderworker": [{ work: "stories-and-prayers", section: 2 }],
  "spyridon-of-trimythous": [{ work: "the-brick-and-the-flood", section: 5 }],
};

/** A saint's hymns, in the order his page shows them. */
export function hymnsOf(slug: string): readonly HymnRef[] {
  return HYMNS[slug] ?? [];
}
