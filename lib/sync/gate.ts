"use client";

import { settlePsalmsMove } from "@/lib/bible/psalmMoveBoot";
import { canSync } from "@/lib/entitlements/client";

/**
 * Whether this device's verse-numbered things may sync now: notes and
 * highlights, bookmarks, gathered verses, journal pages and what the reader
 * keeps (lib/sync/annotations, bookmarks, florilegium, journal, kept). As
 * canSync (the Purify Plus layer), and only once the device stands in the
 * same numbering of Psalms 113 to 115 as the server
 * (lib/bible/psalmMoveBoot.ts): a pull before that could bring rows the
 * device would then move a second time, and a push could send rows numbered
 * otherwise than the server's.
 */
export async function canSyncPlaces(): Promise<boolean> {
  if (!(await settlePsalmsMove())) return false;
  return canSync();
}
