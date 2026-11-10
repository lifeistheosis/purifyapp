import "server-only";

import nextUpdate from "@/data/changelog/next-update.json";
import { getMessages } from "@/lib/i18n";
import { LOCALES } from "@/lib/i18n/locales";
import { coversPackOf } from "@/lib/readAloud/covers";
import { readingCovers } from "@/lib/reading/cards";
import { packMachineVerses } from "@/lib/today/machineVerse.server";
import { getVerseOfDayTable } from "@/lib/today/verseOfDay";
import type { VerseOfDayEntry } from "@/lib/today/verseOfDay.types";
import { getBoardMessage } from "@/lib/whatsNew/boardLive";
import { CURRENT_VERSION } from "@/lib/whatsNew/version";
import { PACK_SCHEMAS, PACKS_FORMAT, readNextUpdate, type Packs } from "./types";

/**
 * The website's half of content packs: what /api/packs answers.
 *
 * Built from the same code the pages use, never from a second copy, so a pack
 * cannot say anything the website itself would not show:
 *
 * - "verse-of-day" is getVerseOfDayTable(), the function the Verse of the Day
 *   card renders from, for a window that starts the day before today (a
 *   reader behind UTC still finds their day) and runs two months ahead. A
 *   chosen verse added to data/today/verse-picks.json reaches the apps with
 *   the next website deploy, and a build that has outlived its own 400-day
 *   window is carried forward by it.
 * - "board" is getBoardMessage(), the message /whats-new shows: the row
 *   published from the admin panel, or the committed file when the table is
 *   empty or out of reach. Publishing a message reaches the apps within the
 *   time the answer is kept (MADE_FOR_MS), with no deploy at all.
 * - "covers" (1.9) is the read-aloud covers' own map (lib/readAloud/covers.ts):
 *   each book's figure, its file under /covers/ and its name in every
 *   language, so a cover chosen after a store build reaches the apps with
 *   the website deploy that carries its picture; and the reading room's
 *   books and How you feel doors (lib/reading/cards.ts, readingCovers), the
 *   same way (build 89 note 3).
 *
 * Kept in memory for five minutes, because the verse window reads sixty
 * chapters off disk and the answer is the same for every reader.
 */

export const VERSE_DAYS_AHEAD = 62;
export const MADE_FOR_MS = 5 * 60 * 1000;

let made: { at: number; packs: Packs } | null = null;

export async function buildPacks(now: Date = new Date()): Promise<Packs> {
  const base = new Date(now);
  base.setUTCDate(base.getUTCDate() - 1);
  const [table, board] = await Promise.all([
    getVerseOfDayTable(base, VERSE_DAYS_AHEAD),
    getBoardMessage(),
  ]);
  // TEMPORARY (lib/today/machineVerse.ts): each day carries its machine
  // translations, for the languages with no Bible of their own, so a verse
  // chosen after a store build reaches those readers translated and
  // labelled, never in English for want of the build's file knowing it.
  const days: Record<string, VerseOfDayEntry> = {};
  for (const [key, entry] of Object.entries(table)) {
    const machine = packMachineVerses(entry);
    days[key] = machine ? { ...entry, machine } : entry;
  }
  return {
    format: PACKS_FORMAT,
    release: CURRENT_VERSION,
    made: now.toISOString(),
    packs: {
      "verse-of-day": { schema: PACK_SCHEMAS["verse-of-day"], days },
      board: { schema: PACK_SCHEMAS.board, message: board.message ?? null },
      // The next update, for the widgets' countdown: a date set or moved in
      // data/changelog/next-update.json reaches the apps with the next deploy.
      release: {
        schema: PACK_SCHEMAS.release,
        next: readNextUpdate(nextUpdate) ?? { name: null, version: null, date: null },
      },
      covers: { ...coversPackOf(coverNames), ...readingCovers(), schema: PACK_SCHEMAS.covers },
    },
  };
}

/** A figure's name in each of the app's languages, from the website's catalogs (English where one has none). */
function coverNames(nameKey: string): Record<string, string> {
  const names: Record<string, string> = {};
  for (const { code } of LOCALES) {
    const name = getMessages(code)[nameKey];
    if (typeof name === "string" && name.trim()) names[code] = name.trim();
  }
  return names;
}

/** buildPacks(), kept for MADE_FOR_MS. */
export async function currentPacks(now: number = Date.now()): Promise<Packs> {
  if (made && now - made.at < MADE_FOR_MS && now >= made.at) return made.packs;
  const packs = await buildPacks(new Date(now));
  made = { at: now, packs };
  return packs;
}
