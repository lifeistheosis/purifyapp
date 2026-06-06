import type { LyricLine } from "@/components/prayers/AudioPlayer";

/**
 * Lyrics for "The English Prayer Rope Anthem".
 *
 * Two modes, decided automatically by the player:
 *   - Synced (Apple Music / Spotify style): give every line a `time` in
 *     seconds. The active line brightens, the rest dim, the panel auto-scrolls,
 *     and tapping a line seeks to it. Example:
 *         { time: 12.4, text: "Lord Jesus Christ, Son of God" }
 *   - Plain sheet: omit `time` on the lines; the panel just renders the words.
 *
 * Leave this array empty to hide the Lyrics toggle entirely.
 */
export const ANTHEM_LYRICS: LyricLine[] = [];
