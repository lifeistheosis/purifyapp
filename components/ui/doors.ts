/**
 * The doors' classes (1.8). A saint's page drew them first (round 3b D, "Fade
 * and doors", the owner's pick of 2026-10-27, components/saints/SaintDoors.tsx),
 * and making a post in Community is built like that page (r3-24 B, his pick of
 * 2026-10-31, components/community/ComposePage.tsx), so both wear these.
 *
 * Since the fifteen screens (1.9, one small choice, one form) the doors are
 * the house's track, as Settings draws its choices (.set-track): each door
 * its name alone, the open one lit; and, once they have gone up under the
 * bar, the same doors again as one slim row pinned under it.
 */

/** A door: its name, on the track. */
export const DOOR = "hit-44 min-w-0 font-sans";
export const DOOR_OFF = "";
export const DOOR_ON = "";

/** The grid for so many doors. */
export const DOOR_COLS: Record<number, string> = { 2: "set-track [--set-cols:2]", 3: "set-track [--set-cols:3]", 4: "set-track [--set-cols:4]" };

/** The slim row: its track, and each door in it. */
export const SLIM_TRACK = "grid grid-flow-col auto-cols-fr gap-1 rounded-pill border border-paper/10 bg-paper/[0.03] p-1";
export const SLIM =
  "flex min-h-11 min-w-0 items-center justify-center gap-1.5 truncate rounded-pill px-2 font-sans text-detail font-semibold";
export const SLIM_OFF = "text-paper/65 hover:text-paper";
export const SLIM_ON = "bg-paper text-night";
