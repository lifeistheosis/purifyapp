/**
 * The doors' classes (1.8). A saint's page drew them first (round 3b D, "Fade
 * and doors", the owner's pick of 2026-10-27, components/saints/SaintDoors.tsx),
 * and making a post in Community is built like that page (r3-24 B, his pick of
 * 2026-10-31, components/community/ComposePage.tsx), so both wear these.
 *
 * The design's own drawing: square doors 74px tall, rounded, the open one
 * filled with the page's ink; and, once they have gone up under the bar, the
 * same doors again as one slim row of pills pinned under it.
 */

/** A door: its icon over its name. */
export const DOOR =
  "tap-press flex h-[74px] min-w-0 flex-col items-center justify-center gap-[7px] rounded-[16px] border px-1 font-sans text-detail font-semibold leading-none motion-safe:transition-colors";
export const DOOR_OFF = "border-paper/[0.09] bg-paper/[0.06] text-paper hover:bg-paper/[0.1]";
export const DOOR_ON = "border-paper bg-paper text-night";

/** The grid for so many doors. */
export const DOOR_COLS: Record<number, string> = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" };

/** The slim row: its track, and each door in it. */
export const SLIM_TRACK = "grid grid-flow-col auto-cols-fr gap-1 rounded-pill border border-paper/10 bg-paper/[0.03] p-1";
export const SLIM =
  "flex min-h-11 min-w-0 items-center justify-center gap-1.5 truncate rounded-pill px-2 font-sans text-detail font-semibold";
export const SLIM_OFF = "text-paper/65 hover:text-paper";
export const SLIM_ON = "bg-paper text-night";
