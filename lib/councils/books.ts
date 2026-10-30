import "server-only";

import fs from "node:fs";
import path from "node:path";

import { cardFor } from "@/lib/reading/cards";
import { tileOf, type TileCard } from "@/lib/reading/select";
import { getSaint } from "@/lib/saints/saints";

import { getCouncil, type Council, type CouncilDocumentRef } from "./councils";
import { authorLine, councilPicture, councilsInOrder, cropOf, ordinalKey, principalDocument } from "./page";

/**
 * The councils' documents as books in the reading room (1.8, the owner's
 * build 80 note 12, "Read the Council's documents opens the reading room",
 * and his pick of r3-03): a shelf for each council, each book a window onto
 * its council's own icon (lib/councils/page.ts, CROPS) with the council and
 * its year as the author line, opened in the room's reader. A local council
 * has no picture, so its books are the room's plate with the title alone
 * (components/covers/WorkCover.tsx). The two documents read among a
 * Father's works (the Tome of St. Leo, St. Cyprian's letters on baptism) are
 * the room's own books, with their own covers, and open there.
 *
 * Built on the server, at build time in the apps, and handed to the pages as
 * small cards: no text, only what a cover and its line need.
 */

/** A council's book: a cover on a row, where it opens, and its subtitle. */
export type CouncilBook = TileCard & { href: string; subtitle?: string };

/** The house's pace, as the room counts every work (scripts/reading-stats.mjs). */
const WORDS_PER_MINUTE = 180;
const words = (text: string) => {
  const t = text.trim();
  return t === "" ? 0 : t.split(/\s+/).length;
};

const minutes = new Map<string, number>();

/**
 * How long a document is to read: its paragraphs' words at the house's 180 a
 * minute, never less than 1, counted as the room counts a work (the
 * editor's framing above a section is not the text). Read once per build.
 */
export function documentMinutes(councilSlug: string, documentSlug: string): number {
  const key = `${councilSlug}/${documentSlug}`;
  const known = minutes.get(key);
  if (known !== undefined) return known;
  let total = 0;
  try {
    const file = path.join(process.cwd(), "data", "councils", councilSlug, `${documentSlug}.json`);
    const json = JSON.parse(fs.readFileSync(file, "utf8")) as { sections: { paragraphs?: string[] }[] };
    total = json.sections.reduce((n, s) => n + (s.paragraphs ?? []).reduce((m, p) => m + words(p), 0), 0);
  } catch {
    total = 0;
  }
  const count = Math.max(1, Math.round(total / WORDS_PER_MINUTE));
  minutes.set(key, count);
  return count;
}

/** A document read among a Father's works: the room's own book for it. */
function roomBook(doc: CouncilDocumentRef, native: boolean): CouncilBook | null {
  const m = /^\/saints\/([^/#?]+)\/([^/#?]+)/.exec(doc.href ?? "");
  const saint = m ? getSaint(m[1]) : undefined;
  const card = saint && m ? cardFor(saint, m[2], native) : null;
  return card ? { ...tileOf(card), href: doc.href!, ...(card.subtitle ? { subtitle: card.subtitle } : {}) } : null;
}

/** One document as a book: a window onto its council's icon, or the plate. */
function councilBook(c: Council, doc: CouncilDocumentRef, native: boolean): CouncilBook {
  if (doc.href) {
    const own = roomBook(doc, native);
    if (own) return own;
  }
  const picture = councilPicture(c.slug, native);
  return {
    key: `councils/${c.slug}/${doc.slug}`,
    title: doc.title,
    ...(doc.subtitle ? { subtitle: doc.subtitle } : {}),
    author: authorLine(c),
    minutes: documentMinutes(c.slug, doc.slug),
    href: doc.href ?? `/councils/${c.slug}/${doc.slug}`,
    ...(picture ? { cover: { src: picture.src, focusY: 30, crop: cropOf(c.slug, doc.slug) } } : {}),
  };
}

/** A council's shelf: every document it carries, in its own order. */
export function councilBooks(c: Council, native: boolean): CouncilBook[] {
  return c.documents.map((d) => councilBook(c, d, native));
}

/** What a council's head says of its shelf: how many books and how long they take together. */
export function shelfSize(books: readonly Pick<CouncilBook, "minutes">[]): { books: number; minutes: number } {
  return { books: books.length, minutes: books.reduce((n, b) => n + b.minutes, 0) };
}

/** A council as the shelves name it: what its head and its row need, no more. */
export type ShelfCouncil = {
  slug: string;
  byname: string;
  year: number;
  /** The line over its name, "First Ecumenical Council" or "Local Council", as a catalog key. */
  ordinalKey: string;
  /** The council's picture, for the shelf's backdrop. */
  picture?: { src: string; focus: string; credit: string };
};

export function shelfCouncil(c: Council, native: boolean, focus: string): ShelfCouncil {
  const picture = councilPicture(c.slug, native);
  return {
    slug: c.slug,
    byname: c.byname,
    year: c.year,
    ordinalKey: ordinalKey(c),
    ...(picture ? { picture: { src: picture.src, focus, credit: picture.credit } } : {}),
  };
}

/**
 * The other councils, each by its own document (principalDocument): the row
 * under a council's shelf. The seven, in their order; the local councils are
 * on the page of all the shelves, where the row's See all leads, so a
 * shelf's page carries a row of six or seven covers and not eighteen (the
 * apps carry every page, lib/build/exportSize.ts).
 */
export function otherCouncilBooks(slug: string, native: boolean): CouncilBook[] {
  return councilsInOrder()
    .seven.filter((c) => c.slug !== slug)
    .map((c) => {
      const doc = principalDocument(c);
      return doc ? councilBook(c, doc, native) : null;
    })
    .filter((b): b is CouncilBook => b !== null);
}

/** Every council's shelf, in order: the page the other councils' See all opens. */
export function allShelves(native: boolean, focusOf: (slug: string) => string): { council: ShelfCouncil; books: CouncilBook[] }[] {
  const { seven, local } = councilsInOrder();
  return [...seven, ...local]
    .filter((c) => c.documents.length > 0)
    .map((c) => ({ council: shelfCouncil(c, native, focusOf(c.slug)), books: councilBooks(c, native) }));
}

/** The council a shelf's address names, when it has books to show. */
export function shelfFor(slug: string): Council | undefined {
  const c = getCouncil(slug);
  return c && c.documents.length > 0 ? c : undefined;
}
