/**
 * A doctrine's own page and its reading (1.8): the pure parts, so a test can
 * hold them without a page to draw. Round 3 r3-04 made the page B's doors
 * and C's deck; the owner's pick of r3-13 (2026-10-30, a hybrid of B and C)
 * made it B's cover, a Father's words over his portrait, and C's "before you
 * read": the study's length, its parts and the Fathers each part brings,
 * then Begin, which reads it one part at a time (lib/theology/parts.ts).
 *
 * No fs and no "use client": the pages' server shells and their client
 * parts both read this file.
 */

import { THEOLOGY_SUBJECTS, type TheologySubject } from "./subjects";

/** One passage of a study, as its card shows it. Resolved on the server (lib/theology/passages.ts). */
export type DeckPassage = {
  /** The words, verbatim, in English as the study has them. */
  text: string;
  /** Its Father, as the passages are grouped (fatherKey). */
  father: string;
  /** Who: the saint's name as the registry has it, else the source's printed name. */
  name: string;
  /** The name as the source prints it, kept with a gathered line. */
  author: string;
  saintSlug?: string;
  /** The icon the app carries, for when his portrait cannot be had. */
  iconUrl?: string;
  /** The work, and the place in it, as the line under a quotation gives them. */
  work?: string;
  place?: string;
  /** Close to the passage it opens, not as its edition prints it. */
  inexact?: boolean;
  /** Where Read where it's from opens: the words where they stand in the app, else the public-domain page they were read on. */
  source?: { href: string; external: boolean };
  /** The study's own line on why the passage is quoted. */
  gloss?: string;
  /** Where a gathered line opens again. */
  gatherHref?: string;
};

/** The subject a study belongs to: its icon is the light behind the study, its name the line over the title. */
export function subjectOfStudy(slug: string): TheologySubject | null {
  return THEOLOGY_SUBJECTS.find((s) => s.studies.includes(slug)) ?? null;
}

/** A Father of a study and how many of its passages are his. */
export type FatherGroup = {
  /** The saint's slug where the passage names one the app has, else the source's printed name. */
  key: string;
  saintSlug?: string;
  /** The printed name of the first passage in the group. */
  author: string;
  count: number;
};

/** The key a passage is grouped by. */
export function fatherKey(passage: { saintSlug?: string; author: string }): string {
  return passage.saintSlug ?? `author:${passage.author.trim()}`;
}

/**
 * The Fathers of a study, most quoted first; Fathers quoted as often keep
 * the order the study first quotes them in.
 */
export function fatherGroups(passages: readonly { saintSlug?: string; author: string }[]): FatherGroup[] {
  const groups = new Map<string, FatherGroup & { first: number }>();
  passages.forEach((p, i) => {
    const key = fatherKey(p);
    const found = groups.get(key);
    if (found) found.count += 1;
    else groups.set(key, { key, saintSlug: p.saintSlug, author: p.author, count: 1, first: i });
  });
  return [...groups.values()]
    .sort((a, b) => b.count - a.count || a.first - b.first)
    .map((g) => ({ key: g.key, saintSlug: g.saintSlug, author: g.author, count: g.count }));
}

/**
 * The passage a study opens on, its epigraph: the editors choose it by its
 * opening words (TheologyBody.epigraph, data/theology/<slug>.json); where
 * they have not, or the words match no passage the page shows, the first
 * passage. The open question of r3-04 and r3-13, as the owner's word was
 * taken: the editors' pick where one is set, else the first passage.
 */
export function epigraphIndex(passages: readonly { text: string }[], epigraph?: string): number {
  const opening = squash(epigraph ?? "");
  if (!opening) return 0;
  const at = passages.findIndex((p) => squash(p.text).startsWith(opening));
  return at < 0 ? 0 : at;
}

function squash(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * The name under a face: the registry's name without its "St." or "Sts.",
 * as the saint web labels its saints (lib/saints/web.ts, shortName).
 */
export function medallionName(name: string): string {
  return name.replace(/^(?:Saints?|Sts?\.?|Ss\.)\s+/, "").trim();
}

/** The letter a face with no picture shows in its ring: the first of the short name's words that is not "The". */
export function medallionInitial(name: string): string {
  const words = medallionName(name).split(/\s+/).filter(Boolean);
  const word = words.find((w) => !/^the$/i.test(w)) ?? words[0] ?? "";
  return word.charAt(0).toUpperCase();
}

/**
 * A passage's card in the reading's deck: its words at 15.5px, on lines 1.5
 * of that apart, and never more than CARD_LINES of them. A longer passage
 * folds after its seventh line under a soft fade, and Read where it's from
 * opens it whole (every one has a place in the app or a public-domain page).
 * The cards share one height, so the deck holds still as it is swiped; a
 * shorter passage sits in the middle of its card. Build 83's walk found
 * every card as tall as the longest passage before the fold.
 */
export const CARD_TEXT = { size: 15.5, lineHeight: 1.5 } as const;
export const CARD_LINES = 7;

/** The cover's words, a Father's over his portrait: larger, and folded sooner. */
export const COVER_TEXT = { size: 18, lineHeight: 1.45 } as const;
export const COVER_LINES = 6;
