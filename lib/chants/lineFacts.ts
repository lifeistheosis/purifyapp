import type { ChantIndexRow, ChantTradition } from "./types";

/**
 * What a list says of a chant (1.9): its tradition and its length. With a
 * tradition chosen (the Chants home's chips), the line speaks of that
 * tradition's own singing, its name and its shortest recording, never the
 * first version's: Fable Themes' finding of 2026-11-11, "Psalm 135, Arabic ·
 * Psalm · 4:13" under Greek, a chant sung in more than one tradition.
 * Without one, the first tradition and the shortest recording of all.
 */
export function chantLineFacts(row: ChantIndexRow, tradition: ChantTradition | null = null): { tradition: ChantTradition | null; seconds: number } {
  const own = tradition && row.traditions.includes(tradition) ? row.variants.filter((v) => v.tradition === tradition) : [];
  if (own.length > 0) return { tradition, seconds: Math.min(...own.map((v) => v.audio.durationSec)) };
  return { tradition: row.traditions[0] ?? null, seconds: row.shortest };
}
