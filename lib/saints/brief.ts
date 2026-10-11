// A saint in brief: what a day of the calendar needs of a profile.
//
// lib/saints/saints.ts is the registry, every profile with its life, its
// works and its quotations, and it is 484 KB of source. The calendar needs
// six small things from each profile to say who is kept today. Until 1.6 it
// imported the registry to get them, and the calendar is on every screen:
// the streak host in the root layout reaches it through the day key. So every
// cold open of the app, and every page of the website, read every saint's
// life before it could show anything.
//
// The rows are data/calendar/profiled-saints.json, written from the registry
// by scripts/emit-saint-briefs.mjs. The test beside this file fails when the
// file and the registry differ, and the native build refuses a stale file.
//
// No import here but a type, on purpose. The script that writes the file
// loads this module in plain Node, and so does everything that loads
// lib/calendar/orthodox.ts.

import type { Saint } from "@/lib/saints/saints";

export type SaintBrief = {
  slug: string;
  name: string;
  epithet: string;
  /** As the registry writes them: "November 13". */
  feastDays: string[];
  iconUrl?: string;
  /**
   * Minutes to read the profile, for the saint's card on Today: the short
   * life and the long one at 900 characters a minute, never under 2 or
   * over 12.
   */
  readMinutes: number;
};

/** The registry's record cut down to what the calendar needs. */
export function briefOf(saint: Saint): SaintBrief {
  const characters = (saint.shortBio?.length ?? 0) + (saint.life?.join(" ").length ?? 0);
  return {
    slug: saint.slug,
    name: saint.name,
    epithet: saint.epithet,
    feastDays: [...(saint.feastDays ?? [])],
    ...(saint.iconUrl ? { iconUrl: saint.iconUrl } : {}),
    readMinutes: Math.max(2, Math.min(12, Math.round(characters / 900))),
  };
}
