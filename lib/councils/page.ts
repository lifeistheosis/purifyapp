import { eventsForCouncil, type HistoryEventMeta } from "@/lib/history/events";
import { eventPicture, type EventPicture } from "@/lib/history/media";
import type { EraId } from "@/lib/reading/catalog";
import type { CoverWindow } from "@/lib/reading/coverWindow";

import { COUNCILS, type Council, type CouncilDocumentRef } from "./councils";

/**
 * What the councils' pages draw, worked out from the registry (1.8, the
 * owner's pick of r3-03, 2026-10-30: "the selection page for A, and the
 * Nicaea at a glance for C"). Pure: the pages read it on the server, and no
 * word here is in the reader's language (the pages look their words up on the
 * device, components/i18n/T.tsx). Every name, place and line is the
 * registry's own English, as the rest of a council's account is.
 */

/** The seven by their numerals, as the gallery's bands carry them. */
export const NUMERALS = ["", "I", "II", "III", "IV", "V", "VI", "VII"] as const;

/** Each of the seven by its place among them, and a local council. */
const ORDINAL_KEYS = [
  "study.ecumenicalCouncil",
  "study.councils.firstEcumenical",
  "study.councils.secondEcumenical",
  "study.councils.thirdEcumenical",
  "study.councils.fourthEcumenical",
  "study.councils.fifthEcumenical",
  "study.councils.sixthEcumenical",
  "study.councils.seventhEcumenical",
] as const;

/** "First Ecumenical Council", or "Local Council": the line over a council's name. */
export function ordinalKey(c: Pick<Council, "kind" | "ordinal">): string {
  return c.kind === "local" ? "study.councils.localCouncil" : ORDINAL_KEYS[c.ordinal ?? 0];
}

/** The seven in their order, then the local councils by year. */
export function councilsInOrder(): { seven: Council[]; local: Council[] } {
  const seven = COUNCILS.filter((c) => c.kind !== "local").sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0));
  const local = COUNCILS.filter((c) => c.kind === "local").sort((a, b) => a.year - b.year || a.slug.localeCompare(b.slug));
  return { seven, local };
}

/**
 * Where it met, as the head of its page says it: the place before the
 * registry's note on where that is today ("Nicaea in Bithynia (modern
 * İznik, Türkiye)" is "Nicaea in Bithynia") or on the building ("Carthage,
 * in the basilica of Faustus" is "Carthage").
 */
export function placeOf(location: string): string {
  const cut = [location.indexOf(" ("), location.indexOf(",")].filter((i) => i > 0);
  return (cut.length ? location.slice(0, Math.min(...cut)) : location).trim();
}

/** The council's name without the year its byname carries ("Council of Carthage (256)" is "Council of Carthage"). */
export function shortName(byname: string): string {
  return byname.replace(/\s*\((?:about\s+)?\d{3,4}\)\s*$/, "").trim();
}

/** Whether the council's year is approximate, as its byname says ("Council of Gangra (about 340)"). */
export function isCirca(c: Pick<Council, "byname">): boolean {
  return /\(about\s+\d{3,4}\)\s*$/.test(c.byname);
}

/**
 * The council and its year, the author line of its books (the owner's pick
 * of r3-03: "the council and its year as the author line"):
 * "First Council of Nicaea, 325", "Council of Gangra, about 340".
 */
export function authorLine(c: Pick<Council, "byname" | "year">): string {
  const about = /\((about\s+\d{3,4})\)\s*$/.exec(c.byname);
  return `${shortName(c.byname)}, ${about ? about[1] : c.year}`;
}

/**
 * The edition a document's words are from, as its book's page names it under
 * the byline: its source without the publisher, the year and the notes on
 * where the text was read ("Schaff & Wace, Nicene and Post-Nicene Fathers,
 * Series II, Vol. 14"). The whole source stays at the foot of the text.
 */
export function editionOf(source: string): string {
  const cut = [source.indexOf(":"), source.indexOf(" (")].filter((i) => i > 0);
  return (cut.length ? source.slice(0, Math.min(...cut)) : source).replace(/[,.\s]+$/, "").trim();
}

/** The reading room's era for a council's year (lib/reading/catalog.ts, ERAS). */
export function eraOfYear(year: number): EraId {
  if (year < 100) return "apostolic";
  if (year < 325) return "early";
  if (year <= 787) return "councils";
  if (year < 1453) return "byzantine";
  if (year < 1900) return "afterByzantium";
  return "modern";
}

/**
 * The council's own event in History, the one whose picture is the council
 * itself (opened, checked and credited there, docs/licensing/HISTORY_MEDIA.md),
 * not one it merely touches. Only the seven have one; a local council has no
 * picture, and its books get the room's plate.
 */
export function councilEvent(slug: string): HistoryEventMeta | undefined {
  return eventsForCouncil(slug).find((e) => e.media && /council/.test(e.slug));
}

/** The council's picture, its address decided by the build (`native` is IS_STATIC_EXPORT). */
export function councilPicture(slug: string, native: boolean): EventPicture | null {
  const event = councilEvent(slug);
  return event ? eventPicture(event, native) : null;
}

/** The one line under a council's name: its event's own preview, else the registry's summary. */
export function councilLine(c: Pick<Council, "slug" | "shortBio">): string {
  return councilEvent(c.slug)?.preview ?? c.shortBio;
}

/**
 * Where each council's picture is cut for its band and the head of its page
 * (CSS object-position), as the design drew them: the faces in the icon's
 * upper part, Ephesus's bishop with his arm raised, the second Nicaea's
 * Fathers along its middle.
 */
const FOCUS: Readonly<Record<string, string>> = {
  "first-nicaea": "50% 24%",
  "first-constantinople": "50% 22%",
  ephesus: "45% 35%",
  chalcedon: "50% 26%",
  "second-constantinople": "50% 28%",
  "third-constantinople": "50% 24%",
  "second-nicaea": "50% 40%",
};

export function councilFocus(slug: string): string {
  return FOCUS[slug] ?? "50% 30%";
}

/**
 * Each document's window onto its council's icon (lib/reading/coverWindow.ts):
 * the part of the picture its cover shows, chosen by looking at each icon so
 * that a council's books are different parts of the one picture. Nicaea's are
 * the design's own: the throne with the open Gospel for the Creed, the
 * Fathers on the left for the letter, those on the right for the canons.
 * lib/councils/__tests__/page.test.ts holds every document of the seven to a
 * window of its own.
 */
const w = (x: number, y: number, zoom: number): CoverWindow => ({ x, y, zoom });
export const CROPS: Readonly<Record<string, Readonly<Record<string, CoverWindow>>>> = {
  "first-nicaea": {
    "the-symbol-of-the-faith": w(0.5, 0.44, 2.1),
    "the-synodal-letter": w(0.2, 0.56, 2),
    "the-twenty-canons": w(0.73, 0.56, 1.95),
  },
  "first-constantinople": {
    // The throne with the open Gospel; the Fathers on the left; the emperor
    // among the Fathers on the right; the Fathers behind him.
    "the-niceno-constantinopolitan-creed": w(0.47, 0.26, 2),
    "the-synodical-letter": w(0.14, 0.45, 2),
    "the-letter-to-theodosius": w(0.72, 0.46, 2.1),
    "the-seven-canons": w(0.88, 0.58, 2),
  },
  ephesus: {
    // The bishop at the centre with his arm raised; the bishops standing on
    // the right; the lectern with the open book on the left.
    "the-second-letter-of-cyril": w(0.47, 0.32, 1.9),
    "the-third-letter-of-cyril": w(0.36, 0.4, 2.1),
    "the-sentence-against-nestorius": w(0.68, 0.45, 2),
    "the-eight-canons": w(0.84, 0.48, 2),
    "the-formula-of-reunion": w(0.22, 0.58, 2),
  },
  chalcedon: {
    // The emperor enthroned; the bishops on the left. The Tome is read among
    // St. Leo's works and keeps his cover there.
    "the-definition-of-faith": w(0.49, 0.3, 2),
    "the-thirty-canons": w(0.2, 0.42, 1.9),
  },
  "second-constantinople": {
    // The emperor; the bishops below on the left; the monks on the right.
    "the-sentence-of-the-synod": w(0.5, 0.3, 2),
    "the-capitula": w(0.22, 0.56, 1.9),
    "the-fifteen-anathemas-against-origen": w(0.8, 0.56, 1.9),
  },
  "third-constantinople": {
    // The bishops above on the left; the emperor; the bishops below on the
    // left; the bishops above on the right; the monks below on the right.
    "the-letter-of-agatho": w(0.2, 0.26, 2),
    "the-definition-of-faith": w(0.53, 0.26, 2),
    "the-sentence-against-the-monothelites": w(0.27, 0.56, 1.9),
    "the-prosphoneticus": w(0.83, 0.27, 2),
    "the-canons-of-trullo": w(0.8, 0.62, 1.9),
  },
  "second-nicaea": {
    // The cross and the throne at the centre; the Fathers on the left.
    "the-decree-on-the-holy-icons": w(0.5, 0.32, 1.25),
    "the-twenty-two-canons": w(0.25, 0.36, 1.3),
  },
};

/** A document with no window of its own: the middle of the icon, a little nearer. */
export const DEFAULT_CROP: CoverWindow = w(0.5, 0.4, 1.6);

export function cropOf(councilSlug: string, documentSlug: string): CoverWindow {
  return CROPS[councilSlug]?.[documentSlug] ?? DEFAULT_CROP;
}

/**
 * The council's own document, the one its book stands for among the other
 * councils (the design's "The other councils" row: the Creed of the second
 * council, the Definition of Chalcedon, the Decree of the seventh): its
 * definition, creed or decree, else the first it carries in Purify.
 */
export function principalDocument(c: Pick<Council, "documents">): CouncilDocumentRef | undefined {
  const own = c.documents.filter((d) => !d.href);
  return own.find((d) => /definition|creed|symbol|decree/.test(d.slug)) ?? own[0] ?? c.documents[0];
}
