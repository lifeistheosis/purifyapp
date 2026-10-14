// The board message the apps carry, written from the release's drop.
//
// data/changelog/board.json is the copy of the weekly "This week at Purify"
// message that the apps carry and the website falls back on when the
// board_messages table cannot be reached (lib/whatsNew/board.ts reads it).
// Only `node scripts/patch-notes.mjs pull --apply` ever wrote it, so between
// pulls it went stale: on 2026-10-14 its newest message was from 2026-09-08,
// and 1.6's store builds would have carried a message five weeks old for as
// long as they stay installed.
//
// `node scripts/release.mjs board` writes the release's own message, the
// drop's piece "board", as the newest entry before the store builds.
// `release.mjs check` and lib/whatsNew/__tests__/board.test.ts refuse a
// release whose newest message is more than STALE_DAYS older than its note.
//
// No fs here: release.mjs reads and writes the files, and
// lib/release/__tests__/board.test.ts imports this as it is.

export const EYEBROW = "This week at Purify";

/** A board message older than this many days before the release's note is stale. */
export const STALE_DAYS = 30;

const EM_DASH = String.fromCharCode(0x2014);
const DAY_MS = 86_400_000;
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * @typedef {{ week: string, date: string, eyebrow: string, headline: string, body: string[] }} BoardMessage
 *   The shape lib/whatsNew/board.ts reads and patch-notes.mjs pull writes, keys in this order.
 */

/**
 * "October 14, 2026" (how entries.json writes a date) or "2026-10-14" to
 * "2026-10-14". Null for anything else.
 * @param {unknown} value
 * @returns {string | null}
 */
export function isoDate(value) {
  const s = String(value ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = /^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/.exec(s);
  if (!m) return null;
  const month = MONTHS.findIndex((n) => n.toLowerCase() === m[1].toLowerCase());
  if (month < 0) return null;
  return `${m[3]}-${String(month + 1).padStart(2, "0")}-${String(m[2]).padStart(2, "0")}`;
}

/**
 * "2026-10-14" to "2026-W42", ISO 8601 week numbering. A copy of isoWeekOf in
 * lib/whatsNew/boardShape.ts, which imports zod and is TypeScript, so this
 * plain script cannot load it. lib/release/__tests__/board.test.ts holds the
 * two to the same answer over three years of days.
 * @param {string} iso
 * @returns {string}
 */
export function isoWeek(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return "";
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  // Thursday of the same ISO week decides the year.
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / DAY_MS + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/**
 * The release's board message, as board.json holds one: the headline is the
 * drop piece's subject, each line of its text a paragraph, and the date and
 * week are the release note's. Throws a sentence a person can act on.
 * @param {{ drop: any, note: { version?: string, date?: string } | undefined }} from
 * @returns {BoardMessage}
 */
export function boardEntry({ drop, note }) {
  const where = `docs/plans/v${drop?.release ?? "?"}/drop.json`;
  const piece = (drop?.pieces ?? []).find((/** @type {any} */ p) => p?.id === "board");
  if (!piece) throw new Error(`${where} has no piece "board". Draft it first: node scripts/drop.mjs draft`);
  const headline = String(piece.subject ?? "").trim();
  if (!headline) throw new Error(`${where}: the board piece has no subject, which is the headline.`);
  const body = String(piece.text ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!body.length) throw new Error(`${where}: the board piece has no text, which is the body.`);
  if (!note) throw new Error("There is no note for this release in data/changelog/entries.json. Write it first: node scripts/release.mjs note <version>");
  const date = isoDate(note.date);
  if (!date) throw new Error(`The ${note.version} note's date "${note.date}" is not a date this can read.`);
  /** @type {BoardMessage} */
  const entry = { week: isoWeek(date), date, eyebrow: EYEBROW, headline, body };
  if (JSON.stringify(entry).includes(EM_DASH)) throw new Error(`${where}: the board piece carries an em dash. This repo allows none.`);
  return entry;
}

/**
 * board.json with `entry` in it, newest first. A week holds one message: the
 * release's own is put in again when it changed (same headline), and another
 * message in that week (the owner's, pulled from the table) is only replaced
 * when asked, so his words are never lost by rerunning this.
 * @param {BoardMessage[]} board
 * @param {BoardMessage} entry
 * @param {{ replace?: boolean }} [options]
 * @returns {{ board: BoardMessage[], change: "same" | "added" | "replaced", newer: BoardMessage[] }}
 */
export function placeBoardEntry(board, entry, options = {}) {
  const held = board.find((m) => m.week === entry.week);
  const newer = board.filter((m) => m.week !== entry.week && m.date > entry.date);
  if (held && JSON.stringify(held) === JSON.stringify(entry)) return { board, change: "same", newer };
  if (held && held.headline !== entry.headline && !options.replace) {
    throw new Error(
      `board.json already has a message for ${entry.week}: "${held.headline}". ` +
        `Writing the release's would replace it. If that is right, run it again with --replace.`,
    );
  }
  const rest = board.filter((m) => m.week !== entry.week);
  const at = rest.findIndex((m) => m.date < entry.date);
  const next = at < 0 ? [...rest, entry] : [...rest.slice(0, at), entry, ...rest.slice(at)];
  return { board: next, change: held ? "replaced" : "added", newer };
}

/**
 * The message a reader is shown, as lib/whatsNew/board.ts picks it: the
 * newest by date, whatever order the file is in.
 * @param {BoardMessage[]} board
 * @returns {BoardMessage | undefined}
 */
export function newestBoard(board) {
  return [...board].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))[0];
}

/**
 * Whether the board a build would carry is stale for a release whose note is
 * dated `noteDate`: no message at all, or a newest message more than
 * STALE_DAYS before the note. `days` is how far before the note it is
 * (negative when it is newer).
 * @param {BoardMessage[]} board
 * @param {string} noteDate "2026-10-14" or "October 14, 2026"
 * @returns {{ stale: boolean, newest: BoardMessage | undefined, days: number | null }}
 */
export function boardFreshness(board, noteDate) {
  const newest = newestBoard(board);
  const note = isoDate(noteDate);
  if (!newest || !note) return { stale: true, newest, days: null };
  const days = Math.round((Date.parse(`${note}T00:00:00Z`) - Date.parse(`${newest.date}T00:00:00Z`)) / DAY_MS);
  return { stale: !(days <= STALE_DAYS), newest, days };
}
