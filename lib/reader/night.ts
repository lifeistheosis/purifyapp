// Night reading in one tap (1.9, s2-05 of docs/1.9-build/ideas.json, from
// BRAINSTORM.md's Reading 5: "Candlelight, Focus, larger text and a sound
// together; the code already calls Candlelight with Focus the best pair").
//
// One row at the top of the reader's settings turns on, together: the
// Candlelight palette, Focus, the text a size larger, and a sound under the
// words (the reader's last, lib/ambience/player.ts, or rain before they have
// one). What it put down is kept on the device, and the same row gives it
// all back: the palette, Focus, the size (unchosen again, if it was), and
// silence, if there was silence before.
//
// Pure: the reading of what was kept, and the rules. The row itself is
// components/reader/NightReadingRow.tsx.

import { getAmbienceTrack, type AmbienceId } from "@/lib/ambience/ambience";

import { coerceReadingTheme, type ReadingTheme } from "./readingModes";

export const NIGHT_KEY = "purify.reader.night";

/** The palette night reading reads in. */
export const NIGHT_THEME: ReadingTheme = "candlelight";

/** The sound before a reader has one of their own. */
export const NIGHT_FIRST_SOUND: AmbienceId = "rain";

type Size = "sm" | "md" | "lg" | "xl";
const SIZES: readonly Size[] = ["sm", "md", "lg", "xl"];

/** What night reading put down, to give back. */
export type BeforeNight = {
  theme: ReadingTheme;
  focus: boolean;
  /** The size as stored, or null when the reader had never chosen one. */
  size: Size | null;
  /** The sound that was playing, or null for silence. */
  sound: AmbienceId | null;
};

/** One size larger, to the largest. */
export function largerSize(size: Size): Size {
  const at = SIZES.indexOf(size);
  return SIZES[Math.min((at < 0 ? 1 : at) + 1, SIZES.length - 1)];
}

/** The sound night reading plays: the reader's last, or rain. */
export function nightSound(last: AmbienceId | null): AmbienceId {
  return last ?? NIGHT_FIRST_SOUND;
}

/** What was kept, read back; null when nothing (or nothing sound) was. */
export function readBeforeNight(raw: string | null): BeforeNight | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Partial<Record<keyof BeforeNight, unknown>>;
    if (!o || typeof o !== "object") return null;
    return {
      theme: coerceReadingTheme(typeof o.theme === "string" ? o.theme : null),
      focus: o.focus === true,
      size: typeof o.size === "string" && (SIZES as readonly string[]).includes(o.size) ? (o.size as Size) : null,
      sound: typeof o.sound === "string" ? (getAmbienceTrack(o.sound)?.id ?? null) : null,
    };
  } catch {
    return null;
  }
}

/**
 * Whether night reading is on: something kept, and the page still in
 * Candlelight. A reader who has since chosen another palette has left it by
 * hand, and the row offers it again rather than taking them back.
 */
export function isNight(before: BeforeNight | null, theme: ReadingTheme): boolean {
  return before !== null && theme === NIGHT_THEME;
}

/**
 * Whether turning night reading off stops the sound: only when there was
 * silence before it, and only the sound it may have started or one chosen
 * since. A sound that was playing before night reading plays on.
 */
export function stopsSound(before: BeforeNight, playing: AmbienceId | null): boolean {
  return before.sound === null && playing !== null;
}
