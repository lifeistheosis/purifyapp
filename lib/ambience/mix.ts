/**
 * How loud the ambience plays (1.7), as plain numbers, so the rule can be
 * tested without a sound card. lib/ambience/player.ts applies it.
 *
 * The reader sets two things in the ambience sheet: the volume, and, while
 * something plays in the app's player (the reading voice, a chant), the
 * balance between that voice and the sound. The voice's own volume is never
 * touched: an iPhone ignores an audio element's volume, and taking the voice
 * through Web Audio to lower it would stop it when the screen goes off. So
 * the balance works by lowering the ambience alone.
 */

/** The volume a reader starts with: the level the ambience always had. */
export const DEFAULT_VOLUME = 0.55;
/** The balance a reader starts with, a little toward the voice. */
export const DEFAULT_BALANCE = 0.4;
/** Under a voice, at the balance's voice end, the ambience keeps this share
 *  of its volume: quiet, but still there. */
export const DUCK_FLOOR = 0.15;

export function clamp01(v: number): number {
  return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0;
}

/**
 * The ambience's gain. Alone, it is the volume. Under a voice that is
 * playing, it is lowered by the balance: from 15% of the volume at the voice
 * end to all of it at the sound end.
 */
export function mixGain(volume: number, balance: number, voicePlaying: boolean): number {
  const v = clamp01(volume);
  if (!voicePlaying) return v;
  return v * (DUCK_FLOOR + (1 - DUCK_FLOOR) * clamp01(balance));
}

/** A level kept on the device, or the default when there is none or it is not one. */
export function readLevel(raw: string | null, fallback: number): number {
  if (raw === null || raw.trim() === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : fallback;
}
