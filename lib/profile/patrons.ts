// The saints a reader can choose as their patron, as the chooser draws them
// (build 95 note 17; the owner's word of 2026-11-13: "patron saint chooser
// design needs a rework").
//
// The chooser was the generic searchable dropdown: bare names in the order the
// website sent them, sorted on the name after its "St.", so the fifteen apostles
// and prophets whose names begin "Holy Apostle" or "The Prophet" stood together
// under H and T, and no saint had his picture. Here each saint is drawn from
// the library in brief (data/calendar/profiled-saints.json, which the calendar
// already carries on every screen, so it opens with no network in the apps):
// his name as the registry writes it, his icon (public/saints/icons/, the one
// his own page shows, or the house's plate while his picture waits on a
// permission: lib/saints/__tests__/everySaintAPicture.test.ts), his feast, and
// his own name, by which the list is sorted and lettered: John under J,
// Matthew under M, Andrew under A.
//
// The website still says which saints it will save (/api/saints/patrons, the
// registry saints with a feast day), so the list is the library in brief less
// any saint the website does not know: a test build talks to the main web,
// which learns the release's new saints only at the merge, and offering one it
// would refuse is a tap that fails.

import profiledSaints from "@/data/calendar/profiled-saints.json";
import type { SaintBrief } from "@/lib/saints/brief";
import { KNOWN_FORMS } from "@/lib/saints/nameForms";
import { filterItems, fold } from "@/lib/ui/listbox";

export type Patron = {
  slug: string;
  /** As the registry writes it: "Holy Apostle and Evangelist John". */
  name: string;
  /** The saint's own name, what the list is sorted and lettered by: "John". */
  own: string;
  /** The letter the saint stands under: the first of his own name. */
  letter: string;
  /** His icon as his own page shows it, or null: the house's plate. */
  icon: string | null;
  /** His first feast as the registry writes it ("November 13"), the one a name day keeps. */
  feast: string | null;
  /** Other forms the search finds him by, never shown (lib/saints/nameForms.ts). */
  terms: string;
};

/** What the website answers at /api/saints/patrons. */
export type ServerPatron = { slug: string; name: string };

const BRIEF = profiledSaints as SaintBrief[];
const BY_SLUG = new Map(BRIEF.map((s) => [s.slug, s]));

/**
 * The words of honour before a saint's own name. Only ever taken from the
 * front, a word at a time, so "and" goes only between two of them ("Holy
 * Apostle and Evangelist John") and never out of a name ("Cyril and
 * Methodius").
 */
const TITLES = new Set([
  "the",
  "most",
  "holy",
  "st.",
  "st",
  "sts.",
  "sts",
  "saint",
  "saints",
  "apostle",
  "apostles",
  "evangelist",
  "prophet",
  "prophetess",
  "forerunner",
  "baptist",
  "archangel",
  "blessed",
  "righteous",
  "venerable",
  "great",
  "martyr",
  "great-martyr",
  "hieromartyr",
  "and",
]);

/** "Holy Apostle and Evangelist John" to "John"; "St. Mary of Egypt" to "Mary of Egypt". */
export function ownName(name: string): string {
  const words = name.trim().split(/\s+/);
  let i = 0;
  // The last word always stays: a name is never all honour.
  while (i < words.length - 1 && TITLES.has(words[i].replace(/,$/, "").toLowerCase())) i += 1;
  return words.slice(i).join(" ");
}

/** The letter a saint stands under: the first of his own name, its accent off. */
export function letterOf(own: string): string {
  const first = fold(own).charAt(0).toUpperCase();
  return /[A-Z]/.test(first) ? first : "#";
}

function patronOf(slug: string, name: string): Patron {
  const brief = BY_SLUG.get(slug);
  const own = ownName(name);
  return {
    slug,
    name,
    own,
    letter: letterOf(own),
    icon: brief?.iconUrl ?? null,
    feast: brief?.feastDays[0] ?? null,
    terms: (KNOWN_FORMS[slug] ?? []).join(" "),
  };
}

/** By the saint's own name, then by the name as written (the Apostle John before the Forerunner). */
export function byOwnName(a: Patron, b: Patron): number {
  return a.own.localeCompare(b.own, "en", { sensitivity: "base" }) || a.name.localeCompare(b.name, "en");
}

/**
 * The saints the chooser offers: every saint of the library in brief the
 * website will save, by his own name. A saint the website names that this
 * build does not carry (an older app, a newer website) is left out: the app
 * has no picture or feast to draw him with, and the reader finds him once the
 * app is updated.
 */
export function patronList(server: readonly ServerPatron[]): Patron[] {
  const known = new Set(server.map((p) => p.slug));
  return BRIEF.filter((s) => known.has(s.slug))
    .map((s) => patronOf(s.slug, s.name))
    .sort(byOwnName);
}

/**
 * The saint a reader has chosen, to show in the chooser's row: from the
 * library in brief when the build carries him, else by the name the website
 * gave (on the plate), else null.
 */
export function patronFor(slug: string | null | undefined, named?: string | null): Patron | null {
  if (!slug) return null;
  const brief = BY_SLUG.get(slug);
  if (brief) return patronOf(slug, brief.name);
  return named ? patronOf(slug, named) : null;
}

/**
 * The saints a search finds: any part of the name or of a known form, accents
 * off, so "egypt" finds St. Mary of Egypt and "theologian" the Apostle John
 * (lib/ui/listbox.ts, filterItems). Those whose own name begins with the words
 * typed come first, so "john" opens on the Apostle and the Forerunner, not on
 * Sts. Alexander, John and Paul; each part keeps the list's own order.
 */
export function findPatrons(list: readonly Patron[], query: string): Patron[] {
  const q = fold(query.trim());
  if (!q) return [...list];
  const kept = new Set(filterItems(list.map((p) => ({ slug: p.slug, label: p.name, terms: p.terms })), query).map((it) => it.slug));
  const hits = list.filter((p) => kept.has(p.slug));
  const first = hits.filter((p) => fold(p.own).startsWith(q));
  return [...first, ...hits.filter((p) => !first.includes(p))];
}

/** The list in its letters, for the chooser's headings: [["A", [...]], ["B", [...]], ...]. */
export function byLetter(list: readonly Patron[]): [string, Patron[]][] {
  const groups = new Map<string, Patron[]>();
  for (const p of list) {
    const group = groups.get(p.letter);
    if (group) group.push(p);
    else groups.set(p.letter, [p]);
  }
  return [...groups];
}
