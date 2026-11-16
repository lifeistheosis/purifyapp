// What each part of Plus is shown with on the Plus page (1.9, the fifteen
// screens' round 3). The fresh eyes' finding: "A good opening picture, then
// eight identical boxed cards, each an icon tile, a paragraph and 'Try it'."
// The direction: show each part of Plus as it looks.
//
// So a part stands on the page as a specimen of itself, made from the app's
// own component or picture for it (components/billing/PlusParts.tsx), with
// its name and its one line under it, in the rows' own keys
// (lib/premium/plusRows.ts). The specimens differ in shape because the things
// differ. A part with no honest specimen stands plainly: its name and its
// line, and no icon tile.
//
// Nothing here is written for the page. Every word a specimen shows is the
// app's own: a verse of John 1 as the Bible holds it, its Greek and its
// cross-references from the chapter's own files, Psalm 50:1 as the Compare
// preview holds it to each Bible's file, a chant's own name. The addresses
// below are kept here, not read from their registries, so the Plus page does
// not carry the registry of every icon's rights (220 KB) for three pictures;
// lib/premium/__tests__/plusParts.test.ts holds each to its registry.
//
// Pure, so the tests can hold it.

import { CHANT_SAVING } from "@/lib/chants/saving";
import type { BibleId } from "@/lib/bible/downloads/catalog";
import { TRY_CHAPTER, TRY_WORDS, type TryPalette } from "@/lib/premium/plusTry";

/** The parts that are shown as themselves, by the row's id. Every other row stands plainly. */
export const PART_SPECIMENS = [
  "word-study",
  "reading-modes",
  "cross-refs",
  "journal",
  "offline",
  "ambience",
  "compare",
  "profile",
  "supporter-mark",
] as const;

export type PartSpecimen = (typeof PART_SPECIMENS)[number];

export function isPartSpecimen(id: string): id is PartSpecimen {
  return (PART_SPECIMENS as readonly string[]).includes(id);
}

/** Word study: John 1:1 in the Greek beside the English, the word the study preview opens on marked in it. */
export const PART_WORD = { ...TRY_CHAPTER, verse: 1, strongs: TRY_WORDS[0].strongs } as const;

/** The reading modes worn: three that Plus adds, in the Try preview's order (lib/premium/plusTry.ts, TRY_PALETTE_ORDER). */
export const PART_MODES: readonly Exclude<TryPalette, "default">[] = ["candlelight", "monastery", "nightsky"];

/** Cross-references: John 1:3, one of the verses the Try preview offers, and how many of its echoes are named. */
export const PART_REFS = { ...TRY_CHAPTER, verse: 3, most: 4 } as const;

/**
 * The journal's covers: three of the pictures its cover picker offers
 * (lib/journal/covers.ts, COVERS), by the file's name, which is what a page
 * keeps.
 */
export const PART_COVERS: readonly string[] = ["catherine-of-alexandria.jpg", "anthony-the-great.jpg", "alexander-nevsky.jpg"];

/**
 * Listen offline: the Prayer Rope Anthem as a saved recording's row, its own
 * cover (data/chants/prayer-rope-anthem.json, carried in the apps) and its
 * own name. Shown only while keeping a chant is part of Plus
 * (lib/chants/saving.ts): otherwise the row would promise what is free.
 */
export const PART_OFFLINE = CHANT_SAVING === "plus" ? ({ slug: "prayer-rope-anthem", key: "prayerRopeAnthem", cover: "/audio/art/anthem.jpg" } as const) : null;

/** Ambience: how many of the sounds' photographs stand in the row: the three its line names, rain, morning birds and a bell. */
export const PART_SOUNDS = 3;

/** Compare: beside the app's English, the Greek Church's own text (lib/premium/tryCompare.ts). */
export const PART_COMPARE: BibleId = "grc-lxx-patriarchal";

/** The profile's frames worn: the first three a reader picks from (lib/profile/cosmetics.ts, DECORATIONS). */
export const PART_FRAMES = 3;
