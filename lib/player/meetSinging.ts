import { lineAt, type CaptionLine } from "./captions";

/**
 * The words meet the singing as it starts (build 98 note 13, his word of
 * 2026-11-15: "it should automatically follow the lyrics one started"). His
 * screenshot: the Prayer Rope Anthem playing at 0:07, the words still where
 * they had been scrolled, in the middle of the song, and no line lit, because
 * the words followed only a line being sung, and only once the reader had left
 * them alone a while. So Play, a seek and another recording each bring the
 * words to where the singing is, wherever the box had been scrolled
 * (components/player/LiveCaptions.tsx); then they follow line by line.
 */

/** A move of the player's clock larger than this between two of its answers is a seek, not the singing going on. */
export const SEEK_S = 1.5;

/** What the words need of the player to know the singing started. */
export type PlayerMoment = { playing: boolean; currentTime: number; src: string | null };

/**
 * Whether the singing just started where the words should go to it: Play
 * pressed, another recording begun, or a seek while it plays (a tap on a line,
 * back or on 15, the position bar). Its answers come four times a second or
 * so, a quarter or half a second apart even at twice the speed, so a larger
 * move, or any move back, is a seek.
 */
export function singingStarted(was: PlayerMoment, now: PlayerMoment): boolean {
  if (!now.playing) return false;
  if (!was.playing || was.src !== now.src) return true;
  const moved = now.currentTime - was.currentTime;
  return moved > SEEK_S || moved < -0.5;
}

/**
 * The line the words go to as the singing starts or comes back: the line
 * being sung, or, in the opening before any line is sung, the first; none
 * once the singing is over (the words are left where they are).
 */
export function lineToMeet(lines: CaptionLine[], t: number): number | null {
  if (lines.length === 0) return null;
  const at = lineAt(lines, t);
  if (at >= 0) return at;
  return t < lines[0].at ? 0 : null;
}
