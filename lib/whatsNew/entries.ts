import entriesJson from "@/data/changelog/entries.json";

/**
 * One release on /whats-new.
 *
 * `date` is the human string, "August 28, 2026", and doubles as the group key
 * the page nests by. It is a display string on purpose: the grouper reads the
 * year and month back out of it, and a release the parser cannot read still
 * renders under its raw string rather than vanishing.
 */
export type Entry = {
  version: string;
  kind: string;
  date: string;
  blurb: string;
  items: string[];
};

/**
 * The committed release notes, newest first.
 *
 * This file is the FALLBACK and the native bundle. The live copy is the
 * patch_notes table, read through lib/whatsNew/notes.ts, which an admin edits
 * from /admin without a deploy. When that read fails, is empty, or the table
 * is not applied yet, this array is what readers see, and the native app
 * (a static export with no server) always sees this array.
 *
 * Keep it current with `node scripts/patch-notes.mjs pull`. Until 2026-09-04
 * this literal lived inline in app/(app)/whats-new/page.tsx and a test had to
 * regex-scrape the newest entry out of the TSX; the JSON is what that test
 * reads now.
 */
export const ENTRIES: Entry[] = entriesJson as Entry[];
