/**
 * The covers on the You tab (1.8, note 71): the owner's pick A of r3-25,
 * "the Ladder, then the day". Where a reader left off is one lit card, the
 * newest place large with its cover and the two after it small with theirs;
 * and what they have kept is a shelf of covers, each group wearing the
 * newest thing in it.
 *
 * Only pictures the app already shows, each rights-checked where it is
 * registered: a Bible book's icon of its saint or prophet, or the
 * manuscript plate (lib/readAloud/covers.ts); a saint's icon settled for a
 * book's cover (lib/reading/coverArt.ts) or his page's picture
 * (lib/saints/heroes.ts); the Pantocrator the prayer pages carry
 * (lib/prayers/icons.ts). Those under /covers/ live on the website and the
 * apps ask for them (lib/media/streamed.ts); with no signal a cover is its
 * fallback or the plate with the cross (components/player/CoverArt.tsx).
 * Anything with no picture of its own (a history event, the journal) is the
 * plate.
 *
 * Pure but for the address, which asks the device whether it is the app.
 */

import { readAloudCover } from "@/lib/readAloud/covers";
import { streamedUrl } from "@/lib/media/streamed";
import { PRAYER_ICONS } from "@/lib/prayers/icons";
import { coverArtFor } from "@/lib/reading/coverArt";
import type { SavedItem } from "@/lib/saved/feed";
import { saintHero } from "@/lib/saints/heroes";

/** A picture to draw, what to draw when it cannot load, and where its face is. */
export type YouCover = {
  src: string;
  /** A bundled picture to fall back on, or null for the plate with the cross. */
  fallback: string | null;
  /** CSS object-position: the face, from the top. */
  focus: string;
};

/** What a cover is of. */
export type CoverSubject =
  | { kind: "book"; book: string }
  | { kind: "saint"; slug: string }
  | { kind: "prayer" }
  | { kind: "picture"; src: string };

/** A Bible book: its saint's or prophet's icon, or the manuscript plate. */
function bookCover(book: string): YouCover {
  const c = readAloudCover(book);
  return { src: c.src, fallback: c.fallback, focus: "50% 18%" };
}

/** A saint: the icon settled for his books, else his page's picture, else none. */
function saintCover(slug: string): YouCover | null {
  const art = coverArtFor(slug);
  if (art) return { src: art.kind === "streamed" ? streamedUrl(art.file) : art.file, fallback: null, focus: `50% ${art.focusY}%` };
  const hero = saintHero(slug);
  return hero ? { src: streamedUrl(hero.file), fallback: null, focus: "50% 20%" } : null;
}

/** The prayer pages' Pantocrator, bundled, for a prayer. */
const PRAYER = PRAYER_ICONS["christ-pantocrator"];

export function coverOf(subject: CoverSubject | null): YouCover | null {
  if (!subject) return null;
  switch (subject.kind) {
    case "book":
      return bookCover(subject.book);
    case "saint":
      return saintCover(subject.slug);
    case "prayer":
      return PRAYER ? { src: PRAYER.src, fallback: null, focus: "50% 25%" } : null;
    case "picture":
      return { src: subject.src, fallback: null, focus: "50% 50%" };
  }
}

/** What a kept thing's cover is of: its book, its saint, a prayer, its own picture, or nothing. */
export function subjectOf(item: SavedItem): CoverSubject | null {
  if (item.highlight) return { kind: "book", book: item.highlight.book };
  if (item.passage) return { kind: "saint", slug: item.passage.saintSlug };
  const b = item.bookmark;
  if (!b) return null;
  switch (b.kind) {
    case "bible-verse":
    case "bible-chapter":
    case "walkthrough-card":
      return { kind: "book", book: b.book };
    case "writing-section":
    case "saint":
      return { kind: "saint", slug: b.saintSlug };
    case "prayer":
    case "prayer-rule":
      return { kind: "prayer" };
    case "product":
      return b.imageUrl ? { kind: "picture", src: b.imageUrl } : null;
    case "history-event":
      return null;
  }
}
