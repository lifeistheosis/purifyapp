/**
 * How fast the Bible is read aloud (1.8). The owner's round 8 A drew "1x,
 * Speed" under the player's controls (Homebase/boards/purify-master/
 * variants/08-player); it was built with his "add everything we left out"
 * of 2026-10-28: 0.75, 1, 1.25, 1.5 or 2, the reader's own choice, kept on
 * the device, the same for every chapter and for today's readings.
 *
 * A chant always plays at 1: a sung chant is never sped up. So the player
 * offers no Speed while one plays (components/player/NowPlayingSheet.tsx),
 * lib/chants/play.ts loads every recording at 1, and a track that does not
 * ask for a speed is loaded at 1 too (lib/prayers/persistentAudioStore.ts,
 * setTrack): only the read-aloud asks for the reader's (lib/readAloud/play.ts,
 * lib/readings/listen.ts).
 */

export const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;
export type Speed = (typeof SPEEDS)[number];

/** Where the reader's speed is kept on the device. */
export const SPEED_KEY = "purify:player.speed";

export function isSpeed(value: number): value is Speed {
  return (SPEEDS as readonly number[]).includes(value);
}

/** The speed a stored value names, or 1 for anything else (nothing stored, or a value from elsewhere). */
export function parseSpeed(raw: string | null): Speed {
  const value = raw === null ? NaN : Number(raw);
  return isSpeed(value) ? value : 1;
}

/** The reader's speed, as kept on this device. 1 where storage is shut. */
export function readSpeed(): Speed {
  if (typeof window === "undefined") return 1;
  try {
    return parseSpeed(window.localStorage.getItem(SPEED_KEY));
  } catch {
    return 1;
  }
}

/** Keep the reader's speed on this device. */
export function saveSpeed(speed: Speed): void {
  try {
    window.localStorage.setItem(SPEED_KEY, String(speed));
  } catch {
    /* private mode: the speed lasts while the track plays */
  }
}

/** One tap on Speed: the next speed up, and after 2 round again to 0.75. A speed not on the list goes to 1. */
export function nextSpeed(current: number): Speed {
  const at = (SPEEDS as readonly number[]).indexOf(current);
  return at < 0 ? 1 : SPEEDS[(at + 1) % SPEEDS.length];
}

/** "1×", "1.25×", in the reader's own figures ("1,25×" in German). */
export function speedText(speed: number, locale: string): string {
  let figure: string;
  try {
    figure = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(speed);
  } catch {
    figure = String(speed);
  }
  return `${figure}×`;
}
