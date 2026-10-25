import "server-only";

import file from "@/data/fathers/struggles.json";
import type { ShownCite } from "@/lib/citations/cite";
import { shownWork } from "@/lib/citations/shown";

/**
 * The Fathers on everyday struggles (1.8, the owner's yes of 2026-10-24):
 * anxiety, anger, grief, temptation, loneliness, despondency, pride and the
 * hard work of forgiving, each a page of short passages in the Fathers' own
 * words from the works the reading room carries, every one with the source
 * line that opens it where it stands. Nothing of ours but the headings and a
 * line under each (data/fathers/struggles.json; its test holds every passage
 * to its paragraph, character for character).
 */
export const STRUGGLES = ["anxiety", "anger", "grief", "temptation", "loneliness", "despondency", "pride", "forgiveness"] as const;
export type Struggle = (typeof STRUGGLES)[number];

/** One passage as stored: where it stands, and the words, as they stand there. */
export type StruggleRow = { saint: string; work: string; section: number; paragraph: number; quote: string };

export const STRUGGLE_ROWS = file as unknown as Record<Struggle, StruggleRow[]>;

export type StrugglePassage = { text: string; shown: Extract<ShownCite, { kind: "father" }> };

export function isStruggle(slug: string): slug is Struggle {
  return (STRUGGLES as readonly string[]).includes(slug);
}

/** A struggle's passages, each with the line under it. */
export function strugglePassages(slug: Struggle): StrugglePassage[] {
  return (STRUGGLE_ROWS[slug] ?? []).flatMap((r) => {
    const shown = shownWork({ saint: r.saint, work: r.work, section: r.section, paragraph: r.paragraph });
    return shown ? [{ text: r.quote, shown }] : [];
  });
}
