// The earned palettes (1.9, rec 79, ideas.json s2-04), the rules his
// "if these are good" accepted (BRAINSTORM.md, 2026-11-10):
//
//   Councils      every council's page in the app read to its end (19);
//   Cappadocian   one work by each of the three Cappadocians read to its
//                 end: St Basil the Great, St Gregory the Theologian and St
//                 Gregory of Nyssa.
//
// Until a palette is earned, the reader's palettes show how far they are
// (components/reader/ReadingModeChips.tsx, components/settings/
// ReadingModePages.tsx). An earned palette is then a palette like
// Candlelight: a Purify Plus palette, applied with Plus (lib/reader/
// themeWrite.ts holds the server to that), offered to everyone who earned it.
//
// What counts as read to its end: a council's page whose foot came into view,
// a work whose last chapter's foot did (lib/reading/readToEnd.ts), and, for a
// work read before 1.9, one whose last chapter the reading room saw reached
// (lib/reading/progress.ts, `done`) when it has more than one chapter, since a
// one-chapter work is "reached" the moment it opens.
//
// Pure, so the rules are tested directly (lib/reader/__tests__/earned.test.ts).

import type { Store as ProgressStore } from "@/lib/reading/progress";
import type { ReadToEnd } from "@/lib/reading/readToEnd";

/**
 * Every council's page in the app, by its slug (lib/councils/councils.ts,
 * COUNCILS, which the test holds this to): listed here so the palettes do not
 * carry the councils' whole text to count them.
 */
export const COUNCIL_PAGES = [
  "first-nicaea",
  "first-constantinople",
  "ephesus",
  "chalcedon",
  "second-constantinople",
  "third-constantinople",
  "second-nicaea",
  "antioch-268",
  "carthage-256",
  "ancyra-314",
  "neocaesarea-315",
  "gangra",
  "antioch-341",
  "sardica",
  "carthage-419",
  "constantinople-394",
  "laodicea",
  "jerusalem-1672",
  "orange-529",
] as const;

/** The three Cappadocian Fathers, by their saints' pages. */
export const CAPPADOCIANS = ["basil-the-great", "gregory-theologian", "gregory-of-nyssa"] as const;

/**
 * Each of the three, by the icon the apps carry for him (lib/saints/saints.ts,
 * iconUrl, which the test holds this to): the earned palette's card lights a
 * face as his work is read, without carrying the saints' whole registry.
 */
export const CAPPADOCIAN_FACES: Readonly<Record<(typeof CAPPADOCIANS)[number], string>> = {
  "basil-the-great": "/saints/icons/basil-the-great.jpg",
  "gregory-theologian": "/saints/icons/gregory-theologian.v2.jpg",
  "gregory-of-nyssa": "/saints/icons/gregory-of-nyssa.v3.jpg",
};

export type EarnedGoal = { read: number; of: number; earned: boolean };
export type EarnedPalettes = { councils: EarnedGoal; cappadocian: EarnedGoal };

/** Was this work ("saint/work") read to its end, by either sign? */
function workRead(key: string, ends: ReadToEnd, progress: ProgressStore): boolean {
  if (ends.works.includes(key)) return true;
  const p = progress[key];
  return Boolean(p?.done && p.of > 1);
}

/** How far a reader is towards each earned palette. `councils` is every council's slug in the app. */
export function earnedPalettes(ends: ReadToEnd, progress: ProgressStore, councils: readonly string[] = COUNCIL_PAGES): EarnedPalettes {
  const councilsRead = councils.filter((slug) => ends.councils.includes(slug)).length;
  const keys = new Set([...ends.works, ...Object.keys(progress)]);
  const fathersRead = CAPPADOCIANS.filter((saint) => [...keys].some((key) => key.startsWith(`${saint}/`) && workRead(key, ends, progress))).length;
  return {
    councils: { read: councilsRead, of: councils.length, earned: councils.length > 0 && councilsRead === councils.length },
    cappadocian: { read: fathersRead, of: CAPPADOCIANS.length, earned: fathersRead === CAPPADOCIANS.length },
  };
}

/**
 * Which of them are read, by name: the councils whose page was read to its
 * end, and the Cappadocians one of whose works was. What the card's marks and
 * faces light by, and what the sheet's doors leave out (build 95 note 27).
 */
export function earnedSoFar(ends: ReadToEnd, progress: ProgressStore, councils: readonly string[] = COUNCIL_PAGES): { councils: readonly string[]; fathers: readonly string[] } {
  const keys = [...new Set([...ends.works, ...Object.keys(progress)])];
  return {
    councils: councils.filter((slug) => ends.councils.includes(slug)),
    fathers: CAPPADOCIANS.filter((saint) => keys.some((key) => key.startsWith(`${saint}/`) && workRead(key, ends, progress))),
  };
}
