/**
 * Theology's own pages, round 3 (1.8, r3-04): the owner's pick of 2026-10-30,
 * "For theology, we should do one A, two B and C, hybrid, three, C"
 * (Homebase/boards/purify-master/variants/r3-04-theology, INDEX.md).
 *
 * A doctrine's page is B and C made one page: C's head (the subject's icon as
 * the cover, the title, Read the study as the main button), then B's four
 * doors (The study, The Fathers, Scripture, Related), with The Fathers
 * holding B's medallions over C's deck of picture cards. The pure parts of
 * that page live here, so a test can hold them without a page to draw.
 *
 * No fs and no "use client": the page's server shell and its client doors
 * both read this file.
 */

import { THEOLOGY_SUBJECTS, type TheologySubject } from "./subjects";

/** A doctrine's doors, in the order the design draws them. */
export type DoctrineDoor = "study" | "fathers" | "scripture" | "related";

export const DOCTRINE_DOORS: readonly DoctrineDoor[] = ["study", "fathers", "scripture", "related"];

/**
 * The doors a study has: The study always, the others only where there is
 * something behind them, as a saint's page draws only the doors a saint has.
 */
export function doctrineDoors(has: { passages: number; scripture: number; related: number }): DoctrineDoor[] {
  return DOCTRINE_DOORS.filter((door) => {
    if (door === "fathers") return has.passages > 0;
    if (door === "scripture") return has.scripture > 0;
    if (door === "related") return has.related > 0;
    return true;
  });
}

/**
 * The door open as the page opens: The Fathers, where the study has them.
 * B draws that door lit and C sets the deck right under the head, so the
 * passages are what a reader meets first, and Read the study opens the long
 * form. A study with no passages opens on the study.
 */
export function openingDoor(doors: readonly DoctrineDoor[]): DoctrineDoor {
  return doors.includes("fathers") ? "fathers" : (doors[0] ?? "study");
}

/**
 * The doors with the opening one first: lib/ui/sectionTabs.ts reads the first
 * part as the one with no # in the address, so the plain address opens on
 * the opening door and the others are #study, #scripture, #related.
 */
export function doorsForAddress(doors: readonly DoctrineDoor[]): DoctrineDoor[] {
  const opening = openingDoor(doors);
  return [opening, ...doors.filter((d) => d !== opening)];
}

/** The subject a study belongs to: its icon is the page's cover, its name the line over the title. */
export function subjectOfStudy(slug: string): TheologySubject | null {
  return THEOLOGY_SUBJECTS.find((s) => s.studies.includes(slug)) ?? null;
}

/** One medallion over the deck: a Father and how many of the study's passages are his. */
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
 * The Fathers of a study, most quoted first (B: "The Fathers open on their
 * faces, most quoted first, with how many passages each"); Fathers quoted as
 * often keep the order the study first quotes them in.
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
 * The passage the deck opens on: the study's epigraph. The editors choose it
 * by its opening words (TheologyBody.epigraph, data/theology/<slug>.json);
 * where they have not, or the words match no passage the page shows, the
 * deck opens on the first passage. The open question of r3-04, built as
 * drawn: the editors' pick where the data has one, else the first.
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
 * The name under a medallion: the registry's name without its "St." or
 * "Sts.", as the saint web labels its saints (lib/saints/web.ts, shortName).
 */
export function medallionName(name: string): string {
  return name.replace(/^(?:Saints?|Sts?\.?|Ss\.)\s+/, "").trim();
}

/** The letter a medallion with no picture shows in its ring: the first of the short name's words that is not "The". */
export function medallionInitial(name: string): string {
  const words = medallionName(name).split(/\s+/).filter(Boolean);
  const word = words.find((w) => !/^the$/i.test(w)) ?? words[0] ?? "";
  return word.charAt(0).toUpperCase();
}

/**
 * A card of the Fathers' deck (C): its words at the design's 15px, on lines
 * 1.45 of that apart, and never more than CARD_LINES of them. Build 83's walk
 * found every card as tall as the deck's longest passage, so a short one
 * stood over a gap of several hundred pixels: St Irenaeus's three lines on
 * The Essence and the Energies, beside a passage of seven hundred letters.
 * Now a longer passage folds after its seventh line, under a soft fade, and
 * Read where it's from opens it whole (every one of the 136 has a place in
 * the app or a public-domain page). The cards share one height, so the deck,
 * its two buttons and the line under it hold still as it is swiped; a
 * shorter passage sits in the middle of its card.
 */
export const CARD_TEXT = { size: 15, lineHeight: 1.45 } as const;
export const CARD_LINES = 7;

/**
 * The doors' slim row, pinned under the bar (DoctrineDoors): the sizes its
 * labels are tried at, from the row's own 13px down to 9px by half a pixel,
 * and their line height.
 */
export const SLIM_SIZES = { from: 13, floor: 9, step: 0.5, lineHeight: 1.1 } as const;

/** The largest size at which every label reads whole (`fits`), or null when none does. */
export function slimSize(fits: (size: number) => boolean): number | null {
  for (let size = SLIM_SIZES.from; size >= SLIM_SIZES.floor; size -= SLIM_SIZES.step) {
    if (fits(size)) return size;
  }
  return null;
}

/** How tall `lines` lines of a slim label are at `size` pixels. */
export function slimLinesHeight(size: number, lines: number): number {
  return size * SLIM_SIZES.lineHeight * lines;
}
